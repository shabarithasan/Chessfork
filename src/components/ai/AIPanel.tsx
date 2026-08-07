"use client";

import { useState, useRef, useEffect } from "react";
import { useAI, CONVERSATION_STARTERS } from "@/contexts/AIProvider";
import { AIMessage } from "@/components/ai/AIMessage";
import { AIChatInput } from "@/components/ai/AIChatInput";
import { AILoadingState } from "@/components/ai/AILoadingState";
import {
  Sparkles,
  X,
  Trash2,
  PanelRightOpen,
  Keyboard,
} from "lucide-react";

export function AIPanel({ chatEndRef }: { chatEndRef: React.RefObject<HTMLDivElement | null> }) {
  const {
    open,
    messages,
    streaming,
    pageContext,
    closeAI,
    sendMessage,
    clearConversation,
  } = useAI();

  const panelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(420);
  const resizing = useRef(false);

  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflowY = "scroll";
      document.body.style.overflowX = "hidden";
    } else {
      const top = parseFloat(document.body.style.top || "0");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflowY = "";
      document.body.style.overflowX = "";
      window.scrollTo(0, isNaN(top) ? 0 : -top);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflowY = "";
      document.body.style.overflowX = "";
    };
  }, [open]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatEndRef]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!resizing.current) return;
      setWidth(Math.min(650, Math.max(380, window.innerWidth - e.clientX)));
    }
    function handleMouseUp() {
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  function handleSubmit(value: string) {
    if (streaming) return;
    sendMessage(value);
  }

  const hasMessages = messages.length > 0;

  const visibleMessages = streaming
    ? messages.filter((m) => !(m.role === "assistant" && m.content === ""))
    : messages;

  return (
    <>
      <style>{`
        @keyframes ai-panel-slide {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ai-pulse-dot {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .ai-streaming-dot {
          animation: ai-pulse-dot 1s ease-in-out infinite;
        }
        .ai-streaming-dot:nth-child(2) { animation-delay: 0.15s; }
        .ai-streaming-dot:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      {open && (
        <div className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm md:bg-black/30" onClick={closeAI} />
      )}

      {open && <div
        ref={panelRef}
        data-ai-panel="true"
        className="fixed right-0 inset-y-0 z-[999] flex flex-col bg-[#0f1117] shadow-[0_0_60px_rgba(0,0,0,0.5)] border-l border-[#2a2f3a] overflow-hidden"
        style={{
          width: `${width}px`,
          boxSizing: "border-box",
          animation: "ai-panel-slide 0.25s ease-out",
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            closeAI();
          }
        }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#3b82f6]/30 transition-colors active:bg-[#3b82f6]/50"
          onMouseDown={(e) => {
            resizing.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
          }}
        />

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#2a2f3a] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">ChessFork AI</h2>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              {pageContext && (
                <span className="inline-flex items-center gap-1 rounded bg-[#3b82f6]/10 px-1.5 py-0.5 text-[10px] text-[#3b82f6]">
                  <PanelRightOpen className="h-2.5 w-2.5" />
                  {pageContext.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasMessages && (
              <button
                type="button"
                onClick={clearConversation}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-[#2a2f3a] hover:text-neutral-200"
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={closeAI}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-[#2a2f3a] hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 scrollbar-thin scrollbar-thumb-[#2a2f3a] scrollbar-track-transparent" style={{ overscrollBehavior: "contain" }}>
          {!hasMessages ? (
            <div className="flex h-full flex-col justify-center">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5">
                  <Sparkles className="h-7 w-7 text-[#3b82f6]" />
                </div>
                <h3 className="text-base font-semibold text-white">ChessFork AI</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Your chess analysis assistant
                </p>
                {pageContext && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#3b82f6]/10 px-3 py-1 text-xs text-[#3b82f6]">
                    <PanelRightOpen className="h-3 w-3" />
                    Viewing {pageContext.label}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 px-2">
                {CONVERSATION_STARTERS.slice(0, 5).map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => {
                      sendMessage(starter);
                    }}
                    className="group rounded-xl border border-[#2a2f3a] bg-[#171b24]/50 px-4 py-2.5 text-left text-xs text-neutral-400 transition-all hover:border-[#3b82f6]/30 hover:bg-[#171b24] hover:text-neutral-200 active:scale-[0.98]"
                  >
                    <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                      {starter}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleMessages.map((msg) => (
                <AIMessage key={msg.id} message={msg} />
              ))}
              {streaming && (
                <div className="flex gap-3 animate-fadeIn">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f3c53d]/20 text-[#f3c53d]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-md border border-[#2a2f3a] bg-[#171b24] px-4 py-2.5">
                    <AILoadingState />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-[#2a2f3a] p-4">
          <AIChatInput
            placeholder="Ask ChessFork AI..."
            onSubmit={handleSubmit}
            disabled={streaming}
            autoFocus={open}
          />
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[10px] text-neutral-600">
              AI may produce inaccurate information
            </span>
            <span className="flex items-center gap-1 text-[10px] text-neutral-600">
              <Keyboard className="h-2.5 w-2.5" />
              Ctrl+K
            </span>
          </div>
        </div>
      </div>}
    </>
  );
}
