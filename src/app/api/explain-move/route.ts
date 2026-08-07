import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export interface ExplainRequest {
  fenBefore: string;
  fenAfter: string;
  playedMove: string;
  bestMove: string;
  grade: string;
  playedEval: number;
  bestEval: number;
  evalLoss: number;
  depth: number;
  topMoves: { san: string; eval: number }[];
  sideToMove: "white" | "black";
  moveNumber: number;
  reasons: string[];
}

interface ExplainSection {
  icon: string;
  title: string;
  content: string;
}

interface ExplainResponse {
  sections: ExplainSection[];
}

const GRADE_SECTIONS: Record<string, { icon: string; title: string }[]> = {
  Brilliant: [
    { icon: "💡", title: "Why it's brilliant" },
    { icon: "♟", title: "The idea" },
    { icon: "🎯", title: "What it threatens" },
  ],
  Best: [
    { icon: "✅", title: "Why it works" },
    { icon: "♟", title: "Strategic idea" },
  ],
  Excellent: [
    { icon: "👍", title: "Why it's strong" },
    { icon: "💡", title: "What to watch" },
  ],
  Great: [
    { icon: "👍", title: "Why it's good" },
    { icon: "💡", title: "What to watch" },
  ],
  Good: [
    { icon: "👌", title: "Why it's playable" },
    { icon: "💡", title: "What to improve" },
  ],
  Inaccuracy: [
    { icon: "📊", title: "Small improvement missed" },
    { icon: "🎓", title: "Lesson" },
  ],
  Mistake: [
    { icon: "⚠️", title: "What went wrong" },
    { icon: "⭐", title: "Better alternative" },
    { icon: "🎓", title: "Lesson" },
  ],
  Blunder: [
    { icon: "📉", title: "What changed" },
    { icon: "♟", title: "Tactical mistake" },
    { icon: "⭐", title: "Better move" },
    { icon: "🎓", title: "Lesson" },
  ],
};

const GRADE_EXPLANATIONS: Record<string, string> = {
  Brilliant: "The player found a **Brilliant** move — a deep sacrifice or the only winning continuation.",
  Best: "The player played the **Best** move — the engine's top choice in this position.",
  Excellent: "The player played an **Excellent** move — nearly as strong as the best.",
  Great: "The player played a **Great** move — a very good, solid choice.",
  Good: "The player played a **Good** move — playable but stronger alternatives existed.",
  Inaccuracy: "The player made an **Inaccuracy** — a small but measurable slip.",
  Mistake: "The player made a **Mistake** — a clear error that worsened the position.",
  Blunder: "The player made a **Blunder** — a critical error that severely worsened the position.",
};

const MOTIF_HINTS: Record<string, string> = {
  sacrifice: "This was a sacrifice. Explain why giving up material is justified.",
  missed_mate: "The player missed a checkmate. Explain the mating pattern.",
  best_move_mate: "This forces checkmate. Explain the mate threat.",
  forced_move: "This was the only legal move. Note that there was no alternative.",
  only_engine_move: "Only this move keeps the game alive. Explain the threat.",
  missed_win: "The player missed a winning continuation. Show the missed tactic.",
  escaped_mate: "The player escaped a checkmate threat. Explain the escape.",
  equivalent: "Multiple moves are equally good here. Keep the explanation brief.",
  shallow_depth_downgrade: "The position was analyzed at shallow depth. Be cautious.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const {
      playedMove,
      bestMove,
      grade,
      playedEval,
      bestEval,
      evalLoss,
      depth,
      topMoves,
      sideToMove,
      moveNumber,
      reasons,
    } = body as ExplainRequest;

    if (!playedMove || !grade) {
      return NextResponse.json({ message: "playedMove and grade are required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "OpenRouter API key not configured" }, { status: 500 });
    }

    const sections = GRADE_SECTIONS[grade] ?? GRADE_SECTIONS.Blunder;
    const gradeExplanation = GRADE_EXPLANATIONS[grade] ?? GRADE_EXPLANATIONS.Blunder;
    const sideLabel = sideToMove === "white" ? "White" : "Black";

    const evalBeforeDisplay = bestEval > 0 ? `+${(bestEval / 100).toFixed(1)}` : (bestEval / 100).toFixed(1);
    const evalAfterDisplay = playedEval > 0 ? `+${(playedEval / 100).toFixed(1)}` : (playedEval / 100).toFixed(1);

    const topLinesFormatted = (topMoves ?? [])
      .slice(0, 3)
      .map((m) => {
        const display = m.eval > 0 ? `+${(m.eval / 100).toFixed(1)}` : (m.eval / 100).toFixed(1);
        return `${m.san} (${display})`;
      })
      .join(", ");

    const motifHint = (reasons ?? [])
      .map((r) => MOTIF_HINTS[r])
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");

    const sectionFormat = sections
      .map((s) => `  - icon: "${s.icon}", title: "${s.title}"`)
      .join("\n");

    const systemPrompt = `You are a professional chess coach. Return ONLY valid JSON — no markdown fences, no extra text.

Output format:
{
  "sections": [
    { "icon": string, "title": string, "content": string }
  ]
}

Each section content is a short paragraph in plain text (no markdown). Keep each section 1-3 sentences. Maximum 200 words total across all sections. Be beginner friendly. Do not mention "engine" or "Stockfish".

IMPORTANT: Use the exact grade label from the Grade field in your content. If the grade is "Good", describe it as a "Good" move — never call it "Great". If the grade is "Great", call it "Great". Match the grade precisely.`;

    const userPrompt = [
      `## Game Information`,
      `Move: **${playedMove}** (Move ${moveNumber}, ${sideLabel})`,
      `Grade: **${grade}**`,
      `${gradeExplanation}`,
      `Evaluation: ${evalBeforeDisplay} → ${evalAfterDisplay}`,
      `Loss: ${(evalLoss / 100).toFixed(2)}`,
      `Best move: **${bestMove}** (${evalBeforeDisplay})`,
      `Top lines: ${topLinesFormatted}`,
      motifHint ? `Context: ${motifHint}` : "",
      ``,
      `## Required Sections`,
      `Return exactly ${sections.length} sections with these icons and titles:`,
      sectionFormat,
    ].filter(Boolean).join("\n");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Chessigma",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      console.error("[explain-move] OpenRouter error:", response.status, errorBody);
      return NextResponse.json({ message: `OpenRouter API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ message: "Empty response from model" }, { status: 502 });
    }

    let parsed: { sections?: ExplainSection[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn("[explain-move] Failed to parse JSON, falling back.");
      return NextResponse.json({
        success: true,
        sections: [{ icon: "💬", title: "Coach analysis", content }],
      });
    }

    const validatedSections = sections.map((tmpl, i) => ({
      icon: parsed?.sections?.[i]?.icon || tmpl.icon,
      title: parsed?.sections?.[i]?.title || tmpl.title,
      content: parsed?.sections?.[i]?.content || "",
    }));

    return NextResponse.json({ success: true, sections: validatedSections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explain failed";
    console.error("[explain-move] Error:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
