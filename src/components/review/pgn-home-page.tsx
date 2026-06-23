"use client";

import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Brain,
  CalendarCheck2,
  ChartNoAxesCombined,
  ChessKnight,
  CircleDot,
  Clock3,
  DatabaseZap,
  FileText,
  Flame,
  Gauge,
  Infinity,
  Layers3,
  LineChart,
  Play,
  RadioTower,
  Sparkles,
  Target,
  Trophy,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { samplePgn } from "@/data/sample-data";
import { cn } from "@/lib/utils";

type HomeSource = "chesscom" | "lichess" | "pgn";

type ImportResponse = {
  analysisId?: string;
  message?: string;
  shareUrl?: string;
};

type SampleChip = {
  avatar: string;
  label: string;
  value: string;
};

type ProofCard = {
  copy: string;
  icon: LucideIcon;
  label: string;
  stat: string;
  tone: string;
};

const sourceTabs: {
  description: string;
  id: HomeSource;
  imageSrc?: string;
  label: string;
}[] = [
  {
    description: "Game archive, move list, report handoff.",
    id: "chesscom",
    imageSrc: "/images/platforms/chesscom.svg",
    label: "Chess.com",
  },
  {
    description: "Latest public game, fast engine pass.",
    id: "lichess",
    imageSrc: "/images/platforms/lichess.svg",
    label: "Lichess",
  },
  {
    description: "Paste notation, keep the same report flow.",
    id: "pgn",
    label: "PGN",
  },
];

const sampleChips: Record<HomeSource, SampleChip[]> = {
  chesscom: [
    { avatar: "MC", label: "Magnus Carlsen", value: "MagnusCarlsen" },
    { avatar: "GC", label: "GothamChess", value: "GothamChess" },
    { avatar: "HK", label: "Hikaru", value: "Hikaru" },
  ],
  lichess: [
    { avatar: "DN", label: "DrNykterstein", value: "DrNykterstein" },
    { avatar: "NN", label: "Naroditsky", value: "DanielNaroditsky" },
    { avatar: "LC", label: "Lichess", value: "lichess" },
  ],
  pgn: [{ avatar: "PG", label: "Sample PGN", value: samplePgn }],
};

const proofCards: ProofCard[] = [
  {
    copy: "Engine review, accuracy, CPL, and candidate lines stay together.",
    icon: DatabaseZap,
    label: "Stockfish 18",
    stat: "Depth-ready",
    tone: "text-amber-200",
  },
  {
    copy: "The report highlights the few positions that deserve the next hour.",
    icon: ChartNoAxesCombined,
    label: "Move grades",
    stat: "Signal first",
    tone: "text-white",
  },
  {
    copy: "Every miss can turn into a repeatable perfect-move drill.",
    icon: Infinity,
    label: "Daily loop",
    stat: "No dead end",
    tone: "text-amber-200",
  },
];

const dailyWorkflow = [
  {
    copy: "Import the latest game from the account where the day actually happened.",
    icon: RadioTower,
    label: "Morning scan",
    stat: "01",
  },
  {
    copy: "Open the exact turning points with accuracy, opening, and eval context already attached.",
    icon: BarChart3,
    label: "Report desk",
    stat: "02",
  },
  {
    copy: "Turn one mistake into a focused card for the next Perfects session.",
    icon: Target,
    label: "Training lock",
    stat: "03",
  },
];

const operatingMetrics = [
  { label: "Import lanes", value: "3", icon: Layers3 },
  { label: "Engine pass", value: "18", icon: Gauge },
  { label: "Daily work", value: "15m", icon: Clock3 },
  { label: "Saved route", value: "1", icon: BookOpenCheck },
];

const reportRows = [
  { label: "Opening", score: "B42", tone: "bg-amber-300" },
  { label: "Swing", score: "-182", tone: "bg-rose-300" },
  { label: "Perfect", score: "Nf6", tone: "bg-white" },
  { label: "Coach", score: "Pins", tone: "bg-amber-200" },
];

