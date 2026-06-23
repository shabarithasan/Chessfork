import { badges, getBadgeById, type Badge } from "@/lib/badges";
import { average } from "@/lib/utils";
import type { AnalysisRun, MoveEvaluation } from "@/types/platform";

export type DailyAccuracy = {
  count: number;
  total: number;
};

export type OpeningStat = {
  count: number;
  eco: string;
  name: string;
  totalAccuracy: number;
};

export type AnalysisStat = {
  accuracy: number;
  blunders: number;
  brilliants: number;
  date: string;
  elapsedMs?: number;
  id: string;
  openingEco: string;
  openingName: string;
};

export type KnightowlStats = {
  accuracyByDate: Record<string, DailyAccuracy>;
  analysisIds: string[];
  analyses: AnalysisStat[];
  coachUses: number;
  currentStreak: number;
  freezeWeeks: Record<string, true>;
  gamesByDate: Record<string, number>;
  lastAnalysisDate?: string;
  longestStreak: number;
  openings: Record<string, OpeningStat>;
  shareCount: number;
  totalAccuracy: number;
  totalGames: number;
  version: 1;
};

const badgesKey = "knightowl_badges";
const statsKey = "knightowl_stats";
const maxStoredAnalyses = 300;

const emptyStats: KnightowlStats = {
  accuracyByDate: {},
  analysisIds: [],
  analyses: [],
  coachUses: 0,
  currentStreak: 0,
  freezeWeeks: {},
  gamesByDate: {},
  longestStreak: 0,
  openings: {},
  shareCount: 0,
  totalAccuracy: 0,
  totalGames: 0,
  version: 1,
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore local storage pressure. The in-session UI still works.
  }
}

function cloneStats(stats: KnightowlStats): KnightowlStats {
  return {
    ...emptyStats,
    ...stats,
    accuracyByDate: { ...stats.accuracyByDate },
    analysisIds: [...(stats.analysisIds ?? [])],
    analyses: [...(stats.analyses ?? [])],
    freezeWeeks: { ...(stats.freezeWeeks ?? {}) },
    gamesByDate: { ...(stats.gamesByDate ?? {}) },
    openings: { ...(stats.openings ?? {}) },
    version: 1,
  };
}

export function readUnlockedBadgeIds() {
  const ids = readJson<string[]>(badgesKey, []);
  const knownIds = new Set<string>(badges.map((badge) => badge.id));
  return [...new Set(ids.filter((id) => knownIds.has(id)))];
}

export function readUnlockedBadges() {
  return readUnlockedBadgeIds().map((id) => getBadgeById(id)).filter((badge): badge is Badge => Boolean(badge));
}

export function readGamificationStats(): KnightowlStats {
  return cloneStats(readJson<KnightowlStats>(statsKey, emptyStats));
}

export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function dayDifference(leftKey: string, rightKey: string) {
  const left = dateFromKey(leftKey).getTime();
  const right = dateFromKey(rightKey).getTime();
  return Math.round((left - right) / 86_400_000);
}

export function weekKeyForDate(date = new Date()) {
  const monday = new Date(date);
  const dayOffset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dayOffset);
  return toLocalDateKey(monday);
}

export function hasAnalyzedToday(stats = readGamificationStats()) {
  return Boolean(stats.gamesByDate[toLocalDateKey()]);
}

export function isStreakAtRisk(stats = readGamificationStats(), now = new Date()) {
  return now.getHours() >= 20 && stats.currentStreak > 0 && !hasAnalyzedToday(stats);
}

export function hasFreezeAvailable(stats = readGamificationStats(), now = new Date()) {
  return !stats.freezeWeeks[weekKeyForDate(now)];
}

function updateStreak(stats: KnightowlStats, todayKey: string) {
  const lastKey = stats.lastAnalysisDate;

  if (!lastKey) {
    stats.currentStreak = 1;
  } else if (lastKey === todayKey) {
    stats.currentStreak = Math.max(1, stats.currentStreak);
  } else {
    const gap = dayDifference(todayKey, lastKey);

    if (gap === 1) {
      stats.currentStreak += 1;
    } else if (gap === 2) {
      const missedDate = dateFromKey(lastKey);
      missedDate.setDate(missedDate.getDate() + 1);
      const missedWeek = weekKeyForDate(missedDate);

      if (!stats.freezeWeeks[missedWeek]) {
        stats.freezeWeeks[missedWeek] = true;
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }
    } else {
      stats.currentStreak = 1;
    }
  }

  stats.lastAnalysisDate = todayKey;
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
}

function gameAccuracy(report: Pick<AnalysisRun, "accuracyBlack" | "accuracyWhite">) {
  return Math.round((report.accuracyWhite + report.accuracyBlack) / 2);
}

function countMoves(report: AnalysisRun, grade: MoveEvaluation["grade"]) {
  return report.moveEvaluations.filter((move) => move.grade === grade).length;
}

function averageCaps(moves: MoveEvaluation[]) {
  return average(moves.map((move) => move.caps));
}

function comebackDetected(report: AnalysisRun) {
  const winner = report.result === "1-0" ? "white" : report.result === "0-1" ? "black" : null;

  if (!winner) {
    return false;
  }

  return report.moveEvaluations.some((move) => {
    const scoreForWinner = winner === "white" ? move.score : -move.score;
    return scoreForWinner <= -500;
  });
}

