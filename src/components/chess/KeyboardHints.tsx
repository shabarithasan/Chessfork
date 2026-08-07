"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const hints = [
  { key: "← →", label: "Navigate" },
  { key: "Home/End", label: "Jump" },
  { key: "Space", label: "Auto-play" },
  { key: "J/K", label: "Critical" },
];

export function KeyboardHints() {
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -4 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#111118]/90 px-3 py-2 backdrop-blur-sm"
        >
          <span className="mr-1 text-xs">⌨️</span>
          {hints.map((h) => (
            <span key={h.key} className="flex items-center gap-1 text-[10px] text-slate-400">
              <kbd className="rounded border border-[#3a3a3a] bg-[#1a1a1a] px-1.5 py-px font-mono text-[9px] font-semibold text-slate-300">
                {h.key}
              </kbd>
              <span className="hidden sm:inline">{h.label}</span>
            </span>
          ))}
          <button
            onClick={handleDismiss}
            className="ml-1 rounded p-0.5 text-slate-500 transition hover:bg-[#2a2a2a] hover:text-slate-300"
          >
            <X className="size-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
