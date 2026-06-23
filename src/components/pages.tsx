import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { AccountPage as AccountRoutePage } from "@/components/account/account-page";
import { AnalysisReportWorkbench } from "@/components/analysis/analysis-report-workbench";
import { ChessDnaCard, type ChessDnaProfile } from "@/components/analysis/chess-dna-card";
import { ChessBoard } from "@/components/analysis/chess-board";
import { ChessVillainCard, type ChessVillainProfile } from "@/components/analysis/chess-villain-card";
import { ImportWorkbench } from "@/components/analysis/import-workbench";
import { OpeningBossCard, type OpeningBossProfile } from "@/components/analysis/opening-boss-card";
import { PerfectChallengeCard, type PerfectChallengeProfile } from "@/components/analysis/perfect-challenge-card";
import { PositionWorkbench } from "@/components/analysis/position-workbench";
import { RoastCard, type RoastCardMoment } from "@/components/analysis/roast-card";
import { AuthPage as AuthRoutePage } from "@/components/auth/auth-page";
import { AiCoachWorkspace } from "@/components/coach/ai-coach-workspace";
import { FeaturesPage } from "@/components/features/features-page";
import { GuestAnalysisRecorder } from "@/components/guest/guest-analysis-recorder";
import { GuestGamesPage } from "@/components/guest/guest-games-page";
import { GuestUpgradePrompts } from "@/components/guest/guest-upgrade-prompts";
import { ProfilePage } from "@/components/profile/profile-page";
import { PerfectShareStudio } from "@/components/puzzles/perfect-share-studio";
import { PuzzleAttemptPanel } from "@/components/puzzles/puzzle-attempt-panel";
import {
  baseAnalysis,
  featuredBlogPosts,
  productStats,
  samplePuzzles,
  wrapped2025,
} from "@/data/sample-data";
import { buildAiCoachGamesFromAnalyses } from "@/lib/ai-coach";
import { formatOpeningName } from "@/lib/chess/openings";
import { openingPageSlugFor } from "@/data/openings";
import { nameForSide, oppositeSide, resolveReviewSide } from "@/lib/chess/perspective";
import { formatCpLossLabel } from "@/lib/chess/report-helpers";
import { localeLabels } from "@/lib/locales";
import { getBlogPostSummaries } from "@/lib/mdx";
import { getAnalysisResponse, getLeaderboard, getPuzzles, listAnalysisResponses } from "@/lib/platform-service";
import { cn, formatCp } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { pricingTiers } from "@/server/billing/stripe";
import { findCoachSnapshotById } from "@/server/repositories/coach-repository";
import { getAccountProfile } from "@/server/repositories/user-repository";
import type { AnalysisRun, BlogPostSummary, LeaderboardEntry, Locale, MoveEvaluation, MoveGrade, Puzzle } from "@/types/platform";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/70">{children}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{children}</h2>;
}

function SectionCopy({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300/90">{children}</p>;
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "premium-surface relative overflow-hidden rounded-lg border p-6",
        className,
      )}
    >
      <div className="premium-surface-shine pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

function AnalysisSummary({ analysis }: { analysis: AnalysisRun }) {
  const firstMoment = analysis.criticalMoments[0];
  const lastMove = analysis.moveEvaluations[analysis.moveEvaluations.length - 1];

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
      <ChessBoard fen={lastMove?.fenAfter ?? "8/8/8/8/8/8/8/8 w - - 0 1"} highlightSquares={["d6", "d7"]} />
      <div className="space-y-6">
        <SectionLabel>Saved report</SectionLabel>
        <SectionTitle>{analysis.title}</SectionTitle>
        <SectionCopy>{analysis.summary}</SectionCopy>
        <div className="grid gap-5 sm:grid-cols-3">
          <Surface>
            <p className="text-2xl font-semibold tracking-tight text-white">{Math.round(analysis.accuracyWhite)}%</p>
            <p className="mt-2 text-sm text-slate-400">White accuracy</p>
          </Surface>
          <Surface>
            <p className="text-2xl font-semibold tracking-tight text-white">{Math.round(analysis.accuracyBlack)}%</p>
            <p className="mt-2 text-sm text-slate-400">Black accuracy</p>
          </Surface>
          <Surface>
            <p className="text-2xl font-semibold tracking-tight text-white">{analysis.opening.eco}</p>
            <p className="mt-2 text-sm text-slate-400">{analysis.opening.name}</p>
          </Surface>
        </div>
        {firstMoment && (
          <Surface>
            <p className="text-sm font-semibold text-white">Critical moment: {firstMoment.san}</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">{firstMoment.insight}</p>
          </Surface>
        )}
      </div>
    </section>
  );
}

