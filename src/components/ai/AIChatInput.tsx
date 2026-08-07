"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Paperclip, Send } from "lucide-react";
import { useState } from "react";

import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";

interface AIChatInputProps {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function AIChatInput({
  placeholder = "Ask ChessFork AI...",
  onSubmit,
  disabled = false,
  autoFocus = false,
  className,
}: AIChatInputProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 52,
    maxHeight: 200,
  });
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit?.(trimmed);
    setValue("");
    adjustHeight(true);
  };

  const handleContainerClick = () => {
    textareaRef.current?.focus();
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative mx-auto w-full">
        <div
          aria-label="Chat input container"
          className={cn(
            "relative flex w-full cursor-text flex-col rounded-xl text-left transition-all duration-200",
            "ring-1 ring-[#2a2f3a]",
            isFocused && "ring-[#3b82f6]/40",
          )}
          onClick={handleContainerClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleContainerClick();
            }
          }}
          role="textbox"
          tabIndex={0}
        >
          <div className="max-h-[200px] overflow-y-auto">
            <textarea
              className="w-full resize-none rounded-xl rounded-b-none border-none bg-[#171b24] px-4 py-3 leading-[1.2] text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-0 focus:outline-none"
              autoFocus={autoFocus}
              disabled={disabled}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={placeholder}
              ref={textareaRef}
              rows={1}
              value={value}
            />
          </div>

          <div className="h-12 rounded-b-xl bg-[#171b24]">
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button
                className="cursor-pointer rounded-lg bg-black/10 p-2 transition-colors hover:text-neutral-200"
                disabled={disabled}
                type="button"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4 text-neutral-400 transition-colors" />
              </button>
            </div>
            <div className="absolute bottom-3 right-3">
              <button
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                  value.trim() && !disabled
                    ? "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white hover:scale-105 hover:shadow-[0_0_16px_rgba(59,130,246,0.35)] active:scale-[0.97]"
                    : "cursor-pointer bg-black/10 text-neutral-400 hover:text-neutral-200",
                )}
                disabled={disabled}
                onClick={handleSubmit}
                type="button"
                aria-label="Send message"
              >
                <motion.div
                  animate={{ scale: value.trim() && !disabled ? 1 : 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Send className="h-4 w-4" />
                </motion.div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
