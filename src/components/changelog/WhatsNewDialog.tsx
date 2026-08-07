"use client";

import { useEffect, useState } from "react";
import { X, Rocket, Lock, ArrowUpRight } from "lucide-react";
import { CHANGELOG_ENTRIES, CHANGELOG_IMAGES_BASE, type ChangelogEntry } from "./changelog-data";

type Tab = "whats-new" | "coming-up" | "suggestions";

const REACTION_EMOJI: Record<string, string> = {
  fire: "🔥",
  party: "🎉",
  heart: "❤️",
};

function groupByMonth(entries: ChangelogEntry[]): [string, ChangelogEntry[]][] {
  const map = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.month) ?? [];
    list.push(entry);
    map.set(entry.month, list);
  }
  return Array.from(map.entries());
}

export default function WhatsNewDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("whats-new");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const grouped = groupByMonth(CHANGELOG_ENTRIES);

  return (
    <div className="fixed inset-0 z-[1000] flex justify-center items-center p-6">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-hidden="true"
        style={{ opacity: mounted ? 1 : 0 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="What's new"
        className="relative z-10 flex w-full max-h-[88vh] max-w-[720px]"
        style={{ opacity: mounted ? 1 : 0 }}
      >
        <div className="relative flex w-full flex-col overflow-hidden border border-neutral-700 bg-neutral-900 shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-2.5 border-b border-neutral-800 px-4 py-3">
            <div className="flex flex-1 gap-1 rounded-lg bg-neutral-800/70 p-1">
              <TabButton active={tab === "whats-new"} onClick={() => setTab("whats-new")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="will-change-transform" style={{ width: 14, height: 14 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
                What's new
              </TabButton>
              <TabButton active={tab === "coming-up"} onClick={() => setTab("coming-up")}>
                <Rocket className="size-3.5" />
                Coming up
              </TabButton>
              <TabButton active={tab === "suggestions"} onClick={() => setTab("suggestions")} disabled>
                <Lock className="size-3" />
                Suggestions
              </TabButton>
            </div>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Content */}
          <div className="no-scrollbar overflow-y-auto px-5 py-4" style={{ height: "64vh" }}>
            {grouped.map(([month, entries]) => (
              <MonthSection key={month} month={month} entries={entries} isLast={month === grouped[grouped.length - 1][0]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="relative inline-block w-full" tabIndex={0}>
        <button
          disabled
          className="relative flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors text-neutral-500 hover:text-neutral-400"
          aria-disabled="true"
        >
          <span className="relative flex items-center gap-1.5">{children}</span>
        </button>
      </span>
    );
  }

  return (
    <div className="flex flex-1">
      <button
        onClick={onClick}
        className={`relative flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors ${
          active ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-200"
        }`}
        aria-disabled="false"
      >
        {active && (
          <span
            className="absolute inset-0 rounded-md"
            style={{ background: "rgb(251, 191, 36)" }}
          />
        )}
        <span className="relative flex items-center gap-1.5">{children}</span>
      </button>
    </div>
  );
}

function MonthSection({ month, entries, isLast }: { month: string; entries: ChangelogEntry[]; isLast: boolean }) {
  return (
    <div>
      <style>{`@keyframes spinePing{75%,100%{transform:scale(2.2);opacity:0}}`}</style>
      <div className="relative mb-4 flex items-center gap-3 py-1">
        {!isLast && (
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 left-[13px] top-0 w-px bg-neutral-700/70" />
        )}
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/50" />
        <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold tracking-wide text-neutral-900 shadow-[0_2px_10px_rgba(245,158,11,0.22)]">
          {month}
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/50" />
      </div>
      {entries.map((entry, i) => (
        <TimelineEntry key={i} entry={entry} isFirst={i === 0} isLast={i === entries.length - 1} />
      ))}
    </div>
  );
}

function TimelineEntry({ entry, isFirst, isLast }: { entry: ChangelogEntry; isFirst: boolean; isLast: boolean }) {
  return (
    <div className="relative pl-9">
      {!isLast && (
        <span aria-hidden="true" className="pointer-events-none absolute left-[13px] w-px bottom-0 top-0 bg-neutral-700/70" />
      )}
      {!isFirst && (
        <span aria-hidden="true" className="pointer-events-none absolute left-[13px] w-px bottom-0 top-[10px] bg-gradient-to-b from-amber-400/60 to-neutral-700/70" />
      )}
      <div className="absolute left-0 top-[3px] flex w-7 justify-center">
        {isFirst ? (
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span
              className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: "rgb(251, 191, 36)", opacity: 0.45, animation: "2s cubic-bezier(0, 0, 0.2, 1) 0s infinite normal none running spinePing" }}
            />
            <span
              className="relative h-3.5 w-3.5 rounded-full border-2 border-neutral-900"
              style={{ background: "rgb(251, 191, 36)", boxShadow: "rgba(251, 191, 36, 0.6) 0px 0px 10px" }}
            />
          </span>
        ) : (
          <span
            className="mt-px h-2.5 w-2.5 rounded-full border-2 border-neutral-900"
            style={{ background: "rgb(251, 191, 36)", boxShadow: "rgba(251, 191, 36, 0.4) 0px 0px 6px" }}
          />
        )}
      </div>
      <div className={`pb-6`}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-white">
              {entry.link ? (
                <a
                  href={entry.link}
                  target={entry.link.startsWith("http") ? "_blank" : undefined}
                  rel={entry.link.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group/link inline-flex items-center gap-1.5 text-white"
                >
                  <span className="underline decoration-dotted decoration-[1.5px] decoration-neutral-500 underline-offset-[5px] transition-colors group-hover/link:text-amber-300 group-hover/link:decoration-amber-400">
                    {entry.title}
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-amber-400 transition-all duration-200 group-hover/link:text-amber-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                </a>
              ) : (
                entry.title
              )}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">{entry.description}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 pt-px">
            <span className="text-[12.5px] tabular-nums text-neutral-400">{entry.date}</span>
          </div>
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(entry.reactions) as Array<keyof typeof entry.reactions>).map((key) => (
              <button
                key={key}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold tabular-nums transition-[transform,background-color,border-color,color] duration-150 motion-safe:hover:-translate-y-px motion-safe:active:scale-95"
                aria-pressed="false"
                style={{ borderColor: "rgba(251, 191, 36, 0.55)", background: "transparent", color: "rgb(252, 211, 77)" }}
              >
                <span className="text-[13px] leading-none">{REACTION_EMOJI[key]}</span>
                <span>{entry.reactions[key]}</span>
              </button>
            ))}
          </div>
          {entry.screenshots && entry.screenshots.length > 0 && (
            <div className="flex flex-shrink-0 items-center gap-1">
              {entry.screenshots.slice(0, 3).map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className="block overflow-hidden rounded-md border border-neutral-700/70 bg-neutral-800 transition-[transform,border-color] hover:border-neutral-500 hover:-translate-y-px"
                  style={{ width: i < 2 ? (entry.screenshots!.length > 1 && i === 0 ? 53 : 64) : 36, height: 40 }}
                >
                  <img
                    src={`${CHANGELOG_IMAGES_BASE}/${src}`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
              {entry.extraScreenshotCount && entry.extraScreenshotCount > 0 && (
                <div
                  className="grid place-items-center rounded-md border border-neutral-700/70 bg-neutral-800 text-[11px] font-medium tabular-nums text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                  style={{ width: 36, height: 40 }}
                >
                  +{entry.extraScreenshotCount}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
