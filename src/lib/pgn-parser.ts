import { Chess } from "chess.js";

export interface GameHeaders {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white: string;
  black: string;
  result: string;
  whiteElo?: string;
  blackElo?: string;
  timeControl?: string;
  eco?: string;
  opening?: string;
}

export interface ParsedMove {
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isCapture: boolean;
  piece: string;
  promotion?: string;
}

export function parseHeaders(pgn: string): GameHeaders {
  const headers: Record<string, string> = {};
  for (const line of pgn.split("\n")) {
    const match = line.match(/^\[(\w+)\s+"(.+)"\]$/);
    if (match) {
      headers[match[1]] = match[2];
    }
  }
  return {
    event: headers.Event,
    site: headers.Site,
    date: headers.Date,
    round: headers.Round,
    white: headers.White ?? "White",
    black: headers.Black ?? "Black",
    result: headers.Result ?? "*",
    whiteElo: headers.WhiteElo,
    blackElo: headers.BlackElo,
    timeControl: headers.TimeControl,
    eco: headers.ECO,
    opening: headers.Opening,
  };
}

export function parseMoves(pgn: string): ParsedMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }

  const history = chess.history({ verbose: true });
  const moves: ParsedMove[] = [];

  const replay = new Chess();
  for (const entry of history) {
    const fenBefore = replay.fen();
    const piece = replay.get(entry.from as import("chess.js").Square);
    replay.move(entry.san);

    moves.push({
      san: entry.san,
      from: entry.from,
      to: entry.to,
      fenBefore,
      fenAfter: replay.fen(),
      isCheck: replay.isCheck(),
      isCheckmate: replay.isCheckmate(),
      isCapture: entry.captured !== undefined,
      piece: entry.piece,
      promotion: entry.promotion,
    });
  }

  return moves;
}

export function validatePgn(pgn: string): { valid: boolean; error?: string } {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history();
    if (history.length === 0) {
      return { valid: false, error: "No moves found in PGN" };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

export function getFenAtMove(moves: ParsedMove[], moveIndex: number): string {
  if (moveIndex < 0) {
    return new Chess().fen();
  }
  if (moveIndex >= moves.length) {
    return moves[moves.length - 1]?.fenAfter ?? new Chess().fen();
  }
  return moves[moveIndex].fenAfter;
}

export function getSanAtMove(moves: ParsedMove[], moveIndex: number): string {
  if (moveIndex < 0 || moveIndex >= moves.length) return "";
  return moves[moveIndex].san;
}

export function getMoveNumber(moveIndex: number): number {
  return Math.floor(moveIndex / 2) + 1;
}

export function getSide(moveIndex: number): "white" | "black" {
  return moveIndex % 2 === 0 ? "white" : "black";
}

const EXAMPLE_PGNS: Record<string, string> = {
  "Immortal Game": `[Event "Casual"]
[Site "London"]
[Date "1851.??.??"]
[Round "?"]
[White "Anderssen, Adolf"]
[Black "Kieseritzky, Lionel"]
[Result "1-0"]
[WhiteElo ""]
[BlackElo ""]
[TimeControl "-"]
[ECO "C33"]

1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5
8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5
14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1
19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`,

  "Opera Game": `[Event "Opera"]
[Site "Paris"]
[Date "1858.??.??"]
[Round "?"]
[White "Morphy, Paul"]
[Black "Duke of Brunswick / Count Isouard"]
[Result "1-0"]
[WhiteElo ""]
[BlackElo ""]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6
7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7
12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8
17. Rd8# 1-0`,
};

export function getExamplePgns(): Record<string, string> {
  return EXAMPLE_PGNS;
}

export function convertToSan(moves: ParsedMove[], from: string, to: string, promotion?: string): string | null {
  const chess = new Chess();
  for (const m of moves) {
    try {
      chess.move(m.san);
    } catch {
      return null;
    }
  }
  const legalMoves = chess.moves({ verbose: true });
  const match = legalMoves.find((m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion));
  return match?.san ?? null;
}
