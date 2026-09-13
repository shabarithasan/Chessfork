import { COUNTRY_COORDS } from "./countries";

export function countryName(code?: string | null): string {
  if (!code) return "";
  return COUNTRY_COORDS[code]?.name ?? code;
}

export function flagEmoji(code?: string | null): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 127462 + c.charCodeAt(0) - 65)
  );
}

const COUNTRY_SPREAD: Record<string, number> = {
  RU: 15, CA: 12, AU: 10, US: 8, CN: 8, BR: 8, IN: 6, AR: 6, KZ: 5, DZ: 5,
  CD: 4, SA: 4, MX: 4, ID: 4, SD: 4, LY: 4, IR: 4, MN: 4, PE: 3, TD: 3,
  CL: 3, ZA: 3, PK: 3, TR: 3, MM: 3, EG: 3, NG: 3, ET: 3, CO: 3, TZ: 3,
  FR: 2.5, ES: 2.5, DE: 2, PL: 2, SE: 3, NO: 3, FI: 3, UA: 2.5, IT: 2, JP: 2,
};

function hashScatter(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((31 * h + seed.charCodeAt(i)) | 0);
  const spread = COUNTRY_SPREAD[seed.slice(-2)] ?? 1.5;
  const angle = ((h & 4095) / 4095) * Math.PI * 2;
  const dist = Math.sqrt(((h >>> 12) & 4095) / 4095) * spread;
  return [Math.cos(angle) * dist, Math.sin(angle) * dist];
}

export function scatter(username: string, country: string): [number, number] {
  return hashScatter(username + country);
}

export function playerPosition(
  game: {
    white_username: string;
    black_username: string;
    white_country: string;
    black_country: string;
    start_lng: number;
    start_lat: number;
    end_lng: number;
    end_lat: number;
  },
  color: "white" | "black"
): [number, number] {
  if (color === "white") {
    const [dx, dy] = scatter(game.white_username, game.white_country);
    return [game.start_lng + dx, game.start_lat + dy];
  }
  const [dx, dy] = scatter(game.black_username, game.black_country);
  return [game.end_lng + dx, game.end_lat + dy];
}
