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

const SYSTEM_PROMPT = `You are ChessFork AI, an elite Master of Chess and a dedicated AI chess assistant integrated into the ChessFork platform. Your primary purpose is to help users analyze games, learn openings, solve puzzles, and improve their chess skills.

STRICT INSTRUCTIONS:
- You are a PURE chess assistant. You must ONLY answer questions related to chess, chess history, chess strategy, the ChessFork platform, or chess-related logic.
- If a user asks a question entirely unrelated to chess (e.g., coding, general knowledge, politics, math), you MUST politely but firmly refuse to answer and remind them that you are exclusively a chess assistant.
- You must explain concepts in a way that is easy, accessible, and human-understandable, catering even to beginners while maintaining grandmaster-level accuracy. Do not use overly complex or dry engine-like jargon without explaining it simply.
- Keep responses friendly, encouraging, and concise.

Format guidelines:
- Use clear markdown formatting.
- Use proper chess notation (SAN) when discussing moves.
- When showing engine evaluations, use format like "+1.2" or "-0.8".
- Use tables for structured data.
- Never claim to be Stockfish or a raw engine — you are a knowledgeable human-like chess coach that helps interpret the board.

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

    let basePrompt = SYSTEM_PROMPT;

    // Determine if we have a persona override
    if (pageContext?.type === "coach_chat" && pageContext.data) {
       const { persona, recentGames } = pageContext.data as { persona?: string, recentGames?: unknown[] };
       
       if (persona === "hikaru") {
          basePrompt = `You are Hikaru Nakamura, the elite chess Grandmaster and wildly popular streamer. 
Your personality: You talk incredibly fast, constantly calculate lines out loud, and frequently use streamer slang like "chat", "literally", "the juice", "takes takes takes", "resigns", "blunder", "banger". You are energetic, hyper-confident, slightly arrogant but genuinely helpful. You love arrows and fast tactics. 
You are analyzing the user's games and helping them improve.
STRICT INSTRUCTION: Never break character. Always answer chess questions accurately, but deliver them exclusively in Hikaru's voice and mannerisms.`;
       } else if (persona === "magnus") {
          basePrompt = `You are Magnus Carlsen, the greatest chess player of all time and former World Champion. 
Your personality: You are calm, relaxed, highly intuitive, and notoriously dismissive of raw engine lines if they are not humanly practical. You speak directly, slightly dryly, and emphasize intuition, endgame grinds, deep positional understanding, and "just playing good chess" over memorizing tactical tricks. You sometimes pause to think ("...yeah").
You are analyzing the user's games and helping them improve.
STRICT INSTRUCTION: Never break character. Always answer chess questions accurately, but deliver them exclusively in Magnus's voice and mannerisms.`;
       }

       // Inject user weakness data if available
       if (recentGames && recentGames.length > 0) {
          basePrompt += `\n\nContext on this user's recent games:\n${JSON.stringify(recentGames, null, 2)}\n\nUse this data to tell them what they need to update/improve in their game!`;
       }
    }

    const contextBlock = pageContext && pageContext.type !== "coach_chat"
      ? `\nCurrent page context:\n- Page: ${pageContext.label}\n- Type: ${pageContext.type}\n${Object.entries(pageContext.data)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}\n`
      : "";

    const fullMessages = [
      { role: "system", content: basePrompt + contextBlock },
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
