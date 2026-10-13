"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { AIFloatingButton } from "@/components/ai/AIFloatingButton";
import { AIPanel } from "@/components/ai/AIPanel";

export interface PageContext {
  type: string;
  label: string;
  data: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export const COACH_AVATARS = [
  {
    "id": "hikaru",
    "label": "Hikaru Nakamura",
    "url": "https://assets-coaches.chess.com/image/coachhikaru.png?v=28d7093b"
  },
  {
    "id": "magnus",
    "label": "Magnus Carlsen",
    "url": "https://assets-coaches.chess.com/image/coachmagnus.png?v=819d9dba"
  },
  {
    "id": "vishy",
    "label": "Vishy Anand",
    "url": "https://assets-coaches.chess.com/image/coachvishy.png?v=ea3d532d"
  },
  {
    "id": "levy",
    "label": "GothamChess",
    "url": "https://assets-coaches.chess.com/image/coachlevy.png?v=9f98615d"
  },
  {
    "id": "coach",
    "label": "Elite Coach",
    "url": "/images/pawn-light.png"
  }
];

interface AIState {
  coachAvatar: string;
  open: boolean;
  messages: Message[];
  streaming: boolean;
  pageContext: PageContext | null;
}

interface AIContextValue {
  coachAvatar: string;
  setCoachAvatar: (url: string) => void;
  open: boolean;
  messages: Message[];
  streaming: boolean;
  pageContext: PageContext | null;
  toggleAI: () => void;
  openAI: () => void;
  closeAI: () => void;
  sendMessage: (content: string) => void;
  setPageContext: (ctx: PageContext | null) => void;
  clearConversation: () => void;
}

const AIContext = createContext<AIContextValue | null>(null);

const STORAGE_KEY = "chessfork-ai-history";

function loadHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Message[];
      return Array.isArray(parsed) ? parsed.slice(-50) : [];
    }
  } catch { /* ignore */ }
  return [];
}

function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const CONVERSATION_STARTERS = [
  "How can I improve this position?",
  "Explain this opening.",
  "Find tactical ideas.",
  "Analyze my last game.",
  "Create a puzzle.",
  "Teach me this endgame.",
  "Help me navigate ChessFork.",
  "Explain this feature.",
  "Suggest training.",
  "Review my mistakes.",
];

export function AIProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIState>({
    coachAvatar: COACH_AVATARS[0].url,
    open: false,
    messages: [],
    streaming: false,
    pageContext: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let savedCoach = COACH_AVATARS[0].url;
    try {
      const stored = localStorage.getItem('chessfork-ai-coach');
      if (stored && stored !== "/images/pawn-light.png") savedCoach = stored;
    } catch {}
    setState(prev => ({ ...prev, messages: loadHistory(), coachAvatar: savedCoach }));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages.slice(-50)));
    } catch { /* ignore */ }
  }, [state.messages]);

  const toggleAI = useCallback(() => {
    setState(prev => ({ ...prev, open: !prev.open }));
  }, []);

  const openAI = useCallback(() => {
    setState(prev => ({ ...prev, open: true }));
  }, []);

  const closeAI = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const setPageContext = useCallback((ctx: PageContext | null) => {
    setState(prev => ({ ...prev, pageContext: ctx }));
  }, []);

  const setCoachAvatar = useCallback((url: string) => {
    setState(prev => ({ ...prev, coachAvatar: url }));
    try { localStorage.setItem('chessfork-ai-coach', url); } catch {}
  }, []);

  const clearConversation = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || state.streaming) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
    };

    const assistantMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg, assistantMsg],
      streaming: true,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history = [...state.messages, userMsg].slice(-20);
      const currentPersona = COACH_AVATARS.find(c => c.url === state.coachAvatar)?.id || "hikaru";
      const effectivePageContext = state.pageContext
        ? {
            ...state.pageContext,
            data: {
              persona: currentPersona,
              ...(state.pageContext.data || {}),
            },
          }
        : {
            type: "coach_chat",
            label: "AI Assistant",
            data: { persona: currentPersona },
          };

      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          pageContext: effectivePageContext,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let done = false;
      let fullContent = "";

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === assistantMsg.id ? { ...m, content: fullContent } : m
            ),
          }));
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: "Sorry, I couldn't process that request. Please try again." }
            : m
        ),
      }));
    } finally {
      abortRef.current = null;
      setState(prev => ({ ...prev, streaming: false }));
    }
  }, [state.messages, state.streaming, state.pageContext]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setState(prev => ({ ...prev, open: !prev.open }));
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <AIContext.Provider
      value={{
        open: state.open,
        messages: state.messages,
        streaming: state.streaming,
        pageContext: state.pageContext,
        toggleAI,
        openAI,
        closeAI,
        sendMessage,
        setPageContext,
        clearConversation,
        coachAvatar: state.coachAvatar,
        setCoachAvatar,
      }}
    >
      {children}
      <AIFloatingButton />
      <AIPanel chatEndRef={chatEndRef} />
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used within an AIProvider");
  return ctx;
}

export { CONVERSATION_STARTERS };
