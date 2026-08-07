"use client";

import { useMemo } from "react";
import type { AnalysisResult, CoachCommentary } from "./ChessEngine";
import styles from "./styles.module.css";

/* ─── Types ─── */

interface MoveRecord {
  san: string;
  from: string;
  to: string;
}

interface GameStats {
  accuracyWhite: number;
  accuracyBlack: number;
  moveCounts: Record<string, number>;
}

interface SidebarProps {
  analysis: AnalysisResult | null;
  coach: CoachCommentary | null;
  stats: GameStats;
  moveHistory: MoveRecord[];
  currentPly: number;
  topMoveSan: string | null;
  onSuggestionClick: (san: string) => void;
  onExplain: () => void;
  onSeeBestMove: () => void;
}

/* ─── Sub-cards ─── */

function GameOverviewCard({ stats }: { stats: GameStats }) {
  const classifiers: Array<{ key: string; label: string; cls: string }> = [
    { key: "Brilliant", label: "Brilliant", cls: styles.countBrilliant },
    { key: "Great", label: "Great", cls: styles.countGreat },
    { key: "Best", label: "Best", cls: styles.countBest },
    { key: "Inaccuracy", label: "Inaccuracy", cls: styles.countInaccuracy },
    { key: "Mistake", label: "Mistake", cls: styles.countMistake },
    { key: "Blunder", label: "Blunder", cls: styles.countBlunder },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Game Overview</div>

      <div className={styles.accuracyRow}>
        <div className={styles.accuracyBlock}>
          <div className={styles.accuracyLabel}>White</div>
          <div className={styles.accuracyValue} style={{ color: "#e8eaed" }}>
            {stats.accuracyWhite.toFixed(1)}%
          </div>
        </div>
        <div className={styles.accuracyVs}>vs</div>
        <div className={styles.accuracyBlock}>
          <div className={styles.accuracyLabel}>Black</div>
          <div className={styles.accuracyValue} style={{ color: "#e8eaed" }}>
            {stats.accuracyBlack.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className={styles.streakBadge}>
        <span>🔥</span>
        <span>Day Streak: 7</span>
      </div>

      <div className={styles.classifierGrid}>
        {classifiers.map((c) => (
          <div key={c.key} className={styles.classifierItem}>
            <span className={`${styles.classifierCount} ${c.cls}`}>
              {stats.moveCounts[c.key] ?? 0}
            </span>
            <span className={styles.classifierLabel}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameOptionsCard({
  analysis,
  moveHistory,
  currentPly,
  onSuggestionClick,
}: {
  analysis: AnalysisResult | null;
  moveHistory: { san: string }[];
  currentPly: number;
  onSuggestionClick: (san: string) => void;
}) {
  const suggestions = useMemo(() => {
    if (!analysis?.topMoves) return [];
    return analysis.topMoves.slice(0, 8);
  }, [analysis]);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Game Options</div>
      <div className={styles.moveGrid}>
        {suggestions.map((m, i) => (
          <button
            key={`${m.san}-${i}`}
            type="button"
            className={`${styles.moveBtn} ${i === 0 ? styles.moveBtnTop : ""}`}
            onClick={() => onSuggestionClick(m.san)}
          >
            {m.san}
          </button>
        ))}
        {suggestions.length === 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "#8b8fa3", textAlign: "center", padding: 8 }}>
            Make a move to see suggestions
          </div>
        )}
      </div>
    </div>
  );
}

function GameStatisticsCard({ analysis }: { analysis: AnalysisResult | null }) {
  const evalScore =
    analysis !== null
      ? analysis.mate !== null
        ? (analysis.mate > 0 ? 10 : -10)
        : Math.max(-10, Math.min(10, analysis.eval / 100))
      : 0;

  const evalPercent = ((evalScore + 10) / 20) * 100;

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Game Statistics</div>

      <div className={styles.statsRow}>
        <div className={styles.evalBarOuter}>
          <div
            className={styles.evalBarInner}
            style={{ left: `${evalPercent}%`, transform: "translateX(-50%)" }}
          />
        </div>
        <div className={styles.evalScore}>
          {analysis !== null
            ? analysis.mate !== null
              ? `M${analysis.mate}`
              : `${analysis.eval > 0 ? "+" : ""}${(analysis.eval / 100).toFixed(1)}`
            : "—"}
        </div>
      </div>

      <div className={styles.chipRow}>
        <span className={styles.chip}>23</span>
        <span className={`${styles.chip} ${styles.chipPositive}`}>
          {analysis !== null ? `${analysis.eval > 0 ? "+" : ""}${(analysis.eval / 100).toFixed(1)}` : "—"}
        </span>
        <span className={`${styles.chip} ${styles.chipNeutral}`}>+1.1</span>
        <span className={`${styles.chip} ${styles.chipPositive}`}>+0.8</span>
      </div>

      <div className={styles.numberRow}>
        {[7, 6, 5, 4, 3, 2, 1].map((n) => (
          <span key={n} className={styles.numberDot}>{n}</span>
        ))}
      </div>
    </div>
  );
}

function CoachCard({
  coach,
  onExplain,
  onSeeBestMove,
}: {
  coach: CoachCommentary | null;
  onExplain: () => void;
  onSeeBestMove: () => void;
}) {
  const evalTagClass =
    coach !== null
      ? coach.evaluation >= 0
        ? styles.coachEvalPositive
        : styles.coachEvalNegative
      : "";

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Coach</div>

      {coach ? (
        <>
          <div className={styles.coachTitle}>{coach.title}</div>
          <div className={`${styles.coachEvalTag} ${evalTagClass}`}>
            {coach.evaluation > 0 ? "+" : ""}
            {(coach.evaluation / 100).toFixed(2)}
          </div>
          <p className={styles.coachExplanation}>{coach.explanation}</p>
        </>
      ) : (
        <p className={styles.coachExplanation} style={{ marginTop: 0 }}>
          Make a move to get AI-powered analysis and commentary.
        </p>
      )}

      <div className={styles.coachActions}>
        <button type="button" className={styles.primaryBtn} onClick={onExplain}>
          Explain
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={onSeeBestMove}>
          See best move
        </button>
      </div>
    </div>
  );
}

function GameSettingsCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Game Settings</div>
      <div className={styles.settingsRow}>
        <button type="button" className={`${styles.settingsBtn} ${styles.settingsBtnActive}`}>
          Report
        </button>
        <button type="button" className={styles.settingsBtn}>
          Analysis
        </button>
        <button type="button" className={styles.settingsBtn}>
          Insights
        </button>
      </div>
    </div>
  );
}

/* ─── Main Sidebar ─── */

export function Sidebar({
  analysis,
  coach,
  stats,
  moveHistory,
  currentPly,
  onSuggestionClick,
  onExplain,
  onSeeBestMove,
}: SidebarProps) {
  return (
    <aside>
      <GameOverviewCard stats={stats} />
      <GameOptionsCard
        analysis={analysis}
        moveHistory={moveHistory}
        currentPly={currentPly}
        onSuggestionClick={onSuggestionClick}
      />
      <GameStatisticsCard analysis={analysis} />
      <CoachCard
        coach={coach}
        onExplain={onExplain}
        onSeeBestMove={onSeeBestMove}
      />
      <GameSettingsCard />
    </aside>
  );
}
