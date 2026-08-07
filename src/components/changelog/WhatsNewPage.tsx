"use client";

import { useState } from "react";
import { CHANGELOG_ENTRIES, type ChangelogEntry } from "@/components/changelog/changelog-data";
import { X } from "lucide-react";

const CDN_BASE = "https://ozvvyafyqcgjftdotcae.supabase.co/storage/v1/object/public/changelog-media";

type Tab = "whatsnew" | "coming" | "suggestions";

const groupedByMonth = CHANGELOG_ENTRIES.reduce<Record<string, ChangelogEntry[]>>((acc, entry) => {
  if (!acc[entry.month]) acc[entry.month] = [];
  acc[entry.month].push(entry);
  return acc;
}, {});

const monthOrder = Object.keys(groupedByMonth);

function ReactionButton({ emoji, count }: { emoji: string; count: number }) {
  return (
    <button
      className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold tabular-nums transition-[transform,background-color,border-color,color] duration-150 hover:-translate-y-px active:scale-95"
      style={{
        borderColor: "rgba(251, 191, 36, 0.55)",
        background: "transparent",
        color: "rgb(252, 211, 77)",
      }}
    >
      <span className="text-[13px] leading-none">{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

function EntryCard({ entry, isLatest }: { entry: ChangelogEntry; isLatest: boolean }) {
  return (
    <div className="relative pl-9">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[13px] w-px bg-neutral-700/70"
        style={{ bottom: 0, top: isLatest ? 10 : 0 }}
      />
      {isLatest && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[13px] w-px bottom-0 top-[10px]"
          style={{ background: "linear-gradient(to bottom, rgba(251,191,36,0.6), rgba(64,64,64,0.7))" }}
        />
      )}
      <div className="absolute left-0 top-[3px] flex w-7 justify-center">
        {isLatest ? (
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-[#fbbf24] opacity-45"
              style={{ animation: "spinePing 2s cubic-bezier(0, 0, 0.2, 1) infinite" }}
            />
            <span
              className="relative h-3.5 w-3.5 rounded-full border-2 border-neutral-900 bg-[#fbbf24]"
              style={{ boxShadow: "0 0 10px rgba(251,191,36,0.6)" }}
            />
          </span>
        ) : (
          <span
            className="mt-px h-2.5 w-2.5 rounded-full border-2 border-neutral-900 bg-[#fbbf24]"
            style={{ boxShadow: "0 0 6px rgba(251,191,36,0.4)" }}
          />
        )}
      </div>
      <div className="pb-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-white">{entry.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">{entry.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-px">
            <span className="text-[12.5px] tabular-nums text-neutral-400">{entry.date}</span>
          </div>
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <ReactionButton emoji="\u{1F525}" count={entry.reactions.fire} />
            <ReactionButton emoji="\u{1F389}" count={entry.reactions.party} />
            <ReactionButton emoji="\u2764\uFE0F" count={entry.reactions.heart} />
          </div>
          {entry.screenshots && entry.screenshots.length > 0 && (
            <div className="flex shrink-0 items-center gap-1">
              {entry.screenshots.map((img) => (
                <button
                  key={img}
                  type="button"
                  className="block overflow-hidden rounded-md border border-neutral-700/70 bg-neutral-800 transition-[transform,border-color] hover:border-neutral-500 hover:-translate-y-px"
                  style={{ width: img.includes("class") ? 36 : img.includes("tushi") ? 37 : 64, height: 40 }}
                >
                  <img src={`${CDN_BASE}/${img}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
              {entry.extraScreenshotCount && (
                <button
                  type="button"
                  className="grid w-9 place-items-center rounded-md border border-neutral-700/70 bg-neutral-800 text-[11px] font-medium tabular-nums text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                  style={{ height: 40 }}
                >
                  +{entry.extraScreenshotCount}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsNewPage() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes spinePing { 75%,100% { transform: scale(2.2); opacity: 0; } }
        @keyframes changelog-in { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="What's new"
          className="relative z-10 flex w-full max-h-[88vh] max-w-[720px] animate-[changelog-in_0.3s_ease-out]"
        >
          <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-xl">

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-semibold text-white">What's new</h2>
                <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                  {CHANGELOG_ENTRIES.length} updates
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-5 py-4" style={{ height: "64vh" }}>
              {monthOrder.map((month, mi) => {
                const isFirst = mi === 0;
                return (
                  <div key={month}>
                    <div className="relative mb-4 flex items-center gap-3 py-1">
                      {!isFirst && (
                        <span aria-hidden="true" className="pointer-events-none absolute left-[13px] w-px bg-neutral-700/70" style={{ top: 0, bottom: -16 }} />
                      )}
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/50" />
                      <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold tracking-wide text-neutral-900 shadow-[0_2px_10px_rgba(245,158,11,0.22)]">
                        {month}
                      </span>
                      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/50" />
                    </div>
                    <div>
                      {groupedByMonth[month].map((entry, ei) => (
                        <EntryCard
                          key={`${entry.date}-${entry.title}`}
                          entry={entry}
                          isLatest={!!entry.highlight && ei === 0}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}