function LeaderboardTable({
  title,
  entries,
}: {
  title: string;
  entries: LeaderboardEntry[];
}) {
  function badgeTone(rank: number) {
    if (rank === 1) {
      return "border-amber-300/30 bg-amber-300/12 text-amber-100";
    }

    if (rank === 2) {
      return "border-slate-300/20 bg-slate-300/10 text-slate-100";
    }

    if (rank === 3) {
      return "border-orange-300/20 bg-orange-300/10 text-orange-100";
    }

    return "border-white/10 bg-white/5 text-slate-200";
  }

  return (
    <Surface>
      <p className="text-lg font-semibold text-white">{title}</p>
      <div className="mt-5 space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.player}
            className={cn(
              "grid gap-3 rounded-[1.4rem] border bg-slate-950/75 p-4 transition hover:border-white/20 hover:bg-slate-950/85 sm:grid-cols-[4rem_1fr_6rem]",
              entry.rank === 1 ? "border-amber-300/20" : "border-white/10",
            )}
          >
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-full border text-sm font-semibold",
                badgeTone(entry.rank),
              )}
            >
              #{entry.rank}
            </div>
            <div>
              <p className="font-medium text-slate-100">{entry.player}</p>
              <p className="text-sm text-slate-400">{entry.detail}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold text-amber-300">{entry.score}</p>
              <p className={`text-sm ${entry.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {entry.change >= 0 ? "+" : ""}
                {entry.change}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function formatSourceLabel(source: AnalysisRun["source"]) {
  if (source === "chesscom") return "Chess.com";
  if (source === "lichess") return "Lichess";
  return "PGN";
}

function describeResult(run: Pick<AnalysisRun, "result" | "white" | "black">) {
  if (run.result === "1-0") return `${run.white} won`;
  if (run.result === "0-1") return `${run.black} won`;
  return "Draw";
}

function averageAccuracy(run: Pick<AnalysisRun, "accuracyWhite" | "accuracyBlack">) {
  return Math.round((run.accuracyWhite + run.accuracyBlack) / 2);
}

function ReportTrend({ run }: { run: AnalysisRun }) {
  if (run.moveEvaluations.length === 0) {
    return null;
  }

  const interval = Math.max(1, Math.ceil(run.moveEvaluations.length / 18));
  const sample = run.moveEvaluations.filter((_, index) => index % interval === 0).slice(0, 18);

  return (
    <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Eval trace</p>
        <p className="text-xs text-slate-500">{sample.length} checkpoints</p>
      </div>
      <div className="mt-4 flex items-end gap-1.5">
        {sample.map((move) => {
          const clamped = Math.max(-200, Math.min(200, move.score));
          const height = 16 + Math.round((Math.abs(clamped) / 200) * 34);

          return (
            <div key={move.ply} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={`${move.san} / ${formatCp(move.score)} cp`}>
              <span
                className={cn(
                  "w-full rounded-full",
                  clamped >= 0 ? "bg-emerald-300/90" : "bg-rose-300/90",
                  move.cpLoss >= 90 ? "shadow-[0_0_0_3px_rgba(245,158,11,0.14)]" : undefined,
                )}
                style={{ height: `${height}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourcePill({ source }: { source: AnalysisRun["source"] }) {
  const tone =
    source === "chesscom"
      ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
      : source === "lichess"
        ? "border-sky-300/20 bg-sky-300/10 text-sky-200"
        : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${tone}`}>
      {formatSourceLabel(source)}
    </span>
  );
}

function ReportCard({ run }: { run: AnalysisRun }) {
  const leadMoment = run.criticalMoments[0];
  const moreHref = `/more?report=${encodeURIComponent(run.id)}`;

  return (
    <Surface className="h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SourcePill source={run.source} />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            {run.depth}
          </span>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{run.playedAt}</span>
      </div>

      <div className="mt-5">
        <p className="text-xl font-semibold text-white">
          {run.white} vs {run.black}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {run.title} / {run.opening.name}
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{run.summary}</p>
      </div>

      <ReportTrend run={run} />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/65 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Average accuracy</p>
          <p className="mt-2 text-2xl font-semibold text-white">{averageAccuracy(run)}%</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/65 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Opening</p>
          <p className="mt-2 text-lg font-semibold text-white">{run.opening.eco}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/65 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Critical moments</p>
          <p className="mt-2 text-2xl font-semibold text-white">{run.criticalMoments.length}</p>
        </div>
      </div>

      {leadMoment ? (
        <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Largest review point</p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              {leadMoment.san} / {formatCpLossLabel(leadMoment.cpLoss)}
            </p>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-300">{leadMoment.insight}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{describeResult(run)}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={moreHref} className="text-sm font-semibold text-slate-200 transition hover:text-white">
            More tools
          </Link>
          <Link href={`/analysis/${run.id}`} className="text-sm font-semibold text-amber-300 transition hover:text-amber-200">
            Open report
          </Link>
        </div>
      </div>
    </Surface>
  );
}

function getRoastMoment(run: AnalysisRun): RoastCardMoment | null {
  const candidate =
    [...run.moveEvaluations]
      .filter((move) => move.cpLoss > 0)
      .sort((left, right) => right.cpLoss - left.cpLoss)[0] ?? run.moveEvaluations[0];

  if (!candidate?.bestMove) {
    return null;
  }

  return {
    cpLoss: candidate.cpLoss,
    grade: candidate.grade,
    moveNumber: candidate.moveNumber,
    perfectMove: candidate.bestMove,
    problemMove: candidate.san,
    side: candidate.side,
  };
}

function getPerfectChallenge(runs: AnalysisRun[], playerName: string): PerfectChallengeProfile | null {
  const candidate = runs
    .flatMap((run) =>
      run.moveEvaluations
        .filter((move) => move.bestMove && move.cpLoss > 0)
        .map((move) => ({
          move,
          run,
          score:
            move.cpLoss +
            (move.grade === "Blunder" ? 180 : move.grade === "Mistake" ? 105 : move.grade === "Inaccuracy" ? 56 : 18) +
            (move.phase === "middlegame" ? 24 : move.phase === "endgame" ? 18 : 10),
        })),
    )
    .sort((left, right) => right.score - left.score)[0];

  if (!candidate) {
    return null;
  }

  const { move, run } = candidate;
  const difficulty = Math.min(
    99,
    Math.max(
      38,
      Math.round(
        34 +
          move.cpLoss / 8 +
          (move.grade === "Blunder" ? 18 : move.grade === "Mistake" ? 12 : move.grade === "Inaccuracy" ? 7 : 3) +
          (move.phase === "middlegame" ? 6 : move.phase === "endgame" ? 5 : 3),
      ),
    ),
  );

  return {
    challengeId: `PC-${move.moveNumber}${move.side === "white" ? "W" : "B"}-${difficulty}`,
    difficulty,
    fen: move.fenBefore,
    from: move.from,
    moveNumber: move.moveNumber,
    opening: `${run.opening.eco} / ${formatOpeningName(run.opening)}`,
    perfectMove: move.bestMove,
    playedMove: move.san,
    playerName,
    side: move.side,
    stakes: `${formatCpLossLabel(move.cpLoss)} in the ${move.phase}.`,
    to: move.to,
  };
}

function getOpeningBossName(opening: string) {
  const normalizedOpening = opening.toLowerCase();

  if (normalizedOpening.includes("sicilian")) return "Sicilian Counterpunch";
  if (normalizedOpening.includes("ruy lopez")) return "Ruy Lopez Gatekeeper";
  if (normalizedOpening.includes("king's indian") || normalizedOpening.includes("kings indian")) return "King's Indian Storm";
  if (normalizedOpening.includes("queen's gambit")) return "Queen's Gambit Lock";
  if (normalizedOpening.includes("petrov")) return "Petrov Mirror";

  return `${opening.split("/")[0]?.trim() || "Opening"} Gatekeeper`;
}

function getOpeningBoss(runs: AnalysisRun[], playerName: string): OpeningBossProfile | null {
  const buckets = new Map<
    string,
    {
      moves: MoveEvaluation[];
      opening: string;
      runs: AnalysisRun[];
      score: number;
    }
  >();

  for (const run of runs) {
    const opening = `${run.opening.eco} / ${formatOpeningName(run.opening)}`;
    const current = buckets.get(opening) ?? {
      moves: [],
      opening,
      runs: [],
      score: 0,
    };
    const openingDamage = run.moveEvaluations
      .filter((move) => move.phase === "opening" || move.cpLoss >= 40 || problemMoveGrades.has(move.grade))
      .reduce(
        (total, move) =>
          total +
          move.cpLoss +
          (move.grade === "Blunder" ? 120 : move.grade === "Mistake" ? 72 : move.grade === "Inaccuracy" ? 36 : 8) +
          (move.phase === "opening" ? 28 : 0),
        0,
      );

    buckets.set(opening, {
      moves: [...current.moves, ...run.moveEvaluations],
      opening,
      runs: [...current.runs, run],
      score: current.score + openingDamage,
    });
  }

  const bucket = [...buckets.values()].sort((left, right) => right.score - left.score)[0];

  if (!bucket || bucket.moves.length === 0) {
    return null;
  }

  const problemMoves = bucket.moves.filter((move) => move.bestMove && (move.cpLoss >= 40 || problemMoveGrades.has(move.grade)));
  const worstMove = [...problemMoves].sort((left, right) => right.cpLoss - left.cpLoss)[0] ?? bucket.moves[0];
  const openingMoves = bucket.moves.filter((move) => move.phase === "opening");
  const problemRate = percent(problemMoves.length, bucket.moves.length);
  const openingLoss = averageCpLossFor(openingMoves);
  const health = Math.max(
    42,
    Math.min(
      99,
      Math.round(
        44 +
          bucket.score / Math.max(1, bucket.moves.length * 9) +
          problemRate * 0.32 +
          openingLoss / 6 +
          bucket.runs.length * 2,
      ),
    ),
  );
  const captureProblems = problemMoves.filter((move) => move.isCapture).length;
  const checkProblems = problemMoves.filter((move) => move.isCheck).length;
  const openingProblems = problemMoves.filter((move) => move.phase === "opening").length;
  const weakness =
    openingProblems >= Math.max(captureProblems, checkProblems)
      ? "The first phase is taking too much damage before the plan is clear."
      : captureProblems >= checkProblems
        ? "The boss punishes automatic captures and loose material grabs."
        : "Forcing moves are arriving before the escape squares are fully checked.";
  const bestMove = worstMove.bestMove || "the engine move";
  const weapon = `Your cleanest weapon is ${bestMove} instead of ${worstMove.san} on move ${worstMove.moveNumber}.`;

  return {
    bossName: getOpeningBossName(bucket.opening),
    health,
    opening: bucket.opening,
    playerName,
    proof: `${bucket.runs.length} report${bucket.runs.length === 1 ? "" : "s"}, ${problemMoves.length} flagged opening-family moment${
      problemMoves.length === 1 ? "" : "s"
    }, worst hit ${formatCpLossLabel(worstMove.cpLoss)}.`,
    quests: [
      {
        label: "First ten audit",
        reward: Math.min(34, Math.max(18, Math.round(16 + openingLoss / 12))),
        target: "Check king safety, center, loose pieces, and the candidate move.",
      },
      {
        label: "Perfect rematch",
        reward: Math.min(38, Math.max(22, Math.round(20 + worstMove.cpLoss / 32))),
        target: `Replay move ${worstMove.moveNumber} until ${bestMove} is instant.`,
      },
      {
        label: "Pattern lock",
        reward: Math.min(30, Math.max(16, Math.round(14 + problemRate / 4))),
        target: "Turn the same weakness into a three-position Perfects pack.",
      },
    ],
    weakness,
    weapon,
  };
}

type VillainKey =
  | "checkAddiction"
  | "conversionTax"
  | "greedyCapture"
  | "openingShortcut"
  | "panicButton"
  | "quietDrift"
  | "tacticsFog";

const villainDefinitions: Record<
  VillainKey,
  {
    antidote: string;
    name: string;
    weakness: string;
  }
> = {
  checkAddiction: {
    antidote: "Before giving check, compare it with the quiet engine move. The perfect habit is asking what changes after the opponent escapes.",
    name: "The Check Addiction",
    weakness: "Checks are showing up before the position is ready, which can turn forcing energy into loose calculation.",
  },
  conversionTax: {
    antidote: "Train conversion Perfects: simplify only after naming the opponent's counterplay and your cleanest engine move.",
    name: "The Conversion Tax Collector",
    weakness: "Winning or stable endgames are leaking value because the clean continuation gets traded for drift.",
  },
  greedyCapture: {
    antidote: "Pause on every capture and ask what your opponent wins back. The antidote is capture discipline, not capture avoidance.",
    name: "The Greedy Capture",
    weakness: "Material grabs are costing more than they earn, especially when the perfect move keeps control instead.",
  },
  openingShortcut: {
    antidote: "Run a five-move opening check: king safety, center, loose pieces, then the candidate move. No shortcut gets played without passing it.",
    name: "The Opening Shortcut",
    weakness: "The early game is trying to skip development logic, and the report is charging interest immediately.",
  },
  panicButton: {
    antidote: "When the position feels urgent, list two candidate moves before touching the board. Panic hates comparison.",
    name: "The Panic Button",
    weakness: "The biggest swings are coming from urgent-looking moves that needed one more candidate.",
  },
  quietDrift: {
    antidote: "Use a quiet-move checklist: worst piece, opponent threat, improving move. The perfect move usually has a job.",
    name: "The Slow Drift",
    weakness: "The position is not exploding at once, but small unforced choices are handing away the thread.",
  },
  tacticsFog: {
    antidote: "Train forcing-move Perfects: checks, captures, threats, then compare with the engine's cleanest reply.",
    name: "The Tactics Fog Machine",
    weakness: "Middlegame tactics are getting blurry right when the position asks for concrete calculation.",
  },
};

function classifyVillainMove(move: MoveEvaluation): VillainKey {
  if (move.phase === "opening") return "openingShortcut";
  if (move.isCapture) return "greedyCapture";
  if (move.isCheck) return "checkAddiction";
  if (move.phase === "endgame") return "conversionTax";
  if (move.grade === "Blunder") return "panicButton";
  if (move.phase === "middlegame") return "tacticsFog";
  return "quietDrift";
}

function getChessVillain(runs: AnalysisRun[]): ChessVillainProfile | null {
  const problemMoves = runs
    .flatMap((run) => run.moveEvaluations)
    .filter((move) => move.bestMove && (move.cpLoss >= 40 || move.grade === "Blunder" || move.grade === "Mistake" || move.grade === "Inaccuracy"));

  if (problemMoves.length === 0) {
    return null;
  }

  const scores = new Map<VillainKey, { count: number; score: number; worst: MoveEvaluation }>();

  for (const move of problemMoves) {
    const key = classifyVillainMove(move);
    const existing = scores.get(key);
    const gradeWeight = move.grade === "Blunder" ? 90 : move.grade === "Mistake" ? 55 : move.grade === "Inaccuracy" ? 28 : 12;
    const score = Math.max(12, move.cpLoss) + gradeWeight;

    if (!existing) {
      scores.set(key, {
        count: 1,
        score,
        worst: move,
      });
      continue;
    }

    scores.set(key, {
      count: existing.count + 1,
      score: existing.score + score,
      worst: move.cpLoss > existing.worst.cpLoss ? move : existing.worst,
    });
  }

  const [key, entry] = [...scores.entries()].sort((left, right) => right[1].score - left[1].score)[0] ?? [];
  if (!key || !entry) {
    return null;
  }

  const definition = villainDefinitions[key];
  const heat = Math.min(100, Math.max(35, Math.round(34 + entry.score / Math.max(1, problemMoves.length * 2.4))));
  const moveLabel = `Move ${entry.worst.moveNumber}: ${entry.worst.san}`;

  return {
    antidote: definition.antidote,
    heat,
    name: definition.name,
    perfectMove: entry.worst.bestMove,
    problemMove: entry.worst.san,
    proof: `${entry.count} flagged moment${entry.count === 1 ? "" : "s"} in this pattern. ${moveLabel} lost ${formatCpLossLabel(entry.worst.cpLoss)}.`,
    weakness: definition.weakness,
  };
}

type DnaTraitKey = "attack" | "conversion" | "discipline" | "nerves" | "opening" | "tactics";

const cleanMoveGrades = new Set<MoveGrade>(["Brilliant", "Great", "Best", "Excellent", "Good", "Book"]);
const problemMoveGrades = new Set<MoveGrade>(["Inaccuracy", "Mistake", "Blunder"]);

const dnaTraitDefinitions: Record<
  DnaTraitKey,
  {
    code: string;
    description: string;
    label: string;
    quest: string;
  }
> = {
  attack: {
    code: "ATK",
    description: "Checks, captures, and forcing chances that keep pressure on the board.",
    label: "Attack",
    quest: "Play a forcing-move ladder: checks, captures, threats, then compare the quiet engine move.",
  },
  conversion: {
    code: "CLS",
    description: "How cleanly winning or simplified positions stay under control.",
    label: "Conversion",
    quest: "Train three winning-position Perfects before your next session.",
  },
  discipline: {
    code: "DSC",
    description: "Low-drama move quality across the whole report.",
    label: "Discipline",
    quest: "Use one full candidate-move pause before every committal capture.",
  },
  nerves: {
    code: "NRV",
    description: "How calmly the game avoids the biggest one-move swings.",
    label: "Nerves",
    quest: "Before urgent moves, name two legal alternatives and the opponent's best reply.",
  },
  opening: {
    code: "OPN",
    description: "Early-game cleanliness before the position becomes tactical.",
    label: "Opening",
    quest: "Run the first ten moves through king safety, center, loose pieces, then plan.",
  },
  tactics: {
    code: "TAC",
    description: "Accuracy when calculation, captures, and checks become concrete.",
    label: "Tactics",
    quest: "Solve one mini-set from the exact pattern behind your latest villain card.",
  },
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percent(count: number, total: number) {
  return total > 0 ? (count / total) * 100 : 0;
}

function averageCpLossFor(moves: MoveEvaluation[]) {
  if (moves.length === 0) {
    return 0;
  }

  return moves.reduce((total, move) => total + move.cpLoss, 0) / moves.length;
}

function scoreFromAverageLoss(moves: MoveEvaluation[], penaltyScale: number, fallback: number) {
  if (moves.length === 0) {
    return fallback;
  }

  return clampPercent(100 - averageCpLossFor(moves) / penaltyScale);
}

function getSignatureOpening(runs: AnalysisRun[]) {
  const openings = new Map<string, { count: number; label: string }>();

  for (const run of runs) {
    const label = `${run.opening.eco} / ${formatOpeningName(run.opening)}`;
    const existing = openings.get(label);
    openings.set(label, { count: (existing?.count ?? 0) + 1, label });
  }

  return [...openings.values()].sort((left, right) => right.count - left.count)[0]?.label ?? "Mixed openings";
}

function getChessDnaArchetype(topKeys: DnaTraitKey[]) {
  const has = (key: DnaTraitKey) => topKeys.includes(key);

  if (has("attack") && has("tactics")) return "Pressure Artist";
  if (has("conversion") && has("nerves")) return "Ice Closer";
  if (has("opening") && has("discipline")) return "Theory Pilot";
  if (has("discipline") && has("nerves")) return "Calm Technician";
  if (has("tactics")) return "Tactical Spark";
  if (has("attack")) return "Initiative Hunter";
  if (has("conversion")) return "Endgame Closer";
  return "Balanced Climber";
}

function getChessDnaProfile(runs: AnalysisRun[], playerName: string): ChessDnaProfile | null {
  const moves = runs.flatMap((run) => run.moveEvaluations);

  if (moves.length === 0) {
    return null;
  }

  const tacticalMoves = moves.filter((move) => move.isCapture || move.isCheck);
  const openingMoves = moves.filter((move) => move.phase === "opening");
  const endgameMoves = moves.filter((move) => move.phase === "endgame");
  const criticalMoves = moves.filter((move) => problemMoveGrades.has(move.grade) || move.cpLoss >= 80);
  const blunders = moves.filter((move) => move.grade === "Blunder");
  const cleanMoves = moves.filter((move) => cleanMoveGrades.has(move.grade));
  const cleanTacticalMoves = tacticalMoves.filter((move) => cleanMoveGrades.has(move.grade) || move.cpLoss < 80);
  const averageRunAccuracy =
    runs.length > 0 ? runs.reduce((total, run) => total + averageAccuracy(run), 0) / runs.length : scoreFromAverageLoss(moves, 4.2, 72);
  const cleanMoveRate = percent(cleanMoves.length, moves.length);
  const tacticalShare = percent(tacticalMoves.length, moves.length);
  const checkShare = percent(moves.filter((move) => move.isCheck).length, moves.length);
  const criticalRate = percent(criticalMoves.length, moves.length);
  const blunderRate = percent(blunders.length, moves.length);
  const averageCriticalLoss = averageCpLossFor(criticalMoves);

  const traitScores: Record<DnaTraitKey, number> = {
    attack: clampPercent(40 + tacticalShare * 0.5 + checkShare * 0.65 + percent(cleanTacticalMoves.length, tacticalMoves.length) * 0.18),
    conversion: scoreFromAverageLoss(endgameMoves, 3.6, scoreFromAverageLoss(moves, 4.2, 72)),
    discipline: clampPercent(averageRunAccuracy * 0.58 + cleanMoveRate * 0.3 + (100 - criticalRate) * 0.12 - blunderRate * 0.45),
    nerves: clampPercent(averageRunAccuracy * 0.32 + (100 - blunderRate) * 0.48 + Math.max(0, 100 - averageCriticalLoss / 3.2) * 0.2),
    opening: scoreFromAverageLoss(openingMoves, 3.2, averageRunAccuracy),
    tactics: clampPercent(
      percent(cleanTacticalMoves.length, tacticalMoves.length) * 0.62 + scoreFromAverageLoss(tacticalMoves, 4, averageRunAccuracy) * 0.38,
    ),
  };

  const traits = (Object.entries(traitScores) as Array<[DnaTraitKey, number]>)
    .map(([key, score]) => ({
      description: dnaTraitDefinitions[key].description,
      key,
      label: dnaTraitDefinitions[key].label,
      score,
    }))
    .sort((left, right) => right.score - left.score);

  const topKeys = traits.slice(0, 2).map((trait) => trait.key as DnaTraitKey);
  const archetype = getChessDnaArchetype(topKeys);
  const lowestTrait = traits.at(-1);
  const topTrait = traits[0];
  const secondTrait = traits[1] ?? topTrait;
  const signature = getSignatureOpening(runs);
  const code = `${dnaTraitDefinitions[topTrait.key as DnaTraitKey].code}${topTrait.score}-${dnaTraitDefinitions[secondTrait.key as DnaTraitKey].code}${secondTrait.score}`;

  return {
    archetype,
    code,
    headline: `${playerName} plays like a ${archetype.toLowerCase()}: ${topTrait.label.toLowerCase()} leads the profile, with ${secondTrait.label.toLowerCase()} close behind.`,
    nextQuest: lowestTrait ? dnaTraitDefinitions[lowestTrait.key as DnaTraitKey].quest : "Review one Perfect and turn it into a share card.",
    playerName,
    proof: `${runs.length} report${runs.length === 1 ? "" : "s"}, ${moves.length} evaluated moves, ${criticalMoves.length} flagged swing${
      criticalMoves.length === 1 ? "" : "s"
    }.`,
    signature,
    traits,
  };
}

function totalTrainingMinutes(tasks: Array<{ durationMinutes: number }>) {
  return tasks.reduce((total, task) => total + task.durationMinutes, 0);
}

function formatIsoDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCompactDateParts(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      monthDay: value,
      year: "",
    };
  }

  return {
    monthDay: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(parsed),
    year: new Intl.DateTimeFormat("en-US", {
      year: "numeric",
    }).format(parsed),
  };
}

function formatTimeControlLabel(value: string) {
  const match = /^(\d+)(?:\+(\d+))?$/.exec(value);
  if (!match) {
    return value;
  }

  const initialSeconds = Number(match[1]);
  const incrementSeconds = Number(match[2] ?? 0);
  const initialMinutes = Math.max(1, Math.round(initialSeconds / 60));

  return incrementSeconds > 0 ? `${initialMinutes}+${incrementSeconds}` : `${initialMinutes} min`;
}

function formatResultLabel(result: string) {
  if (result === "1-0") {
    return "White won";
  }

  if (result === "0-1") {
    return "Black won";
  }

  return "Draw";
}

function compactBreadcrumbName(name: string) {
  const trimmed = name.trim();

  if (trimmed.length <= 15) {
    return trimmed;
  }

  const boundaries = [" ", "-", "_"]
    .map((boundary) => trimmed.lastIndexOf(boundary, 15))
    .filter((index) => index > 0);
  const boundaryIndex = Math.max(...boundaries, -1);

  if (boundaryIndex >= 6) {
    return `${trimmed.slice(0, boundaryIndex)}...`;
  }

  return `${trimmed.slice(0, 15)}...`;
}

function getDailyPuzzle(puzzles: Puzzle[]) {
  const puzzlePool = puzzles.length > 0 ? puzzles : samplePuzzles;
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split("-").reduce((total, part) => total + Number(part), 0);
  return puzzlePool[seed % puzzlePool.length] ?? puzzlePool[0];
}

function slugForPlayerName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "player"
  );
}

function profileNameMatches(run: AnalysisRun, slug: string) {
  const candidates = [run.subject, run.white, run.black].filter((name): name is string => Boolean(name));
  return candidates.some((name) => slugForPlayerName(name) === slug);
}

const homeProofCards = [
  {
    title: "Saved reports, not throwaway review screens",
    copy: "Every import lands on a stable page you can revisit, share, and use again for training.",
  },
  {
    title: "Fast first pass, deeper only when needed",
    copy: "Quick analysis returns immediately while deeper work can queue in the background without blocking the main flow.",
  },
  {
    title: "Problems become perfects",
    copy: "Critical moments turn into a compact loop: problem move, perfect move, proof pattern, and the next drill.",
  },
  {
    title: "Fits the habits you already have",
    copy: "PGN paste, Chess.com imports, and Lichess imports all use the same clean path into the product.",
  },
];

const homeWorkflow = [
  {
    step: "01",
    title: "Bring in the game you actually want to understand.",
    copy: "Paste the PGN or fetch the latest public game from the account you already use.",
  },
  {
    step: "02",
    title: "See the turning points without digging through noise.",
    copy: "Accuracy, critical moments, and opening context land on one report page that stays useful later.",
  },
  {
    step: "03",
    title: "Turn the miss into a perfect-move card.",
    copy: "The same evidence can power your next Perfects session, your coach snapshot, and your daily work blocks.",
  },
];

const pricingTierFeatures: Record<string, string[]> = {
  Free: ["Quick report generation", "Public daily challenge", "Starter Perfects queue"],
  Pro: ["Saved report library", "Deep analysis queue", "Unlimited report-linked Perfects"],
  Coach: ["AI coach snapshots", "Shareable training reports", "Coach collaboration workflows"],
};

const pricingProofNotes = [
  "No ads on analysis surfaces",
  "Free tier stays genuinely useful",
  "Paid depth unlocks report compounding, not clutter",
];

export function HomePage({ locale = "en" as Locale }) {
  const lastMove = baseAnalysis.moveEvaluations.at(-1);

  return (
    <section className="mx-auto w-full max-w-[1500px] py-6 lg:py-10">
      <div className="grid gap-8 2xl:grid-cols-[220px_minmax(0,1fr)_220px]">
        <div className="hidden 2xl:flex 2xl:flex-col 2xl:gap-4">
          <Surface className="h-full bg-[linear-gradient(180deg,rgba(9,12,25,0.95),rgba(13,15,19,0.98))]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Live focus</p>
            <p className="mt-3 text-3xl font-semibold text-white">Import first. Study second.</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Fetch public games, save the report, and come back later without losing the context that made the game worth reviewing.
            </p>
            <div className="mt-6 space-y-3">
              {homeProofCards.slice(0, 2).map((card) => (
                <div key={card.title} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-semibold text-white">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.copy}</p>
                </div>
              ))}
            </div>
          </Surface>
        </div>

        <div className="space-y-10">
          <div className="grid gap-6 lg:grid-cols-2">
            <Surface className="bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(36,31,27,0.94)_36%,rgba(22,19,17,0.98))]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/90">Coach-ready surface</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">Your AI chess coach is here.</p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {localeLabels[locale]} Import one real game, keep the report, and let the coach layer build from the exact mistakes
                you already made.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                  $14 / month
                </span>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                  175 spots left
                </span>
              </div>
              <Link
                href="/coach"
                className="mt-8 inline-flex rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-amber-200 hover:shadow-lg hover:shadow-amber-300/20"
              >
                Try coach
              </Link>
            </Surface>

            <Surface className="bg-slate-950/45">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Review flow</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">Fetch recent games. Keep the report. Reopen it later.</p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The UI should feel like a real product dashboard from the first click, not a long landing page that happens to have a
                form on it.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Average accuracy", value: `${averageAccuracy(baseAnalysis)}%` },
                  { label: "Opening", value: baseAnalysis.opening.eco },
                  { label: "Saved reports", value: productStats[2]?.value ?? "1 click" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </Surface>
          </div>

          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-3xl">
                <SectionLabel>Import recent games</SectionLabel>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Start with the games you already played.
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  Use Chess.com, Lichess, or PGN and keep the result in a saved report that still matters tomorrow.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/games"
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Browse saved games
                </Link>
                <Link
                  href="/analyze"
                  className="rounded-full bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-amber-200 hover:shadow-lg hover:shadow-amber-300/20"
                >
                  Open analyze
                </Link>
              </div>
            </div>

            <ImportWorkbench defaultSource="chesscom" variant="spotlight" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {homeWorkflow.map((item) => (
              <Surface key={item.step} className="bg-slate-950/45">
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">
                  {item.step}
                </span>
                <p className="mt-5 text-lg font-semibold tracking-tight text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.copy}</p>
              </Surface>
            ))}
          </div>

          <AnalysisSummary analysis={baseAnalysis} />
        </div>

        <div className="hidden 2xl:flex 2xl:flex-col 2xl:gap-4">
          <Surface className="bg-slate-950/45">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Demo report</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {baseAnalysis.white} vs {baseAnalysis.black}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{baseAnalysis.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <SourcePill source={baseAnalysis.source} />
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                {baseAnalysis.opening.eco}
              </span>
            </div>
            <Link href={`/analysis/${baseAnalysis.id}`} className="mt-5 inline-flex text-sm font-semibold text-amber-300 transition hover:text-amber-200">
              Open demo report
            </Link>
          </Surface>

          <Surface className="bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(26,22,20,0.92)_40%,rgba(15,12,11,0.98))]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/90">At a glance</p>
            <div className="mt-5 grid gap-3">
              {productStats.map((stat) => (
                <div key={stat.label} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-slate-400">{lastMove ? "Final position ready for replay." : "Report board ready."}</p>
          </Surface>
        </div>
      </div>
    </section>
  );
}

export async function AnalyzePage() {
  const viewer = await getCurrentUser();
  const [runs, accountProfile] = await Promise.all([
    viewer ? listAnalysisResponses(viewer.id) : Promise.resolve([]),
    viewer ? getAccountProfile(viewer.id) : Promise.resolve(null),
  ]);
  const recentRuns = runs.slice(0, 3);
  const sourceCount = new Set(runs.map((run) => run.source)).size;
  const deepCount = runs.filter((run) => run.depth === "deep").length;
  const averageRunAccuracy =
    runs.length > 0 ? Math.round(runs.reduce((total, run) => total + averageAccuracy(run), 0) / runs.length) : 0;
  const linkedAccounts = Object.fromEntries(
    (accountProfile?.linkedAccounts ?? []).map((account) => [account.source, account.username]),
  );

  return (
    <div className="mx-auto w-full max-w-7xl py-10 sm:py-16 lg:py-20">
      <section className="grid min-w-0 gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
        <div className="min-w-0">
          <SectionLabel>Analyze</SectionLabel>
          <SectionTitle>Start with a quick pass, then deepen only when the game is worth it.</SectionTitle>
          <SectionCopy>
            Import public games or paste PGN, generate a saved report, and turn each mistake into something you can revisit later.
          </SectionCopy>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { label: "Saved reports", value: runs.length.toString().padStart(2, "0") },
              { label: "Import sources live", value: sourceCount.toString() },
              { label: "Average report accuracy", value: `${averageRunAccuracy}%` },
            ].map((item) => (
              <Surface key={item.label} className="bg-slate-950/55">
                <p className="text-3xl font-semibold tracking-tight text-white">{item.value}</p>
                <p className="mt-2 text-sm text-slate-400">{item.label}</p>
              </Surface>
            ))}
          </div>

          <div className="mt-10 grid gap-5">
            {[
              {
                title: "1. Import from wherever the game already lives",
                copy: "Paste PGN, pull a public Chess.com game, or grab a public Lichess game without changing the rest of the workflow.",
              },
              {
                title: "2. Save the report instead of showing disposable output",
                copy: "Every run gets a stable destination page with move-by-move review, critical moments, and opening context.",
              },
              {
                title: "3. Deepen only when the game deserves it",
                copy: `${deepCount} deep reports are already queued or stored, so the UI stays quick without hiding the premium path.`,
              },
            ].map((step) => (
              <Surface key={step.title} className="bg-slate-950/45">
                <p className="text-lg font-semibold tracking-tight text-white">{step.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300/90">{step.copy}</p>
              </Surface>
            ))}
          </div>
        </div>

        <ImportWorkbench
          linkedAccounts={linkedAccounts}
          viewerDisplayName={viewer?.displayName}
          signInHref="/auth"
        />
      </section>

      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Recent reports</SectionLabel>
            <SectionTitle>Imported games should immediately feel reusable.</SectionTitle>
          </div>
          <Link href="/games" className="text-sm font-semibold text-amber-300 transition hover:text-amber-200 hover:underline">
            View all saved games &rarr;
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {recentRuns.length > 0 ? (
            recentRuns.map((run) => <ReportCard key={run.id} run={run} />)
          ) : (
            <Surface className="lg:col-span-3">
              <p className="text-lg font-semibold tracking-tight text-white">No reports yet</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Your first import will appear here with a permanent report page and an entry in the saved games library.
              </p>
            </Surface>
          )}
        </div>
      </section>
    </div>
  );
}

export async function MorePage({ reportId }: { reportId?: string }) {
  const runs = await listAnalysisResponses();
  const requestedReport = reportId ? await getAnalysisResponse(reportId) : null;
  const analysis = requestedReport ?? runs[0] ?? baseAnalysis;
  const openingName = formatOpeningName(analysis.opening);
  const reviewSide = resolveReviewSide(analysis);
  const reviewedName = nameForSide(analysis, reviewSide);
  const opponentName = nameForSide(analysis, oppositeSide(reviewSide));
  const moreBaseHref = `/more?report=${encodeURIComponent(analysis.id)}`;
  const challenge = getPerfectChallenge([analysis], reviewedName);
  const dnaProfile = getChessDnaProfile([analysis], reviewedName);
  const openingBoss = getOpeningBoss([analysis], reviewedName);
  const roastMoment = getRoastMoment(analysis);
  const villainProfile = getChessVillain([analysis]);

  const toolLinks = [
    { href: "#roast-card", label: "Roast" },
    { href: "#perfect-challenge", label: "Challenge" },
    { href: "#opening-boss", label: "Boss" },
    { href: "#chess-dna", label: "DNA" },
    { href: "#chess-villain", label: "Villain" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1540px] py-8 sm:py-12">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionLabel>More</SectionLabel>
          <SectionTitle>Extra share tools live here, not inside the analysis report.</SectionTitle>
          <SectionCopy>
            Use this page for the playful layers: roast, challenge, opening boss, DNA, and villain cards. The report stays focused on
            analysis, while More handles the viral and experimental pieces.
          </SectionCopy>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/analysis/${analysis.id}`}
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Open focused report
            </Link>
            <Link
              href="/analyze"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Pick another game
            </Link>
          </div>
        </div>

        <Surface className="bg-slate-950/55">
          <div className="flex flex-wrap items-center gap-2">
            <SourcePill source={analysis.source} />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {analysis.depth}
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
              {analysis.opening.eco}
            </span>
          </div>
          <p className="mt-5 text-2xl font-semibold tracking-tight text-white">
            {reviewedName} vs {opponentName}
          </p>
          <p className="mt-2 text-sm text-slate-400">{openingName}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Accuracy", value: `${averageAccuracy(analysis)}%` },
              { label: "Critical moments", value: analysis.criticalMoments.length.toString() },
              { label: "Move count", value: analysis.moveCount.toString() },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-2 text-sm text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {toolLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Surface>
      </section>

      <div className="mt-8 grid gap-5">
        <RoastCard
          href={`${moreBaseHref}#roast-card`}
          moment={roastMoment}
          opening={`${analysis.opening.eco} / ${openingName}`}
          players={`${analysis.white} vs ${analysis.black}`}
        />

        <PerfectChallengeCard challenge={challenge} shareHref={`${moreBaseHref}#perfect-challenge`} />

        <OpeningBossCard challengeHref={`${moreBaseHref}#perfect-challenge`} profile={openingBoss} shareHref={`${moreBaseHref}#opening-boss`} />

        <ChessDnaCard profile={dnaProfile} shareHref={`${moreBaseHref}#chess-dna`} />

        <ChessVillainCard profile={villainProfile} shareHref={`${moreBaseHref}#chess-villain`} />
      </div>
    </div>
  );
}

