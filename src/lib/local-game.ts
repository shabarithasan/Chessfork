import { Chess } from "chess.js";

export type LocalTimeControl = "unlimited" | "1" | "3" | "5" | "10" | "custom";
export type LocalGameEndReason =
  | "checkmate"
  | "stalemate"
  | "threefold repetition"
  | "fifty-move rule"
  | "insufficient material"
  | "agreement"
  | "resignation"
  | "timeout";

export type LocalGameEnd = {
  reason: LocalGameEndReason;
  result: "1-0" | "0-1" | "1/2-1/2";
  winner?: "white" | "black";
};

export type SavedLocalGame = {
  id: string;
  white: string;
  black: string;
  result: string;
  winner?: "white" | "black";
  moveCount: number;
  pgn: string;
  finalFen: string;
  createdAt: string;
  timeControl: string;
  analysisStatus: "pending" | "complete" | "failed";
  reportId?: string;
};

export const LOCAL_GAMES_STORAGE_KEY = "chessfork:local-games";

export function timeControlSeconds(control: LocalTimeControl, customMinutes?: number) {
  if (control === "unlimited") return null;
  if (control === "custom") return Math.max(1, customMinutes ?? 15) * 60;
  return Number(control) * 60;
}

export function timeControlLabel(control: LocalTimeControl, customMinutes?: number) {
  if (control === "unlimited") return "Unlimited";
  const minutes = control === "custom" ? Math.max(1, customMinutes ?? 15) : Number(control);
  return `${minutes} min`;
}

export function getAutomaticGameEnd(game: Chess): LocalGameEnd | null {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "black" : "white";
    return { reason: "checkmate", winner, result: winner === "white" ? "1-0" : "0-1" };
  }
  if (game.isStalemate()) return { reason: "stalemate", result: "1/2-1/2" };
  if (game.isThreefoldRepetition()) return { reason: "threefold repetition", result: "1/2-1/2" };
  if (game.isDrawByFiftyMoves()) return { reason: "fifty-move rule", result: "1/2-1/2" };
  if (game.isInsufficientMaterial()) return { reason: "insufficient material", result: "1/2-1/2" };
  return null;
}

function pgnValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function buildLocalGamePgn(params: {
  game: Chess;
  white: string;
  black: string;
  result: LocalGameEnd["result"];
  timeControl: string;
  playedAt: Date;
}) {
  const date = params.playedAt.toISOString().slice(0, 10).replaceAll("-", ".");
  params.game.header(
    "Event", "Chessfork Local Game",
    "Site", "Chessfork",
    "Date", date,
    "Round", "-",
    "White", pgnValue(params.white),
    "Black", pgnValue(params.black),
    "Result", params.result,
    "TimeControl", params.timeControl,
  );
  return params.game.pgn({ maxWidth: 0, newline: "\n" });
}

export function saveLocalGame(game: SavedLocalGame) {
  if (typeof window === "undefined") return;
  const existing: SavedLocalGame[] = (() => {
    try { return JSON.parse(window.localStorage.getItem(LOCAL_GAMES_STORAGE_KEY) ?? "[]") as SavedLocalGame[]; } catch { return []; }
  })();
  const withoutCurrent = existing.filter((item) => item.id !== game.id);
  window.localStorage.setItem(LOCAL_GAMES_STORAGE_KEY, JSON.stringify([game, ...withoutCurrent].slice(0, 50)));
}
