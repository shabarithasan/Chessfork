import { Chess } from "chess.js";

export function normalizeFen(fen: string) {
  const chess = new Chess();
  chess.load(fen);

  const [board, turn, castling, ep] = chess.fen().split(" ");
  return [board, turn, castling, ep].join(" ");
}

export function expandFenBoard(fen: string) {
  const [boardPart] = fen.split(" ");

  return boardPart.split("/").map((rank) => {
    const squares: string[] = [];

    for (const char of rank) {
      if (/\d/.test(char)) {
        const count = Number.parseInt(char, 10);
        for (let index = 0; index < count; index += 1) {
          squares.push("");
        }
      } else {
        squares.push(char);
      }
    }

    return squares;
  });
}
