import { Chess } from "chess.js";

export function parsePgn(pgn: string) {
  const chess = new Chess();
  chess.loadPgn(pgn);

  return chess.history({ verbose: true });
}

export function readHeaders(pgn: string) {
  const headers: Record<string, string> = {};

  for (const line of pgn.split("\n")) {
    const match = line.match(/^\[(\w+)\s+"(.+)"\]$/);
    if (match) {
      headers[match[1]] = match[2];
    }
  }

  return headers;
}