export async function AnalysisReportPage({ analysisId }: { analysisId: string }) {
  const [analysis, viewer] = await Promise.all([getAnalysisResponse(analysisId), getCurrentUser()]);
  if (!analysis) {
    notFound();
  }

  const openingName = formatOpeningName(analysis.opening);
  const openingHref = `/opening/${openingPageSlugFor(openingName, analysis.opening.eco)}`;
  const reviewSide = resolveReviewSide(analysis);
  const reviewedName = nameForSide(analysis, reviewSide);
  const opponentName = nameForSide(analysis, oppositeSide(reviewSide));
  const compactReviewedName = compactBreadcrumbName(reviewedName);
  const compactOpponentName = compactBreadcrumbName(opponentName);
  const moreHref = `/more?report=${encodeURIComponent(analysis.id)}`;

  return (
    <div className="mx-auto w-full max-w-[1540px] overflow-hidden py-2 sm:py-3">
      <GuestAnalysisRecorder analysis={analysis} />
      <GuestUpgradePrompts
        isSignedIn={Boolean(viewer)}
        placement="inline"
        pathname={`/analysis/${analysis.id}`}
      />
      <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,23,22,0.92),rgba(17,16,15,0.98))] px-3 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:rounded-[1.55rem] sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="grid min-w-0 items-center gap-3">
              <div className="min-w-0 text-sm font-semibold text-slate-300 md:overflow-visible">
                <span className="block max-w-full truncate md:hidden">
                  {formatSourceLabel(analysis.source)} <span className="text-slate-600">&middot;</span> {compactReviewedName} vs {compactOpponentName}
                </span>
                <span className="hidden whitespace-normal break-words md:inline">
                  {formatSourceLabel(analysis.source)} <span className="text-slate-600">&middot;</span> {reviewedName} vs {opponentName}
                </span>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 justify-self-start">
                <Link
                  href={openingHref}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#2a2a3e] bg-[#1e1e2e] px-3.5 py-2 text-xs font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-[#00d4aa]/45 hover:bg-[#00d4aa]/10 sm:text-sm"
                >
                  <span className="shrink-0 text-[#8fffe7]">{analysis.opening.eco}</span>
                  <span className="text-slate-600">&middot;</span>
                  <span className="min-w-0 truncate">{openingName}</span>
                </Link>
                <span className="inline-flex shrink-0 items-center rounded-[20px] border border-[#00d4aa] bg-[#1a1a2e] px-3 py-1 text-[13px] font-semibold leading-none text-[#00d4aa]">
                  {averageAccuracy(analysis)}% Accuracy
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-500">Stockfish 18</span>
              </div>
            </div>
            <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
              <p className="min-w-0 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {reviewedName} report vs {opponentName}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link
              href="/analyze"
              className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] sm:flex-none"
            >
              Analyze another game
            </Link>
            <Link
              href={moreHref}
              className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] sm:flex-none"
            >
              More tools
            </Link>
            <Link
              href="/games"
              className="flex-1 rounded-full bg-amber-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition hover:bg-amber-200 sm:flex-none"
            >
              Saved games
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <AnalysisReportWorkbench analysis={analysis} />
      </div>
    </div>
  );
}

