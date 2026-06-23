import { eq } from "drizzle-orm";

import { sampleCoachSnapshot } from "@/data/sample-data";
import { getDb } from "@/server/db/client";
import { coachSnapshots } from "@/server/db/schema";
import { withDatabaseFallback } from "@/server/repositories/runtime";
import type { CoachProfileSnapshot } from "@/types/platform";

const globalForCoachFallback = globalThis as typeof globalThis & {
  __knightowlFallbackCoachSnapshots?: Map<string, CoachProfileSnapshot>;
  __knightowlFallbackCoachOwners?: Map<string, string>;
};

function getFallbackCoachStore() {
  if (!globalForCoachFallback.__knightowlFallbackCoachSnapshots) {
    globalForCoachFallback.__knightowlFallbackCoachSnapshots = new Map([
      [sampleCoachSnapshot.id, sampleCoachSnapshot],
    ]);
  }

  return globalForCoachFallback.__knightowlFallbackCoachSnapshots;
}

function saveFallbackCoachSnapshot(snapshot: CoachProfileSnapshot) {
  getFallbackCoachStore().set(snapshot.id, snapshot);
  return snapshot;
}

function getFallbackCoachOwnerStore() {
  if (!globalForCoachFallback.__knightowlFallbackCoachOwners) {
    globalForCoachFallback.__knightowlFallbackCoachOwners = new Map();
  }

  return globalForCoachFallback.__knightowlFallbackCoachOwners;
}

export async function persistCoachSnapshot(snapshot: CoachProfileSnapshot, userId?: string) {
  if (userId) {
    getFallbackCoachOwnerStore().set(snapshot.id, userId);
  }

  return withDatabaseFallback(
    async () => {
      const db = getDb();
      await db
        .insert(coachSnapshots)
        .values({
          publicId: snapshot.id,
          userId,
          summary: snapshot.summary,
          payload: snapshot,
          generatedAt: new Date(snapshot.generatedAt),
        })
        .onConflictDoUpdate({
          target: coachSnapshots.publicId,
          set: {
            userId,
            summary: snapshot.summary,
            payload: snapshot,
            generatedAt: new Date(snapshot.generatedAt),
          },
        });

      return snapshot;
    },
    async () => saveFallbackCoachSnapshot(snapshot),
  );
}

export async function findCoachSnapshotById(id: string) {
  return withDatabaseFallback(
    async () => {
      const db = getDb();
      const rows = await db.select({ payload: coachSnapshots.payload }).from(coachSnapshots).where(eq(coachSnapshots.publicId, id)).limit(1);
      return (rows[0]?.payload as CoachProfileSnapshot | undefined) ?? getFallbackCoachStore().get(id) ?? sampleCoachSnapshot;
    },
    async () => getFallbackCoachStore().get(id) ?? sampleCoachSnapshot,
  );
}
