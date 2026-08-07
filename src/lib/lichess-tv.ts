/**
 * Lichess TV client for the Chess Globe.
 *
 * Live games come from the public Lichess TV per-channel endpoints
 * (`https://lichess.org/api/tv/{channel}`), which return several currently
 * running games per channel as PGN blocks. Player countries come from public
 * Lichess user profiles (`https://lichess.org/api/user/{name}`).
 */

export type TvSpeed =
  | "ultraBullet"
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "correspondence";

export interface TvPlayer {
  name: string;
  rating: number;
  country?: string;
}

export interface LiveGame {
  id: string;
  speed: TvSpeed;
  white: TvPlayer;
  black: TvPlayer;
  startedAt: number;
  finishedAt?: number;
}

export interface GameOpening {
  eco: string;
  name: string;
}

export const TV_CHANNELS = ["blitz", "rapid", "bullet", "classical", "chess960", "threeCheck"] as const;
export type TvChannel = (typeof TV_CHANNELS)[number];

export const SPEED_META: Record<TvSpeed, { label: string; dot: string }> = {
  ultraBullet: { label: "UltraBullet", dot: "bg-rose-400" },
  bullet: { label: "Bullet", dot: "bg-rose-500" },
  blitz: { label: "Blitz", dot: "bg-amber-400" },
  rapid: { label: "Rapid", dot: "bg-emerald-400" },
  classical: { label: "Classical", dot: "bg-sky-400" },
  correspondence: { label: "Correspondence", dot: "bg-slate-400" },
};

function speedForChannel(channel: TvChannel): TvSpeed {
  if (channel === "blitz" || channel === "rapid" || channel === "bullet" || channel === "classical") {
    return channel;
  }
  return "blitz";
}

const coordsCache: Record<string, [number, number]> = {};

/** Normalizes a Lichess flag code: "GB-SCT" → "GB", drops non-alpha codes. */
export function normalizeFlagCode(code: string): string | null {
  const first = (code.split("-")[0] ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(first)) return null;
  return first;
}

export function countryCoords(code: string): [number, number] | null {
  const clean = normalizeFlagCode(code);
  if (!clean) return null;
  const cached = coordsCache[clean];
  if (cached) return cached;
  const found = findCoords(clean);
  if (found) coordsCache[clean] = found;
  return found;
}

