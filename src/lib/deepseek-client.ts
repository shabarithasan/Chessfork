const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

interface ExplanationResponse {
  explanation: string;
  moveClassification: string;
  evalChange: number;
}

const fallbackExplanations: Record<string, string> = {
  Best: "This is the top engine move. It maintains optimal play.",
  Brilliant: "An excellent move! It maintains strong positional pressure.",
  Good: "A solid move that keeps the position balanced.",
  Mistake: "This move gives your opponent an advantage.",
  Blunder: "This is a critical error that significantly changes the evaluation.",
  Inaccuracy: "Not the best move. There was a stronger alternative.",
};

function getDeepSeekKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY?.trim();
}

function buildExplainPrompt(fen: string, move: string, evalScore: number): string {
  return `You are a chess coach. Analyze this chess move:
Position FEN: ${fen}
Move played: ${move}
Engine evaluation: ${evalScore > 0 ? "+" : ""}${evalScore}

Provide a brief coaching explanation (2-3 sentences). Classify the move as one of: Best, Brilliant, Good, Inaccuracy, Mistake, Blunder. State the evaluation change in centipawns.

Response format:
Explanation: <text>
Classification: <Best|Brilliant|Good|Inaccuracy|Mistake|Blunder>
EvalChange: <number>`;
}

function buildSummaryPrompt(moves: string[]): string {
  const moveList = moves.slice(0, 80).join(" ");
  return `Summarize this chess game in 2-3 sentences: ${moveList}`;
}

async function callDeepSeek(prompt: string, maxTokens = 150): Promise<string | null> {
  const apiKey = getDeepSeekKey();
  if (!apiKey || apiKey === "your_deepseek_api_key_here") {
    console.warn("[deepseek] No valid DEEPSEEK_API_KEY configured");
    return null;
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      console.warn(`[deepseek] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn("[deepseek] API call failed:", (err as Error).message);
    return null;
  }
}

function parseExplainResponse(text: string): ExplanationResponse {
  const classificationMatch = text.match(/Classification:\s*(Best|Brilliant|Good|Inaccuracy|Mistake|Blunder)/i);
  const evalMatch = text.match(/EvalChange:\s*(-?\d+)/i);
  const explanationMatch = text.match(/Explanation:\s*(.+?)(?=\n|$)/i);

  return {
    explanation: explanationMatch?.[1]?.trim() ?? text.slice(0, 200),
    moveClassification: classificationMatch?.[1] ?? "Good",
    evalChange: evalMatch ? Number(evalMatch[1]) : 0,
  };
}

export async function explainMove(
  fen: string,
  move: string,
  evalScore: number,
): Promise<ExplanationResponse> {
  const prompt = buildExplainPrompt(fen, move, evalScore);
  const response = await callDeepSeek(prompt);

  if (!response) {
    const classification = evalScore > 100 ? "Brilliant" : evalScore > 30 ? "Good" : evalScore < -100 ? "Blunder" : evalScore < -30 ? "Mistake" : "Best";
    return {
      explanation: fallbackExplanations[classification] ?? "Move analyzed.",
      moveClassification: classification,
      evalChange: evalScore,
    };
  }

  return parseExplainResponse(response);
}

export async function summarizeGame(moves: string[]): Promise<string> {
  const prompt = buildSummaryPrompt(moves);
  const response = await callDeepSeek(prompt, 200);

  if (!response) {
    return `Game analyzed: ${moves.length} moves played.`;
  }

  return response.slice(0, 500);
}
