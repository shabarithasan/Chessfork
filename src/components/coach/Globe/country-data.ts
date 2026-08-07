import { countryCoords, flagEmoji, countryName, getAllCountryCodes } from "@/lib/lichess-tv";

export type { countryName } from "@/lib/lichess-tv";

const OPENINGS_POOL = [
  "Sicilian Defense",
  "Italian Game",
  "Ruy Lopez",
  "Caro-Kann Defense",
  "French Defense",
  "London System",
  "King's Indian Defense",
  "Nimzo-Indian Defense",
  "Slav Defense",
  "Grünfeld Defense",
  "Queen's Gambit Declined",
  "English Opening",
  "Pirc Defense",
  "Scandinavian Defense",
  "Catalan Opening",
  "Dutch Defense",
  "Modern Defense",
  "Alekhine's Defense",
] as const;

const TIME_CONTROLS = ["1+0", "3+0", "3+2", "5+0", "5+3", "10+0", "10+5", "15+10", "30+0", "30+20"] as const;

export interface CountryStats {
  code: string;
  name: string;
  flag: string;
  activeGames: number;
  playersOnline: number;
  avgRating: number;
  mostPlayedOpening: string;
  mostImprovedOpening: string;
  popularTimeControl: string;
  winRateToday: number;
  tacticalAccuracy: number;
  blitzGames: number;
  rapidGames: number;
  classicalGames: number;
  openings: readonly string[];
  aiInsights: string[];
  aiRecommendation: string;
}

export interface ArcConnection {
  id: string;
  from: string;
  to: string;
  rating: string;
  timeControl: string;
  opening: string;
}

const MAJOR_SAMPLES = {
  IN: {
    activeGames: 1428, playersOnline: 684, avgRating: 1712,
    mostPlayedOpening: "Sicilian Defense", mostImprovedOpening: "London System",
    popularTimeControl: "10+0", winRateToday: 52, tacticalAccuracy: 89,
    blitzGames: 842, rapidGames: 386, classicalGames: 200,
    openings: ["Sicilian Defense", "King's Indian Defense", "London System", "Italian Game"],
    aiInsights: ["Players here frequently choose aggressive openings.", "Tactical precision is high in the mid-game, especially below 1800.", "Hyperbullet and quick time controls dominate the tier lists."],
    aiRecommendation: "Study endgames to improve overall performance — time pressure drains are the main weakness.",
  },
  US: {
    activeGames: 2103, playersOnline: 912, avgRating: 1658,
    mostPlayedOpening: "London System", mostImprovedOpening: "Caro-Kann Defense",
    popularTimeControl: "3+0", winRateToday: 54, tacticalAccuracy: 82,
    blitz: 1380, rapid: 523, classical: 200,
    openings: ["London System", "Caro-Kann Defense", "Sicilian Defense", "French Defense"],
    aiInsights: ["Aggressive blitz style dominates across all rating tiers", "Many players transition well from rapid to classical"],
    aiRecommendation: "Focus on positional understanding — the London is safe but can become too passive at higher levels.",
  },
  DE: {
    activeGames: 687, playersOnline: 340, avgRating: 1924,
    mostIncenseOpening: "Caro-Kann Defense", mostImprovedOpening: "English Opening",
    popularTimeControl: "5+3", winRateToday: 57, tacticalAccuracy: 89,
    blitz: 312, rapid: 220, classical: 155,
    openings: ["Caro-Kann Defense", "English Opening", "King's Indian Defense", "Nimzo-Indian Defense"],
    aiInsights: ["Top theoretical obedience — deep preparation is the hallmark", "an endgame proficiency is an elite-level differentiator"],
    aiRecommendation: "Train faster time controls to turn theoretical understanding into clock confidence.",
  },
  RU: {
    activeGames: 965, playersOnline: 498, avgRating: 2030,
    mostPlayedOpening: "King's Indian Defense", mostImprovedOpening: "Catalan Opening",
    popularTimeControl: "15+10", winRateToday: 49, tacticalAccuracy: 90,
    blitz: 412, rapid: 353, classical: 200,
    openings: ["King's Indian Defense", "Catalan Opening", "Sicilian Defense", "Slav Defense"],
    aiInsights: ["Deep calculation in complex middlegame positions", "Master-level ratings pop up with raw strategic play"],
    aiRecommendation: "Work on theoretical novelties outside the known main line — that reward is higher than the risk.",
  },
  FR: {
    activeGames: 521, name: "France", playersOnline: 289, avgRating: 1740,
    mostPlayedOpening: "French Defense", mostImprovedOpening: "Sicilian Defense",
    popularTimeControl: "5+3", winRateToday: 53, tacticalAccuracy: 85,
    blitz: 274, rapid: 159, classical: 130,
    openings: ["French Defense", "Sicilian Defense", "Italian Game", "Queen's Gambit Declined"],
    aiInsights: ["French Defense is played correctly in every form — rare for a minor opening", "Good ratio of slow to fast play; waste points here"],
    aiRecommendation: "Watch the move-order trap in the Exchange French. put some work on the c5-c4 advance for brownie points.",
  },
  BR: {
    name: "Brazil", activeGames: 487, playersOnline: 252, avgRating: 1561,
    mostPlayedOpening: "London System", mostImprovedOpening: "Sicilian Defense",
    popularTimeControl: "3+0", winRateToday: 46, tacticalAccuracy: 78,
    blitz: 320, rapid: 67, classical: 100,
    openings: ["London System", "Sicilian Defense", "Italian Game", "Caro-Kann Defense"],
    aiInsights: ["Bullet culture is strong and fast; blunders happen in high tempo", "Soft center opening — the London style aligns with national play success"],
    aiRecommendation: "Reduce fall-through situations — switch to strong-seeded rapid games for retention.",
  },
  CN: {
    name: "China", activeGames: 430, playersOnline: 201, avgRating: 1822,
    mostPlayedOpening: "English Opening", mostImprovedOpening: "Nimzo-Indian Defense",
    popularTimeControl: "30+0", winRateToday: 55, tacticalAccuracy: 88,
    blitz: 120, rapid: 210, classical: 100,
    openings: ["English Opening", "Nimzo-Indian Defense", "Queen's Gambinenden", "Sicilian Defense"],
    aiInsights: ["Known for methodical and slow positional gambit game", "Focus on long sessions yields 'deep' reading at the classical level"],
    aiRecommendation: "Add blitz risk gampler to increase versatility; best at all fast-paced ops.",
  },
GB: {
    name: "United Kingdom", activeGames: 512, playersOnline: 274, avgRating: 1668,
    mostPlayedOpening: "London System", mostImprovedOpening: "English Opening",
    popularTimeControl: "5+0", winRateToday: 48, tacticalAccuracy: 83,
    blitzGames: 280, rapidGames: 152, classicalGames: 80,
    openings: ["London System", "Italian Game", "Sicilian Defense", "Ruy Lopez"],
    aiInsights: ["Heavy analysis culture — many logs and reports generated", "Quick play expos\u00E9 in fast formats"],
    aiRecommendation: "Play one longer rapid game per day — the London is sharp for a few moves but falls back.",
  },
};

