import { COUNTRY_COORDS } from "./countries";
import type { GlobeGame, GlobeStats, GlobeResponse, CountryCount, TimeClass } from "./globe-game-types";
export type { GlobeGame, GlobeStats, GlobeResponse, CountryCount, TimeClass };



/* ------------------------------------------------------------------ *
 * Country weights calibrated from the live endpoint: India dominates
 * online chess, followed by the US, UK, Egypt, Philippines, Germany...
 * ------------------------------------------------------------------ */
const COUNTRY_WEIGHTS: [string, number][] = [
  ["IN", 224], ["US", 88], ["GB", 46], ["EG", 37], ["PH", 35], ["DE", 35],
  ["ID", 32], ["FR", 30], ["CA", 25], ["ES", 23], ["IT", 21], ["BD", 18],
  ["PL", 16], ["IQ", 14], ["TR", 14], ["BR", 13], ["RU", 12], ["MX", 11],
  ["VN", 11], ["NL", 10], ["AU", 10], ["AR", 9], ["UA", 9], ["IR", 9],
  ["CO", 8], ["PK", 8], ["PE", 8], ["RO", 7], ["CZ", 7], ["KZ", 6],
  ["MY", 6], ["TH", 6], ["JP", 6], ["ZA", 6], ["CL", 6], ["SE", 5],
  ["GR", 5], ["HU", 5], ["AT", 5], ["BE", 5], ["AZ", 5], ["BY", 4],
  ["RS", 4], ["FI", 4], ["NO", 4], ["DK", 4], ["PT", 4], ["IL", 4],
  ["CN", 4], ["KR", 4], ["TW", 3], ["HK", 3], ["SG", 3], ["NZ", 3],
  ["IE", 3], ["CH", 3], ["SK", 3], ["SI", 3], ["HR", 3], ["BG", 3],
  ["LT", 3], ["LV", 3], ["GE", 3], ["AM", 3], ["UZ", 3], ["NP", 3],
  ["LK", 3], ["SA", 3], ["AE", 3], ["MA", 3], ["DZ", 3], ["NG", 3],
  ["EE", 2], ["MN", 2], ["MM", 2], ["KH", 2], ["JO", 2], ["KW", 2],
  ["QA", 2], ["LB", 2], ["TN", 2], ["LY", 2], ["ET", 2], ["KE", 2],
  ["GH", 2], ["TZ", 2], ["UG", 2], ["VE", 2], ["EC", 2], ["UY", 2],
  ["PY", 2], ["DO", 2], ["BO", 1], ["CR", 1], ["PA", 1], ["GT", 1],
  ["SN1", 0],
].filter(([code]) => COUNTRY_COORDS[code] !== undefined) as [string, number][];

const TOTAL_WEIGHT = COUNTRY_WEIGHTS.reduce((s, [, w]) => s + w, 0);

/* Time classes — the live feed is overwhelmingly rapid games. */
const TIME_CLASSES: [TimeClass, string, number][] = [
  ["rapid", "600", 62],
  ["rapid", "300", 12],
  ["rapid", "1800", 11],
  ["rapid", "900", 4],
  ["blitz", "300", 5],
  ["blitz", "180", 3],
  ["blitz", "60", 1],
  ["bullet", "60", 1],
  ["bullet", "120", 1],
  ["classical", "1800", 1],
  ["daily", "86400", 1],
];
const TIME_TOTAL = TIME_CLASSES.reduce((s, [, , w]) => s + w, 0);

const ECO_CODES = [
  "A00", "A04", "A10", "A20", "A40", "A43", "A45", "A48", "A50", "A80",
  "B00", "B01", "B02", "B06", "B07", "B10", "B12", "B15", "B20", "B22",
  "B23", "B27", "B30", "B33", "B40", "B50", "B53", "B70", "B76", "B90",
  "B94", "B99", "C00", "C02", "C20", "C21", "C23", "C25", "C30", "C33",
  "C40", "C41", "C44", "C50", "C53", "C54", "C55", "C60", "C65", "C68",
  "C78", "C80", "C84", "C88", "C92", "D00", "D02", "D06", "D10", "D20",
  "D30", "D37", "D43", "D80", "D85", "E00", "E12", "E20", "E32", "E60",
  "E81",
];

