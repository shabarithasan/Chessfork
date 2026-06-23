import { formatOpeningName } from "@/lib/chess/openings";
import { accuracyForSide, type PlayerSide } from "@/lib/chess/perspective";
import { normalizeOpeningText, type SeoOpening } from "@/data/openings";
import type { AnalysisRun, MoveEvaluation } from "@/types/platform";

export function averageGameAccuracy(run: Pick<AnalysisRun, "accuracyBlack" | "accuracyWhite">) {
  return Math.round((run.accuracyWhite + run.accuracyBlack) / 2);
}

export function seoSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function displayNameFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function openingMatchesRun(opening: SeoOpening, run: Pick<AnalysisRun, "opening">) {
  const runOpeningName = normalizeOpeningText(formatOpeningName(run.opening));
  const knownOpeningName = normalizeOpeningText(opening.name);

  return run.opening.eco.toUpperCase() === opening.eco || runOpeningName.includes(knownOpeningName);
}

export function getOpeningRuns(opening: SeoOpening, runs: AnalysisRun[]) {
  return runs.filter((run) => openingMatchesRun(opening, run));
}

export function averageAccuracyForRuns(runs: AnalysisRun[]) {
  if (runs.length === 0) {
    return 0;
  }

  return Math.round(runs.reduce((total, run) => total + averageGameAccuracy(run), 0) / runs.length);
}

export function sideForPlayer(run: Pick<AnalysisRun, "black" | "subject" | "subjectColor" | "white">, username: string): PlayerSide | null {
  const slug = seoSlug(username);

  if (run.subject && seoSlug(run.subject) === slug && run.subjectColor) {
    return run.subjectColor;
  }

  if (seoSlug(run.white) === slug) {
    return "white";
  }

  if (seoSlug(run.black) === slug) {
    return "black";
  }

  return null;
}

export function getPlayerRuns(username: string, runs: AnalysisRun[]) {
  return runs.filter((run) => sideForPlayer(run, username));
}

export function publicPlayerEntriesFromAnalyses(runs: AnalysisRun[]) {
  const players = new Map<string, string>();

  for (const run of runs) {
    for (const name of [run.subject, run.white, run.black]) {
      if (!name) {
        continue;
      }

      const slug = seoSlug(name);
      if (slug) {
        players.set(slug, name);
      }
    }
  }

  return [...players.entries()]
    .map(([slug, name]) => ({ name, slug }))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export function playerAccuracy(run: AnalysisRun, username: string) {
  const side = sideForPlayer(run, username);
  return side ? Math.round(accuracyForSide(run, side)) : averageGameAccuracy(run);
}

export function playerMoveIssues(run: AnalysisRun, username: string, grade: MoveEvaluation["grade"]) {
  const side = sideForPlayer(run, username);
  return run.moveEvaluations.filter((move) => move.grade === grade && (!side || move.side === side));
}

export function mostCommonBlunderType(runs: AnalysisRun[], username: string) {
  const phaseCounts = new Map<MoveEvaluation["phase"], number>();

  for (const run of runs) {
    for (const move of playerMoveIssues(run, username, "Blunder")) {
      phaseCounts.set(move.phase, (phaseCounts.get(move.phase) ?? 0) + 1);
    }
  }

  const [phase, count] = [...phaseCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

  if (!phase || !count) {
    return "No recurring blunder pattern yet";
  }

  return `${phase.charAt(0).toUpperCase()}${phase.slice(1)} blunders (${count})`;
}

export function bestOpeningForPlayer(runs: AnalysisRun[], username: string) {
  const groups = new Map<string, { accuracyTotal: number; count: number; eco: string; name: string }>();

  for (const run of runs) {
    const key = formatOpeningName(run.opening);
    const current = groups.get(key) ?? {
      accuracyTotal: 0,
      count: 0,
      eco: run.opening.eco,
      name: key,
    };

    current.accuracyTotal += playerAccuracy(run, username);
    current.count += 1;
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((opening) => ({
      ...opening,
      averageAccuracy: Math.round(opening.accuracyTotal / opening.count),
    }))
    .sort((left, right) => right.averageAccuracy - left.averageAccuracy || right.count - left.count)[0];
}
