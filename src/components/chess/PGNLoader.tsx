"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, FileText, Loader2 } from "lucide-react";

import type { GameHeaders, ParsedMove } from "@/lib/pgn-parser";
import { parseHeaders, parseMoves, validatePgn, getExamplePgns } from "@/lib/pgn-parser";

interface PGNLoaderProps {
  onGameLoaded: (headers: GameHeaders, moves: ParsedMove[]) => void;
  onAnalyzeStart: () => void;
  isAnalyzing: boolean;
  analyzeProgress: { current: number; total: number } | null;
}

export function PGNLoader({ onGameLoaded, onAnalyzeStart, isAnalyzing, analyzeProgress }: PGNLoaderProps) {
  const [pgnText, setPgnText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPgn = useCallback(
    (text: string) => {
      setError(null);
      const trimmed = text.trim();
      if (!trimmed) {
        setError("No PGN text provided.");
        return;
      }

      const validation = validatePgn(trimmed);
      if (!validation.valid) {
        setError(validation.error ?? "Invalid PGN");
        return;
      }

      const headers = parseHeaders(trimmed);
      const moves = parseMoves(trimmed);

      if (moves.length === 0) {
        setError("No moves found in PGN.");
        return;
      }

      onGameLoaded(headers, moves);
      onAnalyzeStart();
    },
    [onGameLoaded, onAnalyzeStart],
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        processPgn(text);
      };
      reader.readAsText(file);
    },
    [processPgn],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      processPgn(text);
    };
    reader.readAsText(file);
  }, [processPgn]);

  const handleLoadExample = useCallback(
    (name: string) => {
      const examples = getExamplePgns();
      const pgn = examples[name];
      if (pgn) {
        setPgnText(pgn);
        processPgn(pgn);
      }
    },
    [processPgn],
  );

  const isLoading = isAnalyzing || analyzeProgress !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl"
    >
      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-bold text-white">Load Game</h2>
        <p className="mb-4 text-sm text-slate-400">
          Import a PGN file to analyze the game with Stockfish 18
        </p>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-3 size-8 animate-spin text-cyan-400" />
            <p className="text-sm font-medium text-slate-300">
              Analyzing game...
            </p>
            {analyzeProgress && (
              <div className="mt-3 w-full max-w-xs">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Move {analyzeProgress.current}/{analyzeProgress.total}</span>
                  <span>{Math.round((analyzeProgress.current / analyzeProgress.total) * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1a2e]">
                  <motion.div
                    className="h-full rounded-full bg-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(analyzeProgress.current / analyzeProgress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition ${
                dragOver
                  ? "border-cyan-400 bg-cyan-400/5"
                  : "border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]"
              }`}
            >
              <FileUp className={`mb-3 size-10 ${dragOver ? "text-cyan-400" : "text-slate-500"}`} />
              <p className="mb-1 text-sm font-medium text-slate-300">
                {dragOver ? "Drop PGN file here" : "Drag & drop PGN file"}
              </p>
              <p className="text-xs text-slate-500">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pgn,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#1e1e2e]" />
              <span className="text-xs text-slate-500">or paste PGN</span>
              <div className="h-px flex-1 bg-[#1e1e2e]" />
            </div>

            <textarea
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder={`[Event "Casual Game"]\n[White "Player 1"]\n[Black "Player 2"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...`}
              className="mb-3 h-32 w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-3 font-mono text-xs text-slate-300 placeholder-slate-600 transition focus:border-cyan-500 focus:outline-none"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => processPgn(pgnText)}
                disabled={!pgnText.trim()}
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-40"
              >
                <FileText className="size-4" />
                Analyze Game
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Example:</span>
                {Object.keys(getExamplePgns()).map((name) => (
                  <button
                    key={name}
                    onClick={() => handleLoadExample(name)}
                    className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