/** Approximate centroid of each ISO 3166-1 alpha-2 country, in [lat, lng]. */
const COUNTRY_COORDS: Record<string, [number, number]> = {
  AD: [42.5, 1.6], AE: [24.0, 54.0], AF: [33.0, 65.0], AG: [17.1, -61.8], AL: [41.2, 20.2],
  AM: [40.1, 45.0], AO: [-12.5, 18.5], AR: [-34.0, -64.0], AT: [47.5, 14.5], AU: [-25.0, 134.0],
  AZ: [40.4, 47.6], BA: [44.2, 17.7], BB: [13.2, -59.5], BD: [23.7, 90.4], BE: [50.9, 4.4],
  BF: [12.2, -1.7], BG: [42.7, 25.5], BH: [26.0, 50.6], BI: [-3.4, 29.9], BJ: [9.3, 2.3],
  BN: [4.5, 114.7], BO: [-16.7, -64.7], BR: [-14.2, -51.9], BS: [25.0, -77.4], BT: [27.5, 90.4],
  BW: [-22.3, 24.7], BY: [53.7, 28.0], BZ: [17.2, -88.5], CA: [56.1, -106.3], CD: [-2.9, 23.7],
  CF: [6.6, 20.5], CG: [-0.2, 15.8], CH: [46.8, 8.2], CI: [7.5, -5.5], CL: [-35.7, -71.5],
  CM: [5.7, 12.7], CN: [35.9, 104.2], CO: [4.6, -74.3], CR: [9.7, -84.2], CU: [21.5, -77.8],
  CV: [15.1, -23.6], CY: [35.1, 33.4], CZ: [49.8, 15.5], DE: [51.2, 10.4], DJ: [11.8, 42.6],
  DK: [56.3, 10.2], DM: [15.4, -61.4], DO: [18.7, -70.2], DZ: [28.0, 3.0], EC: [-1.8, -78.2],
  EE: [58.6, 25.1], EG: [26.8, 30.8], ER: [15.2, 39.1], ES: [40.2, -3.7], ET: [9.1, 40.5],
  FI: [61.9, 25.7], FJ: [-17.7, 178.1], FM: [7.4, 150.0], FR: [46.2, 2.2], GA: [-0.6, 11.8],
  GB: [52.5, -1.8], GD: [12.1, -61.7], GE: [42.3, 43.4], GH: [7.9, -1.0], GM: [13.4, -15.3],
  GN: [9.9, -9.7], GQ: [1.7, 10.5], GR: [39.1, 21.8], GT: [15.8, -90.2], GW: [11.8, -15.2],
  GY: [4.9, -58.9], HN: [14.6, -86.3], HR: [45.1, 15.2], HT: [19.0, -72.8], HU: [47.2, 19.5],
  ID: [-2.5, 117.9], IE: [53.1, -8.2], IL: [31.4, 35.1], IN: [21.1, 78.7], IQ: [33.2, 43.7],
  IR: [32.4, 53.7], IS: [64.9, -19.0], IT: [42.8, 12.8], JM: [18.1, -77.3], JO: [31.2, 36.8],
  JP: [36.2, 138.3], KE: [0.3, 37.9], KG: [41.2, 74.8], KH: [12.6, 104.9], KI: [-1.9, -157.4],
  KM: [-11.9, 43.3], KN: [17.3, -62.7], KP: [40.3, 127.5], KR: [36.5, 127.8], KW: [29.3, 47.5],
  KZ: [48.0, 66.9], LA: [19.9, 102.5], LB: [33.9, 35.8], LC: [13.9, -61.0], LI: [47.2, 9.6],
  LK: [7.9, 80.8], LR: [6.4, -9.4], LS: [-29.6, 28.2], LT: [55.2, 23.9], LU: [49.8, 6.1],
  LV: [56.9, 24.9], LY: [26.3, 17.2], MA: [31.8, -7.1], MC: [43.7, 7.4], MD: [47.4, 28.4],
  ME: [42.7, 19.4], MG: [-19.4, 46.7], MH: [7.1, 171.2], MK: [41.6, 21.7], ML: [17.6, -4.0],
  MM: [21.9, 95.9], MN: [46.9, 103.8], MR: [20.3, -10.9], MT: [35.9, 14.4], MU: [-20.3, 57.6],
  MV: [3.2, 73.2], MW: [-13.3, 34.3], MX: [23.6, -102.5], MY: [4.2, 102.0], MZ: [-18.7, 35.5],
  NA: [-22.9, 18.5], NE: [17.6, 8.1], NG: [9.1, 8.7], NI: [12.9, -85.2], NL: [52.1, 5.3],
  NO: [60.5, 8.5], NP: [28.4, 84.1], NR: [-0.5, 166.9], NZ: [-40.9, 174.9], OM: [21.5, 55.9],
  PA: [8.5, -80.1], PE: [-9.2, -75.0], PG: [-6.3, 143.9], PH: [12.9, 121.8], PK: [30.4, 69.3],
  PL: [52.1, 19.4], PS: [31.9, 35.2], PT: [39.4, -8.2], PW: [7.5, 134.5], PY: [-23.4, -58.4],
  QA: [25.3, 51.2], RO: [45.9, 24.9], RS: [44.2, 20.9], RU: [61.5, 105.3], RW: [-2.0, 29.9],
  SA: [23.9, 45.1], SB: [-9.6, 160.2], SC: [-4.7, 55.5], SD: [15.6, 30.2], SE: [60.1, 18.6],
  SG: [1.35, 103.8], SI: [46.1, 14.8], SK: [48.7, 19.5], SL: [8.5, -11.8], SM: [43.9, 12.5],
  SN: [14.4, -14.5], SO: [5.1, 46.2], SR: [4.1, -56.0], SS: [7.9, 30.2], ST: [0.2, 6.6],
  SV: [13.8, -88.9], SY: [35.0, 38.5], SZ: [-26.5, 31.5], TD: [15.4, 18.7], TG: [8.6, 0.8],
  TH: [15.9, 100.9], TJ: [38.9, 71.3], TL: [-8.9, 125.9], TM: [39.0, 59.6], TN: [33.9, 9.6],
  TO: [-21.2, -175.2], TR: [38.9, 35.2], TT: [10.7, -61.3], TV: [-8.5, 179.2], TW: [23.7, 121.0],
  TZ: [-6.3, 34.8], UA: [49.0, 31.4], UG: [1.4, 32.3], US: [37.1, -95.7], UY: [-32.5, -55.8],
  UZ: [41.4, 64.6], VC: [13.0, -61.2], VE: [6.4, -66.6], VN: [14.1, 108.3], VU: [-15.4, 167.0],
  WS: [-13.8, -172.1], YE: [15.6, 48.5], ZA: [-30.6, 22.9], ZM: [-13.1, 27.8], ZW: [-19.0, 29.2],
};

function findCoords(code: string): [number, number] | null {
  if (COUNTRY_COORDS[code]) return COUNTRY_COORDS[code];
  if (code === "XK") return [42.6, 20.9];
  return null;
}

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Converts an ISO 3166-1 alpha-2 code to its flag emoji. */
export function flagEmoji(code: string): string {
  const clean = normalizeFlagCode(code);
  if (!clean) return "";
  return clean
    .replace(/./g, (char) => String.fromCodePoint(0x1f1a5 + char.charCodeAt(0)));
}

export function playerCountry(game: LiveGame, color: "white" | "black"): string | undefined {
  return game[color].country;
}

const countryStorageKey = "chessfork:lichess-countries:v1";