function conditionIdsForAnalysis(report: AnalysisRun, stats: KnightowlStats, elapsedMs?: number) {
  const ids = new Set<string>();
  const accuracy = gameAccuracy(report);
  const blunders = countMoves(report, "Blunder");
  const mistakes = countMoves(report, "Mistake");
  const openingMoves = report.moveEvaluations.filter((move) => move.phase === "opening");
  const endgameMoves = report.moveEvaluations.filter((move) => move.phase === "endgame");
  const todayKey = toLocalDateKey();
  const openingKey = `${report.opening.eco}:${report.opening.name}`;

  if (stats.totalGames >= 1) ids.add("first_analysis");
  if (stats.totalGames >= 5) ids.add("games_5");
  if (stats.totalGames >= 10) ids.add("games_10");
  if (stats.totalGames >= 100) ids.add("games_100");
  if (accuracy >= 90) ids.add("accuracy_90");
  if (accuracy >= 95) ids.add("accuracy_95");
  if (blunders === 0) ids.add("no_blunders");
  if (blunders === 0 && mistakes === 0) ids.add("no_mistakes");
  if (stats.currentStreak >= 7) ids.add("streak_7");
  if (stats.currentStreak >= 30) ids.add("streak_30");
  if (stats.currentStreak >= 100) ids.add("streak_100");
  if (countMoves(report, "Brilliant") > 0) ids.add("brilliant_move");
  if (comebackDetected(report)) ids.add("comeback");
  if (typeof elapsedMs === "number" && elapsedMs > 0 && elapsedMs < 3000) ids.add("speedrunner");
  if ((stats.openings[openingKey]?.count ?? 0) >= 10) ids.add("opening_expert");
  if (openingMoves.length >= 4 && openingMoves.every((move) => move.cpLoss <= 5 || move.grade === "Book")) ids.add("perfect_opening");
  if (endgameMoves.length >= 4 && averageCaps(endgameMoves) >= 95) ids.add("endgame_master");
  if ((stats.gamesByDate[todayKey] ?? 0) >= 2) ids.add("daily_double");

  return ids;
}

function unlockBadgeIds(candidateIds: Iterable<string>) {
  const unlockedIds = new Set(readUnlockedBadgeIds());
  const newlyUnlocked: Badge[] = [];

  for (const id of candidateIds) {
    if (unlockedIds.has(id)) {
      continue;
    }

    const badge = getBadgeById(id);

    if (!badge) {
      continue;
    }

    unlockedIds.add(id);
    newlyUnlocked.push(badge);
  }

  writeJson(badgesKey, [...unlockedIds]);

  if (newlyUnlocked.length > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("knightowl:badges-unlocked", { detail: { badges: newlyUnlocked } }));
    window.dispatchEvent(new Event("knightowl:stats-updated"));
  }

  return newlyUnlocked;
}

export function recordAnalysisAndCheckBadges(report: AnalysisRun, elapsedMs?: number) {
  const stats = readGamificationStats();
  const alreadyRecorded = stats.analysisIds.includes(report.id);
  const todayKey = toLocalDateKey();
  const accuracy = gameAccuracy(report);

  if (!alreadyRecorded) {
    const openingKey = `${report.opening.eco}:${report.opening.name}`;
    const openingStat = stats.openings[openingKey] ?? {
      count: 0,
      eco: report.opening.eco,
      name: report.opening.name,
      totalAccuracy: 0,
    };
    const dailyAccuracy = stats.accuracyByDate[todayKey] ?? { count: 0, total: 0 };

    stats.analysisIds = [...stats.analysisIds, report.id].slice(-maxStoredAnalyses);
    stats.totalGames += 1;
    stats.totalAccuracy += accuracy;
    stats.gamesByDate[todayKey] = (stats.gamesByDate[todayKey] ?? 0) + 1;
    stats.accuracyByDate[todayKey] = {
      count: dailyAccuracy.count + 1,
      total: dailyAccuracy.total + accuracy,
    };
    stats.openings[openingKey] = {
      ...openingStat,
      count: openingStat.count + 1,
      totalAccuracy: openingStat.totalAccuracy + accuracy,
    };
    stats.analyses = [
      ...stats.analyses,
      {
        accuracy,
        blunders: countMoves(report, "Blunder"),
        brilliants: countMoves(report, "Brilliant"),
        date: todayKey,
        elapsedMs,
        id: report.id,
        openingEco: report.opening.eco,
        openingName: report.opening.name,
      },
    ].slice(-maxStoredAnalyses);

    updateStreak(stats, todayKey);
    writeJson(statsKey, stats);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("knightowl:stats-updated"));
    }
  }

  return unlockBadgeIds(conditionIdsForAnalysis(report, stats, elapsedMs));
}

export function recordShareAndCheckBadges() {
  const stats = readGamificationStats();
  stats.shareCount += 1;
  writeJson(statsKey, stats);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("knightowl:stats-updated"));
  }
  return unlockBadgeIds(["share"]);
}

export function recordCoachUseAndCheckBadges() {
  const stats = readGamificationStats();
  stats.coachUses += 1;
  writeJson(statsKey, stats);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("knightowl:stats-updated"));
  }
  return unlockBadgeIds(["coach"]);
}
