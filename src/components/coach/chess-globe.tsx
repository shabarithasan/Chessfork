"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GlobeGl, ArcData, PointData } from "./Globe/GlobeGl";
import { LiveFeed } from "./Globe/LiveFeed";
import { GamePopup } from "./Globe/GamePopup";
import { Filters, type FilterState } from "./Globe/Filters";
import { SearchBar } from "./Globe/SearchBar";
import { StatsPanel } from "./Globe/StatsPanel";
import { getAllCountryCodes, countryCoords } from "@/lib/lichess-tv";
import { getCountryStats, type CountryStats } from "./Globe/country-data";
import { CountryPanel } from "./Globe/CountryPanel";

export interface LiveGame {
  id: string;
  player1: { name: string; rating: number; country: string; countryName?: string; flag?: string };
  player2: { name: string; rating: number; country: string; countryName?: string; flag?: string };
  timeControl: string;
  opening: string;
  moves: string;
  status: "playing" | "finished";
  winner?: string;
  source: "lichess" | "chesscom" | "mock";
}

const TIME_CONTROLS = ["All", "Bullet", "Blitz", "Rapid", "Classical"];
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", IN: "India", RU: "Russia", CN: "China",
  DE: "Germany", FR: "France", GB: "United Kingdom", BR: "Brazil",
  JP: "Japan", ES: "Spain", IT: "Italy", CA: "Canada",
  SE: "Sweden", NO: "Norway", PL: "Poland", UA: "Ukraine",
  NL: "Netherlands", AR: "Argentina", AU: "Australia", KR: "South Korea",
};

type DataSource = "lichess" | "chesscom" | "mock";

function generateMockLiveGames(): LiveGame[] {
  const players = [
    { name: "MagnusCarlsen", rating: 2850, country: "NO" },
    { name: "Hikaru", rating: 2800, country: "US" },
    { name: "Firouzja2003", rating: 2780, country: "FR" },
    { name: "GMWSO", rating: 2770, country: "US" },
    { name: "VishyAnand", rating: 2750, country: "IN" },
    { name: "Nepomniachtchi", rating: 2780, country: "RU" },
    { name: "DingLiren", rating: 2780, country: "CN" },
    { name: "Gukesh", rating: 2750, country: "IN" },
    { name: "Praggnanandhaa", rating: 2720, country: "IN" },
    { name: "ArjunErigaisi", rating: 2710, country: "IN" },
    { name: "ViditGupta", rating: 2700, country: "IN" },
    { name: "Abdusattorov", rating: 2700, country: "UZ" },
    { name: "Keymer", rating: 2680, country: "DE" },
    { name: "VanForeest", rating: 2650, country: "NL" },
    { name: "Sarana", rating: 2680, country: "RU" },
    { name: "Tabatabaei", rating: 2670, country: "IR" },
    { name: "NihalSarin", rating: 2670, country: "IN" },
    { name: "RaunakSadhwani", rating: 2650, country: "IN" },
  ];

  const openings = [
    "Sicilian Defense", "London System", "King's Indian Defense", "French Defense",
    "Italian Game", "Caro-Kann Defense", "Nimzo-Indian Defense", "Ruy Lopez",
    "Catalan Opening", "Scandinavian Defense", "Queen's Gambit Declined", "English Opening",
    "Vienna Game", "Pirc Defense", "Modern Defense",
  ];

  const timeControls = [
    { label: "Bullet", notation: "1+0" }, { label: "Bullet", notation: "2+1" },
    { label: "Blitz", notation: "3+0" }, { label: "Blitz", notation: "3+2" },
    { label: "Blitz", notation: "5+0" }, { label: "Rapid", notation: "10+0" },
    { label: "Rapid", notation: "15+10" }, { label: "Classical", notation: "30+0" },
    { label: "Classical", notation: "60+0" },
  ];

  const games: LiveGame[] = [];
  for (let i = 0; i < 30; i++) {
    const p1 = players[Math.floor(Math.random() * players.length)];
    let p2 = players[Math.floor(Math.random() * players.length)];
    while (p2 === p1) p2 = players[Math.floor(Math.random() * players.length)];
    const tc = timeControls[Math.floor(Math.random() * timeControls.length)];
    const opening = openings[Math.floor(Math.random() * openings.length)];
    const moveCount = Math.floor(Math.random() * 40) + 1;
    const moves = Array.from({ length: moveCount }, (_, i) => `${i + 1}. e4 e5`).join(" ");

    games.push({
      id: `mock-${Date.now()}-${i}`,
      player1: { name: p1.name, rating: p1.rating + Math.floor(Math.random() * 100) - 50, country: p1.country, countryName: COUNTRY_NAMES[p1.country] },
      player2: { name: p2.name, rating: p2.rating + Math.floor(Math.random() * 100) - 50, country: p2.country, countryName: COUNTRY_NAMES[p2.country] },
      timeControl: tc.notation,
      opening,
      moves,
      status: Math.random() > 0.1 ? "playing" : "finished",
      winner: Math.random() > 0.5 ? p1.name : p2.name,
      source: "mock",
    });
  }
  return games;
}

