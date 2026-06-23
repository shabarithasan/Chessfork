import { Chess, Move } from "chess.js";

import type { AnalysisDepth, EngineLine } from "@/types/platform";

const CHECKMATE_SCORE = 200_000;
const SEARCH_INFINITY = 300_000;
const MIDGAME_WEIGHT_TOTAL = 24;
const NEURAL_EVAL_SCALE = 58;

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
} as const;

const PIECE_PHASE = {
  p: 0,
  n: 1,
  b: 1,
  r: 2,
  q: 4,
  k: 0,
} as const;

const KNIGHT_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
] as const;

const BISHOP_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

const ROOK_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

const QUEEN_DIRECTIONS = [...BISHOP_DIRECTIONS, ...ROOK_DIRECTIONS] as const;

const NEURAL_FEATURE_NORMALIZERS = [
  2400,
  220,
  130,
  90,
  90,
  220,
  130,
  48,
  1,
  1,
] as const;

const NEURAL_HIDDEN_WEIGHTS = [
  [0.82, 0.32, 0.18, 0.27, 0.2, 0.46, 0.36, 0.14, 0.08, 0.11],
  [-0.28, 0.64, 0.48, 0.34, 0.22, 0.18, 0.26, 0.12, -0.16, 0.08],
  [0.38, -0.18, 0.14, 0.56, 0.5, 0.28, 0.2, 0.36, 0.18, 0.05],
  [0.18, 0.2, -0.24, 0.1, 0.08, 0.7, 0.54, 0.22, 0.12, 0.18],
  [-0.1, 0.38, 0.32, -0.2, 0.44, 0.22, 0.58, -0.06, -0.1, 0.2],
  [0.48, 0.12, 0.1, 0.42, -0.28, 0.38, -0.18, 0.48, 0.16, -0.12],
] as const;

const NEURAL_HIDDEN_BIASES = [0.02, -0.05, 0.03, -0.02, 0.01, 0.04] as const;
const NEURAL_OUTPUT_WEIGHTS = [0.48, 0.3, 0.36, 0.44, 0.28, 0.34] as const;
const NEURAL_OUTPUT_BIAS = 0;

const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, -20, -20, 10, 10, 5,
  5, -5, -10, 0, 0, -10, -5, 5,
  0, 0, 0, 25, 25, 0, 0, 0,
  5, 5, 10, 27, 27, 10, 5, 5,
  10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 5, 5, 0, 0, 0,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  5, 10, 10, 10, 10, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_MIDGAME_TABLE = [
  20, 30, 10, 0, 0, 10, 30, 20,
  20, 20, 0, 0, 0, 0, 20, 20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
];

const KING_ENDGAME_TABLE = [
  -50, -30, -20, -20, -20, -20, -30, -50,
  -30, -10, 0, 0, 0, 0, -10, -30,
  -30, 0, 20, 30, 30, 20, 0, -30,
  -30, 0, 30, 40, 40, 30, 0, -30,
  -30, 0, 30, 40, 40, 30, 0, -30,
  -30, 0, 20, 30, 30, 20, 0, -30,
  -30, -10, 0, 0, 0, 0, -10, -30,
  -50, -30, -20, -20, -20, -20, -30, -50,
];

const PIECE_SQUARE_TABLES = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
} as const;

const globalForEngineCache = globalThis as typeof globalThis & {
  __knightowlEngineCache?: Map<string, PositionAnalysis>;
};

type BoardPiece = NonNullable<ReturnType<Chess["board"]>[number][number]>;

type PawnSquare = {
  file: number;
  rank: number;
};

type KingSquare = {
  file: number;
  rank: number;
};

type PiecePlacement = {
  file: number;
  index: number;
  piece: BoardPiece;
  rank: number;
};

interface NeuralEvaluationFeatures {
  activityScore: number;
  bishopPairScore: number;
  checkScore: number;
  kingSafetyScore: number;
  materialSquareScore: number;
  middlegameFactor: number;
  pawnStructureScore: number;
  rookFileScore: number;
  sideToMove: number;
  spaceScore: number;
}

