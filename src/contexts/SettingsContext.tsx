"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const BOARD_THEMES = [
  { id: "neo", name: "Neo", light: "#E0E4EC", dark: "#4B586E" },
  { id: "green", name: "Green", light: "#eeeed2", dark: "#769556" },
  { id: "grey", name: "Grey", light: "#efefef", dark: "#b0b0b0" },
  { id: "blue", name: "Blue", light: "#e8ebef", dark: "#4b7399" },
  { id: "light_wood", name: "Light Wood", light: "#e9c18a", dark: "#b38b5d" },
  { id: "dark_wood", name: "Dark Wood", light: "#d9b38c", dark: "#7d512e" },
  { id: "dark_blue", name: "Dark Blue", light: "#d9d9e5", dark: "#46546e" },
];

const PIECE_SET_CDN: Record<string, string> = {
  Neo: "",
  Staunty: "staunty",
  "Staunty Wood": "staunty_wood",
  Governor: "governor_bw",
  Merida: "merida",
  "Merida Traffic": "merida_traffic",
  Companion: "companion",
  Smart: "smart",
  "Alpha Wood": "alpha_wood",
  Fresca: "fresca",
  Mediaeval: "mediaeval",
  "Echiquier Ink": "echiquier_ink",
  "Kosal Violet": "kosal_violet",
  Horsey: "horsey",
  "1K Byte Gambit": "chess_1Kbyte_gambit",
  Fish: "fish",
};

const CDN_PIECE_LETTER: Record<string, string> = {
  p: "p",
  n: "n",
  b: "b",
  r: "r",
  q: "q",
  k: "k",
};

export function pieceCdnBaseUrl(pieceTheme: string) {
  const cdnId = PIECE_SET_CDN[pieceTheme] ?? "";
  return cdnId ? `https://cdn.chessigma.dev/themes/pieces/${cdnId}` : "";
}

export function pieceImageUrl(pieceTheme: string, piece: string) {
  const base = pieceCdnBaseUrl(pieceTheme);
  const letter = CDN_PIECE_LETTER[piece.toLowerCase()];
  if (!base || !letter) return "";
  const color = piece.toUpperCase() === piece ? "w" : "b";
  return `${base}/${letter}${color}.svg`;
}

export function pieceThumbnailUrl(pieceTheme: string) {
  const base = pieceCdnBaseUrl(pieceTheme);
  return base ? `${base}/nw.svg` : "/pieces/wikimedia/wN.svg";
}

const DEFAULT_QUALITY_LABELS: Record<string, string> = {
  Brilliant: "Sigma",
  Great: "Awesome",
  Best: "Best",
  Excellent: "Nice",
  Good: "Ok",
  Book: "Theoretical",
  Inaccuracy: "Strange",
  Mistake: "Bad",
  Blunder: "Clown",
};

const STORAGE_KEY = "chessfork-settings";

export const ENGINE_DEPTH_OPTIONS = [14, 18, 20, 25, 30] as const;

interface SettingsState {
  boardThemeId: string;
  pieceThemeId: string;
  liveEngine: boolean;
  showBestMoves: boolean;
  engineDepth: number;
  qualityLabels: Record<string, string>;
}

interface SettingsContextValue {
  boardThemeId: string;
  pieceThemeId: string;
  boardColors: { light: string; dark: string };
  liveEngine: boolean;
  showBestMoves: boolean;
  engineDepth: number;
  qualityLabels: Record<string, string>;
  setBoardThemeId: (id: string) => void;
  setPieceThemeId: (id: string) => void;
  setLiveEngine: (enabled: boolean) => void;
  setShowBestMoves: (enabled: boolean) => void;
  setEngineDepth: (depth: number) => void;
  setQualityLabel: (grade: string, label: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): SettingsState {
  if (typeof window === "undefined") {
    return { boardThemeId: "neo", pieceThemeId: "Neo", liveEngine: true, showBestMoves: true, engineDepth: 18, qualityLabels: { ...DEFAULT_QUALITY_LABELS } };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        boardThemeId: parsed.boardThemeId ?? "neo",
        pieceThemeId: parsed.pieceThemeId ?? "Neo",
        liveEngine: parsed.liveEngine ?? true,
        showBestMoves: parsed.showBestMoves ?? true,
        engineDepth: (ENGINE_DEPTH_OPTIONS as readonly number[]).includes(parsed.engineDepth) ? parsed.engineDepth : 18,
        qualityLabels: { ...DEFAULT_QUALITY_LABELS, ...(parsed.qualityLabels ?? {}) },
      };
    }
  } catch { /* ignore corrupt data */ }
  return { boardThemeId: "neo", pieceThemeId: "Neo", liveEngine: true, showBestMoves: true, engineDepth: 18, qualityLabels: { ...DEFAULT_QUALITY_LABELS } };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage full or blocked */ }
  }, [state]);

  const setBoardThemeId = useCallback((id: string) => {
    setState(prev => ({ ...prev, boardThemeId: id }));
  }, []);

  const setPieceThemeId = useCallback((id: string) => {
    setState(prev => ({ ...prev, pieceThemeId: id }));
  }, []);

  const setLiveEngine = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, liveEngine: enabled }));
  }, []);

  const setShowBestMoves = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, showBestMoves: enabled }));
  }, []);

  const setEngineDepth = useCallback((depth: number) => {
    setState(prev => ({ ...prev, engineDepth: depth }));
  }, []);

  const setQualityLabel = useCallback((grade: string, label: string) => {
    setState(prev => ({
      ...prev,
      qualityLabels: { ...prev.qualityLabels, [grade]: label },
    }));
  }, []);

  const theme = BOARD_THEMES.find(t => t.id === state.boardThemeId) ?? BOARD_THEMES[0];

  return (
    <SettingsContext.Provider
      value={{
        boardThemeId: state.boardThemeId,
        pieceThemeId: state.pieceThemeId,
        boardColors: { light: theme.light, dark: theme.dark },
        liveEngine: state.liveEngine,
        showBestMoves: state.showBestMoves,
        engineDepth: state.engineDepth,
        qualityLabels: state.qualityLabels,
        setBoardThemeId,
        setPieceThemeId,
        setLiveEngine,
        setShowBestMoves,
        setEngineDepth,
        setQualityLabel,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}

export { BOARD_THEMES, PIECE_SET_CDN, DEFAULT_QUALITY_LABELS };
