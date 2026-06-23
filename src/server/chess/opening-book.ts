import { open, stat } from "node:fs/promises";
import path from "node:path";

import { Chess } from "chess.js";

import { env } from "@/server/env";

import { POLYGLOT_RANDOM } from "./polyglot-random";

const POLYGLOT_RECORD_BYTES = 16;
const POLYGLOT_CASTLING_OFFSET = 768;
const POLYGLOT_EN_PASSANT_OFFSET = 772;
const POLYGLOT_WHITE_TO_MOVE_OFFSET = 780;

type NativePolyglot = {
  find(fen: string, bookPath: string, random?: boolean): string;
};

type NativePolyglotConstructor = new () => NativePolyglot;

type PolyglotRecord = {
  key: bigint;
  learn: number;
  move: number;
  weight: number;
};

export type OpeningBookMove = {
  learn: number;
  uci: string;
  weight: number;
};

export type OpeningBookLookup = {
  bestMove?: OpeningBookMove;
  bookPath: string | null;
  enabled: boolean;
  hit: boolean;
  matchingMove?: OpeningBookMove;
  maxBookPlies: number;
  moves: OpeningBookMove[];
  nativeBestMoveUci?: string | null;
  reason?: string;
};

const nativePolyglotPackageName = ["chess", "polyglot"].join("-");
let nativePolyglotConstructor: NativePolyglotConstructor | null | undefined;

async function getNativePolyglotConstructor() {
  if (nativePolyglotConstructor !== undefined) {
    return nativePolyglotConstructor;
  }

  try {
    const required = (await import(/* turbopackIgnore: true */ nativePolyglotPackageName)) as unknown;
    const candidate =
      typeof required === "function"
        ? required
        : typeof (required as { default?: unknown }).default === "function"
          ? (required as { default: unknown }).default
          : null;
    nativePolyglotConstructor = candidate as NativePolyglotConstructor | null;
  } catch {
    nativePolyglotConstructor = null;
  }

  return nativePolyglotConstructor;
}

async function findNativeBestMove(fen: string, bookPath: string) {
  const Polyglot = await getNativePolyglotConstructor();
  if (!Polyglot) {
    return null;
  }

  try {
    const move = new Polyglot().find(fen, bookPath, false);
    return move ? normalizeUciCastling(move) : null;
  } catch {
    return null;
  }
}

