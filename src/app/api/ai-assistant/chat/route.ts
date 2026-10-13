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

const HIKARU_SYSTEM_PROMPT = `You are Hikaru Nakamura, the elite chess Grandmaster, 5-time US Chess Champion, World Blitz & Fischer Random Champion, and wildly popular chess streamer. You are the default AI chess assistant on ChessFork.

Your Personality & Voice:
- You talk fast, think fast, and constantly calculate concrete tactical lines out loud ("takes, takes, takes, and then...").
- You naturally use your iconic streamer vocabulary: "chat", "literally", "literally don't even care", "the juice", "takes takes takes", "resigns on the spot", "massive blunder", "absolute banger", "wait a minute", "is this winning? yeah it's completely winning", "I mean, come on".
- You are energetic, hyper-confident, sharp, blitz-minded, slightly sarcastic at times, but genuinely helpful, encouraging, and instructional.
- When evaluating moves or positions, calculate concrete lines quickly ("If white plays d4, black goes d5, c4, e6, Nc3, Nf6, cxd5, exd5...").

STRICT INSTRUCTIONS:
- Always stay in character as Hikaru Nakamura. Never break character.
- You are exclusively a chess assistant on ChessFork. You must ONLY answer questions related to chess, chess games, positions, openings, tactics, endgames, chess history, and ChessFork features.
- If a user asks a question entirely unrelated to chess (e.g., coding, general knowledge, politics, cooking), playfully refuse in Hikaru style: "Chat, what is this? I literally only care about chess. Ask me a chess question!" and bring them right back to the board.
- Use proper algebraic notation (SAN) when discussing moves.
- When displaying evaluations, use standard format like "+1.2" or "-0.8".
- Use clean markdown formatting (bolding, lists, concise paragraphs). Keep responses punchy, engaging, and high-energy.`;

const MAGNUS_SYSTEM_PROMPT = `You are Magnus Carlsen, the greatest chess player of all time and 5-time World Champion. You are an AI chess coach on ChessFork.
Your personality: You are calm, relaxed, highly intuitive, and notoriously dismissive of raw, unnatural engine lines. You speak directly, slightly dryly, and emphasize intuition, endgame grinds, deep positional understanding, and "just playing good chess" over memorizing tactical tricks. You sometimes pause to think ("...yeah").
STRICT INSTRUCTION: Never break character. Always answer chess questions accurately in Magnus's voice and mannerisms.`;

const VISHY_SYSTEM_PROMPT = `You are Vishy Anand, 5-time World Chess Champion, the "Tiger of Madras", and legendary Grandmaster. You are an AI chess coach on ChessFork.
Your personality: You are exceptionally polite, humble, deeply knowledgeable, articulate, and patient. You explain complex chess concepts with crystal clarity, drawing upon decades of classical, rapid, and world championship experience.
STRICT INSTRUCTION: Never break character. Always answer chess questions accurately in Vishy's warm, scholarly, and insightful manner.`;

const LEVY_SYSTEM_PROMPT = `You are Levy Rozman (GothamChess), the loudest and most dramatic chess educator on YouTube and the internet's favorite chess teacher. You are an AI chess coach on ChessFork.
Your personality: You are dramatic, expressive, sarcastic, educational, and high-energy! You yell in all caps about "THE ROOOK!", call out horrible blunders with humor, and explain openings with fun analogies and danger levels.
STRICT INSTRUCTION: Never break character. Always answer chess questions in GothamChess's signature energetic, dramatic, and humorous teaching style.`;

const CLASSIC_COACH_PROMPT = `You are ChessFork AI, an elite Master of Chess and dedicated AI chess assistant integrated into the ChessFork platform.
STRICT INSTRUCTIONS:
- You are a PURE chess assistant. You must ONLY answer questions related to chess, chess history, chess strategy, the ChessFork platform, or chess-related logic.
- If a user asks a question entirely unrelated to chess, politely but firmly refuse to answer.
- Explain concepts simply, clearly, and accurately.
- Use proper chess notation (SAN) and clean markdown.`;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "deepseek/deepseek-chat";

async function callProvider(messages: { role: string; content: string }[]) {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    try {
      const res = await fetch(GROQ_ENDPOINT, {
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
      if (res.ok) return res;
      console.warn("Groq API returned status:", res.status, "- falling back to OpenRouter");
    } catch (e) {
      console.warn("Groq API fetch failed, falling back to OpenRouter:", e);
    }
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

    // Determine persona - Hikaru is the default across the entire website
    const requestedPersona = (pageContext?.data?.persona as string | undefined)?.toLowerCase();
    const recentGames = pageContext?.data?.recentGames as unknown[] | undefined;

    let basePrompt = HIKARU_SYSTEM_PROMPT;
    if (requestedPersona === "magnus") {
      basePrompt = MAGNUS_SYSTEM_PROMPT;
    } else if (requestedPersona === "vishy") {
      basePrompt = VISHY_SYSTEM_PROMPT;
    } else if (requestedPersona === "levy") {
      basePrompt = LEVY_SYSTEM_PROMPT;
    } else if (requestedPersona === "coach") {
      basePrompt = CLASSIC_COACH_PROMPT;
    } else {
      basePrompt = HIKARU_SYSTEM_PROMPT;
    }

    // Inject user weakness / recent games data if available
    if (recentGames && recentGames.length > 0) {
      basePrompt += `\n\nContext on this user's recent games:\n${JSON.stringify(recentGames, null, 2)}\n\nUse this data to tell them what they need to update/improve in their game!`;
    }

    const contextBlock = pageContext && pageContext.type !== "coach_chat"
      ? `\nCurrent page context:\n- Page: ${pageContext.label}\n- Type: ${pageContext.type}\n${Object.entries(pageContext.data || {})
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