export const ENGINE_VERSION = "knightowl-search-4";

export interface EngineSearchSettings {
  maxNodes: number;
  searchDepth: number;
  quiescenceDepth: number;
  principalVariationCount: number;
  principalVariationLength: number;
}

export interface PositionAnalysis {
  bestMove: string;
  score: number;
  line: string[];
  engineLines: EngineLine[];
  depth: number;
  moveScores: Record<string, number>;
  nodes: number;
  tablebaseHits: number;
}

interface SearchResult {
  line: string[];
  score: number;
}

interface SearchContext {
  lineLength: number;
  maxNodes: number;
  nodes: number;
  quiescenceDepth: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getEngineCache() {
  if (!globalForEngineCache.__knightowlEngineCache) {
    globalForEngineCache.__knightowlEngineCache = new Map();
  }

  return globalForEngineCache.__knightowlEngineCache;
}

function normalizeFen(fen: string) {
  return fen.split(" ").slice(0, 4).join(" ");
}

function createEngineCacheKey(fen: string, settings: EngineSearchSettings) {
  return `${normalizeFen(fen)}|${settings.searchDepth}|${settings.quiescenceDepth}|${settings.principalVariationCount}|${settings.principalVariationLength}|${settings.maxNodes}`;
}

function mirrorIndex(index: number) {
  return index ^ 56;
}

function isInsideBoard(file: number, rank: number) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function isCoreCenter(file: number, rank: number) {
  return file >= 3 && file <= 4 && rank >= 3 && rank <= 4;
}

function isExtendedCenter(file: number, rank: number) {
  return file >= 2 && file <= 5 && rank >= 2 && rank <= 5;
}

function targetActivityValue(file: number, rank: number, baseValue: number) {
  if (isCoreCenter(file, rank)) {
    return baseValue + 5;
  }

  if (isExtendedCenter(file, rank)) {
    return baseValue + 2;
  }

  return baseValue;
}

function scoreActivityTarget(
  board: ReturnType<Chess["board"]>,
  file: number,
  rank: number,
  color: "w" | "b",
  baseValue: number,
) {
  if (!isInsideBoard(file, rank)) {
    return 0;
  }

  const target = board[rank][file];
  if (target?.color === color) {
    return 0;
  }

  const value = target ? baseValue + 3 : baseValue;
  return targetActivityValue(file, rank, value) * (color === "w" ? 1 : -1);
}

function scoreSlidingActivity(
  board: ReturnType<Chess["board"]>,
  file: number,
  rank: number,
  color: "w" | "b",
  directions: ReadonlyArray<readonly [number, number]>,
  baseValue: number,
) {
  let total = 0;

  for (const [fileDelta, rankDelta] of directions) {
    let targetFile = file + fileDelta;
    let targetRank = rank + rankDelta;

    while (isInsideBoard(targetFile, targetRank)) {
      const target = board[targetRank][targetFile];
      if (target?.color === color) {
        break;
      }

      total += targetActivityValue(targetFile, targetRank, target ? baseValue + 4 : baseValue) * (color === "w" ? 1 : -1);

      if (target) {
        break;
      }

      targetFile += fileDelta;
      targetRank += rankDelta;
    }
  }

  return total;
}

function terminalScoreForTurn(chess: Chess, ply: number) {
  if (chess.isCheckmate()) {
    return -CHECKMATE_SCORE + ply;
  }

  if (
    chess.isDraw() ||
    chess.isStalemate() ||
    chess.isInsufficientMaterial() ||
    chess.isThreefoldRepetition()
  ) {
    return 0;
  }

  return null;
}

function terminalScoreForWhite(chess: Chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? -CHECKMATE_SCORE : CHECKMATE_SCORE;
  }

  if (
    chess.isDraw() ||
    chess.isStalemate() ||
    chess.isInsufficientMaterial() ||
    chess.isThreefoldRepetition()
  ) {
    return 0;
  }

  return null;
}

function mixScores(middlegame: number, endgame: number, middlegameFactor: number) {
  return Math.round(middlegame * middlegameFactor + endgame * (1 - middlegameFactor));
}

