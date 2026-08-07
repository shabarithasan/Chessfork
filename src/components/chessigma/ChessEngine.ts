export interface AnalysisResult {
  eval: number;
  mate: number | null;
  bestMove: string;
  bestLine: string[];
  depth: number;
  topMoves?: Array<{ from: string; to: string; san: string; eval: number }>;
}

export interface CoachCommentary {
  title: string;
  explanation: string;
  evaluation: number;
}

export class ChessEngine {
  private onAnalysis: (result: AnalysisResult) => void;
  private onCoach: (commentary: CoachCommentary) => void;
  private analysisId = 0;

  constructor(
    onAnalysis: (result: AnalysisResult) => void,
    onCoach: (commentary: CoachCommentary) => void,
  ) {
    this.onAnalysis = onAnalysis;
    this.onCoach = onCoach;
  }

  async analyze(fen: string) {
    const id = ++this.analysisId;

    try {
      const { evaluateFen } = await import("@/lib/stockfish-worker");
      const result = await evaluateFen(fen, 18, 3000, 5);
      if (id !== this.analysisId) return;

      const analysisResult: AnalysisResult = {
        eval: result.eval,
        mate: result.mate,
        bestMove: result.bestMove,
        bestLine: result.bestLine,
        depth: result.depth,
        topMoves: result.topMoves as AnalysisResult["topMoves"],
      };

      this.onAnalysis(analysisResult);
      this.onCoach(generateCoachCommentary(analysisResult));
    } catch {
      // Analysis failed silently
    }
  }

  cancel() {
    this.analysisId = -1;
  }
}

function generateCoachCommentary(result: AnalysisResult): CoachCommentary {
  const evalScore =
    result.mate !== null
      ? (result.mate > 0 ? 10000 : -10000)
      : result.eval;

  if (evalScore > 450) {
    return {
      title: `${result.bestMove} is crushing`,
      explanation:
        "The engine sees this as completely winning. Any inaccuracy here could be the difference between a full point and a draw.",
      evaluation: evalScore,
    };
  }
  if (evalScore > 200) {
    return {
      title: `${result.bestMove} is dominant`,
      explanation:
        "White has a commanding advantage. Keep finding the most accurate moves to convert.",
      evaluation: evalScore,
    };
  }
  if (evalScore > 100) {
    return {
      title: `Clear advantage for White`,
      explanation: `${result.bestMove} maintains the pressure. Look for tactical blows and piece activity.`,
      evaluation: evalScore,
    };
  }
  if (evalScore > 50) {
    return {
      title: `White is better`,
      explanation: `${result.bestMove} is a strong move. White's position is favourable — keep pushing.`,
      evaluation: evalScore,
    };
  }
  if (evalScore > -50) {
    return {
      title: evalScore > 0 ? `Slight edge for White` : `Slight edge for Black`,
      explanation: `The position is roughly balanced with ${result.bestMove} being the engine's top choice.`,
      evaluation: evalScore,
    };
  }
  if (evalScore > -100) {
    return {
      title: `Black is better`,
      explanation: `${result.bestMove} is the engine's recommendation. Black's position is preferable.`,
      evaluation: evalScore,
    };
  }
  if (evalScore > -200) {
    return {
      title: `Clear advantage for Black`,
      explanation: `${result.bestMove} keeps Black in control. White needs precision to hold.`,
      evaluation: evalScore,
    };
  }
  if (evalScore > -450) {
    return {
      title: `Black is dominating`,
      explanation:
        "Black's position is overwhelming. White must find creative resources to survive.",
      evaluation: evalScore,
    };
  }
  return {
    title: `${result.bestMove} is clown`,
    explanation:
      "The engine sees this as lost. Find the best defensive resources or look for tactical swindles.",
    evaluation: evalScore,
  };
}
