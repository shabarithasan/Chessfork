import { eq, asc } from "drizzle-orm";

import { samplePuzzles } from "@/data/sample-data";
import { getDb } from "@/server/db/client";
import { puzzleAttempts, puzzles } from "@/server/db/schema";
import { withDatabaseFallback } from "@/server/repositories/runtime";
import type { Puzzle } from "@/types/platform";

export async function upsertSamplePuzzles() {
  return withDatabaseFallback(
    async () => {
      const db = getDb();

      for (const puzzle of samplePuzzles) {
        await db
          .insert(puzzles)
          .values({
            publicId: puzzle.id,
            fen: puzzle.fen,
            prompt: puzzle.prompt,
            rating: puzzle.rating,
            themes: puzzle.themes,
            solution: puzzle.solution,
            sourceGamePublicId: puzzle.sourceGameId,
          })
          .onConflictDoUpdate({
            target: puzzles.publicId,
            set: {
              fen: puzzle.fen,
              prompt: puzzle.prompt,
              rating: puzzle.rating,
              themes: puzzle.themes,
              solution: puzzle.solution,
              sourceGamePublicId: puzzle.sourceGameId,
            },
          });
      }

      return true;
    },
    async () => true,
  );
}

export async function listPuzzles() {
  return withDatabaseFallback(
    async () => {
      await upsertSamplePuzzles();
      const db = getDb();
      const rows = await db
        .select()
        .from(puzzles)
        .orderBy(asc(puzzles.rating));

      return rows.map(
        (row) =>
          ({
            id: row.publicId,
            fen: row.fen,
            prompt: row.prompt,
            rating: row.rating,
            themes: row.themes as string[],
            solution: row.solution as string[],
            sourceGameId: row.sourceGamePublicId ?? "",
          }) satisfies Puzzle,
      );
    },
    async () => samplePuzzles,
  );
}

export async function findPuzzleById(id: string) {
  return withDatabaseFallback(
    async () => {
      await upsertSamplePuzzles();
      const db = getDb();
      const rows = await db.select().from(puzzles).where(eq(puzzles.publicId, id)).limit(1);
      const row = rows[0];
      if (!row) {
        return samplePuzzles.find((puzzle) => puzzle.id === id);
      }

      return {
        id: row.publicId,
        fen: row.fen,
        prompt: row.prompt,
        rating: row.rating,
        themes: row.themes as string[],
        solution: row.solution as string[],
        sourceGameId: row.sourceGamePublicId ?? "",
      } satisfies Puzzle;
    },
    async () => samplePuzzles.find((puzzle) => puzzle.id === id),
  );
}

export async function recordPuzzleAttempt(params: {
  puzzleId: string;
  correct: boolean;
  elapsedMs: number;
  ratingAfter: number;
  userId?: string;
}) {
  return withDatabaseFallback(
    async () => {
      await upsertSamplePuzzles();
      const db = getDb();
      const rows = await db.select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.publicId, params.puzzleId)).limit(1);
      const puzzle = rows[0];
      if (!puzzle) {
        return false;
      }

      await db.insert(puzzleAttempts).values({
        puzzleId: puzzle.id,
        userId: params.userId,
        correct: params.correct,
        elapsedMs: params.elapsedMs,
        ratingAfter: params.ratingAfter,
      });

      return true;
    },
    async () => true,
  );
}