function evaluatePieceSquare(piece: BoardPiece, index: number, middlegameFactor: number) {
  if (piece.type === "k") {
    const midgame = piece.color === "w" ? KING_MIDGAME_TABLE[index] : KING_MIDGAME_TABLE[mirrorIndex(index)];
    const endgame = piece.color === "w" ? KING_ENDGAME_TABLE[index] : KING_ENDGAME_TABLE[mirrorIndex(index)];
    return mixScores(midgame, endgame, middlegameFactor);
  }

  const table = PIECE_SQUARE_TABLES[piece.type];
  return piece.color === "w" ? table[index] : table[mirrorIndex(index)];
}

function hasPassedPawn(pawn: PawnSquare, enemyPawns: PawnSquare[], color: "w" | "b") {
  return !enemyPawns.some((enemy) => {
    if (Math.abs(enemy.file - pawn.file) > 1) {
      return false;
    }

    return color === "w" ? enemy.rank < pawn.rank : enemy.rank > pawn.rank;
  });
}

function evaluatePawnStructure(
  whitePawns: PawnSquare[],
  blackPawns: PawnSquare[],
  whitePawnFiles: number[],
  blackPawnFiles: number[],
) {
  let total = 0;

  for (let file = 0; file < 8; file += 1) {
    if (whitePawnFiles[file] > 1) {
      total -= (whitePawnFiles[file] - 1) * 14;
    }

    if (blackPawnFiles[file] > 1) {
      total += (blackPawnFiles[file] - 1) * 14;
    }
  }

  for (const pawn of whitePawns) {
    const isolated =
      (pawn.file === 0 || whitePawnFiles[pawn.file - 1] === 0) &&
      (pawn.file === 7 || whitePawnFiles[pawn.file + 1] === 0);
    if (isolated) {
      total -= 12;
    }

    if (hasPassedPawn(pawn, blackPawns, "w")) {
      total += 18 + (6 - pawn.rank) * 9;
    }
  }

  for (const pawn of blackPawns) {
    const isolated =
      (pawn.file === 0 || blackPawnFiles[pawn.file - 1] === 0) &&
      (pawn.file === 7 || blackPawnFiles[pawn.file + 1] === 0);
    if (isolated) {
      total += 12;
    }

    if (hasPassedPawn(pawn, whitePawns, "b")) {
      total -= 18 + (pawn.rank - 1) * 9;
    }
  }

  return total;
}

function evaluateRookFiles(whiteRooks: number[], blackRooks: number[], whitePawnFiles: number[], blackPawnFiles: number[]) {
  let total = 0;

  for (const file of whiteRooks) {
    if (whitePawnFiles[file] === 0 && blackPawnFiles[file] === 0) {
      total += 18;
    } else if (whitePawnFiles[file] === 0) {
      total += 10;
    }
  }

  for (const file of blackRooks) {
    if (whitePawnFiles[file] === 0 && blackPawnFiles[file] === 0) {
      total -= 18;
    } else if (blackPawnFiles[file] === 0) {
      total -= 10;
    }
  }

  return total;
}

function evaluateKingShelter(
  king: KingSquare | null,
  pawnSet: Set<string>,
  color: "w" | "b",
  middlegameFactor: number,
) {
  if (!king || middlegameFactor <= 0.15) {
    return 0;
  }

  const direction = color === "w" ? -1 : 1;
  let shelterScore = 0;

  for (let offset = -1; offset <= 1; offset += 1) {
    const file = king.file + offset;
    if (file < 0 || file > 7) {
      continue;
    }

    const frontRank = king.rank + direction;
    const supportRank = king.rank + direction * 2;

    if (pawnSet.has(`${file}:${frontRank}`)) {
      shelterScore += 14;
    } else if (pawnSet.has(`${file}:${supportRank}`)) {
      shelterScore += 6;
    } else {
      shelterScore -= 8;
    }
  }

  return Math.round(shelterScore * middlegameFactor) * (color === "w" ? 1 : -1);
}

