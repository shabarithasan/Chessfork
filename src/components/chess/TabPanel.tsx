"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bot,
  ChevronRight,
  Lightbulb,
  Swords,
} from "lucide-react";

import type { GameHeaders } from "@/lib/pgn-parser";
import type { GameAnalysis, MoveAnalysis } from "@/lib/game-analyzer";

type TabId = "report" | "analysis" | "coach" | "insights" | "openings";

interface TabPanelProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  gameData: GameHeaders | null;
  analysis: GameAnalysis | null;
  moves: { san: string }[];
  currentMoveIndex: number;
}

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "report", label: "Report", icon: <BarChart3 className="size-3.5" /> },
  { id: "analysis", label: "Analysis", icon: <Swords className="size-3.5" /> },
  { id: "coach", label: "Coach", icon: <Bot className="size-3.5" /> },
  { id: "insights", label: "Insights", icon: <Lightbulb className="size-3.5" /> },
  { id: "openings", label: "Openings", icon: <ChevronRight className="size-3.5" /> },
];

function ClassificationBadge({ classification }: { classification: string }) {
  const colors: Record<string, string> = {
    Brilliant: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Best: "bg-green-500/15 text-green-400 border-green-500/25",
    Excellent: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    Good: "bg-slate-500/15 text-slate-400 border-slate-500/25",
    Inaccuracy: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25",
    Mistake: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    Blunder: "bg-red-500/15 text-red-400 border-red-500/25",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors[classification] ?? ""}`}>
      {classification}
    </span>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ReportTab({ gameData, analysis }: { gameData: GameHeaders | null; analysis: GameAnalysis | null }) {
  if (!gameData || !analysis) {
    return <EmptyState message="Load a game and run analysis to see the report" />;
  }

  const whiteStats = analysis.moves.filter((m) => m.side === "white");
  const blackStats = analysis.moves.filter((m) => m.side === "black");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="White" value={gameData.white} />
        <StatCard label="Black" value={gameData.black} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Result" value={gameData.result} color="text-cyan-400" />
        <StatCard label="Date" value={gameData.date ?? "Unknown"} />
        <StatCard label="Time" value={gameData.timeControl ?? "-"} color="text-slate-400" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">White Accuracy</p>
          <p className={`text-lg font-bold ${analysis.whiteAccuracy >= 90 ? "text-green-400" : analysis.whiteAccuracy >= 75 ? "text-yellow-400" : "text-red-400"}`}>
            {analysis.whiteAccuracy}%
          </p>
        </div>
        <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">Black Accuracy</p>
          <p className={`text-lg font-bold ${analysis.blackAccuracy >= 90 ? "text-green-400" : analysis.blackAccuracy >= 75 ? "text-yellow-400" : "text-red-400"}`}>
            {analysis.blackAccuracy}%
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">White Errors</p>
          <div className="space-y-0.5 text-[11px]">
            <p className="text-slate-400">Blunders: {whiteStats.filter((m) => m.classification === "Blunder").length}</p>
            <p className="text-slate-400">Mistakes: {whiteStats.filter((m) => m.classification === "Mistake").length}</p>
            <p className="text-slate-400">Inaccuracies: {whiteStats.filter((m) => m.classification === "Inaccuracy").length}</p>
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Black Errors</p>
          <div className="space-y-0.5 text-[11px]">
            <p className="text-slate-400">Blunders: {blackStats.filter((m) => m.classification === "Blunder").length}</p>
            <p className="text-slate-400">Mistakes: {blackStats.filter((m) => m.classification === "Mistake").length}</p>
            <p className="text-slate-400">Inaccuracies: {blackStats.filter((m) => m.classification === "Inaccuracy").length}</p>
          </div>
        </div>
      </div>
      <p className="rounded-lg bg-[#0a0a0a] p-3 text-xs leading-relaxed text-slate-400">
        {analysis.summary}
      </p>
    </div>
  );
}

function AnalysisTab({ analysis, moves, currentMoveIndex }: { analysis: GameAnalysis | null; moves: { san: string }[]; currentMoveIndex: number }) {
  if (!analysis) return <EmptyState message="Analysis results will appear here" />;

  const criticalMoments = analysis.criticalMoments.slice(0, 5);
  const blunders = analysis.blunders.slice(0, 8);
  const missed = analysis.missedOpportunities.slice(0, 8);

  return (
    <div className="space-y-4">
      {criticalMoments.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-cyan-400">Key Moments</h4>
          <div className="space-y-2">
            {criticalMoments.map((cm, i) => (
              <div key={i} className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    {cm.moveNumber}{cm.side === "white" ? "." : "..."}{cm.san}
                  </span>
                  <ClassificationBadge classification={cm.classification} />
                </div>
                <p className="text-xs text-slate-500">
                  Best: {cm.bestMove || "N/A"} | Swing: {Math.abs(cm.diff) > 100 ? `${(Math.abs(cm.diff) / 100).toFixed(1)} pawns` : `${Math.round(Math.abs(cm.diff))} centipawns`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {blunders.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">Blunders</h4>
          <div className="space-y-1.5">
            {blunders.map((b, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-300">{b.moveNumber}{b.side === "white" ? "." : "..."}{b.san}</span>
                  <span className="text-[10px] text-slate-500">→ best: {b.bestMove}</span>
                </div>
                <span className="font-mono text-[11px] text-red-400">{(Math.abs(b.diff) / 100).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {missed.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-400">Missed Opportunities</h4>
          <div className="space-y-1.5">
            {missed.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-yellow-500/10 bg-yellow-500/5 px-2.5 py-1.5">
                <span className="text-xs text-slate-300">{m.moveNumber}{m.side === "white" ? "." : "..."}{m.san}</span>
                <span className="text-[10px] text-yellow-400">+{(Math.abs(m.diff) / 100).toFixed(1)} advantage</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {criticalMoments.length === 0 && blunders.length === 0 && (
        <p className="text-xs text-slate-500">Very accurate game! No major mistakes found.</p>
      )}
    </div>
  );
}

function CoachTab({ analysis, gameData }: { analysis: GameAnalysis | null; gameData: GameHeaders | null }) {
  if (!analysis || !gameData) return <EmptyState message="AI coaching available after analysis" />;

  const whiteMistakes = analysis.moves.filter((m) => m.side === "white" && (m.classification === "Mistake" || m.classification === "Blunder"));
  const blackMistakes = analysis.moves.filter((m) => m.side === "black" && (m.classification === "Mistake" || m.classification === "Blunder"));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-400">Opening</h4>
        <p className="text-xs font-semibold text-white">{analysis.openingName}</p>
        <p className="text-[10px] text-slate-500">ECO: {analysis.eco}</p>
        {analysis.moves.length > 0 && analysis.moves[0] && (
          <p className="mt-1 text-[11px] text-slate-400">
            {analysis.moves.slice(0, 4).map((m) => m.san).join(" ")}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Quality Assessment</h4>
        <p className="text-xs text-slate-400">
          <span className="text-white">{gameData.white}</span> played at <span className={analysis.whiteAccuracy >= 90 ? "text-green-400" : analysis.whiteAccuracy >= 75 ? "text-yellow-400" : "text-red-400"}>{analysis.whiteAccuracy}%</span> accuracy.
          {" "}
          <span className="text-white">{gameData.black}</span> played at <span className={analysis.blackAccuracy >= 90 ? "text-green-400" : analysis.blackAccuracy >= 75 ? "text-yellow-400" : "text-red-400"}>{analysis.blackAccuracy}%</span> accuracy.
        </p>
      </div>

      {whiteMistakes.length + blackMistakes.length > 0 && (
        <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-orange-400">Areas to Improve</h4>
          <div className="space-y-1.5">
            {whiteMistakes.slice(0, 3).map((m, i) => (
              <p key={i} className="text-[11px] text-slate-400">
                <span className="text-white">White</span>: {m.moveNumber}{m.san} — lost {Math.round(Math.abs(m.diff) / 100)} pawns of advantage
              </p>
            ))}
            {blackMistakes.slice(0, 3).map((m, i) => (
              <p key={i} className="text-[11px] text-slate-400">
                <span className="text-white">Black</span>: {m.moveNumber}{m.san} — lost {Math.round(Math.abs(m.diff) / 100)} pawns of advantage
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Practical Advice</h4>
        <ul className="space-y-1 text-[11px] text-slate-400">
          <li>• Review each blunder in the Analysis tab</li>
          <li>• Practice tactics from the missed opportunities</li>
          <li>• Study the opening line for better understanding</li>
          <li>• Focus on calculating before committing to trades</li>
        </ul>
      </div>
    </div>
  );
}

function InsightsTab({ analysis, gameData }: { analysis: GameAnalysis | null; gameData: GameHeaders | null }) {
  if (!analysis || !gameData) return <EmptyState message="Game insights will appear after analysis" />;

  const whiteMoves = analysis.moves.filter((m) => m.side === "white");
  const blackMoves = analysis.moves.filter((m) => m.side === "black");
  const whiteCaptures = whiteMoves.filter((m) => m.isCapture).length;
  const blackCaptures = blackMoves.filter((m) => m.isCapture).length;
  const whiteChecks = whiteMoves.filter((m) => m.isCheck).length;
  const blackChecks = blackMoves.filter((m) => m.isCheck).length;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Piece Activity</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-slate-500">{gameData.white}</p>
            <p className="text-xs text-slate-300">{whiteMoves.length} moves</p>
            <p className="text-[10px] text-slate-500">{whiteCaptures} captures</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">{gameData.black}</p>
            <p className="text-xs text-slate-300">{blackMoves.length} moves</p>
            <p className="text-[10px] text-slate-500">{blackCaptures} captures</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Dynamics</h4>
        <div className="space-y-1 text-[11px]">
          <p className="text-slate-400">
            Checks: <span className="text-white">{whiteChecks}</span> White / <span className="text-white">{blackChecks}</span> Black
          </p>
          <p className="text-slate-400">
            Total moves: <span className="text-white">{analysis.moves.length}</span>
          </p>
          <p className="text-slate-400">
            Critical moments: <span className="text-yellow-400">{analysis.criticalMoments.length}</span>
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">King Safety</h4>
        <p className="text-[11px] text-slate-400">
          {analysis.blunders.length > 0
            ? "King safety was compromised during critical moments. Review blunders for specific threats."
            : "King safety was well maintained throughout the game."}
        </p>
      </div>

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Pawn Structure</h4>
        <p className="text-[11px] text-slate-400">
          {analysis.moves.filter((m) => m.isCapture).length > 10
            ? "Multiple exchanges occurred, simplifying the position significantly."
            : "Pawn structure remained relatively stable throughout the game."}
        </p>
      </div>
    </div>
  );
}

function OpeningsTab({ analysis }: { analysis: GameAnalysis | null }) {
  if (!analysis) return <EmptyState message="Opening classification will appear after analysis" />;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-400">Opening Details</h4>
        <p className="text-sm font-semibold text-white">{analysis.openingName}</p>
        <p className="text-[11px] text-slate-500">ECO Code: {analysis.eco}</p>
      </div>

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Opening Principles</h4>
        <ul className="space-y-1 text-[11px]">
          {analysis.moves.length >= 2 && (
            <>
              <li className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                <span className="text-slate-400">Control center with pawns</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                <span className="text-slate-400">Develop minor pieces</span>
              </li>
              {analysis.moves.some((m) => !m.isCapture && m.san.startsWith("O-O")) && (
                <li className="flex items-center gap-1.5">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-400">Castle early for king safety</span>
                </li>
              )}
              {analysis.moves.filter((m) => m.classification === "Inaccuracy" || m.classification === "Mistake").length > 0 && (
                <li className="flex items-center gap-1.5">
                  <span className="text-red-400">✗</span>
                  <span className="text-slate-400">Some moves deviated from best play</span>
                </li>
              )}
            </>
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Transpositions</h4>
        <p className="text-[11px] text-slate-400">
          {analysis.eco !== "A00"
            ? `The game follows ${analysis.openingName} lines. Transposition options may have been available via different move orders.`
            : "The opening sequence does not match any standard ECO classification."}
        </p>
      </div>

      <div className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0a] p-3">
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Study Suggestion</h4>
        <p className="text-[11px] text-slate-400">
          Review master games in {analysis.openingName} to deepen your understanding of typical plans, tactics, and positional themes.
        </p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

export function TabPanel({
  activeTab,
  onTabChange,
  gameData,
  analysis,
  moves,
  currentMoveIndex,
}: TabPanelProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-[#1e1e2e] bg-[#111118] shadow-lg">
      <div className="flex border-b border-[#1e1e2e]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-cyan-400 text-cyan-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "report" && <ReportTab gameData={gameData} analysis={analysis} />}
            {activeTab === "analysis" && <AnalysisTab analysis={analysis} moves={moves} currentMoveIndex={currentMoveIndex} />}
            {activeTab === "coach" && <CoachTab analysis={analysis} gameData={gameData} />}
            {activeTab === "insights" && <InsightsTab analysis={analysis} gameData={gameData} />}
            {activeTab === "openings" && <OpeningsTab analysis={analysis} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
