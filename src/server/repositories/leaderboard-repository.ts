import { asc, eq } from "drizzle-orm";

import { brilliantLeaderboard, puzzleLeaderboard } from "@/data/sample-data";
import { getDb } from "@/server/db/client";
import { leaderboardEntries } from "@/server/db/schema";
import { withDatabaseFallback } from "@/server/repositories/runtime";
import type { LeaderboardEntry } from "@/types/platform";

const seedSets = {
  puzzles: puzzleLeaderboard,
  brilliant: brilliantLeaderboard,
} satisfies Record<"puzzles" | "brilliant", LeaderboardEntry[]>;

export async function upsertSampleLeaderboards() {
  return withDatabaseFallback(
    async () => {
      const db = getDb();

      for (const [boardType, entries] of Object.entries(seedSets) as Array<
        ["puzzles" | "brilliant", LeaderboardEntry[]]
      >) {
        for (const entry of entries) {
          await db
            .insert(leaderboardEntries)
            .values({
              boardType,
              rank: entry.rank,
              player: entry.player,
              score: entry.score,
              change: entry.change,
              detail: entry.detail,
            })
            .onConflictDoUpdate({
              target: [leaderboardEntries.boardType, leaderboardEntries.player],
              set: {
                rank: entry.rank,
                score: entry.score,
                change: entry.change,
                detail: entry.detail,
                updatedAt: new Date(),
              },
            });
        }
      }

      return true;
    },
    async () => true,
  );
}

export async function listLeaderboardEntries(type: "puzzles" | "brilliant") {
  return withDatabaseFallback(
    async () => {
      await upsertSampleLeaderboards();
      const db = getDb();
      const rows = await db
        .select()
        .from(leaderboardEntries)
        .where(eq(leaderboardEntries.boardType, type))
        .orderBy(asc(leaderboardEntries.rank));

      return rows.map(
        (row) =>
          ({
            rank: row.rank,
            player: row.player,
            score: row.score,
            change: row.change,
            detail: row.detail,
          }) satisfies LeaderboardEntry,
      );
    },
    async () => seedSets[type],
  );
}