function getTimeControlCategory(tc: string): string {
  const base = parseInt(tc.split("+")[0]);
  if (base < 3) return "Bullet";
  if (base < 10) return "Blitz";
  if (base < 30) return "Rapid";
  return "Classical";
}

function normalizeGame(raw: any, source: DataSource): LiveGame {
  return {
    id: raw.id,
    player1: {
      name: raw.white?.name || raw.player1?.name,
      rating: raw.white?.rating || raw.player1?.rating,
      country: raw.white?.country || raw.player1?.country,
      countryName: raw.white?.countryName || raw.player1?.countryName || COUNTRY_NAMES[raw.white?.country || raw.player1?.country || ""],
      flag: raw.white?.flag || raw.player1?.flag,
    },
    player2: {
      name: raw.black?.name || raw.player2?.name,
      rating: raw.black?.rating || raw.player2?.rating,
      country: raw.black?.country || raw.player2?.country,
      countryName: raw.black?.countryName || raw.player2?.countryName || COUNTRY_NAMES[raw.black?.country || raw.player2?.country || ""],
      flag: raw.black?.flag || raw.player2?.flag,
    },
    timeControl: raw.timeControl || raw.time_control,
    opening: raw.opening || "Unknown Opening",
    moves: raw.moves || raw.pgn?.split("\n").slice(-1)[0] || "",
    status: raw.status || (raw.finishedAt || raw.end_time ? "finished" : "playing"),
    winner: raw.winner,
    source,
  };
}

