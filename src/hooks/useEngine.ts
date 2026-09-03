"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { lookupOpeningBook } from "@/lib/opening-book";
import { enginePool } from "@/lib/chess/engine-pool";

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

const analysisCache = new Map<string, AnalysisState>();

export function useEngine() {
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);
  const searchStartedRef = useRef(0);
  const currentRequestRef = useRef({ fen: "", depth: 14, multiPv: 3 });
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
    const worker = enginePool.getLiveWorker();
    workerRef.current = worker;

    const messageHandler = (e: MessageEvent) => {
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
          if (now - (((worker as unknown) as { _lastUiUpdate?: number })._lastUiUpdate || 0) > 150 || msg.depth >= 14 || msg.depth <= 3) {
            ((worker as unknown) as { _lastUiUpdate?: number })._lastUiUpdate = now;
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
          setAnalysis((prev) => {
            const newState = {
              ...prev,
              bestMove: msg.bestmove,
              status: "idle" as const,
            };
            const req = currentRequestRef.current;
            if (req.fen === prev.fen) {
              const cacheKey = `${req.fen}_${req.depth}_${req.multiPv}`;
              analysisCache.set(cacheKey, newState);
            }
            return newState;
          });
          break;
      }
    };

    worker.addEventListener("message", messageHandler);

    // Ping engine to receive "ready" if it was already initialized
    worker.postMessage("isready");

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      worker.postMessage({ command: "stop" });
      worker.removeEventListener("message", messageHandler);
    };
  }, []);

  const startAnalysis = useCallback(
    (fen: string, options?: { multiPV?: number; depth?: number }) => {
      const worker = workerRef.current;
      if (!worker) return;
      searchIdRef.current += 1;
      const sid = searchIdRef.current;
      const normalizedFen = fen === "startpos" ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : fen;
      
      const depth = options?.depth ?? 14;
      const multiPv = options?.multiPV || 3;
      currentRequestRef.current = { fen: normalizedFen, depth, multiPv };
      const cacheKey = `${normalizedFen}_${depth}_${multiPv}`;

      worker.postMessage({ command: "stop" });
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const cached = analysisCache.get(cacheKey);
      if (cached && cached.status === "idle") {
        setAnalysis(cached);
        return;
      }

      setAnalysis((prev) => ({ ...prev, depth: 0, status: "analyzing" }));
      debounceRef.current = setTimeout(() => {
        searchStartedRef.current = sid;
        worker.postMessage({
          command: "start",
          fen: normalizedFen,
          depth,
          multiPV: multiPv,
          searchId: sid,
        });
      }, 100);

      void lookupOpeningBook(normalizedFen).then((bookLines) => {
        if (!bookLines || searchIdRef.current !== sid || searchStartedRef.current === sid) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const bookState: AnalysisState = {
          evaluation: { type: "cp", value: 0 },
          lines: bookLines.map((line, index) => ({
            multiPv: index + 1,
            evaluation: { type: "cp" as const, value: 0 },
            pv: [line.uci],
          })),
          bestMove: bookLines[0]?.uci ?? null,
          depth,
          status: "idle",
          fen: normalizedFen,
        };
        analysisCache.set(cacheKey, bookState);
        setAnalysis(bookState);
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