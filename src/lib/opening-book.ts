"use client";

export interface OpeningBookLine {
  uci: string;
  san: string;
}

const cache = new Map<string, OpeningBookLine[] | null>();
const requests = new Map<string, Promise<OpeningBookLine[] | null>>();

/**
 * Browser-only Lichess Masters opening cache. The explorer provides proven
 * candidate moves (not a numerical engine score), so callers display a
 * neutral book evaluation and skip Stockfish only after a cached hit.
 */
export function lookupOpeningBook(fen: string): Promise<OpeningBookLine[] | null> {
  if (cache.has(fen)) return Promise.resolve(cache.get(fen) ?? null);
  const existing = requests.get(fen);
  if (existing) return existing;

  const request = fetch(`https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}`)
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as { moves?: Array<{ uci?: string; san?: string }> };
      const lines = (data.moves ?? [])
        .filter((move): move is { uci: string; san: string } => Boolean(move.uci && move.san))
        .slice(0, 3)
        .map(({ uci, san }) => ({ uci, san }));
      return lines.length > 0 ? lines : null;
    })
    .catch(() => null)
    .then((result) => {
      cache.set(fen, result);
      requests.delete(fen);
      return result;
    });

  requests.set(fen, request);
  return request;
}