function readCountryCache(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(countryStorageKey);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeCountryCache(cache: Record<string, string>) {
  try {
    window.localStorage.setItem(countryStorageKey, JSON.stringify(cache));
  } catch {
    // Storage pressure or privacy mode; session cache still works.
  }
}

/**
 * Resolves ISO country codes for a list of usernames. Hits the public
 * Lichess profile endpoint at a throttled rate and caches results in
 * localStorage so returning TV players cost nothing.
 */
export function createCountryResolver() {
  const memory = new Map<string, string>();
  const queue: string[] = [];
  const pendingCallbacks = new Map<string, ((name: string, code: string) => void)[]>();
  let draining = false;
  const sessionCache = readCountryCache();

  function resolve(names: string[], onCountry: (name: string, code: string) => void) {
    for (const name of names) {
      const cached = memory.get(name) ?? sessionCache[name];
      if (cached) {
        onCountry(name, cached);
        continue;
      }
      if (!pendingCallbacks.has(name)) queue.push(name);
      const callbacks = pendingCallbacks.get(name) ?? [];
      callbacks.push(onCountry);
      pendingCallbacks.set(name, callbacks);
    }
    void drain();
  }

  async function drain() {
    if (draining) return;
    draining = true;

    try {
      while (queue.length > 0) {
        const name = queue.shift();
        if (!name) continue;
        const callbacks = pendingCallbacks.get(name) ?? [];
        pendingCallbacks.delete(name);
        const cached = memory.get(name) ?? sessionCache[name];
        if (cached) {
          for (const callback of callbacks) callback(name, cached);
          continue;
        }

        try {
          const response = await fetch(`https://lichess.org/api/user/${encodeURIComponent(name)}`, {
            headers: { Accept: "application/json" },
          });
          if (response.ok) {
            const profile = (await response.json()) as { profile?: { flag?: string } };
            const code = profile.profile?.flag;
            if (code) {
              memory.set(name, code);
              sessionCache[name] = code;
              writeCountryCache(sessionCache);
              for (const callback of callbacks) callback(name, code);
            }
          }
        } catch {
          // Network hiccup; skip this player, they may re-enter the queue.
        }

        await new Promise((resolveDelay) => setTimeout(resolveDelay, 400));
      }
    } finally {
      draining = false;
    }
  }

  return { resolve };
}

/** Fetches the opening (ECO code + name) for a game, cheap: no moves. */
export async function fetchGameOpening(id: string, signal?: AbortSignal): Promise<GameOpening | null> {
  try {
    const response = await fetch(`https://lichess.org/api/game/${encodeURIComponent(id)}?moves=0&opening=true`, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) return null;
    const game = (await response.json()) as { opening?: GameOpening };
    return game.opening ?? null;
  } catch {
    return null;
  }
}

/** Age label for the feed, matching the original page ("now", "1m", ...). */
export function ageLabel(startedAt: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - startedAt) / 60_000));
  if (minutes < 1) return "now";
  return `${minutes}m`;
}

/** Parses the multi-game PGN response of the Lichess TV channel endpoint. */
export function parseTvChannelPgn(pgn: string, channel: TvChannel): LiveGame[] {
  const games: LiveGame[] = [];
  const blocks = pgn.split(/\n\n(?=\[)/);

  for (const block of blocks) {
    const id = block.match(/\[GameId "([^"]+)"\]/)?.[1];
    const white = block.match(/\[White "([^"]+)"\]/)?.[1];
    const black = block.match(/\[Black "([^"]+)"\]/)?.[1];
    const whiteElo = block.match(/\[WhiteElo "(\d+)"\]/)?.[1];
    const blackElo = block.match(/\[BlackElo "(\d+)"\]/)?.[1];
    if (!id || !white || !black || !whiteElo || !blackElo) continue;
    if (white === "Anonymous" || black === "Anonymous") continue;

    const startedAt = parsePgnStart(block);
    games.push({
      id,
      speed: speedForChannel(channel),
      white: { name: white, rating: Number(whiteElo) },
      black: { name: black, rating: Number(blackElo) },
      startedAt,
    });
  }

  return games;
}

function parsePgnStart(block: string): number {
  const date = block.match(/\[UTCDate "([^"]+)"\]/)?.[1];
  const time = block.match(/\[UTCTime "([^"]+)"\]/)?.[1];
  if (date && time) {
    const timestamp = Date.parse(`${date}T${time}Z`);
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return Date.now();
}

/** Fetches one channel's current live games. */
export async function fetchTvChannel(channel: TvChannel): Promise<LiveGame[]> {
  try {
    const response = await fetch(`https://lichess.org/api/tv/${channel}`, {
      headers: { Accept: "application/x-chess-pgn" },
    });
    if (!response.ok) return [];
    const pgn = await response.text();
    return parseTvChannelPgn(pgn, channel);
  } catch {
    return [];
  }
}

export function getAllCountryCodes(): string[] {
  return Object.keys(COUNTRY_COORDS);
}
