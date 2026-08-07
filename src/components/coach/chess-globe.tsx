"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getAllCountryCodes } from "@/lib/lichess-tv";

import { CountryPanel } from "./Globe/CountryPanel";
import { Filters } from "./Globe/Filters";
import { GlobeCanvas } from "./Globe/Globe";
import { SearchBar } from "./Globe/SearchBar";
import { StatsPanel } from "./Globe/StatsPanel";
import { getCountryStats, type ArcConnection, type CountryStats } from "./Globe/country-data";

const ARC_POOL: Omit<ArcConnection, "id">[] = [
  { from: "IN", to: "US", rating: "1500", timeControl: "5+0", opening: "Sicilian Defense" },
  { from: "US", to: "DE", rating: "1900", timeControl: "10+0", opening: "London System" },
  { from: "RU", to: "CN", rating: "2100", timeControl: "15+0", opening: "King's Indian" },
  { from: "FR", to: "DE", rating: "1700", timeControl: "3+0", opening: "French Defense" },
  { from: "IN", to: "GB", rating: "1450", timeControl: "5+3", opening: "Italian Game" },
  { from: "BR", to: "US", rating: "1600", timeControl: "3+2", opening: "Caro-Kann" },
  { from: "US", to: "JP", rating: "1800", timeControl: "30+0", opening: "Nimzo-Indian" },
  { from: "ES", to: "IT", rating: "1550", timeControl: "10+0", opening: "Ruy Lopez" },
  { from: "CA", to: "GB", rating: "1400", timeControl: "5+0", opening: "Catalan" },
  { from: "SE", to: "NO", rating: "1650", timeControl: "3+0", opening: "Scandinavian" },
];

export function ChessGlobePage() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [filters, setFilters] = useState({ timeControl: "", ratingMin: 0, ratingMax: 10000, liveOnly: false });
  const [arcs, setArcs] = useState<ArcConnection[]>([]);
  const arcIndexRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const pool = [...ARC_POOL].sort(() => Math.random() - 0.5).slice(0, Math.min(6, ARC_POOL.length));
      setArcs(pool.map((a, i) => ({ ...a, id: `arc-${arcIndexRef.current++}-${i}` })));
    };
    tick();
    const id = window.setInterval(tick, 6000);
    return () => window.clearInterval(id);
  }, []);

  const selectedStats: CountryStats | null = selectedCode ? getCountryStats(selectedCode) : null;

  const highlightCodes = useMemo(() => {
    const codes = getAllCountryCodes();
    return codes.filter((code) => {
      const s = getCountryStats(code);
      if (!s) return false;
      if (filters.ratingMin > 0 && s.avgRating < filters.ratingMin) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar onSelect={setSelectedCode} />
        <Filters values={filters} onChange={setFilters} />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#040914] min-h-[540px] h-[68vh] lg:h-[calc(100dvh-10rem)]">
          <GlobeCanvas
            highlights={highlightCodes}
            selected={selectedCode}
            onDotClick={setSelectedCode}
            arcs={arcs}
          />

          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-black/70 px-4 py-2 backdrop-blur">
              <span className="size-5 font-bold text-[#f3c53d]">♟</span>
              <span className="text-sm font-bold text-white">Chess Globe</span>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-20 sm:bottom-5">
            <StatsPanel className="pointer-events-auto" />
          </div>
        </div>
        <div className="max-h-[74vh] pr-1 overflow-y-auto">
          <CountryPanel selected={selectedStats} className="w-full" />
        </div>
      </div>
    </div>
  );
}