export function BoardPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <SectionLabel>Analysis board</SectionLabel>
      <SectionTitle>Inspect any position with a reusable board surface.</SectionTitle>
      <SectionCopy>The board module is shared by analysis, puzzles, next-move, and study pages.</SectionCopy>
      <div className="mt-10">
        <PositionWorkbench mode="board" initialFen={samplePuzzles[1].fen} />
      </div>
    </section>
  );
}

export function EditorPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <SectionLabel>Editor</SectionLabel>
      <SectionTitle>Set up lines, FEN snapshots, and coach-ready examples.</SectionTitle>
      <SectionCopy>
        The full production version should support drag-and-drop editing, annotation layers, and study link sharing. This scaffold
        already exposes the position pipeline and preview component.
      </SectionCopy>
      <div className="mt-10">
        <PositionWorkbench mode="editor" initialFen={samplePuzzles[0].fen} />
      </div>
    </section>
  );
}

export function NextMovePage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <SectionLabel>Best move</SectionLabel>
      <SectionTitle>Evaluate one position at a time with cache-aware scoring.</SectionTitle>
      <SectionCopy>
        This page hits the position evaluation API directly and returns the recommended move plus a deterministic cache key behind
        the scenes.
      </SectionCopy>
      <div className="mt-10">
        <PositionWorkbench mode="next-move" initialFen={samplePuzzles[2].fen} />
      </div>
    </section>
  );
}

