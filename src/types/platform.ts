export type Locale = "en" | "es" | "fr" | "hi" | "ru" | "ar";

export type SourceType = "pgn" | "chesscom" | "lichess";
export type AnalysisMode = "browser" | "worker" | "blended";
export type AnalysisDepth = "quick" | "deep";
export type SubscriptionTier = "free" | "pro" | "coach";
export type MoveGrade =
  | "Brilliant"
  | "Great"
  | "Best"
  | "Nice"
  | "Excellent"
  | "Good"
  | "Book"
  | "Inaccuracy"
  | "Mistake"
  | "Blunder"
  | "Miss";

export interface EngineLine {
  depth: number;
  line: string[];
  nodes: number;
  rank: number;
  san: string;
  score: number;
  tablebaseHits?: number;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  locale: Locale;
  createdAt: string;
  subscriptionTier: SubscriptionTier;
}

export interface LinkedChessAccount {
  id: string;
  source: Extract<SourceType, "chesscom" | "lichess">;
  username: string;
  linkedAt: string;
}

export interface AccountProfile {
  user: UserAccount;
  linkedAccounts: LinkedChessAccount[];
}

export interface OpeningTag {
  eco: string;
  name: string;
  variation?: string;
}

export interface MoveEvaluation {
  ply: number;
  moveNumber: number;
  side: "white" | "black";
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  score: number;
  caps: number;
  cpLoss: number;
  grade: MoveGrade;
  label?: MoveGrade;
  comment: string;
  bestMove: string;
  principalVariation: string[];
  engineLines?: EngineLine[];
  refutationLine?: EngineLine;
  depth: number;
  nodes: number;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  phase: "opening" | "middlegame" | "endgame";
}

export interface CriticalMoment {
  ply: number;
  san: string;
  grade: MoveGrade;
  cpLoss: number;
  insight: string;
}

export interface GameSummary {
  id: string;
  source: SourceType;
  title: string;
  white: string;
  black: string;
  result: string;
  timeControl: string;
  playedAt: string;
  opening: OpeningTag;
  accuracyWhite: number;
  accuracyBlack: number;
  moveCount: number;
  pgn: string;
}

export type ImportGameOutcome = "win" | "loss" | "draw";
export type ImportGameResultFilter = "all" | ImportGameOutcome;

export interface ImportablePlayerProfile {
  avatarUrl?: string;
  countryCode?: string;
  countryName?: string;
  username: string;
}

export interface ImportableGameOption {
  id: string;
  source: Extract<SourceType, "chesscom" | "lichess">;
  white: string;
  black: string;
  opponent: string;
  playerColor: "white" | "black";
  outcome: ImportGameOutcome;
  result: string;
  playedAt: string;
  endedAt?: string;
  timeControl: string;
  timeClass?: string;
  eco?: string;
  openingName?: string;
  archiveUrl?: string;
  url?: string;
  rated?: boolean;
  whiteRating?: number;
  blackRating?: number;
  whiteProfile?: ImportablePlayerProfile;
  blackProfile?: ImportablePlayerProfile;
  previewFen?: string;
  previewMove?: {
    from: string;
    ply: number;
    san: string;
    to: string;
  };
  previewMoveCount?: number;
}

export interface ImportGameLibraryStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  timeClasses: string[];
}

export interface ImportGameLibraryFilters {
  search: string;
  result: ImportGameResultFilter;
  timeClass: string;
}

export interface ImportGameLibraryResponse {
  source: Extract<SourceType, "chesscom" | "lichess">;
  username: string;
  games: ImportableGameOption[];
  page: number;
  pageSize: number;
  filteredCount: number;
  hasMore: boolean;
  message: string;
  filters: ImportGameLibraryFilters;
  stats: ImportGameLibraryStats;
}

export interface AnalysisRun extends GameSummary {
  mode: AnalysisMode;
  depth: AnalysisDepth;
  status: "queued" | "complete";
  subject?: string;
  subjectColor?: "white" | "black";
  createdAt: string;
  summary: string;
  story: string[];
  moveEvaluations: MoveEvaluation[];
  criticalMoments: CriticalMoment[];
  bestMoveChain: string[];
  shareSlug: string;
}

export interface Puzzle {
  id: string;
  fen: string;
  prompt: string;
  solution: string[];
  rating: number;
  themes: string[];
  sourceGameId: string;
}

export interface PuzzleAttempt {
  puzzleId: string;
  userId?: string;
  correct: boolean;
  elapsedMs: number;
  newRating: number;
}

export interface LeaderboardEntry {
  rank: number;
  player: string;
  score: number;
  change: number;
  detail: string;
}

export interface TrainingTask {
  id: string;
  title: string;
  description: string;
  focus: string;
  durationMinutes: number;
  proof: string[];
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  objective: string;
  cadence: string;
  tasks: TrainingTask[];
}

export interface CoachPillar {
  name: "Blunders" | "Discipline" | "Tactics" | "Conversion" | "Preparation";
  score: number;
  confidence: number;
  trend: string;
  evidence: string[];
}

export interface CoachProfileSnapshot {
  id: string;
  generatedAt: string;
  subject: string;
  summary: string;
  pillars: CoachPillar[];
  dailyPlan: TrainingTask[];
  modules: TrainingModule[];
}

export interface WrappedSeasonReport {
  year: number;
  player: string;
  headline: string;
  totals: {
    games: number;
    puzzles: number;
    streak: number;
    brilliantMoves: number;
  };
  highlights: string[];
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: string;
}

export interface RouteDescriptor {
  key: string;
  title: string;
  description: string;
}
