"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GlobeGl, ArcData, PointData } from "./Globe/GlobeGl";
import { LiveFeed } from "./Globe/LiveFeed";
import { GamePopup } from "./Globe/GamePopup";
import { Filters, type FilterState } from "./Globe/Filters";
import { SearchBar } from "./Globe/SearchBar";
import { StatsPanel } from "./Globe/StatsPanel";
import { CountryPanel } from "./Globe/CountryPanel";
import { countryCoords } from "@/lib/lichess-tv";
import { LiveChessGame, CountryGameData, GlobeStatistics } from "@/lib/globe-types";

const TIME_CONTROLS = ["All", "Bullet", "Blitz", "Rapid", "Classical"] as const;

type DataSource = "lichess" | "chesscom";

function getTimeControlCategory(tc: string): "Bullet" | "Blitz" | "Rapid" | "Classical" {
  const base = parseInt(tc.split("+")[0]);
  if (base < 3) return "Bullet";
  if (base < 10) return "Blitz";
  if (base < 30) return "Rapid";
  return "Classical";
}

function liveGameToArcData(game: LiveChessGame): ArcData | null {
  const fromCoords = game.coordinates?.white || (game.white.country ? countryCoords(game.white.country) : null);
  const toCoords = game.coordinates?.black || (game.black.country ? countryCoords(game.black.country) : null);
  
  if (!fromCoords || !toCoords) return null;
  
  return {
    startLat: fromCoords[0],
    startLng: fromCoords[1],
    endLat: toCoords[0],
    endLng: toCoords[1],
    color: "#f3c53d",
    gameId: game.id,
    player1: game.white.name,
    player2: game.black.name,
    timeControl: game.timeControl,
    opening: game.opening,
  };
}

function liveGamesToPointData(games: LiveChessGame[]): PointData[] {
  const countryGameCount: Record<string, { count: number; name: string; flag: string }> = {};
  
  games.forEach((game) => {
    for (const player of [game.white, game.black]) {
      const code = player.country;
      if (!countryGameCount[code]) {
        countryGameCount[code] = { count: 0, name: player.countryName || code, flag: player.flag || "" };
      }
      countryGameCount[code].count++;
    }
  });

  return Object.entries(countryGameCount)
    .filter(([code]) => code !== "XX" && countryCoords(code))
    .map(([code, data]) => {
      const coords = countryCoords(code)!;
      return {
        lat: coords[0],
        lng: coords[1],
        size: Math.min(0.5 + data.count * 0.1, 2),
        color: data.count > 5 ? "#f3c53d" : "#00d4aa",
        countryCode: code,
        countryName: data.name,
        gameCount: data.count,
      };
    });
}

export function ChessGlobePage() {
  const [selectedGame, setSelectedGame] = useState<LiveChessGame | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ timeControl: "All", ratingMin: 0, ratingMax: 10000, liveOnly: true });
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [pointsData, setPointsData] = useState<PointData[]>([]);
  const [liveGames, setLiveGames] = useState<LiveChessGame[]>([]);
  const [countryStats, setCountryStats] = useState<CountryGameData[]>([]);
  const [statistics, setStatistics] = useState<GlobeStatistics | null>(null);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>("lichess");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const globeRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: "100",
        timeControl: filters.timeControl === "All" ? "" : filters.timeControl,
        liveOnly: String(filters.liveOnly),
        country: selectedCountry || "",
      });
      
      const endpoint = dataSource === "lichess" 
        ? `/api/globe/live-games?${params}`
        : `/api/globe/chess-com?${params}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch");
      }
      
      const games: LiveChessGame[] = data.games || [];
      
      setLiveGames(games);
      setStatistics(data.statistics || null);
      setCountryStats(data.countryStats || []);
      
      const arcs = games.slice(0, 20).map(liveGameToArcData).filter(Boolean) as ArcData[];
      const points = liveGamesToPointData(games);
      
      setArcsData(arcs);
      setPointsData(points);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch";
      setError(message);
      console.error(`${dataSource} fetch error:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [dataSource, filters, selectedCountry]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    fetchIntervalRef.current = setInterval(fetchGames, 30000);
    return () => {
      if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
    };
  }, [fetchGames, dataSource]);

  useEffect(() => {
    const es = new EventSource("/api/globe/ws");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_game" && data.game) {
          const newGame = data.game as LiveChessGame;
          setLiveGames((prev) => [newGame, ...prev.slice(0, 99)]);
          
          const arc = liveGameToArcData(newGame);
          if (arc) {
            setArcsData((prev) => [arc, ...prev.slice(0, 19)]);
          }
          
          setLiveGames((prev) => {
            const updated = [newGame, ...prev.slice(0, 99)];
            setPointsData(liveGamesToPointData(updated));
            return updated;
          });
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
  }, [dataSource]);

  const filteredGames = useMemo(() => {
    return liveGames.filter((game) => {
      if (filters.timeControl !== "All" && game.timeControlCategory !== filters.timeControl) {
        return false;
      }
      if (filters.liveOnly && game.status !== "playing") {
        return false;
      }
      if (filters.ratingMin > 0) {
        const avgRating = (game.white.rating + game.black.rating) / 2;
        if (avgRating < filters.ratingMin) return false;
      }
      if (selectedCountry && game.white.country !== selectedCountry && game.black.country !== selectedCountry) {
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

  const handleGameSelect = (game: LiveChessGame) => {
    setSelectedGame(game);
    setSelectedCountry(null);
  };

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    setSelectedGame(null);
    setSelectedCountry(null);
  };

  const selectedCountryData = countryStats.find(c => c.countryCode === selectedCountry) || null;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SearchBar onSelect={setSelectedCountry} countries={countryStats} />
          <div className="flex gap-1.5 bg-white/5 rounded-full p-1">
            {(["lichess", "chesscom"] as DataSource[]).map((source) => (
              <button
                key={source}
                onClick={() => handleDataSourceChange(source)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  dataSource === source
                    ? "bg-[#f3c53d] text-black"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {source === "lichess" ? "Lichess TV" : "Chess.com"}
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
            <StatsPanel statistics={statistics} isLoading={isLoading} />
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

          <CountryPanel selected={selectedCountryData} className="w-full" />
        </div>
      </div>
    </div>
  );
}