function evaluatePieceActivity(pieces: PiecePlacement[], board: ReturnType<Chess["board"]>) {
  let total = 0;

  for (const placement of pieces) {
    const { file, piece, rank } = placement;

    if (piece.type === "p") {
      const direction = piece.color === "w" ? -1 : 1;
      total += scoreActivityTarget(board, file - 1, rank + direction, piece.color, 5);
      total += scoreActivityTarget(board, file + 1, rank + direction, piece.color, 5);
    }

    if (piece.type === "n") {
      for (const [fileDelta, rankDelta] of KNIGHT_OFFSETS) {
        total += scoreActivityTarget(board, file + fileDelta, rank + rankDelta, piece.color, 5);
      }
    }

    if (piece.type === "b") {
      total += scoreSlidingActivity(board, file, rank, piece.color, BISHOP_DIRECTIONS, 3);
    }

    if (piece.type === "r") {
      total += scoreSlidingActivity(board, file, rank, piece.color, ROOK_DIRECTIONS, 2);
    }

    if (piece.type === "q") {
      total += scoreSlidingActivity(board, file, rank, piece.color, QUEEN_DIRECTIONS, 2);
    }
  }

  return Math.round(total * 0.45);
}

function evaluateSpace(whitePawns: PawnSquare[], blackPawns: PawnSquare[]) {
  function pawnSpace(pawn: PawnSquare, color: "w" | "b") {
    const advancement = color === "w" ? 6 - pawn.rank : pawn.rank - 1;
    if (advancement <= 1) {
      return 0;
    }

    const fileWeight = pawn.file >= 2 && pawn.file <= 5 ? 6 : 3;
    return (advancement - 1) * fileWeight + (advancement >= 3 ? 2 : 0);
  }

  return (
    whitePawns.reduce((total, pawn) => total + pawnSpace(pawn, "w"), 0) -
    blackPawns.reduce((total, pawn) => total + pawnSpace(pawn, "b"), 0)
  );
}

function normalizeNeuralFeature(value: number, index: number) {
  return clamp(value / NEURAL_FEATURE_NORMALIZERS[index], -1, 1);
}

function evaluateNeuralNetwork(features: NeuralEvaluationFeatures) {
  const inputFeatures = [
    features.materialSquareScore,
    features.pawnStructureScore,
    features.rookFileScore,
    features.kingSafetyScore,
    features.bishopPairScore,
    features.activityScore,
    features.spaceScore,
    features.checkScore,
    features.middlegameFactor * 2 - 1,
    features.sideToMove,
  ].map(normalizeNeuralFeature);

  const hidden = NEURAL_HIDDEN_WEIGHTS.map((weights, neuronIndex) =>
    Math.tanh(
      NEURAL_HIDDEN_BIASES[neuronIndex] +
        weights.reduce((total, weight, featureIndex) => total + weight * inputFeatures[featureIndex], 0),
    ),
  );
  const output =
    NEURAL_OUTPUT_BIAS +
    NEURAL_OUTPUT_WEIGHTS.reduce((total, weight, index) => total + weight * hidden[index], 0);

  return Math.round(clamp(output * NEURAL_EVAL_SCALE, -95, 95));
}

