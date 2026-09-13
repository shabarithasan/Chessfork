import { readFile, writeFile } from "fs/promises";
async function run() {
  const file = "src/server/repositories/user-repository.ts";
  const code = await readFile(file, "utf8");
  const newCode = code + `
import { calculateLevel, getLevelTitle } from "@/lib/progression";

export async function awardUserXp(userId: string, xpAmount: number, statToIncrement?: "gamesAnalyzed" | "puzzlesSolved") {
  if (!databaseEnabled()) return null;
  const db = getDb();
  
  // First get current XP
  const currentUserRows = await db.select({ xp: users.xp, level: users.level, gamesAnalyzed: users.gamesAnalyzed, puzzlesSolved: users.puzzlesSolved }).from(users).where(eq(users.id, userId)).limit(1);
  if (!currentUserRows[0]) return null;
  
  const current = currentUserRows[0];
  const newXp = current.xp + xpAmount;
  const newLevel = calculateLevel(newXp);
  const newTitle = getLevelTitle(newLevel);
  
  const updates: any = {
    xp: newXp,
    level: newLevel,
    title: newTitle,
  };
  
  if (statToIncrement === "gamesAnalyzed") updates.gamesAnalyzed = current.gamesAnalyzed + 1;
  if (statToIncrement === "puzzlesSolved") updates.puzzlesSolved = current.puzzlesSolved + 1;
  
  await db.update(users).set(updates).where(eq(users.id, userId));
  
  return { newXp, newLevel, newTitle, leveledUp: newLevel > current.level };
}
`;
  await writeFile(file, newCode);
}
run();
