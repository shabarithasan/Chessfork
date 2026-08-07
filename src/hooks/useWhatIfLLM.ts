"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { LLMAnalysis } from "@/types/llm";

interface UseWhatIfLLMResult {
  data: LLMAnalysis | null;
  loading: boolean;
  error: string | null;
}

export function useWhatIfLLM(
  altFen: string | null,
  alternativeMoves: { san: string }[],
): UseWhatIfLLMResult {
  const [data, setData] = useState<LLMAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef(0);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!altFen || alternativeMoves.length === 0) {
      reset();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const key = ++keyRef.current;

    setLoading(true);
    setError(null);

    fetch("/api/analyze-alternative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fen: altFen,
        alternativeMoves: alternativeMoves.map((m) => m.san),
      }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        if (key !== keyRef.current) return;
        if (json.success && json.analysis) {
          setData(json.analysis);
          setError(null);
        } else {
          setData(null);
          setError(json.message ?? "Analysis failed");
        }
      })
      .catch((err: unknown) => {
        if (key !== keyRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setData(null);
        setError(err instanceof Error ? err.message : "Request failed");
      })
      .finally(() => {
        if (key === keyRef.current) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [altFen, alternativeMoves, reset]);

  return { data, loading, error };
}
