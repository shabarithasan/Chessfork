"use client";

import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, ChevronRight, Swords, TrendingUp, Zap } from "lucide-react";
import type { GameReport } from "@/lib/report-generator";
import { PlayerAvatar } from "@/components/chess/PlayerAvatar";
import { BadgeAnimation, CriticalPulse } from "@/components/animations/BadgeAnimation";

interface AnalysisReportProps {
  report: GameReport;
  onJumpToMove?: (ply: number) => void;
  onViewInteractive?: () => void;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function PhaseBar({ phase, index }: { phase: GameReport["phases"][0]; index: number }) {
  const avgAcc = Math.round((phase.whiteAccuracy + phase.blackAccuracy) / 2);
  const barColor = avgAcc >= 90 ? "bg-green-500" : avgAcc >= 75 ? "bg-amber-500" : "bg-red-500";
  const borderColors = ["border-l-cyan-500", "border-l-violet-500", "border-l-amber-500"];
  const totalErrors = phase.blunders + phase.mistakes;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-lg border border-[#2a2a2a] border-l-2 bg-[#1a1a1a] p-3 ${borderColors[index]}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-white">{phase.name}</span>
        <span className="rounded bg-[#242424] px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
          Ply {phase.startPly}–{phase.endPly}
        </span>
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: "0%" }}
          animate={{ width: `${avgAcc}%` }}
          transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-green-400" />
          <span className="text-slate-400">White:</span>
          <span className="font-semibold text-white">{phase.whiteAccuracy}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-red-400" />
          <span className="text-slate-400">Black:</span>
          <span className="font-semibold text-white">{phase.blackAccuracy}%</span>
        </div>
        <div className="text-slate-500">
          {totalErrors > 0 ? `${totalErrors} error${totalErrors > 1 ? "s" : ""}` : "Clean play"}
        </div>
        <div className="text-slate-500">
          {phase.themes.slice(0, 2).join(", ")}
        </div>
      </div>
    </motion.div>
  );
}

function KeyMomentItem({ moment, index, onJump }: { moment: GameReport["keyMoments"][0]; index: number; onJump?: (ply: number) => void }) {
  const isBlunder = moment.classification === "Blunder";
  const isMistake = moment.classification === "Mistake";
  const borderColor = isBlunder ? "border-l-red-500" : isMistake ? "border-l-orange-500" : "border-l-amber-500";

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={() => onJump?.(moment.ply)}
      className={`w-full rounded-lg border border-[#2a2a2a] border-l-2 bg-[#1a1a1a] p-3 text-left transition hover:bg-[#242424] ${borderColor}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">
            {moment.moveNumber}{moment.side === "white" ? "." : "..."}
            {moment.san}
          </span>
          <BadgeAnimation classification={moment.classification}>
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
              isBlunder ? "bg-red-500/20 text-red-400" : isMistake ? "bg-orange-500/20 text-orange-400" : "bg-amber-500/20 text-amber-400"
            }`}>
              {moment.classification}
            </span>
          </BadgeAnimation>
        </div>
        <ChevronRight className="size-3 text-slate-600" />
      </div>
      <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">{moment.description}</p>
    </motion.button>
  );
}

function BlunderCard({ blunder, index, onJump }: { blunder: GameReport["blunders"][0]; index: number; onJump?: (ply: number) => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => onJump?.(blunder.ply)}
      className="w-full rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-left transition hover:bg-red-500/10"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CriticalPulse isCritical>
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
              ?? {blunder.moveNumber}{blunder.side === "white" ? "." : "..."}
            </span>
          </CriticalPulse>
          <span className="text-sm font-bold text-white">{blunder.san}</span>
        </div>
        <span className="font-mono text-[10px] text-red-400">
          {blunder.evalBefore > 0 ? "+" : ""}{blunder.evalBefore} → {blunder.evalAfter > 0 ? "+" : ""}{blunder.evalAfter}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">{blunder.explanation}</p>
      {blunder.bestMove && (
        <div className="mt-1.5 text-[10px] text-slate-600">
          Best move: <span className="font-mono text-cyan-400">{blunder.bestMove}</span>
          {blunder.bestLine.length > 1 && (
            <span className="text-slate-600"> {blunder.bestLine.slice(1, 4).join(" ")}</span>
          )}
        </div>
      )}
    </motion.button>
  );
}

