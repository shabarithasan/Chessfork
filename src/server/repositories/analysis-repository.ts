import { desc, eq, inArray } from "drizzle-orm";

import { createAnalysisCacheKey } from "@/lib/chess/cache";
import { ENGINE_VERSION, getEngineSearchSettings } from "@/lib/chess/engine";
import { sanitizeAnalysisRun } from "@/lib/chess/report-helpers";
import { hashString } from "@/lib/utils";
import { getAllAnalysisRuns } from "@/data/sample-data";
import { getDb } from "@/server/db/client";
import { analysisRuns, importedPgns, moveEvaluations } from "@/server/db/schema";
import { databaseEnabled, mongoDatabaseEnabled } from "@/server/env";
import { getMongoAnalysisRunsCollection } from "@/server/mongodb/client";
import { withDatabaseFallback } from "@/server/repositories/runtime";
import type { AnalysisRun, SourceType } from "@/types/platform";

const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const globalForAnalysisFallback = globalThis as typeof globalThis & {
  __knightowlFallbackAnalysisRuns?: Map<string, AnalysisRun>;
  __knightowlFallbackAnalysisOwners?: Map<string, string>;
};

function depthToPly(depth: AnalysisRun["depth"]) {
  return getEngineSearchSettings(depth, "report").searchDepth;
}

function getFallbackAnalysisStore() {
  if (!globalForAnalysisFallback.__knightowlFallbackAnalysisRuns) {
    globalForAnalysisFallback.__knightowlFallbackAnalysisRuns = new Map(
      getAllAnalysisRuns().map((run) => [run.id, sanitizeAnalysisRun(run)]),
    );
  }

  return globalForAnalysisFallback.__knightowlFallbackAnalysisRuns;
}

function saveFallbackAnalysisRun(run: AnalysisRun) {
  const sanitized = sanitizeAnalysisRun(run);
  getFallbackAnalysisStore().set(sanitized.id, sanitized);
  return sanitized;
}

function getFallbackAnalysisOwnerStore() {
  if (!globalForAnalysisFallback.__knightowlFallbackAnalysisOwners) {
    globalForAnalysisFallback.__knightowlFallbackAnalysisOwners = new Map();
  }

  return globalForAnalysisFallback.__knightowlFallbackAnalysisOwners;
}

function getFallbackAnalysisRun(id: string) {
  return getFallbackAnalysisStore().get(id);
}

