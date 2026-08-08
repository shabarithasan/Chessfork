export type MoveGrade =
  | "Brilliant"
  | "Best"
  | "Excellent"
  | "Good"
  | "Inaccuracy"
  | "Mistake"
  | "Blunder";

export interface ClassifyResult {
  grade: MoveGrade;
  symbol: string;
  label: string;
}

const GRADE_META: Record<MoveGrade, { symbol: string; label: string; maxCpLoss: number }> = {
  Brilliant: { symbol: "★", label: "Brilliant", maxCpLoss: 0 },
  Best: { symbol: "●", label: "Best", maxCpLoss: 5 },
  Excellent: { symbol: "○", label: "Excellent", maxCpLoss: 15 },
  Good: { symbol: "△", label: "Good", maxCpLoss: 50 },
  Inaccuracy: { symbol: "⚠", label: "Inaccuracy", maxCpLoss: 120 },
  Mistake: { symbol: "?", label: "Mistake", maxCpLoss: 250 },
  Blunder: { symbol: "??", label: "Blunder", maxCpLoss: Infinity },
};

export function classifyMoveAbsolute(cpLoss: number, isCheckmate: boolean): ClassifyResult {
  if (isCheckmate) return { grade: "Brilliant", symbol: GRADE_META.Brilliant.symbol, label: GRADE_META.Brilliant.label };
  for (const g of Object.keys(GRADE_META) as MoveGrade[]) {
    if (cpLoss <= GRADE_META[g].maxCpLoss) {
      return { grade: g, symbol: GRADE_META[g].symbol, label: GRADE_META[g].label };
    }
  }
  return { grade: "Blunder", symbol: "??", label: "Blunder" };
}

export function classifyMoveDiff(
  diff: number,
  side: "white" | "black",
  isCheckmate: boolean,
): ClassifyResult {
  const cpLoss = side === "white" ? -diff : diff;
  return classifyMoveAbsolute(Math.max(0, cpLoss), isCheckmate);
}