export async function PuzzlesPage() {
  const puzzles = await getPuzzles();
  const featuredPuzzle = puzzles[0] ?? samplePuzzles[0];
  const averagePuzzleRating =
    puzzles.length > 0 ? Math.round(puzzles.reduce((total, puzzle) => total + puzzle.rating, 0) / puzzles.length) : 0;
  const linkedPuzzleCount = puzzles.filter((puzzle) => puzzle.sourceGameId).length;
  const themeCount = new Set(puzzles.flatMap((puzzle) => puzzle.themes)).size;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <SectionLabel>Perfects</SectionLabel>
          <SectionTitle>Every miss deserves a perfect-move comeback card.</SectionTitle>
          <SectionCopy>
            This route turns tactical reps and report-derived mistakes into a shareable loop: problem, perfect, proof, and repeat.
          </SectionCopy>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Perfect packs", value: puzzles.length.toString().padStart(2, "0") },
            { label: "Average rating", value: averagePuzzleRating > 0 ? averagePuzzleRating.toString() : "0" },
            { label: "Theme clusters", value: themeCount.toString() },
            { label: "Report-linked cards", value: linkedPuzzleCount.toString() },
          ].map((metric) => (
            <Surface key={metric.label} className="bg-slate-950/55">
              <p className="text-3xl font-semibold text-white">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-400">{metric.label}</p>
            </Surface>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <PuzzleAttemptPanel
          puzzles={puzzles}
          eyebrow="Perfects lab"
          title="Turn the candidate move into a perfect-move proof card."
          description="The board, answer field, and source report stay connected so a tactical miss can become something worth repeating and sharing."
        />
      </div>

      <PerfectShareStudio puzzle={featuredPuzzle} />

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        <Surface className="bg-slate-950/45">
          <p className="text-lg font-semibold text-white">Problem-derived reps</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Perfects backed by saved reports keep the lesson grounded in your own collapse points instead of a generic catalog.
          </p>
          {featuredPuzzle.sourceGameId ? (
            <Link href={`/analysis/${featuredPuzzle.sourceGameId}`} className="mt-5 inline-flex text-sm font-semibold text-amber-300 transition hover:text-amber-200">
              Review the source report
            </Link>
          ) : null}
        </Surface>
        <Surface className="bg-slate-950/45">
          <p className="text-lg font-semibold text-white">Training rhythm</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Fast solves graduate into spaced repetition, while misses stay visible long enough to become pattern memory.
          </p>
          <p className="mt-5 text-sm font-semibold text-white">Best first pack: forcing moves, conversion, and back-rank discipline.</p>
        </Surface>
        <Surface className="bg-slate-950/45">
          <p className="text-lg font-semibold text-white">Community layer</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Daily challenge streaks and Perfects ladders are downstream from the same attempt log, so growth and competition stay in
            sync.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/daily" className="text-sm font-semibold text-amber-300 transition hover:text-amber-200">
              Open daily challenge
            </Link>
            <Link href="/leaderboards/puzzles" className="text-sm font-semibold text-slate-200 transition hover:text-white">
              View Perfects ladder
            </Link>
            <Link href="/u/maya-lopez" className="text-sm font-semibold text-slate-200 transition hover:text-white">
              View public profile
            </Link>
          </div>
        </Surface>
      </div>
    </section>
  );
}

