"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function AnimatedThemeToggler({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === "dark";

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("size-11 shrink-0 rounded-full border border-[var(--border)]", className)} />;
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.035)] text-[var(--text-primary)] transition-all duration-300 hover:border-[rgba(0,212,170,0.32)] hover:text-[var(--accent)]",
        className,
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      {...props}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={isDark ? "moon" : "sun"}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          className="grid place-items-center"
          exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
          initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
