"use client";

import { Filter } from "lucide-react";

export interface FilterState {
  timeControl: string;
  ratingMin: number;
  ratingMax: number;
  liveOnly: boolean;
}

interface FiltersProps {
  values: FilterState;
  onChange: (next: FilterState) => void;
}

const TIME_OPTIONS = ["All", "Bullet", "Blitz", "Rapid", "Classical"] as const;

export function Filters({ values, onChange }: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        <Filter className="size-3.5" /> Filter
      </span>

      <div className="flex flex-wrap gap-1.5">
        {TIME_OPTIONS.map((label) => {
          const active = values.timeControl === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange({ ...values, timeControl: active ? "" : label })}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                active
                  ? "border-[#f3c53d] bg-[#f3c53d]/15 text-[#ffd966]"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="h-5 w-px bg-white/10" />

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <select
          value={values.ratingMin}
          onChange={(e) => onChange({ ...values, ratingMin: Number(e.target.value) })}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-300 outline-none transition hover:bg-white/[0.08] focus:border-[#f3c53d]/60"
        >
          <option value={0}>Any Rating</option>
          <option value={1000}>1000+</option>
          <option value={1400}>1400+</option>
          <option value={1800}>1800+</option>
          <option value={2200}>2200+</option>
        </select>

        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 transition hover:bg-white/[0.08]">
          <input
            type="checkbox"
            checked={values.liveOnly}
            onChange={(e) => onChange({ ...values, liveOnly: e.target.checked })}
            className="size-3 accent-[#f3c53d]"
          />
          <span className="text-[11px] font-bold text-slate-400">Live only</span>
        </label>
      </div>
    </div>
  );
}