const NAMED_OPENINGS = [
  "Sicilian Defense: Najdorf Variation",
  "Sicilian Defense: Open",
  "French Defense: Winawer Variation",
  "Caro-Kann Defense: Classical Variation",
  "Queen's Gambit Declined: Exchange Variation",
  "King's Indian Defense: Classical Variation",
  "Italian Game: Giuoco Piano",
  "Ruy Lopez: Morphy Defense",
  "Scandinavian Defense: Modern Variation",
  "Vienna Game: Frankfurt Variation",
  "English Opening: Symmetrical Variation",
  "London System",
  "King's Gambit Accepted",
  "Dutch Defense: Leningrad Variation",
  "Nimzo-Indian Defense: Rubinstein Variation",
];

const RESULT_PAIRS: [string, string, number][] = [
  ["win", "resigned", 20],
  ["win", "checkmated", 20],
  ["checkmated", "win", 19],
  ["resigned", "win", 18],
  ["win", "timeout", 7],
  ["timeout", "win", 4],
  ["abandoned", "win", 4.5],
  ["win", "abandoned", 4],
  ["draw", "draw", 3],
  ["agreed", "agreed", 0.5],
];
const RESULT_TOTAL = RESULT_PAIRS.reduce((s, [, , w]) => s + w, 0);

const SYL_A = [
  "ka", "ro", "mi", "ta", "lu", "ne", "sha", "vi", "de", "go", "pe", "sa",
  "zo", "ra", "ki", "mo", "ju", "bla", "che", "tri", "plo", "mar", "fen",
  "gal", "hur", "ton", "sil", "ver", "wol", "zar", "kni", "guf", "bly",
  "ham", "nas", "rav", "she", "tim", "dar", "kor", "yus", "pra", "dha",
];
const SYL_B = [
  "rolf", "mir", "tor", "zen", "dus", "lin", "vok", "pas", "nar", "dov",
  "ski", "vic", "ham", "ton", "ger", "man", "son", "witz", "berg", "ste",
  "cho", "vil", "gul", "rov", "nas", "czyk", "ides", "akis", "kov", "yan",
  "jan", "bek", "tay", "mur", "sin", "kum", "raj", "pat", "gup", "sha",
];
const PREFIXES = [
  "the_", "im", "mr_", "dr_", "gm_", "real", "not", "pro_", "xX_", "its_",
  "just", "big", "no", "old", "new", "true", "un", "el_", "le_", "un_",
];
const NOUNS = [
  "chess", "blitz", "gambit", "knight", "rook", "bishop", "pawn", "mate",
  "master", "tactics", "endgame", "castle", "fianchetto", "zugzwang", "king",
  "queen", "castle", "enpassant", "skewer", "fork", "pin", "blunder",
];
const FIRST = [
  "alex", "sam", "chris", "jordan", "taylor", "mika", "yuri", "ivan", "omar",
  "kenji", "luca", "noah", "amir", "dmitri", "raj", "chen", "kai", "luis",
  "ahmed", "pavel", "nina", "sofia", "hana", "leila",
];
const LAST = [
  "chess", "moves", "king", "queen", "plays", "gm", "gm2", "boss", "wolf",
  "tiger", "styles", "official", "real", "hd", "pro",
];

const rnd = Math.random;
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

function makeUsername(): string {
  const style = rnd();
  if (style < 0.3) return pick(SYL_A) + pick(SYL_B) + (rnd() < 0.62 ? randInt(1, 999) : "");
  if (style < 0.55)
    return (
      (rnd() < 0.4 ? pick(PREFIXES) : "") +
      pick(NOUNS) +
      (rnd() < 0.75 ? randInt(1, 9999) : "")
    );
  if (style < 0.74)
    return pick(NOUNS) + "_" + pick(SYL_B) + (rnd() < 0.5 ? randInt(1, 99) : "");
  if (style < 0.9)
    return pick(FIRST) + "_" + pick(LAST) + (rnd() < 0.6 ? randInt(2, 99) : "");
  return pick(SYL_A) + pick(SYL_A) + pick(SYL_B) + randInt(1, 99);
}

function pickCountry(): string {
  let r = rnd() * TOTAL_WEIGHT;
  for (const [code, w] of COUNTRY_WEIGHTS) {
    r -= w;
    if (r <= 0) return code;
  }
  return "US";
}

function pickTimeClass(): [TimeClass, string] {
  let r = rnd() * TIME_TOTAL;
  for (const [tc, ctl, w] of TIME_CLASSES) {
    r -= w;
    if (r <= 0) return [tc, ctl];
  }
  return ["rapid", "600"];
}

function pickResults(): [string, string] {
  let r = rnd() * RESULT_TOTAL;
  for (const [w, b, weight] of RESULT_PAIRS) {
    r -= weight;
    if (r <= 0) return [w, b];
  }
  return ["win", "checkmated"];
}

