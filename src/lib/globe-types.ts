/**
 * Normalized Live Chess Game Model
 * 
 * This is the single internal representation used by the Chess Globe UI.
 * All external providers (Lichess, Chess.com) must map to this format.
 */

export interface LiveChessPlayer {
  name: string;
  rating: number;
  country: string;           // ISO 3166-1 alpha-2 code
  countryName?: string;      // Human-readable country name
  flag?: string;             // Flag emoji
  title?: string;            // GM, IM, FM, etc.
}

export interface LiveChessGame {
  id: string;                // Unique game ID (source:originalId)
  source: "lichess" | "chesscom";  // Data source
  white: LiveChessPlayer;
  black: LiveChessPlayer;
  timeControl: string;       // Original time control string (e.g., "3+0", "10+0")
  timeControlCategory: "Bullet" | "Blitz" | "Rapid" | "Classical";
  opening: string;           // Opening name or "Unknown Opening"
  moves: string;             // Current move list (PGN or SAN)
  status: "playing" | "finished";
  winner?: string;           // Winner name if finished
  startedAt: number;         // Unix timestamp (ms)
  finishedAt?: number;       // Unix timestamp (ms) if finished
  coordinates?: {
    white: [number, number] | null;  // [lat, lng]
    black: [number, number] | null;  // [lat, lng]
  };
}

export interface LiveGameProvider {
  name: string;
  fetchGames(options: FetchGamesOptions): Promise<LiveChessGame[]>;
  fetchGameDetails(gameId: string): Promise<LiveChessGame | null>;
}

export interface FetchGamesOptions {
  limit?: number;
  timeControl?: "Bullet" | "Blitz" | "Rapid" | "Classical" | "All";
  liveOnly?: boolean;
  country?: string;
}

export interface GlobeStatistics {
  gamesReceived: number;
  uniquePlayers: number;
  countriesRepresented: number;
  ratingDistribution: { range: string; count: number }[];
  timeControlDistribution: { category: string; count: number }[];
  openings: { name: string; count: number }[];
  averageRating: number;
}

export interface CountryGameData {
  countryCode: string;
  countryName: string;
  flag: string;
  gameCount: number;
  coordinates: [number, number] | null;
  activeGames: number;
  uniquePlayers: number;
  averageRating: number;
  timeControlDistribution: { category: string; count: number }[];
  openings: { name: string; count: number }[];
}