function evaluateBoardState(chess: Chess) {
  const terminalScore = terminalScoreForWhite(chess);
  if (terminalScore !== null) {
    return terminalScore;
  }

  let materialSquareScore = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  let whiteKing: KingSquare | null = null;
  let blackKing: KingSquare | null = null;
  let phaseWeight = 0;

  const whitePawnFiles = Array.from({ length: 8 }, () => 0);
  const blackPawnFiles = Array.from({ length: 8 }, () => 0);
  const whitePawns: PawnSquare[] = [];
  const blackPawns: PawnSquare[] = [];
  const whiteRooks: number[] = [];
  const blackRooks: number[] = [];
  const pieces: PiecePlacement[] = [];

  const board = chess.board();
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank][file];
      if (!piece) {
        continue;
      }

      const index = rank * 8 + file;
      pieces.push({ file, index, piece, rank });
      phaseWeight += PIECE_PHASE[piece.type];

      if (piece.type === "b") {
        if (piece.color === "w") {
          whiteBishops += 1;
        } else {
          blackBishops += 1;
        }
      }

      if (piece.type === "p") {
        if (piece.color === "w") {
          whitePawnFiles[file] += 1;
          whitePawns.push({ file, rank });
        } else {
          blackPawnFiles[file] += 1;
          blackPawns.push({ file, rank });
        }
      }

      if (piece.type === "r") {
        if (piece.color === "w") {
          whiteRooks.push(file);
        } else {
          blackRooks.push(file);
        }
      }

      if (piece.type === "k") {
        if (piece.color === "w") {
          whiteKing = { file, rank };
        } else {
          blackKing = { file, rank };
        }
      }
    }
  }

  const middlegameFactor = clamp(phaseWeight / MIDGAME_WEIGHT_TOTAL, 0, 1);

  for (const placement of pieces) {
    const pieceValue =
      PIECE_VALUES[placement.piece.type] + evaluatePieceSquare(placement.piece, placement.index, middlegameFactor);
    materialSquareScore += placement.piece.color === "w" ? pieceValue : -pieceValue;
  }

  const pawnStructureScore = evaluatePawnStructure(whitePawns, blackPawns, whitePawnFiles, blackPawnFiles);
  const rookFileScore = evaluateRookFiles(whiteRooks, blackRooks, whitePawnFiles, blackPawnFiles);
  const whiteKingShelterScore = evaluateKingShelter(
    whiteKing,
    new Set(whitePawns.map((pawn) => `${pawn.file}:${pawn.rank}`)),
    "w",
    middlegameFactor,
  );
  const blackKingShelterScore = evaluateKingShelter(
    blackKing,
    new Set(blackPawns.map((pawn) => `${pawn.file}:${pawn.rank}`)),
    "b",
    middlegameFactor,
  );
  const kingSafetyScore = whiteKingShelterScore + blackKingShelterScore;
  const activityScore = evaluatePieceActivity(pieces, board);
  const spaceScore = evaluateSpace(whitePawns, blackPawns);
  let bishopPairScore = 0;
  let checkScore = 0;

  if (whiteBishops >= 2) {
    bishopPairScore += 32;
  }

  if (blackBishops >= 2) {
    bishopPairScore -= 32;
  }

  if (chess.inCheck()) {
    checkScore += chess.turn() === "w" ? -12 : 12;
  }

  const neuralScore = evaluateNeuralNetwork({
    activityScore,
    bishopPairScore,
    checkScore,
    kingSafetyScore,
    materialSquareScore,
    middlegameFactor,
    pawnStructureScore,
    rookFileScore,
    sideToMove: chess.turn() === "w" ? 1 : -1,
    spaceScore,
  });

  return (
    materialSquareScore +
    pawnStructureScore +
    rookFileScore +
    kingSafetyScore +
    activityScore +
    spaceScore +
    bishopPairScore +
    checkScore +
    neuralScore
  );
}

function evaluateForTurn(chess: Chess) {
  const whitePerspective = evaluateBoardState(chess);
  return chess.turn() === "w" ? whitePerspective : -whitePerspective;
}

function capturePriority(move: Move) {
  if (!move.isCapture() || !move.captured) {
    return 0;
  }

  return PIECE_VALUES[move.captured] * 10 - PIECE_VALUES[move.piece];
}

function orderMoves(moves: Move[]) {
  return [...moves].sort((left, right) => {
    const leftScore =
      capturePriority(left) +
      (left.promotion ? PIECE_VALUES[left.promotion] : 0) +
      (left.isKingsideCastle() || left.isQueensideCastle() ? 60 : 0) +
      (left.san.includes("#") ? 20_000 : 0) +
      (left.san.includes("+") ? 160 : 0);
    const rightScore =
      capturePriority(right) +
      (right.promotion ? PIECE_VALUES[right.promotion] : 0) +
      (right.isKingsideCastle() || right.isQueensideCastle() ? 60 : 0) +
      (right.san.includes("#") ? 20_000 : 0) +
      (right.san.includes("+") ? 160 : 0);

    return rightScore - leftScore;
  });
}

