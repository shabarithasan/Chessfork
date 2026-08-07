import { NextResponse } from "next/server";
import type { LLMAnalysis } from "@/types/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const { fen, alternativeMoves } = body as Record<string, unknown>;

    if (!fen || typeof fen !== "string") {
      return NextResponse.json({ message: "FEN string is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "OpenRouter API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are an elite Grandmaster Chess Engine Analyzer. Your task is to evaluate a "What If" alternative line chosen by a user during a chess game review.

You will be given:
1. The FEN string representing the starting position before the alternative line.
2. The sequence of alternative moves made by the user (in standard SAN format).

Analyze this alternative line carefully. Output a raw JSON object containing:
- "score": A string evaluation (e.g., "+1.4", "-3.2", "M2" for mate in 2, or "0.0").
- "verdict": A short evaluation phrase (e.g., "Excellent", "Inaccuracy", "Blunder", "Missed opportunity", "Genuinely strong move").
- "explanation": A concise, clear 1-2 sentence explanation of why this line works or fails tactically.
- "bestContinuation": A short string of the next 3-4 best optimal moves if both sides played perfectly from the end of this alternative line.

Output ONLY valid JSON. Do not include markdown formatting like \`\`\`json or \`\`\`.`;

    const userPrompt = `
      Starting FEN: ${fen}
      Alternative Line Played: ${(alternativeMoves as string[] | undefined)?.join(" ") ?? ""}
      Please evaluate this specific alternative line.
    `;

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      console.error("[analyze-alternative] OpenRouter error:", response.status, errorBody);
      return NextResponse.json({ message: `OpenRouter API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) {
      return NextResponse.json({ message: "Empty response from model" }, { status: 502 });
    }

    const analysis: LLMAnalysis = JSON.parse(resultText);

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("[analyze-alternative] Error:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
