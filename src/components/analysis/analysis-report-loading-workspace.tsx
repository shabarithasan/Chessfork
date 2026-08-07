"use client";

import Link from "next/link";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Bolt, ChevronLeft, ChevronRight, Flame, Home, Info, Sparkles, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PandaMascot } from "@/components/mascot/PandaMascot";
import { cn } from "@/lib/utils";

const loadingPositions = [
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3",
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4",
  "r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 b - - 6 5",
];

const moveTicker = ["d4", "d6", "e4", "Nf6", "e5", "dxe5", "Nf3", "e4", "Ne5", "Qd5"];

function LoadingSidebar() {
  const nav = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/daily", icon: Bolt, label: "Train", badge: "NEW" },
    { href: "/coach", icon: Sparkles, label: "Supercoach", dot: true },
    { href: "/analyze", icon: Wrench, label: "Tools", active: true },
    { href: "/features", icon: Info, label: "About" },
  ];

  return (
    <aside className="hidden h-screen w-[252px] shrink-0 border-r border-white/8 bg-[#1f1e1b] px-3 py-4 text-[#e8e1d2] lg:flex lg:flex-col">
      <div className="flex items-center justify-between border-b border-white/8 pb-5">
        <Link href="/" className="flex items-center gap-2"><span className="text-2xl">♜</span><span className="text-[1.05rem] tracking-wide">CHESSFORK</span></Link>
        <ChevronLeft className="size-4 text-stone-500" />
      </div>
      <nav className="mt-7 space-y-2">
        {nav.map((item) => {
          const Icon = item.icon;
          return <Link key={item.label} href={item.href} className={cn("flex h-12 items-center gap-3 rounded-2xl border border-transparent px-3 text-sm font-semibold text-stone-300", item.active && "border-[#f6b900] bg-amber-400/10 text-[#ffd04a] shadow-[0_0_20px_rgba(251,191,36,0.15)]")}><Icon className="size-4" /><span className="flex-1">{item.label}</span>{item.badge ? <span className="rounded bg-[#ffc12c] px-1.5 py-0.5 text-[.55rem] font-black text-[#2a2111]">{item.badge}</span> : null}{item.dot ? <span className="size-2 rounded-full bg-[#ffc12c]" /> : null}{item.active ? <ChevronRight className="size-3" /> : null}</Link>;
        })}
      </nav>
      <div className="mt-auto space-y-6"><div className="flex items-center justify-between px-3 text-sm font-semibold text-stone-400"><span>✦ What&apos;s new</span><span className="size-2 rounded-full bg-[#ffc12c]" /></div><div className="rounded-lg bg-[#181715] p-5"><div className="flex items-end gap-3 text-[#ffc12c]"><Flame className="mb-1 size-7 fill-[#ffc12c]/30" /><span className="text-4xl font-black leading-none">1</span><span className="mb-1 text-[.6rem] uppercase tracking-[.28em] text-stone-500">day streak</span></div></div><Link href="/auth" className="flex h-11 items-center justify-center rounded-md bg-[#f2a30d] text-sm font-semibold text-[#2b2111]">Sign in</Link></div>
    </aside>
  );
}

function PlayerChip({ name, active }: { name: string; active?: boolean }) {
  return <div className={cn("flex h-7 items-center gap-1.5 rounded-[7px] pl-1 pr-2.5 text-[12px] font-semibold", active ? "border border-[#f3c53d] bg-[#282410] text-white" : "bg-[#f3f3f3] text-[#252525]")}><span className="grid size-5 place-items-center rounded-[5px] bg-[#777] text-[9px] text-white">P</span><span>{name}</span><span className="font-mono text-[10px] opacity-60">—</span></div>;
}

function AnalysisSkeleton() {
  return <aside className="min-h-0 overflow-hidden border-l border-white/8 bg-[#1d1c19] px-5 py-4 xl:px-7">
    <div className="flex items-start gap-3"><PandaMascot size={58} /><div className="relative mt-1 rounded-2xl bg-white px-4 py-3 text-[13px] font-medium text-[#3a372f] after:absolute after:left-[-6px] after:top-4 after:size-3 after:rotate-45 after:bg-white">Working through the game.</div></div>
    <div className="mt-4 h-[1px] bg-white/8" />
    <div className="mt-5 h-20 overflow-hidden rounded-md border border-white/5 bg-black/15"><div className="h-full w-[46%] animate-pulse bg-gradient-to-r from-white/5 via-white/14 to-white/5" /></div>
    <p className="mt-3 truncate font-mono text-[10px] tracking-wide text-stone-500">{moveTicker.join("  ·  ")}</p>
    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><div><p className="text-xs font-bold text-stone-200">White</p><div className="mx-auto mt-2 size-11 rounded-lg bg-stone-700/60" /><div className="mt-2 h-9 rounded-lg bg-white/8" /></div><p className="text-[11px] text-stone-500">Accuracy</p><div><p className="text-xs font-bold text-stone-200">Black</p><div className="mx-auto mt-2 size-11 rounded-lg bg-stone-700/60" /><div className="mt-2 h-9 rounded-lg bg-white/8" /></div></div>
    <div className="mt-4 space-y-2 border-b border-white/8 pb-4 text-[12px] text-stone-500">{["Sigma", "Awesome", "Best", "Strange", "Bad", "Miss", "Clown"].map((item, index) => <div className="flex items-center gap-2" key={item}><span className={cn("size-3 rounded-full", index < 3 ? "bg-emerald-400/30" : index < 5 ? "bg-amber-400/25" : "bg-rose-400/25")} /><span>{item}</span></div>)}</div>
    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="h-10 rounded-lg bg-white/8" /><span className="text-[11px] text-stone-500">Game rating</span><div className="h-10 rounded-lg bg-white/8" /></div>
  </aside>;
}

export function AnalysisReportLoadingWorkspace() {
  const [positionIndex, setPositionIndex] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setPositionIndex((current) => (current + 1) % loadingPositions.length), 950); return () => window.clearInterval(id); }, []);
  const boardOptions: ChessboardOptions = useMemo(() => ({ position: loadingPositions[positionIndex], boardOrientation: "white", showNotation: true, allowDragging: false, animationDurationInMs: 420, boardStyle: { borderRadius: 0, boxShadow: "0 18px 44px rgba(0,0,0,0.34)", width: "100%" }, lightSquareStyle: { backgroundColor: "#d7d7df" }, darkSquareStyle: { backgroundColor: "#4a5367" }, darkSquareNotationStyle: { color: "rgba(255,255,255,.75)", fontWeight: 700 }, lightSquareNotationStyle: { color: "rgba(28,29,33,.72)", fontWeight: 700 } }), [positionIndex]);
  return <div className="fixed inset-0 z-[1000] overflow-hidden bg-[#171613] text-stone-100"><div className="grid h-screen lg:grid-cols-[252px_minmax(0,1fr)_minmax(320px,420px)]"><LoadingSidebar /><main className="min-w-0 overflow-hidden bg-[#171613] px-3 py-3 sm:px-5 lg:px-7"><div className="mx-auto flex h-full max-w-[720px] flex-col"><div className="flex items-center justify-between gap-3"><PlayerChip name="White" /><span className="font-mono text-[11px] text-stone-500">10:00</span></div><div className="my-3 min-h-0 flex-1"><div className="mx-auto aspect-square h-full max-h-full w-full"><Chessboard options={boardOptions} /></div></div><div className="flex items-center justify-between gap-3"><PlayerChip name="Black" active /><span className="font-mono text-[11px] text-stone-500">10:00</span></div></div></main><AnalysisSkeleton /></div></div>;
}
