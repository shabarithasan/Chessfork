import ecoEntries from "../../../data/eco.json";

import { parsePgn, readHeaders } from "@/lib/chess/pgn";
import type { OpeningTag } from "@/types/platform";

type EcoEntry = {
  code: string;
  moves: string;
  name: string;
};

const typedEcoEntries = ecoEntries as EcoEntry[];

function normalizeMoves(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitOpeningName(value: string) {
  const [name, ...variationParts] = value.split(":");
  const variation = variationParts.join(":").trim();

  return {
    name: name.trim(),
    variation: variation || undefined,
  };
}

export function detectOpeningFromPgn(pgn: string): OpeningTag {
  const headers = readHeaders(pgn);
  const headerOpening = headers.Opening || headers.Variation;

  if (headerOpening) {
    return {
      eco: headers.ECO || "A00",
      ...splitOpeningName(headerOpening),
    };
  }

  const playedMoves = parsePgn(pgn).map((move) => move.san.replace(/[+#?!]+$/g, ""));
  const playedLine = normalizeMoves(playedMoves.join(" "));
  let bestMatch: EcoEntry | undefined;
  let bestLength = 0;

  for (const entry of typedEcoEntries) {
    const entryMoves = normalizeMoves(entry.moves);

    if (entryMoves.length <= bestLength) {
      continue;
    }

    if (playedLine === entryMoves || playedLine.startsWith(`${entryMoves} `)) {
      bestMatch = entry;
      bestLength = entryMoves.length;
    }
  }

  if (!bestMatch) {
    return {
      eco: headers.ECO || "A00",
      name: "Irregular Opening",
    };
  }

  return {
    eco: bestMatch.code,
    name: bestMatch.name,
  };
}

export function countPgnPlies(pgn: string) {
  return parsePgn(pgn).length;
}
