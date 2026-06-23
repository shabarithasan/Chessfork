import { Chess } from "chess.js";

export type GameLoadingPreview = {
  previewFen?: string;
  previewMove?: {
    from: string;
    ply: number;
    san: string;
    to: string;
  };
  previewMoveCount?: number;
};

export function buildGameLoadingPreview(pgn: string, preferredPly = 8): GameLoadingPreview {
  const source = new Chess();

  try {
    source.loadPgn(pgn);
  } catch {
    return {};
  }

  const moves = source.history({ verbose: true });
  if (moves.length === 0) {
    return {
      previewFen: new Chess().fen(),
      previewMoveCount: 0,
    };
  }

  const replay = new Chess();
  const targetPly = Math.max(1, Math.min(preferredPly, moves.length));
  let previewMove: GameLoadingPreview["previewMove"];

  for (let index = 0; index < targetPly; index += 1) {
    const move = replay.move(moves[index].san);
    if (!move) {
      break;
    }

    previewMove = {
      from: move.from,
      ply: index + 1,
      san: move.san,
      to: move.to,
    };
  }

  return {
    previewFen: replay.fen(),
    previewMove,
    previewMoveCount: moves.length,
  };
}