function reachedNodeBudget(context: SearchContext) {
  return context.nodes >= context.maxNodes;
}

function quiescenceSearch(
  chess: Chess,
  alpha: number,
  beta: number,
  depth: number,
  ply: number,
  context: SearchContext,
): SearchResult {
  const terminalScore = terminalScoreForTurn(chess, ply);
  if (terminalScore !== null) {
    return { line: [], score: terminalScore };
  }

  if (reachedNodeBudget(context)) {
    return { line: [], score: evaluateForTurn(chess) };
  }

  const standPat = evaluateForTurn(chess);
  if (depth === 0 || standPat >= beta) {
    return { line: [], score: standPat };
  }

  let bestScore = standPat;
  let bestLine: string[] = [];
  let currentAlpha = Math.max(alpha, standPat);
  const tacticalMoves = orderMoves(chess.moves({ verbose: true })).filter(
    (move) => move.isCapture() || Boolean(move.promotion) || move.san.includes("+"),
  );

  for (const move of tacticalMoves) {
    chess.move(move);
    context.nodes += 1;
    const candidate = quiescenceSearch(chess, -beta, -currentAlpha, depth - 1, ply + 1, context);
    const score = -candidate.score;
    chess.undo();

    if (score > bestScore) {
      bestScore = score;
      bestLine = [move.san, ...candidate.line].slice(0, context.lineLength);
    }

    if (score > currentAlpha) {
      currentAlpha = score;
    }

    if (currentAlpha >= beta) {
      break;
    }
  }

  return {
    line: bestLine,
    score: bestScore,
  };
}

