export const XP_AWARDS = {
  ANALYZE_GAME: 10,
  SOLVE_PUZZLE: 5,
  WIN_ONLINE_MATCH: 15,
  DRAW_ONLINE_MATCH: 5,
};

export function calculateLevel(xp: number): number {
  return Math.floor(0.1 * Math.sqrt(xp)) + 1;
}

export function getLevelTitle(level: number): string {
  if (level >= 100) return "Grandmaster";
  if (level >= 80) return "Master Candidate";
  if (level >= 60) return "Expert";
  if (level >= 40) return "Club Player";
  if (level >= 20) return "Tactician";
  return "Novice";
}

export function calculateNextLevelXp(level: number): number {
  return Math.pow(level * 10, 2);
}

export function getLevelProgress(xp: number, level: number): { currentLevelXp: number; nextLevelXp: number; percentage: number } {
  const currentLevelBaseXp = calculateNextLevelXp(level - 1);
  const nextLevelTotalXp = calculateNextLevelXp(level);
  
  const xpIntoCurrentLevel = Math.max(0, xp - currentLevelBaseXp);
  const xpNeededForNext = nextLevelTotalXp - currentLevelBaseXp;
  
  const percentage = Math.min(100, Math.max(0, Math.round((xpIntoCurrentLevel / xpNeededForNext) * 100)));
  
  return {
    currentLevelXp: xpIntoCurrentLevel,
    nextLevelXp: xpNeededForNext,
    percentage,
  };
}
