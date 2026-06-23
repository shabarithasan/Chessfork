"use client";

import Link from "next/link";
import { useState } from "react";

import { recordCoachUseAndCheckBadges } from "@/lib/badgeChecker";
import type { CoachProfileSnapshot } from "@/types/platform";

interface CoachChatDemoProps {
  snapshot: CoachProfileSnapshot;
  defaultReportHref: string;
  latestAnalysisHref?: string;
}

interface CoachReplyResponse {
  reply?: string;
  message?: string;
}

interface CoachReportResponse {
  shareUrl?: string;
  message?: string;
}

export function CoachChatDemo({ snapshot, defaultReportHref, latestAnalysisHref }: CoachChatDemoProps) {
  const starterPrompts = [
    "What should I train after dropping winning positions?",
    `How do I improve my ${snapshot.dailyPlan[0]?.focus.toLowerCase() ?? "training"} this week?`,
    "Build me a short study block for tonight.",
  ];
  const dailyPlanMinutes = snapshot.dailyPlan.reduce((total, task) => total + task.durationMinutes, 0);

  const [prompt, setPrompt] = useState(starterPrompts[0]);
  const [reply, setReply] = useState<string | null>(null);
  const [reportHref, setReportHref] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingReply, setPendingReply] = useState(false);
  const [pendingReport, setPendingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendPrompt() {
    if (prompt.trim().length < 3) {
      setError("Add a little more detail so the coach can answer usefully.");
      return;
    }

    setPendingReply(true);
    setError(null);

    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = (await response.json()) as CoachReplyResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Coach request failed.");
      }

      setReply(data.reply ?? null);
      recordCoachUseAndCheckBadges();
    } catch (caughtError) {
      setReply(null);
      setError(caughtError instanceof Error ? caughtError.message : "Coach request failed.");
    } finally {
      setPendingReply(false);
    }
  }

  async function generateReport() {
    setPendingReport(true);
    setError(null);

    try {
      const response = await fetch("/api/coach/report", {
        method: "POST",
      });

      const data = (await response.json()) as CoachReportResponse;

      if (!response.ok || !data.shareUrl) {
        throw new Error(data.message ?? "Coach report could not be created.");
      }

      setReportHref(data.shareUrl);
      setStatus("Fresh coach report ready. Open it to review the newest modules and daily plan.");
      recordCoachUseAndCheckBadges();
    } catch (caughtError) {
      setReportHref(null);
      setStatus(null);
      setError(caughtError instanceof Error ? caughtError.message : "Coach report could not be created.");
    } finally {
      setPendingReport(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.9)_34%,rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Coach command center</p>
      <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">Ask for guidance or spin up a fresh report.</h3>
      <p className="mt-4 text-sm leading-7 text-slate-300">{snapshot.summary}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pillars tracked</p>
          <p className="mt-2 text-2xl font-semibold text-white">{snapshot.pillars.length}</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Today&apos;s plan</p>
          <p className="mt-2 text-2xl font-semibold text-white">{dailyPlanMinutes} min</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Modules live</p>
          <p className="mt-2 text-2xl font-semibold text-white">{snapshot.modules.length}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {starterPrompts.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => setPrompt(starter)}
            className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            {starter}
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-6 min-h-32 w-full rounded-[1.5rem] border border-white/10 bg-slate-950/85 px-4 py-4 text-sm leading-7 text-slate-100 outline-none transition focus:border-amber-300/70"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={sendPrompt}
          disabled={pendingReply}
          className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingReply ? "Thinking..." : "Ask coach"}
        </button>
        <button
          type="button"
          onClick={generateReport}
          disabled={pendingReport}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingReport ? "Building report..." : "Generate fresh report"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {reply ? (
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.9))] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Coach answer</p>
          <p className="mt-3 text-sm leading-7 text-slate-200">{reply}</p>
        </div>
      ) : null}

      {(status || reportHref) ? (
        <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-100">Report status</p>
          {status ? <p className="mt-3 text-sm leading-7 text-slate-100">{status}</p> : null}
          {reportHref ? (
            <Link href={reportHref} className="mt-4 inline-flex text-sm font-semibold text-amber-50 transition hover:text-white">
              Open generated report
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={defaultReportHref}
          className="rounded-[1.3rem] border border-white/10 bg-slate-950/75 p-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-900"
        >
          Open current coach snapshot
        </Link>
        {latestAnalysisHref ? (
          <Link
            href={latestAnalysisHref}
            className="rounded-[1.3rem] border border-white/10 bg-slate-950/75 p-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-900"
          >
            Review latest analysis report
          </Link>
        ) : (
          <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/75 p-4 text-sm text-slate-400">
            Add more reports to enrich the next coaching snapshot.
          </div>
        )}
      </div>

      <div className="mt-6 rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
        Stronger coach UX means the chat, snapshot, and latest analysis report all stay in one visible flow. That keeps the guidance
        grounded in evidence instead of feeling detached from the games.
      </div>
    </div>
  );
}