export function ChessGlobePage() {
  const [selectedGame, setSelectedGame] = useState<LiveGame | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ timeControl: "All", ratingMin: 0, ratingMax: 10000, liveOnly: true });
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [pointsData, setPointsData] = useState<PointData[]>([]);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const globeRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGames = useCallback(async () => {
    if (dataSource === "mock") return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: "50",
        timeControl: filters.timeControl === "All" ? "" : filters.timeControl,
        liveOnly: String(filters.liveOnly),
        country: selectedCountry || "",
      });
      
      const endpoint = dataSource === "lichess" 
        ? `/api/globe/live-games?${params}`
        : `/api/globe/chess-com?${params}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      const normalized = data.games.map((g: any) => normalizeGame(g, dataSource));
      
      setLiveGames(normalized);
      updateGlobeData(normalized);
    } catch (err) {
      setError(dataSource === "lichess" ? "Failed to fetch Lichess games" : "Failed to fetch Chess.com games");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [dataSource, filters, selectedCountry]);

  const updateGlobeData = (games: LiveGame[]) => {
    const arcs: ArcData[] = games.slice(0, 15).map((game) => {
      const fromCoords = countryCoords(game.player1.country);
      const toCoords = countryCoords(game.player2.country);
      if (!fromCoords || !toCoords) return null;
      return {
        startLat: fromCoords[0],
        startLng: fromCoords[1],
        endLat: toCoords[0],
        endLng: toCoords[1],
        color: "#f3c53d",
        gameId: game.id,
        player1: game.player1.name,
        player2: game.player2.name,
        timeControl: game.timeControl,
        opening: game.opening,
      };
    }).filter(Boolean) as ArcData[];

    setArcsData(arcs);

    const countryGameCount: Record<string, number> = {};
    games.forEach((game) => {
      countryGameCount[game.player1.country] = (countryGameCount[game.player1.country] || 0) + 1;
      countryGameCount[game.player2.country] = (countryGameCount[game.player2.country] || 0) + 1;
    });

    const points: PointData[] = Object.entries(countryGameCount)
      .filter(([code]) => countryCoords(code))
      .map(([code, count]) => {
        const coords = countryCoords(code)!;
        return {
          lat: coords[0],
          lng: coords[1],
          size: Math.min(0.5 + count * 0.1, 2),
          color: count > 5 ? "#f3c53d" : "#00d4aa",
          countryCode: code,
          countryName: COUNTRY_NAMES[code] || code,
          gameCount: count,
        };
      });

    setPointsData(points);
  };

  useEffect(() => {
    if (dataSource === "mock") {
      const games = generateMockLiveGames();
      setLiveGames(games);
      updateGlobeData(games);
    } else {
      fetchGames();
    }
  }, [dataSource, fetchGames]);

  useEffect(() => {
    if (dataSource === "mock") {
      fetchIntervalRef.current = setInterval(() => {
        const newGame = generateMockLiveGames()[0];
        setLiveGames((prev) => [newGame, ...prev.slice(0, 49)]);
        
        const fromCoords = countryCoords(newGame.player1.country);
        const toCoords = countryCoords(newGame.player2.country);
        if (fromCoords && toCoords) {
          const newArc: ArcData = {
            startLat: fromCoords[0],
            startLng: fromCoords[1],
            endLat: toCoords[0],
            endLng: toCoords[1],
            color: "#f3c53d",
            gameId: newGame.id,
            player1: newGame.player1.name,
            player2: newGame.player2.name,
            timeControl: newGame.timeControl,
            opening: newGame.opening,
          };
          setArcsData((prev) => [newArc, ...prev.slice(0, 14)]);
        }
      }, 5000);
    }

    return () => {
      if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
    };
  }, [dataSource]);

  useEffect(() => {
    if (dataSource !== "mock") {
      fetchIntervalRef.current = setInterval(fetchGames, 30000);
    }
    return () => {
      if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
    };
  }, [fetchGames, dataSource]);

  useEffect(() => {
    if (dataSource === "mock") return;

    const es = new EventSource("/api/globe/ws");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_game" && data.game) {
          const normalized = normalizeGame(data.game, dataSource);
          setLiveGames((prev) => [normalized, ...prev.slice(0, 49)]);
          
          const fromCoords = countryCoords(normalized.player1.country);
          const toCoords = countryCoords(normalized.player2.country);
          if (fromCoords && toCoords) {
            const newArc: ArcData = {
              startLat: fromCoords[0],
              startLng: fromCoords[1],
              endLat: toCoords[0],
              endLng: toCoords[1],
              color: "#f3c53d",
              gameId: normalized.id,
              player1: normalized.player1.name,
              player2: normalized.player2.name,
              timeControl: normalized.timeControl,
              opening: normalized.opening,
            };
            setArcsData((prev) => [newArc, ...prev.slice(0, 14)]);
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      console.warn("SSE connection error, will reconnect");
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [dataSource, fetchGames]);

  const filteredGames = useMemo(() => {
    return liveGames.filter((game) => {
      if (filters.timeControl !== "All" && getTimeControlCategory(game.timeControl) !== filters.timeControl) {
        return false;
      }
      if (filters.liveOnly && game.status !== "playing") {
        return false;
      }
      if (selectedCountry && game.player1.country !== selectedCountry && game.player2.country !== selectedCountry) {
        return false;
      }
      return true;
    });
  }, [liveGames, filters, selectedCountry]);

  const handlePointClick = (point: PointData) => {
    setSelectedCountry(point.countryCode);
    setSelectedGame(null);
  };

  const handleArcClick = (arc: ArcData) => {
    const game = liveGames.find((g) => g.id === arc.gameId);
    if (game) {
      setSelectedGame(game);
      setSelectedCountry(null);
    }
  };

  const handleGameSelect = (game: LiveGame) => {
    setSelectedGame(game);
    setSelectedCountry(null);
  };

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    setSelectedGame(null);
    setSelectedCountry(null);
  };

  const selectedStats: CountryStats | null = selectedCountry ? getCountryStats(selectedCountry) : null;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SearchBar onSelect={setSelectedCountry} />
          <div className="flex gap-1.5 bg-white/5 rounded-full p-1">
            {(["mock", "lichess", "chesscom"] as DataSource[]).map((source) => (
              <button
                key={source}
                onClick={() => handleDataSourceChange(source)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  dataSource === source
                    ? "bg-[#f3c53d] text-black"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {source === "mock" ? "Mock" : source === "lichess" ? "Lichess TV" : "Chess.com"}
              </button>
            ))}
          </div>
        </div>
        <Filters
          values={filters}
          onChange={setFilters}
          timeControls={TIME_CONTROLS}
        />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 flex-1 min-h-0">
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#040914] min-h-[540px] h-[68vh] lg:h-[calc(100dvh-10rem)]">
          <div id="globe-container" className="w-full h-full" />

          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-black/70 px-4 py-2 backdrop-blur">
              <span className="size-5 font-bold text-[#f3c53d]">♟</span>
              <span className="text-sm font-bold text-white">Chess Globe</span>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              {isLoading && <span className="text-xs text-yellow-400 animate-pulse">Loading...</span>}
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-20 sm:bottom-5">
            <StatsPanel className="pointer-events-auto" />
          </div>

          <GlobeGl
            arcsData={arcsData}
            pointsData={pointsData}
            onPointClick={handlePointClick}
            onArcClick={handleArcClick}
            globeRef={globeRef}
          />
        </div>

        <div className="flex flex-col gap-4 max-h-[74vh] overflow-hidden">
          {showLiveFeed && (
            <LiveFeed
              games={filteredGames}
              selectedGame={selectedGame}
              onGameSelect={handleGameSelect}
              onClose={() => setShowLiveFeed(false)}
            />
          )}

          {selectedGame && (
            <GamePopup
              game={selectedGame}
              onClose={() => setSelectedGame(null)}
            />
          )}

          {!showLiveFeed && !selectedGame && (
            <button
              onClick={() => setShowLiveFeed(true)}
              className="fixed bottom-4 right-4 z-50 bg-[#f3c53d] text-black px-4 py-2 rounded-full font-semibold shadow-lg hover:bg-[#f3c53d]/90 transition-colors"
            >
              Show Live Feed
            </button>
          )}

          <CountryPanel selected={selectedStats} className="w-full" />
        </div>
      </div>
    </div>
  );
}