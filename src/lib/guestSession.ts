import type { AnalysisRun, SourceType } from "@/types/platform";

export type GuestPromptId = "analysis-history" | "coach" | "streak-sync";

export type GuestAnalysisSummary = {
  accuracyBlack: number;
  accuracyWhite: number;
  black: string;
  createdAt: string;
  depth: AnalysisRun["depth"];
  guestId: string;
  id: string;
  moveCount: number;
  openingEco: string;
  openingName: string;
  playedAt: string;
  result: string;
  shareUrl: string;
  source: SourceType;
  timeControl: string;
  title: string;
  white: string;
};

export type GuestUpgradePayload = {
  analysisIds: string[];
  badges: unknown;
  guestId: string;
  savedGameCount: number;
  stats: unknown;
};

const guestIdKey = "knightowl_guest_id";
const guestAnalysesKey = "knightowl_guest_analyses";
const promptDismissedPrefix = "knightowl_guest_prompt_dismissed_";
const guestMergeCompleteKey = "knightowl_guest_merge_complete";
const maxGuestAnalyses = 10;

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
    // Local storage is best-effort for guests.
  }
}

function randomGuestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function emitGuestUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("knightowl:guest-updated"));
  }
}

export function readGuestId() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(guestIdKey);
}

export function getOrCreateGuestId() {
  if (!canUseStorage()) {
    return "guest-server-placeholder";
  }

  const existing = window.localStorage.getItem(guestIdKey);
  if (existing) {
    return existing;
  }

  const guestId = randomGuestId();
  window.localStorage.setItem(guestIdKey, guestId);
  return guestId;
}

export function readGuestAnalyses() {
  return readJson<GuestAnalysisSummary[]>(guestAnalysesKey, []);
}

export function saveGuestAnalysis(run: AnalysisRun) {
  const guestId = getOrCreateGuestId();
  const summary: GuestAnalysisSummary = {
    accuracyBlack: run.accuracyBlack,
    accuracyWhite: run.accuracyWhite,
    black: run.black,
    createdAt: run.createdAt,
    depth: run.depth,
    guestId,
    id: run.id,
    moveCount: run.moveCount,
    openingEco: run.opening.eco,
    openingName: run.opening.name,
    playedAt: run.playedAt,
    result: run.result,
    shareUrl: `/analysis/${run.id}`,
    source: run.source,
    timeControl: run.timeControl,
    title: run.title,
    white: run.white,
  };
  const existing = readGuestAnalyses().filter((analysis) => analysis.id !== run.id);
  const nextAnalyses = [summary, ...existing].slice(0, maxGuestAnalyses);
  writeJson(guestAnalysesKey, nextAnalyses);
  emitGuestUpdate();
  return nextAnalyses;
}

export function guestAnalysisCount() {
  return readGuestAnalyses().length;
}

export function isGuestPromptDismissed(promptId: GuestPromptId) {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(`${promptDismissedPrefix}${promptId}`) === "true";
}

export function dismissGuestPrompt(promptId: GuestPromptId) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(`${promptDismissedPrefix}${promptId}`, "true");
  emitGuestUpdate();
}

export function buildGuestUpgradePayload(): GuestUpgradePayload {
  const analyses = readGuestAnalyses();

  return {
    analysisIds: analyses.map((analysis) => analysis.id),
    badges: readJson("knightowl_badges", []),
    guestId: getOrCreateGuestId(),
    savedGameCount: analyses.length,
    stats: readJson("knightowl_stats", null),
  };
}

export function buildGuestUpgradePayloadValue() {
  return JSON.stringify(buildGuestUpgradePayload());
}

export function markGuestMergeComplete(savedGameCount: number) {
  writeJson(guestMergeCompleteKey, {
    at: new Date().toISOString(),
    savedGameCount,
  });
}