function seedRandom(code: string): number {
  let h = 0;
  for (let i = 0; i < 2; i++) h = (h * 31 + code.charCodeAt(i) + (i * 7)) % 1999;
  return h / 1999;
}

function pickFrom<T>(arr: readonly T[], seed: number, index: number): T {
  return arr[Math.floor((seed * (index + 1) * 1.5) * 10) % arr.length];
}

const COUNTRY_CACHE = new Map<string, CountryStats>();

export function getCountryStats(code: string): CountryStats | null {
  const cached = COUNTRY_CACHE.get(code);
  if (cached) return cached;

  const coords = countryCoords(code);
  if (!coords) return null;

  const name = countryName(code);
  const flag = flagEmoji(code) ?? "";
  const major = MAJOR_SAMPLES as Record<string, Partial<CountryStats>>;
  const predef = major[code];
  const seed = seedRandom(code);

  const stats: CountryStats = {
    code,
    name,
    flag,
    activeGames: predef?.activeGames ?? Math.round(30 + seed * 300),
    playersOnline: predef?.playersOnline ?? Math.round(15 + seed * 200),
    avgRating: predef?.avgRating ?? Math.round(1000 + seed * 1300),
    mostPlayedOpening: predef?.mostPlayedOpening ?? pickFrom(OPENINGS_POOL, seed, 0),
    mostImprovedOpening: predef?.mostImprovedOpening ?? pickFrom(OPENINGS_POOL, seed, 3),
    popularTimeControl: predef?.popularTimeControl ?? pickFrom(TIME_CONTROLS, seed, 2),
    winRateToday: predef?.winRateToday ?? Math.round(38 + seed * 30),
    tacticalAccuracy: predef?.tacticalAccuracy ?? Math.round(65 + seed * 25),
    blitzGames: predef?.blitzGames ?? Math.round(20 + seed * 200),
    rapidGames: predef?.rapidGames ?? Math.round(10 + seed * 150),
    classicalGames: predef?.classicalGames ?? Math.round(5 + seed * 80),
    openings: predef?.openings ?? [
      pickFrom(OPENINGS_POOL, seed, 0),
      pickFrom(OPENINGS_POOL, seed, 1),
      pickFrom(OPENINGS_POOL, seed, 3),
      pickFrom(OPENINGS_POOL, seed, 4),
    ],
    aiInsights: predef?.aiInsights ?? [
      `Average tactical accuracy ${Math.round(65 + seed * 23)}%`,
      `Trending: ${pickFrom(OPENINGS_POOL, seed, 5)} this week.`,
      `Spike in bullet games as seen in the record logs.`,
    ],
    aiRecommendation: predef?.aiRecommendation ?? `Study ${pickFrom(OPENINGS_POOL, seed, 6)} to improve your positional rating by at least 30 el points.`,
  };

  COUNTRY_CACHE.set(code, stats);
  return stats;
}

export function getGlobalStats() {
  const codes = getAllCountryCodes().slice(0, 40);
  const all = codes.map((c) => getCountryStats(c)).filter((v): v is CountryStats => v !== null);
  return {
    gamesToday: all.reduce((s, v) => s + v.activeGames, 0),
    playersOnline: all.reduce((s, v) => s + v.playersOnline, 0),
    countriesActive: all.filter((c) => c.activeGames > 10).length,
    avgRating: Math.round(all.reduce((s, v) => s + v.avgRating * v.activeGames, 0) / all.reduce((s, v) => s + v.activeGames, 1)),
    mostPlayedOpening: [...all].sort((a, b) => b.activeGames - a.activeGames)[0]?.mostPlayedOpening ?? "Sicilian Defense",
    avgAccuracy: Math.round(all.reduce((s, v) => s + v.tacticalAccuracy * v.activeGames, 0) / all.reduce((s, v) => s + v.activeGames, 1)),
  };
}