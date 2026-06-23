import type { OpeningTag } from "@/types/platform";

const openingBook = [
  {
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    opening: { eco: "C60", name: "Ruy Lopez" },
  },
  {
    moves: ["e4", "c5"],
    opening: { eco: "B20", name: "Sicilian Defence" },
  },
  {
    moves: ["d4", "Nf6", "c4", "g6"],
    opening: { eco: "E60", name: "King's Indian Defence" },
  },
  {
    moves: ["d4", "d5", "c4", "e6"],
    opening: { eco: "D30", name: "Queen's Gambit Declined" },
  },
  {
    moves: ["e4", "e5", "Nf3", "Nf6"],
    opening: { eco: "C42", name: "Petrov Defence" },
  },
] satisfies Array<{ moves: string[]; opening: OpeningTag }>;

function cleanOpeningText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseOpeningSlug(value: string) {
  const title = cleanOpeningText(
    value
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
  );

  return title
    .replace(/\bCaro Kann\b/g, "Caro-Kann")
    .replace(/\bKing S\b/g, "King's")
    .replace(/\bQueen S\b/g, "Queen's");
}

function openingNameFromEcoUrl(value?: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const slug = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return titleCaseOpeningSlug(decodeURIComponent(slug));
  } catch {
    const slug = value.split("?")[0].split("/").filter(Boolean).at(-1) ?? "";
    return titleCaseOpeningSlug(decodeURIComponent(slug));
  }
}

function splitOpeningName(value: string) {
  const [name, ...variationParts] = value.split(":");
  const variation = cleanOpeningText(variationParts.join(":"));

  return {
    name: cleanOpeningText(name),
    variation: variation || undefined,
  };
}

export function formatOpeningName(opening: OpeningTag) {
  return opening.variation ? `${opening.name}: ${opening.variation}` : opening.name;
}

export function detectOpening(moves: string[], headers: Record<string, string> = {}): OpeningTag {
  const headerName = headers.Opening || headers.Variation || openingNameFromEcoUrl(headers.ECOUrl);
  const headerEco = cleanOpeningText(headers.ECO ?? "");

  if (headerName) {
    return {
      eco: headerEco || "A00",
      ...splitOpeningName(headerName),
    };
  }

  for (const entry of openingBook) {
    if (entry.moves.every((move, index) => moves[index] === move)) {
      return headerEco ? { ...entry.opening, eco: headerEco } : entry.opening;
    }
  }

  return { eco: headerEco || "A00", name: "Irregular Opening" };
}