function ratingFor(tc: TimeClass): number {
  const base =
    tc === "bullet" ? 830 : tc === "blitz" ? 810 : tc === "rapid" ? 785 : 940;
  const v = base + (rnd() + rnd() + rnd() - 1.5) * 330;
  return Math.max(150, Math.min(2900, Math.round(v / 10) * 10));
}

/** How long ago a finished game was created, based on how long it takes to play. */
function ageFor(_tc?: TimeClass): number {
  const r = rnd();
  if (r < 0.42) return randInt(40, 380);
  if (r < 0.5) return randInt(380, 950);
  return randInt(950, 1330);
}

function makeId(): string {
  const hex = "0123456789abcdef";
  const part = (n: number) =>
    Array.from({ length: n }, () => hex[Math.floor(rnd() * 16)]).join("");

  return `${part(8)}-${part(4)}-${part(4)}-${part(4)}-${part(12)}`;
}

function makeGame(now: number, ageSeconds: number): GlobeGame {
  const [timeClass, timeControl] = pickTimeClass();
  const [whiteResult, blackResult] = pickResults();
  const whiteCountry = pickCountry();
  const blackCountry = rnd() < 0.115 ? whiteCountry : pickCountry();
  const wInfo = COUNTRY_COORDS[whiteCountry];
  const bInfo = COUNTRY_COORDS[blackCountry] ?? COUNTRY_COORDS.US;

  return {
    id: makeId(),
    white_username: makeUsername(),
    black_username: makeUsername(),
    white_rating: ratingFor(timeClass),
    black_rating: ratingFor(timeClass),
    white_result: whiteResult,
    black_result: blackResult,
    white_country: whiteCountry,
    black_country: blackCountry,
    time_class: timeClass,
    time_control: timeControl,
    opening: rnd() < 0.12 ? pick(NAMED_OPENINGS) : pick(ECO_CODES),
    source: rnd() < 0.95 ? "chesscom" : "lichess",
    created_at: new Date(now - ageSeconds * 1000).toISOString(),
    ago_seconds: ageSeconds,
    start_lat: wInfo.lat,
    start_lng: wInfo.lng,
    end_lat: bInfo.lat,
    end_lng: bInfo.lng,
  };
}

/* ------------------------------------------------------------------ *
 * Rolling window that mimics the live `/api/globe` endpoint.
 * ------------------------------------------------------------------ */
const WINDOW_SECONDS = 1340;
const POOL_SIZE = 330;
let pool: GlobeGame[] = [];
let lastTick = 0;
let perHour = 2450;

function seedPool(now: number) {
  pool = [];
  for (let i = 0; i < POOL_SIZE; i++) pool.push(makeGame(now, ageFor()));
  pool.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function advance(now: number) {
  const elapsed = lastTick ? (now - lastTick) / 1000 : 0;
  // ~0.17 games/second enter the visible window.
  const n = Math.max(1, Math.round((elapsed / 1400) * POOL_SIZE + rnd()));
  for (let i = 0; i < n; i++) pool.push(makeGame(now, ageFor()));
  pool.sort((a, b) => b.created_at.localeCompare(a.created_at));
  pool = pool.filter((g) => (now - new Date(g.created_at).getTime()) / 1000 < WINDOW_SECONDS);
  if (pool.length > POOL_SIZE) pool = pool.slice(0, POOL_SIZE);
  lastTick = now;
}

export function fetchGlobeData(): GlobeResponse {
  const now = Date.now();
  if (pool.length === 0) {
    seedPool(now);
    lastTick = now;
  } else {
    advance(now);
  }

  const games = pool
    .map((g) => ({
      ...g,
      ago_seconds: Math.max(
        0,
        Math.round((now - new Date(g.created_at).getTime()) / 1000)
      ),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const counts = new Map<string, number>();
  let ratingSum = 0;
  for (const g of games) {
    counts.set(g.white_country, (counts.get(g.white_country) ?? 0) + 1);
    counts.set(g.black_country, (counts.get(g.black_country) ?? 0) + 1);
    ratingSum += (g.white_rating + g.black_rating) / 2;
  }

  const top_countries = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code, count]) => ({ code, count }));

  perHour = Math.round(perHour + (rnd() - 0.5) * 90);
  perHour = Math.max(1800, Math.min(3100, perHour));

  return {
    games,
    stats: {
      total_games: perHour + randInt(-8, 8),
      active_countries: counts.size,
      avg_rating: games.length ? Math.round(ratingSum / games.length) : 0,
      top_countries,
    },
  };
}
