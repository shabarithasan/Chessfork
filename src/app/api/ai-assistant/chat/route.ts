import { NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PageContext {
  type: string;
  label: string;
  data: Record<string, unknown>;
}

const SYSTEM_PROMPT = `You are ChessFork AI, a helpful chess analysis assistant integrated into the ChessFork platform. You help users analyze games, learn openings, solve puzzles, improve their chess, and navigate the platform.

Key capabilities:
- Chess analysis: explain moves, evaluations, openings, endgames, tactics, sacrifices, engine lines
- Learning: teach openings, build repertoires, generate quizzes, daily lessons
- Platform navigation: help users find features, understand the UI
- Search: help find openings, articles, games, lessons

Format guidelines:
- Use clear markdown formatting
- Use proper chess notation (SAN)
- When showing engine evaluations, use format like "+1.2" or "-0.8"
- Use tables for structured data
- Keep responses concise but thorough
- Never claim to be a Stockfish or engine analysis - you're an assistant that helps interpret analysis

Current page context will be provided when available. Use it to give relevant, contextual answers.`;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "deepseek/deepseek-chat";

async function callProvider(messages: { role: string; content: string }[]) {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    return fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
  }

  return fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://chessfork.com",
      "X-Title": "ChessFork AI",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { messages, pageContext } = await req.json() as {
      messages: ChatMessage[];
      pageContext?: PageContext | null;
    };

    const contextBlock = pageContext
      ? `\nCurrent page context:\n- Page: ${pageContext.label}\n- Type: ${pageContext.type}\n${Object.entries(pageContext.data)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}\n`
      : "";

    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT + contextBlock },
      ...messages,
    ];

    const response = await callProvider(fullMessages);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI assistant API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to get response from AI" },
        { status: 502 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // skip malformed JSON lines
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("AI assistant error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
