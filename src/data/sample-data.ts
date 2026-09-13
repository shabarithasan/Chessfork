import { analyzePgn } from "@/lib/chess/analysis";
import { buildCoachSnapshot } from "@/lib/chess/training";
import type {
  AnalysisRun,
  BlogPostSummary,
  LeaderboardEntry,
  Puzzle,
  WrappedSeasonReport,
} from "@/types/platform";

export const samplePgn = `[Event "Chessfork Training Arena"]
[Site "Online"]
[Date "2026.05.18"]
[Round "-"]
[White "Maya Lopez"]
[Black "Evan Shah"]
[Result "1-0"]
[TimeControl "600+5"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 bxc4 12. Bxc4 Bb7 13. Nc3 Nxe4 14. Nxe4 d5 15. Bd3 dxe4 16. Bxe4 Bxe4 17. Rxe4 exd4 18. Rxd4 Bd6 19. Bf4 Qf6 20. Bxd6 cxd6 21. Rxd6 Qxb2 22. Rxd7 1-0`;

export const baseAnalysis = analyzePgn(samplePgn, {
  requestedDepth: "quick",
  subject: "Maya Lopez",
});

const analysisStore = new Map<string, AnalysisRun>([[baseAnalysis.id, baseAnalysis]]);

export function getAnalysisRun(id: string) {
  return analysisStore.get(id);
}

export function getAllAnalysisRuns() {
  return [...analysisStore.values()];
}

export function saveAnalysisRun(run: AnalysisRun) {
  analysisStore.set(run.id, run);
  return run;
}

export const samplePuzzles: Puzzle[] = [
  {
    id: "puzzle-smothered",
    fen: "r4rk1/1b3Npp/8/3Q4/8/8/5PPP/6K1 w - - 0 1",
    prompt: "Execute the classic smothered mate combination.",
    solution: ["Nh6+", "Kh8", "Qg8+", "Rxg8", "Nf7#"],
    rating: 1850,
    themes: ["mate", "smothered-mate", "sacrifice", "double-check"],
    sourceGameId: baseAnalysis.id,
  },
  {
    id: "puzzle-opera",
    fen: "1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 0 17",
    prompt: "Deliver Morphy's famous Opera House mate.",
    solution: ["Rd8#"],
    rating: 1200,
    themes: ["mate", "mate-in-1", "paul-morphy"],
    sourceGameId: baseAnalysis.id,
  },
  {
    id: "puzzle-backrank",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    prompt: "Find the simplest mate on the board.",
    solution: ["Ra8#"],
    rating: 800,
    themes: ["mate", "mate-in-1", "back-rank"],
    sourceGameId: baseAnalysis.id,
  },
  {
    id: "puzzle-fork",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2BnP3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 5",
    prompt: "Punish the loose setup with a tactical fork.",
    solution: ["Bxf7+"],
    rating: 1490,
    themes: ["fork", "initiative", "opening"],
    sourceGameId: baseAnalysis.id,
  },
  {
    id: "puzzle-convert",
    fen: "8/2p3k1/1p2p1p1/p1q1Pp1p/P1P2P1P/2Q3P1/6K1/8 w - - 0 1",
    prompt: "Find the cleanest winning continuation instead of drifting.",
    solution: ["Qxc5"],
    rating: 1715,
    themes: ["endgame", "conversion", "queen-endgame"],
    sourceGameId: baseAnalysis.id,
  }
];

export const puzzleLeaderboard: LeaderboardEntry[] = [
  { rank: 1, player: "Aanya R", score: 2418, change: 34, detail: "91% solve rate this week" },
  { rank: 2, player: "Leo M", score: 2396, change: 12, detail: "8-day streak, 126 puzzles" },
  { rank: 3, player: "Fatima K", score: 2334, change: -6, detail: "Best on conversion packs" },
  { rank: 4, player: "Miles T", score: 2299, change: 22, detail: "Fastest daily solver" },
];

export const brilliantLeaderboard: LeaderboardEntry[] = [
  { rank: 1, player: "Maya Lopez", score: 128, change: 7, detail: "Brilliant attack vs Evan Shah" },
  { rank: 2, player: "Ravi Anand", score: 114, change: 9, detail: "Engine-approved exchange sac" },
  { rank: 3, player: "Nora Kim", score: 102, change: -2, detail: "Quiet move in a queenless middlegame" },
  { rank: 4, player: "Soren Vale", score: 96, change: 5, detail: "Counterintuitive fortress save" },
];

export const wrapped2025: WrappedSeasonReport = {
  year: 2025,
  player: "Maya Lopez",
  headline: "You became a sharper attacker and a calmer closer.",
  totals: {
    games: 384,
    puzzles: 2811,
    streak: 47,
    brilliantMoves: 14,
  },
  highlights: [
    "Rapid accuracy jumped from 74% to 81%.",
    "Your best month was October, with +118 rating and 0 blunder rapid sessions.",
    "You solved 61 conversion drills from winning positions.",
  ],
};

export const sampleCoachSnapshot = buildCoachSnapshot("Maya Lopez", getAllAnalysisRuns());

export const productStats = [
  { label: "Import paths", value: "3" },
  { label: "Analysis depths", value: "2" },
  { label: "Saved report URL", value: "1 click" },
  { label: "Locales ready", value: "6" },
];

export const featuredBlogPosts: BlogPostSummary[] = [
  {
    slug: "how-hybrid-analysis-works",
    title: "How hybrid chess analysis keeps mobile devices fast",
    excerpt: "Why a blended browser-worker pipeline beats a browser-only engine stack.",
    category: "Architecture",
    publishedAt: "2026-05-18",
    readingTime: "6 min",
  },
  {
    slug: "building-a-training-loop",
    title: "From blunder report to training plan",
    excerpt: "Designing drills that start from your actual mistakes instead of generic motifs.",
    category: "Product",
    publishedAt: "2026-05-17",
    readingTime: "5 min",
  },
  {
    slug: "better-than-a-review-screen",
    title: "Why saved analysis reports beat disposable review screens",
    excerpt: "The case for report-centric chess analysis with shareable evidence and coach context.",
    category: "Strategy",
    publishedAt: "2026-05-15",
    readingTime: "4 min",
  },
];
