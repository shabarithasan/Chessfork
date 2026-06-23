import type { AnalysisRun } from "@/types/platform";

export type PlayerSide = "white" | "black";

export function oppositeSide(side: PlayerSide): PlayerSide {
  return side === "white" ? "black" : "white";
}

export function normalizePlayerName(name?: string) {
  return (name ?? "").trim().toLowerCase();
}

export function sideForPlayerName(params: {
  black: string;
  subject?: string;
  white: string;
}): PlayerSide | undefined {
  const subject = normalizePlayerName(params.subject);

  if (!subject) {
    return undefined;
  }

  if (normalizePlayerName(params.white) === subject) {
    return "white";
  }

  if (normalizePlayerName(params.black) === subject) {
    return "black";
  }

  return undefined;
}

export function nameForSide(run: Pick<AnalysisRun, "black" | "white">, side: PlayerSide) {
  return side === "white" ? run.white : run.black;
}

export function accuracyForSide(run: Pick<AnalysisRun, "accuracyBlack" | "accuracyWhite">, side: PlayerSide) {
  return side === "white" ? run.accuracyWhite : run.accuracyBlack;
}

export function scoreForSide(score: number, side: PlayerSide) {
  return side === "white" ? score : -score;
}

export function resolveReviewSide(run: AnalysisRun): PlayerSide {
  if (run.subjectColor === "white" || run.subjectColor === "black") {
    return run.subjectColor;
  }

  const sideFromSubject = sideForPlayerName({
    black: run.black,
    subject: run.subject,
    white: run.white,
  });

  if (sideFromSubject) {
    return sideFromSubject;
  }

  const firstCriticalMove = run.criticalMoments[0]
    ? run.moveEvaluations.find((move) => move.ply === run.criticalMoments[0]?.ply)
    : undefined;

  return firstCriticalMove?.side ?? "white";
}
