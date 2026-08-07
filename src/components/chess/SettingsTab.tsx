"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, Grid3X3, Puzzle, Tags, SlidersHorizontal, Check, X } from "lucide-react";
import { useSettings, BOARD_THEMES, PIECE_SET_CDN, ENGINE_DEPTH_OPTIONS, pieceThumbnailUrl } from "@/contexts/SettingsContext";

const PANDA = {
  gold: "#BDB73C",
  cream: "#ECDBBE",
  ember: "#F59F1D",
  slate: "#2E3A52",
};

type Tab = "board" | "review" | "labels";

const PIECE_THEMES = Object.keys(PIECE_SET_CDN);

const QUALITY_NAMES = [
  { grade: "Brilliant", icon: "sigma", color: "#26c2a3", label: "Sigma" },
  { grade: "Very Good", icon: "very_good", color: "#658ba7", label: "Awesome" },
  { grade: "Best", icon: "best", color: "#6b8841", label: "Best" },
  { grade: "Excellent", icon: "excellent", color: "#6b8841", label: "Nice" },
  { grade: "Good", icon: "good", color: "#889961", label: "Ok" },
  { grade: "Theoretical", icon: "book", color: "#ab7a42", label: "Theoretical" },
  { grade: "Inaccuracy", icon: "inaccuracy", color: "#eac069", label: "Strange" },
  { grade: "Mistake", icon: "mistake", color: "#d88c39", label: "Bad" },
  { grade: "Blunder", icon: "blunder", color: "#a2251c", label: "Clown" },
];

const QUALITY_TABS = ["Chessfork", "Common", "Custom"];

function EngineGridIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full" style={style}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}

function BestMoveArrowIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full" style={style}>
      <path d="M6 18L18 6" />
      <path d="M9 6h9v9" />
    </svg>
  );
}

