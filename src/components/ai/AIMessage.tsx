"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/contexts/AIProvider";
import { Bot, User, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 opacity-0 transition-all group-hover/message:opacity-100 hover:text-neutral-200"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function ThinkingBlock({ children }: { children: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="my-2 rounded-lg border border-[#2a2f3a] bg-[#171b24]/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Thinking
      </button>
      {expanded && (
        <div className="border-t border-[#2a2f3a] px-3 py-2 text-xs leading-relaxed text-neutral-500">
          {children}
        </div>
      )}
    </div>
  );
}

export function AIMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`group/message flex gap-3 ${isUser ? "flex-row-reverse" : ""} animate-fadeIn`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isUser ? "bg-[#3b82f6]/20 text-[#3b82f6]" : "bg-[#f3c53d]/20 text-[#f3c53d]"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`group relative min-w-0 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-[#3b82f6]/10 text-neutral-100 rounded-tr-md"
              : "bg-[#171b24] text-neutral-200 rounded-tl-md border border-[#2a2f3a]"
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-[#0f1117] [&_pre]:border [&_pre]:border-[#2a2f3a] [&_pre]:rounded-xl [&_code]:text-[#f3c53d] [&_code]:text-[13px] [&_table]:w-full [&_th]:text-left [&_th]:text-neutral-400 [&_th]:text-xs [&_th]:font-medium [&_th]:border-b [&_th]:border-[#2a2f3a] [&_th]:pb-2 [&_td]:py-1.5 [&_td]:text-sm [&_tr]:border-b [&_tr]:border-[#2a2f3a]/50 [&_a]:text-[#3b82f6] [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h3]:text-[#f3c53d] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h2]:text-[#f3c53d] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-[#2a2f3a] [&_h2]:pb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[#3b82f6] [&_blockquote]:pl-3 [&_blockquote]:text-neutral-400 [&_blockquote]:italic [&_strong]:text-neutral-100 [&_strong]:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && message.content && (
          <div className="flex items-center gap-1 px-1 pt-1">
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