export function AnalysisReport({ report, onJumpToMove, onViewInteractive }: AnalysisReportProps) {
  const { game, opening, players, phases, keyMoments, blunders, summary } = report;
  const avgAcc = Math.round((players.white.accuracy + players.black.accuracy) / 2);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="rounded-xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#151515] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayerAvatar name={game.white} size="sm" />
            <div>
              <h2 className="text-base font-bold text-white">
                {game.white} vs {game.black}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {game.result} &middot; {game.date ?? "Unknown date"} &middot; {game.totalMoves} moves
                {game.event ? ` · ${game.event}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400">{avgAcc}%</div>
            <div className="text-[10px] text-slate-500">Avg accuracy</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard label="White Accuracy" value={`${players.white.accuracy}%`} color="text-green-400" />
          <StatCard label="Black Accuracy" value={`${players.black.accuracy}%`} color="text-red-400" />
          <StatCard label="Opening" value={opening.name === "Unknown Opening" ? opening.eco : opening.name.split(":")[0]} color="text-cyan-400" />
        </div>

        <div className="mt-4 rounded-lg bg-[#111111] p-3">
          <p className="text-xs text-slate-400 leading-relaxed">{summary}</p>
        </div>

        {onViewInteractive && (
          <button
            onClick={onViewInteractive}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-[#111111] transition hover:bg-amber-400"
          >
            <Swords className="size-4" />
            View Interactive Analysis
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Moves Analyzed" value={`${game.totalMoves}`} color="text-white" />
        <StatCard label="Blunders" value={`${blunders.length}`} color={blunders.length > 0 ? "text-red-400" : "text-green-400"} />
        <StatCard label="Mistakes" value={`${players.white.mistakes + players.black.mistakes}`} color="text-orange-400" />
        <StatCard label="Inaccuracies" value={`${players.white.inaccuracies + players.black.inaccuracies}`} color="text-yellow-400" />
      </div>

      {/* Player comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
          <div className="mb-2 flex items-center gap-2">
            <PlayerAvatar name={game.white} size="sm" />
            <h3 className="text-xs font-bold text-green-400">{game.white}</h3>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between"><span className="text-slate-500">Accuracy</span><span className="font-bold text-white">{players.white.accuracy}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Avg CP Loss</span><span className="font-mono text-white">{players.white.avgCpLoss}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Blunders</span><span className="text-red-400 font-semibold">{players.white.blunders}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mistakes</span><span className="text-orange-400 font-semibold">{players.white.mistakes}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Best Moves</span><span className="text-green-400 font-semibold">{players.white.bestMoves}/{players.white.totalMoves}</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
          <div className="mb-2 flex items-center gap-2">
            <PlayerAvatar name={game.black} size="sm" />
            <h3 className="text-xs font-bold text-red-400">{game.black}</h3>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between"><span className="text-slate-500">Accuracy</span><span className="font-bold text-white">{players.black.accuracy}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Avg CP Loss</span><span className="font-mono text-white">{players.black.avgCpLoss}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Blunders</span><span className="text-red-400 font-semibold">{players.black.blunders}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Mistakes</span><span className="text-orange-400 font-semibold">{players.black.mistakes}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Best Moves</span><span className="text-green-400 font-semibold">{players.black.bestMoves}/{players.black.totalMoves}</span></div>
          </div>
        </div>
      </div>

      {/* Phases */}
      {phases.length > 1 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <BarChart3 className="size-3" />
            Phase Breakdown
          </h3>
          <div className="space-y-2">
            {phases.map((phase, i) => (
              <PhaseBar key={phase.name} phase={phase} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Key Moments */}
      {keyMoments.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Zap className="size-3" />
            Key Moments
          </h3>
          <div className="space-y-1.5">
            {keyMoments.slice(0, 6).map((moment, i) => (
              <KeyMomentItem key={moment.ply} moment={moment} index={i} onJump={onJumpToMove} />
            ))}
          </div>
        </div>
      )}

      {/* Blunders */}
      {blunders.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-400 uppercase tracking-wider">
            <AlertTriangle className="size-3" />
            Blunders ({blunders.length})
          </h3>
          <div className="space-y-1.5">
            {blunders.map((b, i) => (
              <BlunderCard key={b.ply} blunder={b} index={i} onJump={onJumpToMove} />
            ))}
          </div>
        </div>
      )}

      {/* Opening info */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
        <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          <TrendingUp className="size-3" />
          Opening
        </h3>
        <p className="text-sm font-bold text-white">{opening.name}</p>
        <p className="text-xs text-slate-500">ECO: {opening.eco} &middot; {opening.moveCount} book moves</p>
      </div>
    </motion.div>
  );
}