const marqueeItems = ["PGN import", "Chess.com games", "Lichess latest", "Saved reports", "Perfects", "Coach snapshots"];

function displayUsername(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function sourceLabel(source: HomeSource) {
  if (source === "chesscom") return "Chess.com";
  if (source === "lichess") return "Lichess";
  return "PGN";
}

function HomeSourceIcon({ tab }: { tab: (typeof sourceTabs)[number] }) {
  if (!tab.imageSrc) {
    return <FileText className="size-4 shrink-0" />;
  }

  return (
    <span className={cn("grid size-5 shrink-0 place-items-center rounded-md sm:size-6", tab.id === "lichess" ? "bg-white" : "bg-black/20")}>
      <Image alt="" aria-hidden="true" height={14} loading="lazy" src={tab.imageSrc} width={14} />
    </span>
  );
}

function InsightBoard() {
  const pieces = [
    { label: "K", square: "col-start-7 row-start-2", tone: "text-slate-950 bg-white" },
    { label: "Q", square: "col-start-4 row-start-3", tone: "text-slate-950 bg-amber-200" },
    { label: "N", square: "col-start-6 row-start-5", tone: "text-slate-950 bg-white" },
    { label: "k", square: "col-start-2 row-start-7", tone: "text-white bg-slate-950" },
    { label: "r", square: "col-start-5 row-start-6", tone: "text-white bg-slate-900" },
  ];

  return (
    <div className="home-board-shell" aria-label="Animated chess analysis preview">
      <div className="home-board-grid">
        {Array.from({ length: 64 }).map((_, index) => (
          <span key={index} className={cn("home-board-square", (Math.floor(index / 8) + index) % 2 === 0 ? "bg-[#f7d569]" : "bg-[#0f111d]")} />
        ))}
        <span className="home-board-highlight col-start-4 row-start-3" />
        <span className="home-board-highlight col-start-6 row-start-5" />
        <span className="home-board-line" />
        {pieces.map((piece) => (
          <span key={`${piece.label}-${piece.square}`} className={cn("home-board-piece", piece.square, piece.tone)}>
            {piece.label}
          </span>
        ))}
      </div>
      <div className="home-board-eval" aria-hidden="true">
        <span />
      </div>
      <div className="home-board-caption">
        <span>Critical moment</span>
        <strong>21...Nf6</strong>
      </div>
    </div>
  );
}

function ImportConsole({
  activeSource,
  activeTab,
  activeUsername,
  onApplySample,
  onPrimaryAction,
  onSetActiveSource,
  onSetPgn,
  onSetStatus,
  onSetUsername,
  pendingSource,
  pgn,
  primaryLabel,
  status,
  submitPgn,
}: {
  activeSource: HomeSource;
  activeTab: (typeof sourceTabs)[number];
  activeUsername: string;
  onApplySample: (sample: SampleChip) => void;
  onPrimaryAction: () => void;
  onSetActiveSource: (source: HomeSource) => void;
  onSetPgn: (value: string) => void;
  onSetStatus: (value: string | null) => void;
  onSetUsername: (value: string) => void;
  pendingSource: HomeSource | null;
  pgn: string;
  primaryLabel: string;
  status: string | null;
  submitPgn: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="home-console home-reveal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">Live desk</p>
          <p className="mt-1 text-xl font-black text-white">Start a report</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
          <span className="size-2 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(247,213,105,0.85)]" />
          Ready
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/35 p-1">
        {sourceTabs.map((tab) => {
          const active = activeSource === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSetActiveSource(tab.id);
                onSetStatus(null);
              }}
              className={cn(
                "flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-md px-1 text-[11px] font-black transition hover:scale-[1.01] active:scale-[0.98] sm:gap-2 sm:px-2 sm:text-sm",
                active
                  ? "bg-[#f1f5f9] text-slate-950 shadow-[0_14px_34px_rgba(241,245,249,0.16)]"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white",
              )}
              aria-pressed={active}
            >
              <HomeSourceIcon tab={tab} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {activeSource === "pgn" ? (
          <form onSubmit={submitPgn}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="home-pgn-input" className="text-sm font-bold text-slate-100">
                PGN
              </label>
              <button
                type="button"
                onClick={() => {
                  onSetPgn(samplePgn);
                  onSetStatus(null);
                }}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100 hover:bg-amber-300/15"
              >
                <WandSparkles className="size-3.5" />
                Sample
              </button>
            </div>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-4 top-4 size-5 text-amber-200" />
              <textarea
                id="home-pgn-input"
                value={pgn}
                onChange={(event) => {
                  onSetPgn(event.target.value);
                  onSetStatus(null);
                }}
                placeholder="Paste PGN"
                className="min-h-48 w-full resize-y rounded-lg border border-white/10 bg-[#080a0c] px-12 py-4 font-mono text-sm leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-200/70 focus:shadow-[0_0_0_3px_rgba(247,213,105,0.13)]"
              />
            </div>
          </form>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="home-platform-input" className="text-sm font-bold text-slate-100">
                {activeSource === "chesscom" ? "Chess.com username" : "Lichess username"}
              </label>
              {activeSource === "chesscom" ? (
                <button
                  type="button"
                  onClick={() => {
                    onSetUsername("");
                    onSetStatus(null);
                  }}
                  className="inline-flex min-h-9 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/[0.08]"
                  aria-label="Clear username"
                >
                  <X className="size-3.5" />
                  Clear
                </button>
              ) : null}
            </div>
            <div className="relative">
              <ChessKnight className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-amber-200" />
              <input
                id="home-platform-input"
                value={activeUsername}
                onChange={(event) => onSetUsername(event.target.value)}
                placeholder={activeSource === "chesscom" ? "mr-demon-only" : "Lichess username"}
                className="h-16 w-full rounded-lg border border-white/10 bg-[#080a0c] px-12 text-lg font-black text-white outline-none transition placeholder:text-slate-600 focus:border-amber-200/70 focus:shadow-[0_0_0_3px_rgba(247,213,105,0.13)]"
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={Boolean(pendingSource)}
          className="premium-shimmer mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#f1f5f9] px-5 py-4 text-base font-black text-slate-950 shadow-[0_20px_60px_rgba(241,245,249,0.15)] transition hover:scale-[1.01] hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {primaryLabel}
          {pendingSource ? <Sparkles className="size-5 animate-pulse" /> : <ArrowRight className="size-5" />}
        </button>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs leading-5 text-slate-400">
          <BadgeCheck className="size-4 shrink-0 text-amber-200" />
          No account needed. Free analysis stays open.
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {sampleChips[activeSource].map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => onApplySample(sample)}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-amber-200/35 hover:bg-amber-200/10 hover:text-white active:scale-[0.98]"
            >
              <span className="grid size-6 place-items-center overflow-hidden rounded-md bg-slate-800 text-[10px] font-black text-amber-200">
                {sample.avatar}
              </span>
              {sample.label}
            </button>
          ))}
        </div>

        {status ? (
          <p className="mt-4 rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm leading-6 text-slate-300" aria-live="polite">
            <span className="mr-2 inline-block size-2 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(247,213,105,0.7)]" />
            {status}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-center gap-2 text-xs leading-5 text-slate-500">
          <CircleDot className="size-4 shrink-0 text-white" />
          {activeTab.description}
        </div>
      </div>
    </div>
  );
}

export function PgnHomePage() {
  const router = useRouter();
  const navigatingToReportRef = useRef(false);
  const [activeSource, setActiveSource] = useState<HomeSource>("chesscom");
  const [chessComUsername, setChessComUsername] = useState("mr-demon-only");
  const [lichessUsername, setLichessUsername] = useState("");
  const [pgn, setPgn] = useState("");
  const [pendingSource, setPendingSource] = useState<HomeSource | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const activeUsername = activeSource === "chesscom" ? chessComUsername : lichessUsername;
  const activeTab = sourceTabs.find((tab) => tab.id === activeSource) ?? sourceTabs[0];

  function setUsername(value: string) {
    setStatus(null);

    if (activeSource === "chesscom") {
      setChessComUsername(value);
    } else {
      setLichessUsername(value);
    }
  }

  function applySample(sample: SampleChip) {
    setStatus(null);

    if (activeSource === "pgn") {
      setPgn(sample.value);
      return;
    }

    setUsername(sample.value);
  }

  function submitPgn(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedPgn = pgn.trim();

    if (!trimmedPgn) {
      setStatus("Paste a PGN first.");
      return;
    }

    router.push(`/analysis?pgn=${encodeURIComponent(trimmedPgn)}`);
  }

  async function analyzeLatest(source: Exclude<HomeSource, "pgn">) {
    const username = displayUsername(source === "chesscom" ? chessComUsername : lichessUsername);

    if (username.length < 2) {
      setStatus(`Enter a ${sourceLabel(source)} username first.`);
      return;
    }

    navigatingToReportRef.current = false;
    setPendingSource(source);
    setStatus(`Importing ${username}'s latest public ${sourceLabel(source)} game...`);

    try {
      const response = await fetch(`/api/import/${source}`, {
        body: JSON.stringify({ requestedDepth: "quick", username }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Import failed.");
      }

      const reportUrl = data.shareUrl ?? (data.analysisId ? `/analysis/${data.analysisId}` : null);
      setStatus(data.message ?? "Analysis ready.");

      if (reportUrl) {
        void router.prefetch(reportUrl);
        navigatingToReportRef.current = true;
        router.push(reportUrl);
      }
    } catch (error) {
      navigatingToReportRef.current = false;
      setStatus(error instanceof Error ? error.message : "The import failed. Try another public username.");
    } finally {
      if (!navigatingToReportRef.current) {
        setPendingSource(null);
      }
    }
  }

  function handlePrimaryAction() {
    if (activeSource === "pgn") {
      submitPgn();
      return;
    }

    const username = displayUsername(activeUsername);

    if (activeSource === "chesscom") {
      if (username.length < 2) {
        setStatus("Enter a Chess.com username first.");
        return;
      }

      router.push(`/games/chesscom?username=${encodeURIComponent(username)}`);
      return;
    }

    void analyzeLatest(activeSource);
  }

  const primaryLabel =
    activeSource === "chesscom"
      ? "Fetch Recent Games"
      : activeSource === "lichess"
        ? pendingSource === "lichess"
          ? "Analyzing..."
          : "Analyze Latest Game"
        : "Analyze PGN";

  return (
    <section className="premium-home relative -mx-3 -my-4 overflow-hidden text-white sm:-mx-5 md:-mx-6 lg:-mx-8">
      <div className="premium-home-grid" aria-hidden="true" />
      <div className="premium-home-noise" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="min-h-[calc(100vh-2rem)] py-8 lg:py-10">
          <div className="grid min-h-[calc(100vh-7rem)] items-center gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(420px,0.72fr)]">
            <div className="home-reveal">
              <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-300">
                <Sparkles className="size-3.5 text-amber-200" />
                Chessfork
              </div>
              <h1 className="mt-6 max-w-[21rem] text-4xl font-black leading-[0.92] tracking-normal text-white sm:max-w-5xl sm:text-7xl lg:text-8xl">
                Chess work that feels famous by Tuesday.
              </h1>
              <p className="mt-6 max-w-[22rem] text-base font-medium leading-7 text-slate-300 sm:max-w-3xl sm:text-xl sm:leading-8">
                A premium daily desk for importing games, reading the few moves that matter, and turning one miss into a cleaner next session.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => document.getElementById("home-console")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_20px_60px_rgba(255,255,255,0.14)] hover:bg-slate-100"
                >
                  <Play className="size-4 fill-slate-950" />
                  Start now
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("daily-system")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-black text-white hover:bg-white/[0.08]"
                >
                  <CalendarCheck2 className="size-4 text-amber-200" />
                  Daily system
                </button>
              </div>

              <div className="mt-10 hidden gap-3 sm:grid sm:grid-cols-3">
                {proofCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div key={card.label} className="home-proof-card home-reveal">
                      <div className={cn("grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.05]", card.tone)}>
                        <Icon className="size-5" />
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
                      <p className="mt-2 text-lg font-black text-white">{card.stat}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{card.copy}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div id="home-console" className="grid gap-4">
              <ImportConsole
                activeSource={activeSource}
                activeTab={activeTab}
                activeUsername={activeUsername}
                onApplySample={applySample}
                onPrimaryAction={handlePrimaryAction}
                onSetActiveSource={setActiveSource}
                onSetPgn={setPgn}
                onSetStatus={setStatus}
                onSetUsername={setUsername}
                pendingSource={pendingSource}
                pgn={pgn}
                primaryLabel={primaryLabel}
                status={status}
                submitPgn={submitPgn}
              />
              <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
                <InsightBoard />
                <div className="home-mini-report home-reveal">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Report pulse</p>
                    <Flame className="size-4 text-amber-200" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {reportRows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-300">
                          <span className={cn("size-2 shrink-0 rounded-full", row.tone)} />
                          <span className="truncate">{row.label}</span>
                        </span>
                        <strong className="font-mono text-sm text-white">{row.score}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="home-marquee border-y border-white/10" aria-hidden="true">
          <div className="home-marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span key={`${item}-${index}`}>
                <Zap className="size-4" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <section id="daily-system" className="py-16 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="home-reveal lg:sticky lg:top-8 lg:self-start">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200">Daily operating system</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-black leading-none text-white sm:text-6xl">
                Less dashboard fog. More useful next move.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
                The scroll story is built around work, not decoration: import, report, train, repeat. It feels alive because the product surface keeps moving with the player.
              </p>
            </div>

            <div className="grid gap-4">
              {dailyWorkflow.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.label} className="home-stack-panel home-reveal">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="grid size-12 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-amber-200">
                        <Icon className="size-5" />
                      </div>
                      <span className="font-mono text-5xl font-black text-white/10">{item.stat}</span>
                    </div>
                    <h3 className="mt-8 text-3xl font-black text-white">{item.label}</h3>
                    <p className="mt-3 max-w-2xl text-base leading-8 text-slate-300">{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="home-workbench-band home-reveal">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200">Workbench metrics</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-none text-white sm:text-6xl">
              Built like an app people keep open.
            </h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {operatingMetrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <div key={metric.label} className="home-metric-card">
                  <Icon className="size-5 text-amber-200" />
                  <p className="mt-6 font-mono text-5xl font-black text-white">{metric.value}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-slate-500">{metric.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="home-feature-stage home-reveal">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-white">Premium feel</p>
                  <h2 className="mt-4 max-w-3xl text-4xl font-black leading-none text-white sm:text-6xl">
                    Simple enough for today. Deep enough for a serious player.
                  </h2>
                </div>
                <Brain className="size-12 text-amber-200" />
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  { label: "Review", copy: "The board, eval trace, and move grade agree on the same story.", icon: LineChart },
                  { label: "Practice", copy: "A failed move becomes a clean perfect-move repetition.", icon: Trophy },
                  { label: "Coach", copy: "Training snapshots stay connected to saved reports.", icon: WandSparkles },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="home-feature-tile">
                      <Icon className="size-5 text-amber-200" />
                      <p className="mt-5 text-2xl font-black text-white">{item.label}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{item.copy}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="home-rhythm-card home-reveal">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-lg bg-amber-200 text-slate-950">
                  <CalendarCheck2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Today</p>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Focus queue</p>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                {["Game import", "Two critical moves", "One Perfects card", "Coach note"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-md text-xs font-black", index === 0 ? "bg-amber-200 text-slate-950" : "bg-white/[0.06] text-slate-300")}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
