"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { lookupOpeningBook } from "@/lib/opening-book";

export interface EngineLine {
  multiPv: number;
  evaluation: { type: "cp" | "mate"; value: number };
  pv: string[];
}

export interface AnalysisState {
  evaluation: { type: "cp" | "mate"; value: number } | null;
  lines: EngineLine[];
  bestMove: string | null;
  depth: number;
  status: "loading" | "ready" | "analyzing" | "idle";
  fen: string;
}

export function useEngine() {
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);
  const searchStartedRef = useRef(0);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    evaluation: null,
    lines: [],
    bestMove: null,
    depth: 0,
    status: "loading",
    fen: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const worker = new Worker("/stockfishWorker.js#/stockfish/stockfish.wasm");
    workerRef.current = worker;

    worker.addEventListener("message", (e) => {
      const msg = e.data;
      if (msg.searchId && msg.searchId !== searchIdRef.current) {
        return;
      }
      if (msg.type === "_raw") return;
      switch (msg.type) {
        case "ready":
          setAnalysis((prev) => ({ ...prev, status: "ready" }));
          break;
        case "analysis":
          const now = Date.now();
          if (now - ((worker as any)._lastUiUpdate || 0) > 150 || msg.depth >= 14) {
            (worker as any)._lastUiUpdate = now;
            setAnalysis({
              evaluation: msg.lines?.[0]?.evaluation || null,
              lines: msg.lines || [],
              bestMove: msg.lines?.[0]?.pv?.[0] || null,
              depth: msg.depth,
              status: "analyzing",
              fen: msg.fen || "",
            });
          }
          break;
        case "bestmove":
          setAnalysis((prev) => ({
            ...prev,
            bestMove: msg.bestmove,
            status: "idle" as const,
          }));
          break;
      }
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      worker.postMessage({ command: "stop" });
      worker.terminate();
    };
  }, []);

  const startAnalysis = useCallback(
    (fen: string, options?: { multiPV?: number; depth?: number }) => {
      const worker = workerRef.current;
      if (!worker) return;
      searchIdRef.current += 1;
      const sid = searchIdRef.current;
      const normalizedFen = fen === "startpos" ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : fen;
      // Cancellation is immediate; scheduling the replacement search lets a
      // rapid series of board moves collapse into one inexpensive evaluation.
      worker.postMessage({ command: "stop" });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setAnalysis({ evaluation: null, lines: [], bestMove: null, depth: 0, status: "analyzing", fen });
      debounceRef.current = setTimeout(() => {
        searchStartedRef.current = sid;
        worker.postMessage({
          command: "start",
          fen: normalizedFen,
          depth: options?.depth ?? 14,
          multiPV: options?.multiPV || 3,
          searchId: sid,
        });
      }, 100);

      // Only a warm opening-book hit can win this 100 ms window. A cold
      // network response never delays local Stockfish, keeping the board fast
      // and fully functional offline.
      void lookupOpeningBook(normalizedFen).then((bookLines) => {
        if (!bookLines || searchIdRef.current !== sid || searchStartedRef.current === sid) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setAnalysis({
          evaluation: { type: "cp", value: 0 },
          lines: bookLines.map((line, index) => ({
            multiPv: index + 1,
            evaluation: { type: "cp" as const, value: 0 },
            pv: [line.uci],
          })),
          bestMove: bookLines[0]?.uci ?? null,
          depth: options?.depth ?? 14,
          status: "idle",
          fen: normalizedFen,
        });
      });
    },
    [],
  );

  const stopAnalysis = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchIdRef.current += 1;
    setAnalysis({ evaluation: null, lines: [], bestMove: null, depth: 0, status: "idle", fen: "" });
    worker.postMessage({ command: "stop" });
  }, []);

  return { analysis, startAnalysis, stopAnalysis };
}