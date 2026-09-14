export interface SeoOpening {
  description: string;
  eco: string;
  name: string;
  slug: string;
  variations: string[];
  mainLine?: string[];
  trainColor?: "white" | "black";
}

export const topChessOpenings = [
  {
    name: "Sicilian Defense",
    slug: "sicilian-defense",
    mainLine: ["e4","c5"],
    trainColor: "black",
    eco: "B20",
    description: "A sharp reply to 1.e4 where Black fights for imbalance from the first moves.",
    variations: ["Najdorf Variation", "Dragon Variation", "Classical Variation", "Alapin Variation"],
  },
  {
    name: "French Defense",
    slug: "french-defense",
    mainLine: ["e4","e6","d4","d5"],
    trainColor: "black",
    eco: "C00",
    description: "A resilient 1.e4 defense built around central tension and counterplay against White's pawn chain.",
    variations: ["Winawer Variation", "Tarrasch Variation", "Advance Variation", "Exchange Variation"],
  },
  {
    name: "Ruy Lopez",
    slug: "ruy-lopez",
    mainLine: ["e4","e5","Nf3","Nc6","Bb5"],
    trainColor: "white",
    eco: "C60",
    description: "A classical king-pawn opening that pressures the knight on c6 and builds long-term central control.",
    variations: ["Morphy Defense", "Exchange Variation", "Berlin Defense", "Closed Ruy Lopez"],
  },
  {
    name: "Italian Game",
    slug: "italian-game",
    mainLine: ["e4","e5","Nf3","Nc6","Bc4"],
    trainColor: "white",
    eco: "C50",
    description: "A fast-developing opening that targets f7 while keeping both quiet and tactical plans available.",
    variations: ["Giuoco Piano", "Two Knights Defense", "Evans Gambit", "Hungarian Defense"],
  },
  {
    name: "Queen's Gambit",
    slug: "queens-gambit",
    mainLine: ["d4","d5","c4"],
    trainColor: "white",
    eco: "D06",
    description: "A cornerstone 1.d4 opening where White offers the c-pawn to seize central influence.",
    variations: ["Queen's Gambit Accepted", "Queen's Gambit Declined", "Tarrasch Defense", "Albin Countergambit"],
  },
  {
    name: "King's Indian Defense",
    slug: "kings-indian-defense",
    mainLine: ["d4","Nf6","c4","g6","Nc3","Bg7"],
    trainColor: "black",
    eco: "E60",
    description: "A dynamic defense to 1.d4 where Black allows White space before striking at the center and kingside.",
    variations: ["Classical Variation", "Fianchetto Variation", "Saemisch Variation", "Four Pawns Attack"],
  },
  {
    name: "Caro-Kann Defense",
    slug: "caro-kann-defense",
    mainLine: ["e4","c6","d4","d5"],
    trainColor: "black",
    eco: "B10",
    description: "A sturdy 1.e4 defense that aims for sound structure and clean development.",
    variations: ["Advance Variation", "Classical Variation", "Exchange Variation", "Panov-Botvinnik Attack"],
  },
  {
    name: "English Opening",
    slug: "english-opening",
    mainLine: ["c4"],
    trainColor: "white",
    eco: "A10",
    description: "A flexible flank opening where White controls d5 and can transpose into many strategic systems.",
    variations: ["Symmetrical Variation", "Reversed Sicilian", "Botvinnik System", "Four Knights Variation"],
  },
  {
    name: "Slav Defense",
    slug: "slav-defense",
    mainLine: ["d4","d5","c4","c6"],
    trainColor: "black",
    eco: "D10",
    description: "A solid Queen's Gambit defense that supports d5 while keeping the light-squared bishop active.",
    variations: ["Main Line", "Exchange Variation", "Semi-Slav Defense", "Chebanenko Variation"],
  },
  {
    name: "Nimzo-Indian Defense",
    slug: "nimzo-indian-defense",
    mainLine: ["d4","Nf6","c4","e6","Nc3","Bb4"],
    trainColor: "black",
    eco: "E20",
    description: "A principled 1.d4 defense where Black pins the c3 knight and plays for structural pressure.",
    variations: ["Rubinstein Variation", "Classical Variation", "Saemisch Variation", "Leningrad Variation"],
  },
  {
    name: "Queen's Indian Defense",
    slug: "queens-indian-defense",
    mainLine: ["d4","Nf6","c4","e6","Nf3","b6"],
    trainColor: "black",
    eco: "E12",
    description: "A hypermodern defense that controls central light squares with quick queenside development.",
    variations: ["Petrosian Variation", "Fianchetto Variation", "Classical Variation", "Kasparov Variation"],
  },
  {
    name: "Pirc Defense",
    slug: "pirc-defense",
    mainLine: ["e4","d6","d4","Nf6","Nc3","g6"],
    trainColor: "black",
    eco: "B07",
    description: "A flexible 1.e4 defense where Black develops behind the center and invites White to overextend.",
    variations: ["Austrian Attack", "Classical System", "150 Attack", "Byrne Variation"],
  },
  {
    name: "Scandinavian Defense",
    slug: "scandinavian-defense",
    mainLine: ["e4","d5"],
    trainColor: "black",
    eco: "B01",
    description: "An immediate challenge to 1.e4 that simplifies central tension and creates early queen decisions.",
    variations: ["Modern Variation", "Portuguese Variation", "Icelandic Gambit", "Mieses-Kotroc Variation"],
  },
  {
    name: "Alekhine Defense",
    slug: "alekhine-defense",
    mainLine: ["e4","Nf6"],
    trainColor: "black",
    eco: "B02",
    description: "A provocative defense that tempts White's pawns forward before attacking the extended center.",
    variations: ["Four Pawns Attack", "Modern Variation", "Exchange Variation", "Two Pawns Attack"],
  },
  {
    name: "Vienna Game",
    slug: "vienna-game",
    mainLine: ["e4","e5","Nc3"],
    trainColor: "white",
    eco: "C25",
    description: "A 1.e4 opening that develops the queen's knight early and keeps aggressive f-pawn ideas alive.",
    variations: ["Vienna Gambit", "Falkbeer Variation", "Max Lange Defense", "Mieses Variation"],
  },
  {
    name: "King's Gambit",
    slug: "kings-gambit",
    mainLine: ["e4","e5","f4"],
    trainColor: "white",
    eco: "C30",
    description: "A romantic attacking opening where White sacrifices the f-pawn for rapid development and initiative.",
    variations: ["King's Gambit Accepted", "King's Gambit Declined", "Fischer Defense", "Muzio Gambit"],
  },
  {
    name: "London System",
    slug: "london-system",
    mainLine: ["d4","d5","Bf4"],
    trainColor: "white",
    eco: "D02",
    description: "A reliable 1.d4 setup with quick Bf4 development and repeatable attacking plans.",
    variations: ["Jobava London", "Accelerated London", "Mason Variation", "Poisoned Pawn Line"],
  },
  {
    name: "Catalan Opening",
    slug: "catalan-opening",
    mainLine: ["d4","Nf6","c4","e6","g3"],
    trainColor: "white",
    eco: "E01",
    description: "A positional 1.d4 opening where White combines Queen's Gambit space with a kingside fianchetto.",
    variations: ["Open Catalan", "Closed Catalan", "Main Line", "Early dxc4"],
  },
  {
    name: "Dutch Defense",
    slug: "dutch-defense",
    mainLine: ["d4","f5"],
    trainColor: "black",
    eco: "A80",
    description: "An ambitious response to 1.d4 where Black claims kingside space and plays for attacking chances.",
    variations: ["Stonewall Dutch", "Leningrad Dutch", "Classical Dutch", "Staunton Gambit"],
  },
  {
    name: "Grunfeld Defense",
    slug: "grunfeld-defense",
    mainLine: ["d4","Nf6","c4","g6","Nc3","d5"],
    trainColor: "black",
    eco: "D70",
    description: "A dynamic 1.d4 defense where Black lets White build a center and then attacks it with piece pressure.",
    variations: ["Exchange Variation", "Russian System", "Brinckmann Attack", "Fianchetto Variation"],
  },
] satisfies SeoOpening[];

export function getOpeningBySlug(slug: string) {
  return topChessOpenings.find((opening) => opening.slug === slug);
}

export function normalizeOpeningText(value: string) {
  return value
    .toLowerCase()
    .replace(/defence/g, "defense")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugifyOpeningName(value: string) {
  return normalizeOpeningText(value).replace(/\s+/g, "-");
}

export function openingPageSlugFor(name: string, eco?: string) {
  const normalizedName = normalizeOpeningText(name);
  const normalizedEco = eco?.toUpperCase();
  const knownOpening = topChessOpenings.find((opening) => {
    const knownName = normalizeOpeningText(opening.name);
    return normalizedEco === opening.eco || normalizedName.includes(knownName) || knownName.includes(normalizedName);
  });

  return knownOpening?.slug ?? slugifyOpeningName(name);
}
