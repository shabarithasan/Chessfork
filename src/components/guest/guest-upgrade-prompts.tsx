"use client";

import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  dismissGuestPrompt,
  guestAnalysisCount,
  isGuestPromptDismissed,
  markGuestMergeComplete,
  type GuestPromptId,
} from "@/lib/guestSession";

type Prompt = {
  cta: string;
  href: string;
  id: GuestPromptId;
  secondary: string;
  text: string;
};

function authHref(nextPath: string | null) {
  const next = nextPath && nextPath.startsWith("/") ? nextPath : "/account";
  return `/auth?next=${encodeURIComponent(next)}`;
}

export function GuestUpgradePrompts({
  isSignedIn,
  placement = "floating",
  pathname,
}: {
  isSignedIn: boolean;
  placement?: "floating" | "inline";
  pathname: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [savedGameCount, setSavedGameCount] = useState(0);
  const [, setDismissedVersion] = useState(0);
  const [mergedCount, setMergedCount] = useState(0);

  useEffect(() => {
    window.queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    function refresh() {
      setSavedGameCount(guestAnalysisCount());
      setMergedCount(Number(new URLSearchParams(window.location.search).get("guestMerged") ?? 0));
    }

    window.queueMicrotask(refresh);
    window.addEventListener("knightowl:guest-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("knightowl:guest-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (isSignedIn && mergedCount > 0) {
      markGuestMergeComplete(mergedCount);
    }
  }, [isSignedIn, mergedCount]);

  if (!mounted) {
    return null;
  }

  let prompt: Prompt | null = null;
  const path = pathname ?? "/";

  if (!isSignedIn && path.startsWith("/coach") && !isGuestPromptDismissed("coach")) {
    prompt = {
      cta: "Create free account - takes 10 seconds",
      href: authHref(path),
      id: "coach",
      secondary: "Maybe later",
      text: "AI Coaching requires a free account to save your progress.",
    };
  } else if (!isSignedIn && path.startsWith("/profile") && !isGuestPromptDismissed("streak-sync")) {
    prompt = {
      cta: "Sign in",
      href: authHref(path),
      id: "streak-sync",
      secondary: "Maybe later",
      text: "Sign in to sync your streak across devices.",
    };
  } else if (!isSignedIn && savedGameCount >= 3 && !isGuestPromptDismissed("analysis-history")) {
    prompt = {
      cta: "Sign in",
      href: authHref(path),
      id: "analysis-history",
      secondary: "Continue as guest",
      text: "💾 Sign in to save your analysis history across devices.",
    };
  }

  if (isSignedIn && mergedCount > 0) {
    if (placement === "inline") {
      return (
        <div
          className="relative top-auto mb-3 flex w-full items-center gap-3 text-emerald-50"
          style={{
            background: "#0f1f1f",
            border: "1px solid #00d4aa30",
            borderRadius: 8,
            padding: "10px 16px",
          }}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-300/15 text-emerald-200">
            <CheckCircle2 className="size-5" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold">
            Your {mergedCount} analyzed game{mergedCount === 1 ? " has" : "s have"} been saved to your account.
          </p>
        </div>
      );
    }

    return (
      <div className="fixed left-3 right-3 top-3 z-[85] mx-auto max-w-xl rounded-xl border border-emerald-300/30 bg-[#111118] p-3 text-emerald-50 shadow-[0_18px_60px_rgba(0,0,0,0.42)] md:left-auto md:right-5 md:w-[28rem]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-300/15 text-emerald-200">
            <CheckCircle2 className="size-5" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold">
            Your {mergedCount} analyzed game{mergedCount === 1 ? " has" : "s have"} been saved to your account.
          </p>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return null;
  }

  if (placement === "inline") {
    return (
      <div
        className="relative top-auto mb-3 flex w-full flex-wrap items-center justify-between gap-3 text-slate-100"
        style={{
          background: "#0f1f1f",
          border: "1px solid #00d4aa30",
          borderRadius: 8,
          padding: "10px 16px",
        }}
      >
        <p className="min-w-0 text-sm font-semibold leading-6">{prompt.text}</p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={prompt.href}
            className="rounded-lg bg-[#00d4aa] px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-[#26e8c1]"
          >
            {prompt.cta}
          </Link>
          <button
            type="button"
            onClick={() => {
              dismissGuestPrompt(prompt.id);
              setDismissedVersion((version) => version + 1);
            }}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
          >
            {prompt.secondary}
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-3 right-3 top-3 z-[85] mx-auto max-w-2xl rounded-xl border border-[#00d4aa]/25 bg-[#111118] p-3 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.42)] md:left-auto md:right-5 md:w-[34rem]">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-6">{prompt.text}</p>
        <Link
          href={prompt.href}
          className="rounded-lg bg-[#00d4aa] px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-[#26e8c1]"
        >
          {prompt.cta}
        </Link>
        <button
          type="button"
          onClick={() => {
            dismissGuestPrompt(prompt.id);
            setDismissedVersion((version) => version + 1);
          }}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
        >
          {prompt.secondary}
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