function listFallbackAnalysisRuns(userId?: string) {
  const ownerStore = getFallbackAnalysisOwnerStore();
  return [...getFallbackAnalysisStore().entries()]
    .filter(([runId]) => !userId || ownerStore.get(runId) === userId)
    .map(([, run]) => run)
    .sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

export async function persistAnalysisRun(run: AnalysisRun, source: SourceType = "pgn", userId?: string) {
  const storedRun = saveFallbackAnalysisRun(run);
  if (userId) {
    getFallbackAnalysisOwnerStore().set(storedRun.id, userId);
  }

  if (mongoDatabaseEnabled()) {
    try {
      const collection = getMongoAnalysisRunsCollection();
      const now = new Date();
      await collection.updateOne(
        { _id: storedRun.id },
        {
          $set: {
            createdAt: now,
            ownerId: userId,
            source,
            run: sanitizeAnalysisRun(storedRun),
          },
        },
        { upsert: true },
      );
    } catch (error) {
      console.warn("MongoDB analysis store unavailable, falling back to memory:", error);
    }
  }

  return withDatabaseFallback(
    async () => {
      const db = getDb();
      const publicImportId = `import-${storedRun.id}`;
      const pgnHash = hashString(storedRun.pgn);

      const [imported] = await db
        .insert(importedPgns)
        .values({
          publicId: publicImportId,
          userId,
          source,
          externalGameId: storedRun.id,
          pgn: storedRun.pgn,
          pgnHash,
          jobStatus: storedRun.status,
          auditTrail: [
            {
              type: "imported",
              at: new Date().toISOString(),
              source,
            },
          ],
        })
        .onConflictDoUpdate({
          target: importedPgns.publicId,
          set: {
            userId,
            source,
            externalGameId: storedRun.id,
            pgn: storedRun.pgn,
            pgnHash,
            jobStatus: storedRun.status,
          },
        })
        .returning({ id: importedPgns.id });

      const [analysis] = await db
        .insert(analysisRuns)
        .values({
          publicId: storedRun.id,
          importedPgnId: imported.id,
          cacheKey: createAnalysisCacheKey({
            fen: storedRun.moveEvaluations[0]?.fenBefore ?? startingFen,
            depth: depthToPly(storedRun.depth),
            engineVersion: ENGINE_VERSION,
          }),
          mode: storedRun.mode,
          depth: storedRun.depth,
          payload: storedRun,
          status: storedRun.status,
        })
        .onConflictDoUpdate({
          target: analysisRuns.publicId,
          set: {
            importedPgnId: imported.id,
            mode: storedRun.mode,
            depth: storedRun.depth,
            payload: storedRun,
            status: storedRun.status,
            updatedAt: new Date(),
          },
        })
        .returning({ id: analysisRuns.id });

      await db.delete(moveEvaluations).where(eq(moveEvaluations.analysisRunId, analysis.id));

      if (storedRun.moveEvaluations.length > 0) {
        await db.insert(moveEvaluations).values(
          storedRun.moveEvaluations.map((move) => ({
            analysisRunId: analysis.id,
            ply: move.ply,
            score: move.score,
            cpLoss: move.cpLoss,
            grade: move.grade,
            payload: move,
          })),
        );
      }

      return storedRun;
    },
    async () => storedRun,
  );
}

export async function findAnalysisRunById(id: string) {
  if (mongoDatabaseEnabled()) {
    try {
      const doc = await getMongoAnalysisRunsCollection().findOne({ _id: id });
      if (doc) {
        return sanitizeAnalysisRun(doc.run);
      }
      return getFallbackAnalysisRun(id) ?? null;
    } catch (error) {
      console.warn("MongoDB analysis store unavailable, falling back to memory:", error);
      return getFallbackAnalysisRun(id) ?? null;
    }
  }

  return withDatabaseFallback(
    async () => {
      const db = getDb();
      const rows = await db
        .select({
          payload: analysisRuns.payload,
        })
        .from(analysisRuns)
        .where(eq(analysisRuns.publicId, id))
        .limit(1);

      const payload = rows[0]?.payload as AnalysisRun | undefined;
      return payload ? sanitizeAnalysisRun(payload) : getFallbackAnalysisRun(id);
    },
    async () => getFallbackAnalysisRun(id),
  );
}

export async function claimAnalysisRunsForUser(userId: string, runIds: string[]) {
  const uniqueRunIds = [...new Set(runIds)].filter((id) => id.length > 0 && id.length <= 255).slice(0, 10);

  if (uniqueRunIds.length === 0) {
    return 0;
  }

  if (mongoDatabaseEnabled()) {
    try {
      const collection = getMongoAnalysisRunsCollection();
      const result = await collection.updateMany(
        { _id: { $in: uniqueRunIds }, ownerId: { $exists: false } },
        { $set: { ownerId: userId } },
      );
      return result.modifiedCount;
    } catch (error) {
      console.warn("MongoDB analysis store unavailable, falling back to memory:", error);
    }
  }

  const fallbackClaimCount = () => {
    const ownerStore = getFallbackAnalysisOwnerStore();
    let count = 0;

    for (const runId of uniqueRunIds) {
      if (getFallbackAnalysisRun(runId)) {
        ownerStore.set(runId, userId);
        count += 1;
      }
    }

    return count;
  };

  const fallbackCount = fallbackClaimCount();

  return withDatabaseFallback(
    async () => {
      const db = getDb();
      const rows = await db
        .update(importedPgns)
        .set({ userId })
        .where(inArray(importedPgns.externalGameId, uniqueRunIds))
        .returning({ id: importedPgns.id });

      return Math.max(rows.length, fallbackCount);
    },
    async () => fallbackCount,
  );
}

export async function listAnalysisRuns(userId?: string) {
  if (mongoDatabaseEnabled()) {
    try {
      const docs = await getMongoAnalysisRunsCollection()
        .find(userId ? { ownerId: userId } : {})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return docs.map((doc) => sanitizeAnalysisRun(doc.run));
    } catch (error) {
      console.warn("MongoDB analysis store unavailable, falling back to memory:", error);
      return listFallbackAnalysisRuns(userId);
    }
  }

  return withDatabaseFallback(
    async () => {
      const db = getDb();
      const rows = userId
        ? await db
            .select({
              payload: analysisRuns.payload,
            })
            .from(analysisRuns)
            .leftJoin(importedPgns, eq(importedPgns.id, analysisRuns.importedPgnId))
            .where(eq(importedPgns.userId, userId))
            .orderBy(desc(analysisRuns.createdAt))
        : await db
            .select({
              payload: analysisRuns.payload,
            })
            .from(analysisRuns)
            .leftJoin(importedPgns, eq(importedPgns.id, analysisRuns.importedPgnId))
            .orderBy(desc(analysisRuns.createdAt));

      return rows.map((row) => sanitizeAnalysisRun(row.payload as AnalysisRun));
    },
    async () => listFallbackAnalysisRuns(userId),
  );
}