export function SettingsTab() {
  const {
    boardThemeId, pieceThemeId, liveEngine, showBestMoves, engineDepth, qualityLabels,
    setBoardThemeId, setPieceThemeId, setLiveEngine, setShowBestMoves, setEngineDepth, setQualityLabel,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>("board");
  const [qualityTab, setQualityTab] = useState("Chessfork");
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingGrade && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingGrade]);

  function startEdit(grade: string, currentLabel: string) {
    setEditingGrade(grade);
    setEditValue(currentLabel);
  }

  function saveEdit() {
    if (editingGrade && editValue.trim()) {
      setQualityLabel(editingGrade, editValue.trim());
    }
    setEditingGrade(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingGrade(null);
    setEditValue("");
  }

  return (
    <div className="min-h-0 flex-1 animate-fadeIn">
      <div className="flex h-full w-full flex-col overflow-y-auto px-[22px] pb-5 pt-4 [scrollbar-width:thin]">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-2.5 mb-[18px] group">
          <div className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <div className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: `0 0 18px ${PANDA.gold}60` }} />
            <Settings className="h-[18px] w-[18px] relative z-10" style={{ color: PANDA.gold }} />
          </div>
          <h2
            className="text-[15px] font-semibold tracking-[-0.01em] bg-gradient-to-r from-[#ECDBBE] via-[#BDB73C] to-[#F59F1D] bg-clip-text text-transparent"
            style={{ textShadow: `0 0 30px ${PANDA.gold}20` }}
          >
            Review settings
          </h2>
        </div>

        {/* Sub-tabs: Board & Pieces / Review / Labels */}
        <div className="relative flex border-b pb-2.5 gap-0" style={{ borderColor: `${PANDA.gold}18` }}>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BDB73C]/20 to-transparent pointer-events-none" />
          {[
            { id: "board" as Tab, icon: Grid3X3, label: "Board & Pieces" },
            { id: "review" as Tab, icon: SlidersHorizontal, label: "Review" },
            { id: "labels" as Tab, icon: Tags, label: "Labels" },
          ].map((t) => {
            const Icon = t.icon;
            const isOn = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className="relative flex flex-1 items-center justify-center gap-1.5 pb-2.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.96]"
                style={{ color: isOn ? PANDA.gold : "#787878" }}
              >
                {isOn && (
                  <span
                    className="absolute -bottom-[1px] left-1/4 right-1/4 h-[2px] rounded-full transition-all duration-200"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${PANDA.gold}, transparent)`,
                      boxShadow: `0 0 10px ${PANDA.gold}60`,
                    }}
                  />
                )}
                <Icon className="h-4 w-4 transition-transform duration-200" style={{ transform: isOn ? "scale(1.1)" : "scale(1)" }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Board & Pieces */}
        {activeTab === "board" && (
          <div className="mt-5 animate-fadeIn" style={{ animationDuration: "0.25s" }}>
            <span className="flex items-center gap-2.5 text-sm" style={{ color: "#c8c4bc" }}>
              <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center" style={{ color: PANDA.gold }}>
                <Grid3X3 className="h-full w-full" />
              </span>
              Board theme
            </span>
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {BOARD_THEMES.map((t) => {
                const isSelected = boardThemeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBoardThemeId(t.id)}
                    title={t.name}
                    className="relative grid h-7 w-7 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded transition-all duration-200 active:scale-[0.92]"
                    style={{
                      boxShadow: isSelected
                        ? `0 0 0 2px ${PANDA.gold}, 0 0 16px ${PANDA.gold}40`
                        : `0 0 0 1px rgba(115,115,115,0.3)`,
                      filter: isSelected ? "brightness(1.1)" : "brightness(0.85)",
                    }}
                  >
                    <span style={{ backgroundColor: t.light }} />
                    <span style={{ backgroundColor: t.dark }} />
                    <span style={{ backgroundColor: t.dark }} />
                    <span style={{ backgroundColor: t.light }} />
                  </button>
                );
              })}
            </div>

            <span className="mt-6 flex items-center gap-2.5 text-sm" style={{ color: "#c8c4bc" }}>
              <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center" style={{ color: PANDA.gold }}>
                <Puzzle className="h-full w-full" />
              </span>
              Piece theme
            </span>
            <div className="-m-1 flex gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {PIECE_THEMES.map((name) => {
                const isSelected = pieceThemeId === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPieceThemeId(name)}
                    title={name}
                    aria-label={name}
                    aria-pressed={isSelected}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-[background-color,transform] duration-150 active:scale-[0.96] hover:bg-neutral-700/60"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${PANDA.gold}25, ${PANDA.gold}08)`
                        : "rgba(115,115,115,0.15)",
                      boxShadow: isSelected
                        ? `0 0 0 1px ${PANDA.gold}, 0 0 20px ${PANDA.gold}30`
                        : "none",
                    }}
                  >
                    <img
                      src={pieceThumbnailUrl(name)}
                      alt={name}
                      className="h-7 w-7 object-contain"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Review */}
        {activeTab === "review" && (
          <div className="mt-5 animate-fadeIn" style={{ animationDuration: "0.25s" }}>
            <div className="-mr-2 overflow-y-auto pr-2 pt-1 [scrollbar-width:thin]">
              {/* Live engine */}
              <div className="flex items-center justify-between py-[11px]">
                <span className="flex items-center gap-2.5 text-sm" style={{ color: "#c8c4bc" }}>
                  <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center" style={{ color: PANDA.gold }}>
                    <EngineGridIcon />
                  </span>
                  Live engine
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={liveEngine}
                  aria-label="Live engine"
                  onClick={() => setLiveEngine(!liveEngine)}
                  className="relative h-[22px] w-10 rounded-full transition-[background-color,transform] duration-150 active:scale-[0.96]"
                  style={{ backgroundColor: liveEngine ? PANDA.gold : "#4b4b4b" }}
                >
                  <span
                    className="absolute top-[3px] h-4 w-4 rounded-full transition-[left,background-color] duration-150"
                    style={{ left: liveEngine ? 21 : 3, backgroundColor: liveEngine ? "#171717" : "#a1a1a1" }}
                  />
                </button>
              </div>

              {/* Show best moves */}
              <div className="flex items-center justify-between border-t py-[11px]" style={{ borderColor: "rgba(115,115,115,0.25)" }}>
                <span className="flex items-center gap-2.5 text-sm" style={{ color: "#c8c4bc" }}>
                  <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center" style={{ color: PANDA.gold }}>
                    <BestMoveArrowIcon />
                  </span>
                  Show best moves
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showBestMoves}
                  aria-label="Show best moves"
                  onClick={() => setShowBestMoves(!showBestMoves)}
                  className="relative h-[22px] w-10 rounded-full transition-[background-color,transform] duration-150 active:scale-[0.96]"
                  style={{ backgroundColor: showBestMoves ? PANDA.gold : "#4b4b4b" }}
                >
                  <span
                    className="absolute top-[3px] h-4 w-4 rounded-full transition-[left,background-color] duration-150"
                    style={{ left: showBestMoves ? 21 : 3, backgroundColor: showBestMoves ? "#171717" : "#a1a1a1" }}
                  />
                </button>
              </div>

              {/* Engine depth */}
              <div className="flex items-center justify-between border-t py-[11px]" style={{ borderColor: "rgba(115,115,115,0.25)" }}>
                <span className="flex items-center gap-2.5 text-sm" style={{ color: "#c8c4bc" }}>
                  <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center" style={{ color: PANDA.gold }}>
                    <EngineGridIcon />
                  </span>
                  Engine depth
                </span>
                <div role="radiogroup" aria-label="Engine depth" className="flex rounded-lg p-[2px]" style={{ backgroundColor: "#3a3a3a" }}>
                  {ENGINE_DEPTH_OPTIONS.map((depth) => {
                    const isSelected = engineDepth === depth;
                    return (
                      <button
                        key={depth}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setEngineDepth(depth)}
                        className="rounded-md px-[11px] py-[5px] text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.96]"
                        style={{
                          backgroundColor: isSelected ? "#1a1a1a" : "transparent",
                          color: isSelected ? PANDA.gold : "#787878",
                        }}
                      >
                        {depth}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quality Names */}
        {activeTab === "labels" && (
          <div className="mt-5 animate-fadeIn" style={{ animationDuration: "0.25s" }}>
            <span className="flex items-center gap-2.5 text-sm" style={{ color: "#c8c4bc" }}>
              <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center" style={{ color: PANDA.gold }}>
                <Tags className="h-full w-full" />
              </span>
              Quality names
            </span>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {QUALITY_TABS.map((name) => {
                const isSelected = qualityTab === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setQualityTab(name)}
                    className="relative rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-[0.95] overflow-hidden"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${PANDA.slate}, #1a2030)`
                        : "rgba(115,115,115,0.15)",
                      color: isSelected ? PANDA.cream : "#787878",
                      boxShadow: isSelected ? `inset 0 1px 0 ${PANDA.gold}30, 0 0 12px ${PANDA.gold}20` : "none",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1">
              {QUALITY_NAMES.map((q) => {
                const label = qualityLabels[q.grade] ?? q.label;
                const isEditing = editingGrade === q.grade;
                return (
                  <div
                    key={q.grade}
                    className="group relative flex h-8 items-center gap-2 rounded-md text-left"
                  >
                    {isEditing ? (
                      <>
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="h-7 flex-1 rounded border bg-transparent px-2 text-[13px] font-medium outline-none"
                          style={{
                            borderColor: `${q.color}60`,
                            color: q.color,
                            boxShadow: `0 0 12px ${q.color}20`,
                          }}
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-white/10 transition-colors"
                          style={{ color: q.color }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-white/10 transition-colors text-neutral-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(q.grade, label)}
                        className="flex h-full w-full items-center gap-2 rounded-md transition-all duration-150 hover:bg-white/[0.04] active:scale-[0.98] overflow-hidden"
                        title="Click to rename"
                      >
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold transition-all duration-200 group-hover:scale-110"
                          style={{ backgroundColor: `${q.color}25`, color: q.color, boxShadow: `0 0 8px ${q.color}20` }}
                        >
                          {q.grade[0]}
                        </span>
                        <span className="truncate text-[13px] font-medium transition-all duration-200" style={{ color: q.color, textShadow: `0 0 12px ${q.color}20` }}>{label}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto h-3 w-3 shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" style={{ color: "#737373" }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="m18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
