import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/server/rate-limiter";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "deepseek/deepseek-chat";

const coachIssueSchema = z.object({
  cpLoss: z.number(),
  fen: z.string().min(1),
  move: z.string().min(1),
});

const coachGameSchema = z.object({
  blackAccuracy: z.number().min(0).max(100),
  blunders: z.array(coachIssueSchema).default([]),
  mistakes: z.array(coachIssueSchema).default([]),
  opening: z.string().min(1),
  phase: z.enum(["opening", "middlegame", "endgame"]),
  pgn: z.string().min(10),
  result: z.string().min(1),
  timeLeft: z.number().min(0),
  whiteAccuracy: z.number().min(0).max(100),
});

const coachRequestSchema = z.object({
  games: z.array(coachGameSchema).min(1).max(50),
  playerColor: z.enum(["white", "black"]),
  playerName: z.string().min(1),
});

const coachResponseSchema = z.object({
  openingRecommendation: z.string().min(1),
  overallRating: z.enum(["Intermediate", "Advanced", "Expert"]),
  quickInsight: z.string().optional(),
  strengths: z.array(z.string().min(1)).min(1),
  summary: z.string().min(1),
  weaknesses: z
    .array(
      z.object({
        description: z.string().min(1),
        drill: z.string().min(1),
        evidence: z.string().min(1),
        severity: z.enum(["critical", "moderate", "minor"]),
        title: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
  weeklyGoal: z.string().min(1),
});

const systemPrompt =
  "You are a professional chess coach. Analyze the player's games and identify their top 3 weaknesses with specific, actionable advice. Be direct, encouraging, and specific. Reference actual moves and positions. Return ONLY valid JSON with no markdown formatting.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncatePgn(pgn: string) {
  return pgn.length > 3600 ? `${pgn.slice(0, 3600)}\n...` : pgn;
}

function compactPayload(payload: z.infer<typeof coachRequestSchema>) {
  return {
    ...payload,
    games: payload.games.map((game, index) => ({
      ...game,
      gameNumber: index + 1,
      pgn: truncatePgn(game.pgn),
    })),
  };
}

function extractJsonObject(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error("AI coach did not return a JSON object.");
  }

  return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as unknown;
}

async function callCoachProvider(prompt: string, maxTokens = 1800): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const provider = groqKey
    ? {
        url: GROQ_ENDPOINT,
        key: groqKey,
        model: GROQ_MODEL,
        headers: {} as Record<string, string>,
      }
    : {
        url: OPENROUTER_ENDPOINT,
        key: openrouterKey ?? "",
        model: OPENROUTER_MODEL,
        headers: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://chessfork.com",
          "X-Title": "ChessFork AI",
        },
      };

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "no body");
      console.warn(`[ai-coach] ${provider.model} API error: ${response.status} — ${errorBody}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn("[ai-coach] AI coach API call failed:", (err as Error).message);
    return null;
  }
}

async function createCoachMessage(payload: z.infer<typeof coachRequestSchema>) {
  const prompt = [
    "Analyze these games for cross-game weakness patterns.",
    "Return JSON only with this exact shape:",
    "{",
    '  "overallRating": "Intermediate" | "Advanced" | "Expert",',
    '  "summary": "one sentence overall assessment",',
    '  "weaknesses": [{"title": string, "description": string, "evidence": string, "drill": string, "severity": "critical" | "moderate" | "minor"}],',
    '  "strengths": [string],',
    '  "weeklyGoal": string,',
    '  "openingRecommendation": string,',
    '  "quickInsight": "one sentence, especially useful when only one game is provided"',
    "}",
    "",
    JSON.stringify(compactPayload(payload)),
  ].join("\n");

  const response = await callCoachProvider(prompt);
  if (!response) throw new Error("AI coach returned no response");
  return response.trim();
}

async function createCoachMessageWithRetry(payload: z.infer<typeof coachRequestSchema>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createCoachMessage(payload);
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await sleep(750 * 2 ** attempt);
    }
  }

  throw lastError;
}

function buildFallbackReport(playerName: string, playerColor: string, gameCount: number) {
  return {
    openingRecommendation: "Focus on a single opening as White and one as Black. Revisit master games in your chosen lines weekly.",
    overallRating: "Intermediate" as const,
    quickInsight: `Your last ${gameCount} game${gameCount === 1 ? "" : "s were"} analyzed. The AI coach API is temporarily unavailable, so here is a general training plan.`,
    strengths: ["You complete your games consistently", "You seek improvement actively"],
    summary: `${playerName}, you are building a solid foundation. The AI coach engine is currently offline — check back later for a detailed pattern analysis.`,
    weaknesses: [
      {
        description: "Without live analysis, we recommend reviewing any blunder positions from these games with the board explorer.",
        drill: "Set aside 15 minutes daily to solve tactical puzzles focused on the phase (opening, middlegame, endgame) where you lost the most centipawns.",
        evidence: "Based on general patterns across your recent games.",
        severity: "moderate" as const,
        title: "AI coach offline — tactical consistency",
      },
    ],
    weeklyGoal: "Review one of your recent games move by move using the analysis board. Note every position where the evaluation changed by more than 50 centipawns.",
  };
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = checkRateLimit(`ai-coach:${ip}`, 20, 60_000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please wait before sending another coaching request." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = coachRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid coaching payload.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!groqKey && !openrouterKey) {
    return NextResponse.json(
      { message: "No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  try {
    const rawResponse = await createCoachMessageWithRetry(parsed.data);
    const report = coachResponseSchema.parse(extractJsonObject(rawResponse));
    return NextResponse.json(report);
  } catch (error) {
    const err = error as { message?: string };
    console.error("[ai-coach] AI coach API error:", err?.message);

    const fallback = buildFallbackReport(
      parsed.data.playerName,
      parsed.data.playerColor,
      parsed.data.games.length,
    );
    return NextResponse.json(fallback, { status: 200 });
  }
}
