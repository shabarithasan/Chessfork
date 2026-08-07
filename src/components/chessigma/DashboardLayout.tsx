"use client";

import type { ReactNode } from "react";

/* ─── Left Sidebar ─── */

const navItems = [
  { label: "Home", icon: "♟", href: "#" },
  { label: "Analyze", icon: "🔍", href: "#" },
  { label: "Coach", icon: "🤖", href: "#" },
  { label: "Games", icon: "📋", href: "#" },
  { label: "Puzzles", icon: "🧩", href: "#" },
  { label: "Openings", icon: "📚", href: "#" },
  { label: "Settings", icon: "⚙", href: "#" },
];

function LeftSidebar() {
  return (
    <aside
      style={{ width: 240, backgroundColor: "#25262a" }}
      className="flex shrink-0 flex-col border-r border-white/10 overflow-y-auto"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <span className="grid size-9 place-items-center rounded-lg bg-amber-500/20 text-lg font-bold text-amber-400">
          ♚
        </span>
        <span className="text-base font-bold tracking-wide text-white">CHESSIGMA</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom user area */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
            U
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Guest</p>
            <p className="text-xs text-gray-500">Sign in</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Center Board Area ─── */

function CenterBoard({ children, navSlot }: { children: ReactNode; navSlot?: ReactNode }) {
  return (
    <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6">
      {/* Perfectly square board using aspect-ratio */}
      <div className="w-full max-w-[560px]">
        <div className="aspect-square w-full rounded-lg border border-white/10 bg-[#25262a] shadow-2xl">
          {children}
        </div>
      </div>

      {navSlot}
    </main>
  );
}

/* ─── Right Sidebar ─── */

function RightSidebar({ children }: { children: ReactNode }) {
  return (
    <aside
      style={{ width: 400 }}
      className="flex shrink-0 flex-col border-l border-white/10 bg-[#25262a]/50 overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Analysis</h2>
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
          Stockfish 18
        </span>
      </div>
      <div className="flex-1 p-4">
        {children}
      </div>
    </aside>
  );
}

/* ─── Main Layout ─── */

interface DashboardLayoutProps {
  boardContent: ReactNode;
  navSlot?: ReactNode;
  sidebarContent: ReactNode;
}

export function DashboardLayout({ boardContent, navSlot, sidebarContent }: DashboardLayoutProps) {
  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ backgroundColor: "#1a1b1e", color: "#e8eaed" }}
    >
      {/* Left Sidebar — fixed 240px */}
      <LeftSidebar />

      {/* Center — flex-1 fills remaining space */}
      <CenterBoard navSlot={navSlot}>{boardContent}</CenterBoard>

      {/* Right Sidebar — fixed 400px */}
      <RightSidebar>{sidebarContent}</RightSidebar>
    </div>
  );
}
