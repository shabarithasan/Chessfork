export type TimeClass = "bullet" | "blitz" | "rapid" | "classical" | "daily";

export interface GlobeGame {
  id: string;
  white_username: string;
  black_username: string;
  white_rating: number;
  black_rating: number;
  white_result: string;
  black_result: string;
  white_country: string;
  black_country: string;
  time_class: TimeClass;
  time_control: string;
  opening: string;
  source: "chesscom" | "lichess";
  created_at: string;
  ago_seconds: number;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
}

export interface CountryCount {
  code: string;
  count: number;
}

export interface GlobeStats {
  total_games: number;
  active_countries: number;
  avg_rating: number;
  top_countries: CountryCount[];
}

export interface GlobeResponse {
  games: GlobeGame[];
  stats: GlobeStats;
}
