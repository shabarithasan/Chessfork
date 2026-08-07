import type { TopMoveEntry } from "@/lib/analysis-engine";
import type { MoveGrade } from "@/lib/move-classifier";

export interface WhatIfSnapshot {
  moveId: string;
  fen: string;
  san: string;
  from: string;
  to: string;
  evaluation: { type: "cp" | "mate"; value: number } | null;
  grade: MoveGrade | null;
  depth: number;
  topMoves: TopMoveEntry[];
  arrows: { from: string; to: string; color: string }[];
  coach: string | null;
  status: "pending" | "searching" | "ready";
  createdAt: number;
}