function negamax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  context: SearchContext,
): SearchResult {
  const terminalScore = terminalScoreForTurn(chess, ply);
  if (terminalScore !== null) {
    return { line: [], score: terminalScore };
  }

  if (reachedNodeBudget(context)) {
    return { line: [], score: evaluateForTurn(chess) };
  }

  if (depth === 0) {
    return quiescenceSearch(chess, alpha, beta, context.quiescenceDepth, ply, context);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  if (moves.length === 0) {
    return { line: [], score: evaluateForTurn(chess) };
  }

  let bestScore = -SEARCH_INFINITY;
  let bestLine: string[] = [];
  let currentAlpha = alpha;

  for (const move of moves) {
    chess.move(move);
    context.nodes += 1;
    const candidate = negamax(chess, depth - 1, -beta, -currentAlpha, ply + 1, context);
    const score = -candidate.score;
    chess.undo();

    if (score > bestScore) {
      bestScore = score;
      bestLine = [move.san, ...candidate.line].slice(0, context.lineLength);
    }

    if (score > currentAlpha) {
      currentAlpha = score;
    }

    if (currentAlpha >= beta) {
      break;
    }
  }

  return {
    line: bestLine,
    score: bestScore,
  };
}

export function getEngineSearchSettings(
  requestedDepth: AnalysisDepth,
  surface: "report" | "position" = "report",
): EngineSearchSettings {
  if (surface === "position") {
    return requestedDepth === "deep"
      ? {
          maxNodes: 3_000,
          searchDepth: 3,
          quiescenceDepth: 7,
          principalVariationCount: 5,
          principalVariationLength: 6,
        }
      : {
          maxNodes: 1_400,
          searchDepth: 2,
          quiescenceDepth: 5,
          principalVariationCount: 5,
          principalVariationLength: 5,
        };
  }

  return requestedDepth === "deep"
    ? {
        maxNodes: 520,
        searchDepth: 3,
        quiescenceDepth: 4,
        principalVariationCount: 5,
        principalVariationLength: 5,
      }
    : {
        maxNodes: 180,
        searchDepth: 1,
        quiescenceDepth: 3,
        principalVariationCount: 5,
        principalVariationLength: 4,
      };
}

export function evaluateFenMaterial(fen: string) {
  return evaluateBoardState(new Chess(fen));
}

export function analyzePosition(
  fen: string,
  settings: EngineSearchSettings,
): PositionAnalysis {
  const cacheKey = createEngineCacheKey(fen, settings);
  const cached = getEngineCache().get(cacheKey);
  if (cached) {
    return {
      ...cached,
      engineLines: cached.engineLines.map((line) => ({ ...line, line: [...line.line] })),
      line: [...cached.line],
      moveScores: { ...cached.moveScores },
    };
  }

  const chess = new Chess(fen);
  const rootTurn = chess.turn();
  const moves = orderMoves(chess.moves({ verbose: true }));

  if (moves.length === 0) {
    const score = terminalScoreForWhite(chess) ?? evaluateBoardState(chess);
    const emptyResult = {
      bestMove: "none",
      depth: settings.searchDepth,
      engineLines: [],
      line: [],
      moveScores: {},
      nodes: 0,
      score,
      tablebaseHits: 0,
    } satisfies PositionAnalysis;
    getEngineCache().set(cacheKey, emptyResult);
    return { ...emptyResult, moveScores: {} };
  }

  const context: SearchContext = {
    lineLength: settings.principalVariationLength,
    maxNodes: settings.maxNodes,
    nodes: 0,
    quiescenceDepth: settings.quiescenceDepth,
  };
  const moveScores: Record<string, number> = {};
  const moveCandidates: Array<{
    line: string[];
    san: string;
    scoreForTurn: number;
    whiteScore: number;
  }> = [];
  let bestMove = moves[0];
  let bestScoreForTurn = -SEARCH_INFINITY;
  let bestLine = [moves[0].san];

  for (const move of moves) {
    chess.move(move);
    context.nodes += 1;
    const candidate =
      settings.searchDepth === 1
        ? move.isCapture() || Boolean(move.promotion) || move.san.includes("+")
          ? quiescenceSearch(
              chess,
              -SEARCH_INFINITY,
              SEARCH_INFINITY,
              Math.min(2, settings.quiescenceDepth),
              1,
              context,
            )
          : { line: [], score: evaluateForTurn(chess) }
        : negamax(chess, settings.searchDepth - 1, -SEARCH_INFINITY, SEARCH_INFINITY, 1, context);
    const scoreForTurn = -candidate.score;
    chess.undo();

    const whiteScore = rootTurn === "w" ? scoreForTurn : -scoreForTurn;
    const line = [move.san, ...candidate.line].slice(0, settings.principalVariationLength);
    moveScores[move.san] = whiteScore;
    moveCandidates.push({
      line,
      san: move.san,
      scoreForTurn,
      whiteScore,
    });

    if (scoreForTurn > bestScoreForTurn) {
      bestMove = move;
      bestScoreForTurn = scoreForTurn;
      bestLine = line;
    }
  }

  const engineLines = moveCandidates
    .sort((left, right) => right.scoreForTurn - left.scoreForTurn)
    .slice(0, settings.principalVariationCount)
    .map((candidate, index) => ({
      depth: settings.searchDepth,
      line: candidate.line,
      nodes: context.nodes,
      rank: index + 1,
      san: candidate.san,
      score: candidate.whiteScore,
    }));

  const result = {
    bestMove: bestMove.san,
    depth: settings.searchDepth,
    engineLines,
    line: bestLine,
    moveScores,
    nodes: context.nodes,
    score: rootTurn === "w" ? bestScoreForTurn : -bestScoreForTurn,
    tablebaseHits: 0,
  } satisfies PositionAnalysis;

  getEngineCache().set(cacheKey, result);
  return {
    ...result,
    engineLines: result.engineLines.map((line) => ({ ...line, line: [...line.line] })),
    line: [...result.line],
    moveScores: { ...result.moveScores },
  };
}

export function pickBestMove(fen: string, requestedDepth: AnalysisDepth = "quick") {
  const result = analyzePosition(fen, getEngineSearchSettings(requestedDepth, "position"));

  return {
    san: result.bestMove,
    score: result.score,
    line: result.line,
  };
}