function resolveOpeningBookPath(bookPath = env.OPENING_BOOK_PATH) {
  const trimmed = bookPath.trim();
  if (!trimmed) {
    return "";
  }

  if (path.isAbsolute(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.replaceAll("\\", "/");
  const vendorBookPath = normalizedPath.startsWith("vendor/books/")
    ? normalizedPath.slice("vendor/books/".length)
    : path.basename(normalizedPath);

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "vendor", "books", vendorBookPath);
}

function randomAt(index: number) {
  return POLYGLOT_RANDOM[index] ?? BigInt(0);
}

function pieceIndex(piece: { color: "b" | "w"; type: string }) {
  const baseByPiece: Record<string, number> = {
    p: 0,
    n: 2,
    b: 4,
    r: 6,
    q: 8,
    k: 10,
  };

  return baseByPiece[piece.type] + (piece.color === "w" ? 1 : 0);
}

function hasEnPassantCapturingPawn(
  board: ReturnType<Chess["board"]>,
  turn: "b" | "w",
  epFile: number,
  epRank: number,
) {
  const pawnRank = turn === "w" ? epRank - 1 : epRank + 1;
  if (pawnRank < 0 || pawnRank > 7) {
    return false;
  }

  return [epFile - 1, epFile + 1].some((file) => {
    if (file < 0 || file > 7) {
      return false;
    }

    const piece = board[7 - pawnRank]?.[file];
    return piece?.type === "p" && piece.color === turn;
  });
}

export function polyglotHashFen(fen: string) {
  const chess = new Chess(fen);
  const board = chess.board();
  const fields = fen.split(/\s+/);
  const castling = fields[2] ?? "-";
  const enPassantSquare = fields[3] ?? "-";
  let key = BigInt(0);

  for (let row = 0; row < board.length; row += 1) {
    for (let file = 0; file < board[row].length; file += 1) {
      const piece = board[row][file];
      if (!piece) {
        continue;
      }

      const rank = 7 - row;
      const square = rank * 8 + file;
      key ^= randomAt(pieceIndex(piece) * 64 + square);
    }
  }

  if (castling.includes("K")) key ^= randomAt(POLYGLOT_CASTLING_OFFSET);
  if (castling.includes("Q")) key ^= randomAt(POLYGLOT_CASTLING_OFFSET + 1);
  if (castling.includes("k")) key ^= randomAt(POLYGLOT_CASTLING_OFFSET + 2);
  if (castling.includes("q")) key ^= randomAt(POLYGLOT_CASTLING_OFFSET + 3);

  if (enPassantSquare !== "-") {
    const epFile = enPassantSquare.charCodeAt(0) - "a".charCodeAt(0);
    const epRank = Number(enPassantSquare[1]) - 1;
    if (hasEnPassantCapturingPawn(board, chess.turn(), epFile, epRank)) {
      key ^= randomAt(POLYGLOT_EN_PASSANT_OFFSET + epFile);
    }
  }

  if (chess.turn() === "w") {
    key ^= randomAt(POLYGLOT_WHITE_TO_MOVE_OFFSET);
  }

  return key;
}

function normalizeUciCastling(uci: string) {
  const normalized = uci.toLowerCase();
  const castlingMoves: Record<string, string> = {
    e1a1: "e1c1",
    e1h1: "e1g1",
    e8a8: "e8c8",
    e8h8: "e8g8",
  };

  return castlingMoves[normalized] ?? normalized;
}

function decodePolyglotMove(move: number) {
  const files = "abcdefgh";
  const promotionPieces: Record<number, string> = {
    1: "n",
    2: "b",
    3: "r",
    4: "q",
  };
  const toFile = move & 0b111;
  const toRank = (move >> 3) & 0b111;
  const fromFile = (move >> 6) & 0b111;
  const fromRank = (move >> 9) & 0b111;
  const promotion = (move >> 12) & 0b111;
  const uci = `${files[fromFile]}${fromRank + 1}${files[toFile]}${toRank + 1}${promotionPieces[promotion] ?? ""}`;

  return normalizeUciCastling(uci);
}

type BookFileHandle = Awaited<ReturnType<typeof open>>;

async function readRecord(file: BookFileHandle, index: number): Promise<PolyglotRecord | null> {
  const buffer = Buffer.alloc(POLYGLOT_RECORD_BYTES);
  const { bytesRead } = await file.read(buffer, 0, POLYGLOT_RECORD_BYTES, index * POLYGLOT_RECORD_BYTES);

  if (bytesRead !== POLYGLOT_RECORD_BYTES) {
    return null;
  }

  return {
    key: buffer.readBigUInt64BE(0),
    move: buffer.readUInt16BE(8),
    weight: buffer.readUInt16BE(10),
    learn: buffer.readUInt32BE(12),
  };
}

async function recordCountForBook(bookPath: string) {
  const info = await stat(/*turbopackIgnore: true*/ bookPath).catch(() => null);
  if (!info?.isFile() || info.size % POLYGLOT_RECORD_BYTES !== 0) {
    return 0;
  }

  return info.size / POLYGLOT_RECORD_BYTES;
}

export async function findOpeningBookMoves(fen: string, bookPath = env.OPENING_BOOK_PATH) {
  const resolvedBookPath = resolveOpeningBookPath(bookPath);
  if (!resolvedBookPath) {
    return [];
  }

  const recordCount = await recordCountForBook(resolvedBookPath);
  if (recordCount === 0) {
    return [];
  }

  const targetKey = polyglotHashFen(fen);
  const file = await open(/*turbopackIgnore: true*/ resolvedBookPath, "r");

  try {
    let low = 0;
    let high = recordCount - 1;
    let firstMatch = -1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const record = await readRecord(file, middle);
      if (!record) {
        break;
      }

      if (record.key < targetKey) {
        low = middle + 1;
      } else {
        if (record.key === targetKey) {
          firstMatch = middle;
        }
        high = middle - 1;
      }
    }

    if (firstMatch < 0) {
      return [];
    }

    const moves: OpeningBookMove[] = [];
    for (let index = firstMatch; index < recordCount; index += 1) {
      const record = await readRecord(file, index);
      if (!record || record.key !== targetKey) {
        break;
      }

      moves.push({
        learn: record.learn,
        uci: decodePolyglotMove(record.move),
        weight: record.weight,
      });
    }

    return moves.sort((left, right) => right.weight - left.weight);
  } finally {
    await file.close();
  }
}

export async function lookupOpeningBookMove(params: { fen: string; playedUci: string; ply: number }) {
  const bookPath = resolveOpeningBookPath();
  const maxBookPlies = env.STOCKFISH_OPENING_BOOK_MAX_PLIES;

  if (!bookPath) {
    return {
      bookPath: null,
      enabled: false,
      hit: false,
      maxBookPlies,
      moves: [],
      reason: "No opening book path configured.",
    } satisfies OpeningBookLookup;
  }

  if (maxBookPlies <= 0 || params.ply > maxBookPlies) {
    return {
      bookPath,
      enabled: true,
      hit: false,
      maxBookPlies,
      moves: [],
      reason: "Move is outside the configured opening-book window.",
    } satisfies OpeningBookLookup;
  }

  const moves = await findOpeningBookMoves(params.fen, bookPath);
  const playedUci = normalizeUciCastling(params.playedUci);
  const matchingMove = moves.find((move) => move.uci === playedUci);
  const nativeBestMoveUci = await findNativeBestMove(params.fen, bookPath);

  return {
    bestMove: moves[0],
    bookPath,
    enabled: true,
    hit: Boolean(matchingMove),
    matchingMove,
    maxBookPlies,
    moves,
    nativeBestMoveUci,
  } satisfies OpeningBookLookup;
}

export function openingBookCacheSignature() {
  const bookPath = resolveOpeningBookPath();
  return bookPath ? `${bookPath}:${env.STOCKFISH_OPENING_BOOK_MAX_PLIES}` : "disabled";
}

export async function getOpeningBookStatus() {
  const bookPath = resolveOpeningBookPath();
  const info = bookPath ? await stat(/*turbopackIgnore: true*/ bookPath).catch(() => null) : null;

  return {
    configured: Boolean(bookPath),
    exists: Boolean(info?.isFile()),
    maxBookPlies: env.STOCKFISH_OPENING_BOOK_MAX_PLIES,
    nativePackageAvailable: Boolean(await getNativePolyglotConstructor()),
    path: bookPath || null,
    records: info?.isFile() && info.size % POLYGLOT_RECORD_BYTES === 0 ? info.size / POLYGLOT_RECORD_BYTES : 0,
    sizeBytes: info?.isFile() ? info.size : 0,
  };
}
