import Anthropic, { APIError, RateLimitError } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit } from "@/server/rate-limiter";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  "You are a professional chess coach. Analyze the player's games and identify their top 3 weaknesses with specific, actionable advice. Be direct, encouraging, and specific. Reference actual moves and positions. Format your response in JSON only.";

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
    throw new Error("Claude did not return a JSON object.");
  }

  return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as unknown;
}

function isRetryableClaudeError(error: unknown) {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof APIError) {
    return error.status === 429 || error.status === 500 || error.status === 529;
  }

  return false;
}

async function createCoachMessage(client: Anthropic, payload: z.infer<typeof coachRequestSchema>) {
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

  const message = await client.messages.create({
    max_tokens: 1800,
    messages: [{ content: prompt, role: "user" }],
    model: "claude-sonnet-4-20250514",
    system: systemPrompt,
  });

  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();
}

async function createCoachMessageWithRetry(client: Anthropic, payload: z.infer<typeof coachRequestSchema>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createCoachMessage(client, payload);
    } catch (error) {
      lastError = error;

      if (!isRetryableClaudeError(error) || attempt === 2) {
        break;
      }

      await sleep(750 * 2 ** attempt);
    }
  }

  throw lastError;
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

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!anthropicApiKey || anthropicApiKey === "your_anthropic_api_key_here") {
    return NextResponse.json({ message: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }

  const client = new Anthropic({
    apiKey: anthropicApiKey,
    maxRetries: 0,
  });

  try {
    const rawResponse = await createCoachMessageWithRetry(client, parsed.data);
    const report = coachResponseSchema.parse(extractJsonObject(rawResponse));
    return NextResponse.json(report);
  } catch (error) {
    const anthropicError = error as { message?: string; status?: number };
    console.error("Anthropic API error:", anthropicError?.status, anthropicError?.message);

    return NextResponse.json(
      { detail: anthropicError?.message, error: "Claude unavailable" },
      { status: 503 },
    );
  }
}
