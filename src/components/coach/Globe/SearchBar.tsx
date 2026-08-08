"use client";

import { Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { CountryGameData } from "@/lib/globe-types";

interface SearchBarProps {
  onSelect: (code: string) => void;
  countries: CountryGameData[];
}

export function SearchBar({ onSelect, countries }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return countries
      .filter((c) =>
        c.countryName.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase() === q
      )
      .slice(0, 6);
  }, [query, countries]);

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search countries..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#f3c53d]/60 focus:bg-white/[0.10]"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d101c]/95 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur">
          {results.map((r) => (
            <button
              key={r.countryCode}
              type="button"
              onMouseDown={() => {
                onSelect(r.countryCode);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-white/[0.06]"
            >
              <span className="text-lg">{r.flag}</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-white">{r.countryName}</span>
                <span className="ml-2 text-xs text-slate-500">{r.gameCount} games</span>
              </div>
              <span className="text-xs font-mono text-amber-300">{r.openings[0]?.name || "—"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}