export async function DailyPage() {
  const [puzzles, runs] = await Promise.all([getPuzzles(), listAnalysisResponses()]);
  const dailyPuzzle = getDailyPuzzle(puzzles);
  const weeklyAccuracy = runs.length > 0 ? Math.round(runs.reduce((total, run) => total + averageAccuracy(run), 0) / runs.length) : 84;
  const linkedRun = runs.find((run) => run.id === dailyPuzzle.sourceGameId) ?? runs[0];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <SectionLabel>Daily Perfect</SectionLabel>
          <SectionTitle>One curated position, one perfect-move checkpoint for tomorrow.</SectionTitle>
          <SectionCopy>
            The daily board should be lightweight to start, but rich enough to feed streaks, weekly digests, and the next personal
            drill pack from the same attempt log.
          </SectionCopy>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Current streak", value: "18 days" },
            { label: "Best solve time", value: "27 sec" },
            { label: "Weekly accuracy", value: `${weeklyAccuracy}%` },
            { label: "Today's rating", value: dailyPuzzle.rating.toString() },
          ].map((metric) => (
            <Surface key={metric.label} className="bg-slate-950/55">
              <p className="text-3xl font-semibold text-white">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-400">{metric.label}</p>
            </Surface>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <PuzzleAttemptPanel
          puzzles={[dailyPuzzle]}
          eyebrow="Today's board"
          title="Keep the streak alive with one focused position and one tracked answer."
          description="A single daily solve can be the simplest reliable return habit, especially when the result feeds your recap, your ladder, and tomorrow's recommended drills."
        />
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        <Surface className="bg-slate-950/45">
          <p className="text-lg font-semibold text-white">Focus for today</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            The selected board leans on <span className="font-semibold text-white">{dailyPuzzle.themes.join(", ")}</span> so the
            session stays short but specific.
          </p>
          <p className="mt-5 text-sm font-semibold text-white">Recommended study window: 8 to 12 minutes.</p>
        </Surface>
        <Surface className="bg-slate-950/45">
          <p className="text-lg font-semibold text-white">Weekly ladder</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Your daily solves should contribute to the same visible ladder as full Perfects sessions, not disappear into a separate
            streak mechanic.
          </p>
          <Link href="/leaderboards/puzzles" className="mt-5 inline-flex text-sm font-semibold text-amber-300 transition hover:text-amber-200">
            Compare with the ladder
          </Link>
        </Surface>
        <Surface className="bg-slate-950/45">
          <p className="text-lg font-semibold text-white">Tomorrow unlocks</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            The next pack can branch from the latest saved report so your daily session and your long-form analysis stay connected.
          </p>
          {linkedRun ? (
            <Link href={`/analysis/${linkedRun.id}`} className="mt-5 inline-flex text-sm font-semibold text-amber-300 transition hover:text-amber-200">
              Reopen {linkedRun.opening.eco} / {linkedRun.white} vs {linkedRun.black}
            </Link>
          ) : (
            <Link href="/analyze" className="mt-5 inline-flex text-sm font-semibold text-amber-300 transition hover:text-amber-200">
              Import a report to personalize tomorrow
            </Link>
          )}
        </Surface>
      </div>
    </section>
  );
}

export async function PublicProfilePage({ username }: { username: string }) {
  const normalizedSlug = slugForPlayerName(username);
  const runs = await listAnalysisResponses();
  const matchingRuns = runs.filter((run) => profileNameMatches(run, normalizedSlug));
  const profileRuns = matchingRuns.length > 0 ? matchingRuns : [baseAnalysis];
  const playerName = profileRuns[0]?.subject ?? profileRuns[0]?.white ?? "Maya Lopez";
  const publicSlug = slugForPlayerName(playerName);
  const problemMoves = profileRuns
    .flatMap((run) =>
      run.moveEvaluations
        .filter((move) => move.grade === "Blunder" || move.grade === "Mistake" || move.grade === "Inaccuracy")
        .map((move) => ({ move, run })),
    )
    .sort((left, right) => right.move.cpLoss - left.move.cpLoss);
  const featuredProblems = problemMoves.slice(0, 3);
  const averageProfileAccuracy =
    profileRuns.length > 0 ? Math.round(profileRuns.reduce((total, run) => total + averageAccuracy(run), 0) / profileRuns.length) : 0;
  const averageProblemLoss =
    problemMoves.length > 0 ? problemMoves.reduce((total, item) => total + item.move.cpLoss, 0) / problemMoves.length : 0;
  const perfectScore = Math.max(0, Math.min(100, Math.round(100 - averageProblemLoss / 6)));
  const challenge = getPerfectChallenge(profileRuns, playerName);
  const openingBoss = getOpeningBoss(profileRuns, playerName);
  const dnaProfile = getChessDnaProfile(profileRuns, playerName);
  const villainProfile = getChessVillain(profileRuns);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionLabel>Public profile</SectionLabel>
          <SectionTitle>{playerName}&apos;s Problem to Perfect profile</SectionTitle>
          <SectionCopy>
            A public improvement page should make the player&apos;s story easy to understand: which positions hurt, which moves fixed
            them, and what pattern is now being trained.
          </SectionCopy>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Build your profile
            </Link>
            <Link
              href="/puzzles#share-studio"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Make share card
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Problem to Perfect score", value: `${perfectScore}%` },
            { label: "Reports reviewed", value: profileRuns.length.toString().padStart(2, "0") },
            { label: "Average accuracy", value: `${averageProfileAccuracy}%` },
            { label: "Public handle", value: `/${publicSlug}` },
          ].map((metric) => (
            <Surface key={metric.label} className="bg-slate-950/55">
              <p className="break-words text-3xl font-semibold text-white">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-400">{metric.label}</p>
            </Surface>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <ChessDnaCard profile={dnaProfile} shareHref={`/u/${publicSlug}#chess-dna`} />
      </div>

      <div className="mt-12">
        <PerfectChallengeCard challenge={challenge} shareHref={`/u/${publicSlug}#perfect-challenge`} />
      </div>

      <div className="mt-12">
        <OpeningBossCard challengeHref={`/u/${publicSlug}#perfect-challenge`} profile={openingBoss} shareHref={`/u/${publicSlug}#opening-boss`} />
      </div>

      <div className="mt-12">
        <ChessVillainCard profile={villainProfile} shareHref={`/u/${publicSlug}#chess-villain`} />
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {featuredProblems.length > 0 ? (
          featuredProblems.map(({ move, run }) => (
            <Surface key={`${run.id}-${move.ply}`} className="bg-slate-950/45">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">Perfect card</p>
                <p className="text-xs text-slate-500">{formatCpLossLabel(move.cpLoss)}</p>
              </div>
              <p className="mt-4 text-lg font-semibold text-white">{run.white} vs {run.black}</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Problem</p>
                  <p className="mt-2 text-lg font-semibold text-white">{move.san}</p>
                </div>
                <div className="rounded-[1.15rem] border border-emerald-300/15 bg-emerald-300/8 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Perfect</p>
                  <p className="mt-2 text-lg font-semibold text-white">{move.bestMove}</p>
                </div>
                <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Proof</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{move.comment}</p>
                </div>
              </div>
              <Link href={`/analysis/${run.id}`} className="mt-5 inline-flex text-sm font-semibold text-amber-300 transition hover:text-amber-200">
                Open source report
              </Link>
            </Surface>
          ))
        ) : (
          <Surface className="bg-slate-950/45 lg:col-span-3">
            <p className="text-lg font-semibold text-white">No problem cards yet</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Imported reports will populate this profile with the moves most worth turning into Perfects.
            </p>
          </Surface>
        )}
      </div>
    </section>
  );
}

