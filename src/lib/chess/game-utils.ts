export function mergeGamePages<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const seen = new Set(existing.map((game) => game.id));
  const merged = [...existing];

  for (const game of incoming) {
    if (!seen.has(game.id)) {
      seen.add(game.id);
      merged.push(game);
    }
  }

  return merged;
}