export async function LeaderboardPage({ type }: { type: "puzzles" | "brilliant" }) {
  const entries = await getLeaderboard(type);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <SectionLabel>Leaderboards</SectionLabel>
      <SectionTitle>{type === "puzzles" ? "Perfects" : "Brilliant move"} rankings backed by cached stats.</SectionTitle>
      <SectionCopy>
        Community features should sit on top of stored data rather than recomputing expensive reports on-demand. These tables are
        fed from route handlers that can later shift to Redis + Postgres without changing the UI contract.
      </SectionCopy>
      <div className="mt-10">
        <LeaderboardTable
          title={type === "puzzles" ? "Top Perfects climbers" : "Most upvoted brilliant moves"}
          entries={entries}
        />
      </div>
    </section>
  );
}

export async function GamesPage() {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return <GuestGamesPage />;
  }

  const runs = await listAnalysisResponses(viewer.id);
  const latestRun = runs[0];
  const averageLibraryAccuracy =
    runs.length > 0 ? Math.round(runs.reduce((total, run) => total + averageAccuracy(run), 0) / runs.length) : 0;
  const uniqueOpenings = new Set(runs.map((run) => run.opening.name)).size;
  const quickReports = runs.filter((run) => run.depth === "quick").length;
  const viewerLabel = viewer?.displayName ?? "saved library";

  return (
    <section className="mx-auto w-full max-w-[1500px] py-4 lg:py-6">
      <div className="grid gap-6 2xl:grid-cols-[210px_minmax(0,1fr)_210px]">
        <div className="hidden 2xl:flex 2xl:flex-col 2xl:gap-4">
          <Surface className="bg-slate-950/45">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Library stats</p>
            <div className="mt-5 grid gap-3">
              {[
                { label: "Reports", value: runs.length.toString().padStart(2, "0") },
                { label: "Average accuracy", value: `${averageLibraryAccuracy}%` },
                { label: "Openings", value: uniqueOpenings.toString() },
                { label: "Quick reports", value: quickReports.toString() },
              ].map((metric) => (
                <div key={metric.label} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{metric.label}</p>
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(26,22,20,0.92)_38%,rgba(15,12,11,0.98))]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/90">Compounding value</p>
            <p className="mt-3 text-2xl font-semibold text-white">Saved reports are the real product memory.</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This page now leans into a denser history table so your past games feel browseable in the same way as the reference UI.
            </p>
          </Surface>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 px-1">
            <div>
              <SectionLabel>Saved games</SectionLabel>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Chess history of{" "}
                <span className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-amber-100">
                  {viewerLabel}
                </span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                Imported runs should not disappear after one glance. This library keeps opening context, accuracy, and critical moments
                reusable for coaching, puzzles, and future study.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/analyze"
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Import Games
              </Link>
            </div>
          </div>

          <Surface className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
              <p className="text-lg font-medium text-slate-300">
                {runs.length > 0 ? `Showing 1-${runs.length} of ${runs.length} games` : "No saved games yet"}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {new Set(runs.map((run) => run.source)).size} sources
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {runs.length - quickReports} deep reports
                </span>
              </div>
            </div>

            {runs.length > 0 ? (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Players</th>
                        <th className="px-6 py-4 font-semibold">Source</th>
                        <th className="px-6 py-4 font-semibold">Time</th>
                        <th className="px-6 py-4 font-semibold">Result</th>
                        <th className="px-6 py-4 font-semibold">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => {
                        const dateParts = formatCompactDateParts(run.playedAt);
                        const rowRoastMoment = getRoastMoment(run);

                        return (
                          <tr key={run.id} className="border-b border-white/6 transition hover:bg-white/[0.045]">
                            <td className="align-top">
                              <Link href={`/analysis/${run.id}`} className="block px-6 py-5">
                                <p className="text-2xl font-semibold text-white">{dateParts.monthDay}</p>
                                <p className="mt-1 text-sm text-slate-500">{dateParts.year}</p>
                              </Link>
                            </td>
                            <td className="align-top">
                              <Link href={`/analysis/${run.id}`} className="block px-6 py-5">
                                <p className="font-semibold text-white">
                                  {run.white} vs {run.black}
                                </p>
                                <p className="mt-2 text-sm text-slate-400">
                                  {run.opening.eco} / {run.opening.name}
                                </p>
                              </Link>
                            </td>
                            <td className="align-top">
                              <Link href={`/analysis/${run.id}`} className="block px-6 py-5">
                                <SourcePill source={run.source} />
                              </Link>
                            </td>
                            <td className="align-top">
                              <Link href={`/analysis/${run.id}`} className="block px-6 py-5">
                                <p className="font-medium text-white">{formatTimeControlLabel(run.timeControl)}</p>
                                <p className="mt-2 text-sm text-slate-500">{run.depth === "deep" ? "Deep review" : "Quick review"}</p>
                              </Link>
                            </td>
                            <td className="align-top">
                              <Link href={`/analysis/${run.id}`} className="block px-6 py-5">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                                    run.result === "1-0"
                                      ? "border-amber-300/20 bg-amber-300/12 text-amber-100"
                                      : run.result === "0-1"
                                        ? "border-emerald-300/20 bg-emerald-300/12 text-emerald-100"
                                        : "border-white/10 bg-white/[0.04] text-slate-200",
                                  )}
                                >
                                  {formatResultLabel(run.result)}
                                </span>
                              </Link>
                            </td>
                            <td className="align-top">
                              <Link href={`/analysis/${run.id}`} className="block px-6 py-5">
                                <p className="font-semibold text-white">{averageAccuracy(run)}%</p>
                                <p className="mt-2 text-sm text-slate-500">{run.criticalMoments.length} critical moments</p>
                                {rowRoastMoment ? (
                                  <span className="mt-3 inline-flex text-sm font-semibold text-amber-300">Roast ready</span>
                                ) : null}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 p-5 lg:hidden">
                  {runs.map((run) => {
                    const dateParts = formatCompactDateParts(run.playedAt);
                    const cardRoastMoment = getRoastMoment(run);

                    return (
                      <Link
                        key={run.id}
                        href={`/analysis/${run.id}`}
                        className="block rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.055]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-semibold text-white">{dateParts.monthDay}</p>
                            <p className="text-sm text-slate-500">{dateParts.year}</p>
                          </div>
                          <SourcePill source={run.source} />
                        </div>
                        <p className="mt-4 font-semibold text-white">
                          {run.white} vs {run.black}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {run.opening.eco} / {run.opening.name}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                            {formatTimeControlLabel(run.timeControl)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                            {averageAccuracy(run)}% accuracy
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                            {formatResultLabel(run.result)}
                          </span>
                        </div>
                        {cardRoastMoment ? (
                          <p className="mt-4 text-sm font-semibold text-amber-300">
                            Roast ready: {cardRoastMoment.problemMove} -&gt; {cardRoastMoment.perfectMove}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="px-6 py-8">
                <p className="text-lg font-semibold text-white">Your library is empty</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Import a PGN or a public game from Chess.com or Lichess to create the first saved report in the library.
                </p>
              </div>
            )}
          </Surface>
        </div>

        <div className="hidden 2xl:flex 2xl:flex-col 2xl:gap-4">
          {latestRun ? (
            <>
              <Surface className="bg-slate-950/45">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Latest report</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {latestRun.white} vs {latestRun.black}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{latestRun.summary}</p>
                <div className="mt-5 grid gap-3">
                  {[
                    { label: "Source", value: formatSourceLabel(latestRun.source) },
                    { label: "Opening", value: latestRun.opening.eco },
                    { label: "Critical moments", value: latestRun.criticalMoments.length.toString() },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                      <p className="mt-2 font-semibold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/analysis/${latestRun.id}`}
                  className="mt-5 inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
                >
                  Open latest report
                </Link>
              </Surface>

              <Surface className="bg-slate-950/45">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Board snapshot</p>
                <div className="mt-4">
                  <ChessBoard fen={latestRun.moveEvaluations.at(-1)?.fenAfter ?? baseAnalysis.moveEvaluations.at(-1)!.fenAfter} />
                </div>
              </Surface>
            </>
          ) : (
            <Surface className="bg-slate-950/45">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Next step</p>
              <p className="mt-3 text-2xl font-semibold text-white">Import your first game.</p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Once one report exists, the whole library starts feeling useful instead of theoretical.
              </p>
              <Link
                href="/analyze"
                className="mt-5 inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Import a game
              </Link>
            </Surface>
          )}
        </div>
      </div>
    </section>
  );
}

export async function CoachPage() {
  const viewer = await getCurrentUser();
  const runs = viewer ? await listAnalysisResponses(viewer.id) : [];
  const coachRuns = runs.length > 0 ? runs : [baseAnalysis];
  const latestRun = coachRuns[0] ?? baseAnalysis;
  const playerName = latestRun.subject ?? viewer?.displayName ?? latestRun.white;
  const playerColor = latestRun.subjectColor === "black" ? "black" : "white";
  const initialGames = buildAiCoachGamesFromAnalyses(coachRuns, 50);

  return (
    <AiCoachWorkspace
      initialGames={initialGames}
      playerColor={playerColor}
      playerName={playerName}
    />
  );
}

export async function CoachReportPage({ reportId }: { reportId: string }) {
  const snapshot = await findCoachSnapshotById(reportId);
  const averagePillarScore = Math.round(snapshot.pillars.reduce((total, pillar) => total + pillar.score, 0) / snapshot.pillars.length);
  const planMinutes = totalTrainingMinutes(snapshot.dailyPlan);

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.98fr_1.02fr]">
        <div>
          <SectionLabel>Coach report</SectionLabel>
          <SectionTitle>{snapshot.subject}&apos;s training snapshot</SectionTitle>
          <SectionCopy>{snapshot.summary}</SectionCopy>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/coach"
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Back to coach
            </Link>
            <Link
              href="/games"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Revisit saved reports
            </Link>
          </div>
        </div>

        <Surface className="bg-slate-950/45">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Generated", value: formatIsoDate(snapshot.generatedAt) },
              { label: "Average pillar score", value: `${averagePillarScore}/100` },
              { label: "Daily plan minutes", value: `${planMinutes} min` },
              { label: "Modules", value: snapshot.modules.length.toString() },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[1.3rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Pillar board</p>
          <div className="mt-6 grid gap-4">
            {snapshot.pillars.map((pillar) => (
              <div key={pillar.name} className="rounded-[1.4rem] border border-white/10 bg-slate-950/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-white">{pillar.name}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                      {pillar.score}/100
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      {pillar.confidence}% confidence
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{pillar.trend}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pillar.evidence.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Today&apos;s plan</p>
          <p className="mt-3 text-2xl font-semibold text-white">The shortest useful set of blocks for the next session.</p>
          <div className="mt-6 space-y-4">
            {snapshot.dailyPlan.map((task) => (
              <div key={task.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{task.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{task.description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {task.durationMinutes} min
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                    {task.focus}
                  </span>
                  {task.proof.map((proof) => (
                    <span key={proof} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {proof}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <div className="mt-12">
        <div>
          <SectionLabel>Training modules</SectionLabel>
          <SectionTitle>Longer cycles keep the why, proof, and cadence attached.</SectionTitle>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {snapshot.modules.map((module) => (
            <Surface key={module.id}>
              <p className="text-xl font-semibold text-white">{module.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{module.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {module.objective}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {module.cadence}
                </span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {module.tasks.map((task) => (
                  <li key={task.id} className="rounded-[1.2rem] border border-white/10 bg-slate-950/65 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-white">{task.title}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        {task.durationMinutes} min
                      </span>
                    </div>
                    <p className="mt-2 text-slate-400">{task.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                        {task.focus}
                      </span>
                      {task.proof.map((proof) => (
                        <span key={proof} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          {proof}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Surface>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WrappedPage({ year }: { year: number }) {
  const availableYears = [wrapped2025];
  const report = availableYears.find((r) => r.year === year) ?? wrapped2025;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <SectionLabel>Wrapped {report.year}</SectionLabel>
      <SectionTitle>{report.headline}</SectionTitle>
      <SectionCopy>
        Year-in-review pages should be generated from the same stable fact tables that power streaks, reports, and training logs.
      </SectionCopy>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(report.totals).map(([key, value]) => (
          <Surface key={key}>
            <p className="text-3xl font-semibold text-white">{value}</p>
            <p className="mt-2 capitalize text-slate-400">{key}</p>
          </Surface>
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {report.highlights.map((highlight) => (
          <Surface key={highlight}>
            <p className="text-sm leading-7 text-slate-300">{highlight}</p>
          </Surface>
        ))}
      </div>
    </section>
  );
}

export function PricingPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <SectionLabel>Pricing</SectionLabel>
          <SectionTitle>Serious chess workflow pricing without burying the value.</SectionTitle>
          <SectionCopy>
            The monetization layer should feel as intentional as the product: a useful free path, paid depth where the reports start
            compounding, and no ad clutter on the screens people study on.
          </SectionCopy>
          <div className="mt-6 flex flex-wrap gap-2">
            {pricingProofNotes.map((note) => (
              <span
                key={note}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300"
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        <Surface className="bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(15,23,42,0.92)_32%,rgba(2,6,23,0.98))]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Packaging principle</p>
          <p className="mt-3 text-2xl font-semibold text-white">Free gets you in. Paid depth keeps the report stack compounding.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Free entry", value: "Daily + quick" },
              { label: "Power path", value: "Saved + deep" },
              { label: "Premium layer", value: "Coach + share" },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.3rem] border border-white/10 bg-slate-950/75 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {pricingTiers.map((tier) => {
          const isPopular = tier.name === "Pro";
          const isPremium = tier.name === "Coach";

          return (
            <Surface
              key={tier.name}
              className={cn(
                "h-full",
                isPopular ? "border-amber-300/40 bg-[linear-gradient(180deg,rgba(245,158,11,0.1),rgba(15,23,42,0.88)_34%,rgba(2,6,23,0.96))]" : "",
                isPremium ? "border-fuchsia-300/20" : "",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-white">{tier.name}</p>
                  <p className="mt-3 text-4xl font-semibold text-amber-300">
                    {tier.price}
                    <span className="ml-2 text-sm font-medium text-slate-400">/ month</span>
                  </p>
                </div>
                {isPopular ? (
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                    Most popular
                  </span>
                ) : null}
                {isPremium ? (
                  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                    Premium
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">{tier.description}</p>

              <div className="mt-6 space-y-3">
                {(pricingTierFeatures[tier.name] ?? []).map((feature) => (
                  <div key={feature} className="rounded-[1.2rem] border border-white/10 bg-slate-950/65 px-4 py-3 text-sm text-slate-200">
                    {feature}
                  </div>
                ))}
              </div>

              <Link
                href={tier.name === "Free" ? "/analyze" : "/auth"}
                className={cn(
                  "mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold transition",
                  isPopular
                    ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                    : "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10",
                )}
              >
                {tier.name === "Free" ? "Start analyzing" : tier.name === "Coach" ? "Unlock coach" : "Choose Pro"}
              </Link>
            </Surface>
          );
        })}
      </div>
    </section>
  );
}

export async function BlogIndexPage() {
  const posts = await getBlogPostSummaries().catch(() => featuredBlogPosts);
  const [featuredPost, ...otherPosts] = posts;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <SectionLabel>Blog</SectionLabel>
      <SectionTitle>Architecture notes, training ideas, and launch-ready product thinking.</SectionTitle>
      <SectionCopy>
        The content layer is set up for MDX and locale-aware metadata, giving the rebuild a real SEO surface instead of duplicate
        landing pages.
      </SectionCopy>

      {featuredPost ? (
        <Link
          href={`/blog/${featuredPost.slug}`}
          className="mt-10 grid gap-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(15,23,42,0.9)_34%,rgba(2,6,23,0.97))] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.28)] transition hover:border-amber-300/40 lg:grid-cols-[1.08fr_0.92fr]"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">{featuredPost.category}</p>
            <p className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{featuredPost.title}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{featuredPost.excerpt}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                {formatIsoDate(featuredPost.publishedAt)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                {featuredPost.readingTime}
              </span>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Why this matters</p>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-300">
              <p>Articles here should support launch credibility, search visibility, and product education at the same time.</p>
              <p>This featured slot gives the strongest post a more editorial treatment instead of reducing everything to identical cards.</p>
            </div>
          </div>
        </Link>
      ) : null}

      {otherPosts.length > 0 ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {otherPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 transition hover:border-amber-300/40 hover:bg-white/[0.08]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.25em] text-amber-300/70">{post.category}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{post.readingTime}</p>
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{post.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{post.excerpt}</p>
              <p className="mt-5 text-sm text-slate-500">{formatIsoDate(post.publishedAt)}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function BlogPostPage({ post }: { post: Awaited<ReturnType<typeof import("@/lib/mdx").getBlogPostBySlug>> }) {
  return (
    <article className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8">
      <SectionLabel>{post.category}</SectionLabel>
      <SectionTitle>{post.title}</SectionTitle>
      <SectionCopy>{post.excerpt}</SectionCopy>
      <div className="prose prose-invert mt-10 max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
}

export function PolicyPage({ kind }: { kind: "privacy" | "terms" }) {
  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8">
      <SectionLabel>{kind === "privacy" ? "Privacy policy" : "Terms of service"}</SectionLabel>
      <SectionTitle>{kind === "privacy" ? "Protect the training data trail." : "Use the platform responsibly."}</SectionTitle>
      <div className="mt-8 space-y-6 text-sm leading-8 text-slate-300">
        <p>
          This scaffold stores user, game, puzzle, and coach entities in a normalized Postgres schema. Production rollouts should
          document retention windows, export paths, and account deletion guarantees before launch.
        </p>
        <p>
          Third-party services are currently represented by integration interfaces for Supabase Auth, Stripe Billing, and Redis-backed
          queueing. No live credentials ship in this repository.
        </p>
      </div>
    </section>
  );
}

export async function LocalizedRoutePage({
  locale,
  slug,
  searchParams,
}: {
  locale: Locale;
  slug?: string[];
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const path = slug?.join("/") ?? "";

  if (path === "") return <HomePage locale={locale} />;
  if (path === "analyze") return <AnalyzePage />;
  if (path === "board") return <BoardPage />;
  if (path === "editor") return <EditorPage />;
  if (path === "next-move") return <NextMovePage />;
  if (path === "puzzles") return <PuzzlesPage />;
  if (path === "daily") return <DailyPage />;
  if (path === "games") return <GamesPage />;
  if (path === "more") {
    const reportId = Array.isArray(searchParams?.report) ? searchParams.report[0] : searchParams?.report;
    return <MorePage reportId={reportId} />;
  }
  if (path === "coach") return <CoachPage />;
  if (path === "profile") return <ProfilePage />;
  if (path === "features") return <FeaturesPage />;
  if (path === "auth") return <AuthRoutePage locale={locale} localized nextPath={searchParams?.next} />;
  if (path === "account") return <AccountRoutePage locale={locale} localized />;
  if (path === "pricing") return <PricingPage />;
  if (path === "blog") return <BlogIndexPage />;
  if (path === "privacy-policy") return <PolicyPage kind="privacy" />;
  if (path === "tos") return <PolicyPage kind="terms" />;
  if (path === "leaderboards/puzzles") return <LeaderboardPage type="puzzles" />;
  if (path === "leaderboards/brilliant") return <LeaderboardPage type="brilliant" />;
  if (path === "wrapped/2025") return <WrappedPage year={2025} />;

  notFound();
}

export const blogFallbackPosts = featuredBlogPosts satisfies BlogPostSummary[];
