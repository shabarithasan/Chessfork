"use client";

import { Clipboard, RotateCcw, Share2, Shield, Sparkles, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { siteConfig } from "@/lib/site";

export interface OpeningBossQuest {
  label: string;
  reward: number;
  target: string;
}

export interface OpeningBossProfile {
  bossName: string;
  health: number;
  opening: string;
  playerName: string;
  proof: string;
  quests: OpeningBossQuest[];
  weakness: string;
  weapon: string;
}

async function writeClipboardText(text: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Try the textarea fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function OpeningBossCard({
  challengeHref,
  profile,
  shareHref,
}: {
  challengeHref: string;
  profile: OpeningBossProfile | null;
  shareHref: string;
}) {
  const [health, setHealth] = useState(profile?.health ?? 0);
  const [manualText, setManualText] = useState<string | null>(null);
  const [manualTextVisible, setManualTextVisible] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!profile) {
    return null;
  }

  const boss = profile;
  const defeated = health <= 0;

  function getShareUrl() {
    try {
      return new URL(shareHref, window.location.origin).toString();
    } catch {
      return shareHref;
    }
  }

  function buildShareText(shareUrl: string) {
    return [
      `${siteConfig.name} Opening Boss`,
      `${boss.playerName} drew ${boss.bossName}`,
      `Opening: ${boss.opening}`,
      `Boss HP: ${boss.health}%`,
      `Weakness: ${boss.weakness}`,
      `Weapon: ${boss.weapon}`,
      shareUrl,
    ].join("\n");
  }

  const fallbackShareText = buildShareText(shareHref);

  function strikeBoss(quest: OpeningBossQuest) {
    setHealth((currentHealth) => {
      const nextHealth = Math.max(0, currentHealth - quest.reward);
      setStatus(nextHealth === 0 ? "Boss cleared. Add this to the victory wall." : `${quest.label} hit for ${quest.reward} HP.`);
      return nextHealth;
    });
  }

  async function copyBoss() {
    const shareText = buildShareText(getShareUrl());
    setManualText(shareText);
    const copied = await writeClipboardText(shareText);
    setManualTextVisible(!copied);
    setStatus(copied ? "Boss card copied." : "Boss text ready.");
  }

  async function shareBoss() {
    try {
      const shareUrl = getShareUrl();
      const shareText = buildShareText(shareUrl);
      setManualText(shareText);

      if (navigator.share) {
        await navigator.share({
          text: shareText,
          title: `${siteConfig.name} Opening Boss`,
          url: shareUrl,
        });
        setStatus("Share sheet opened.");
        return;
      }

      const copied = await writeClipboardText(shareText);
      setManualTextVisible(!copied);
      setStatus(copied ? "Boss text copied." : "Boss text ready.");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      setManualText(buildShareText(getShareUrl()));
      setManualTextVisible(true);
      setStatus("Boss text ready.");
    }
  }

  return (
    <section
      id="opening-boss"
      className="rounded-lg border border-fuchsia-400/15 bg-[linear-gradient(118deg,rgba(232,121,249,0.15),transparent_34%),linear-gradient(135deg,rgba(76,29,149,0.48),rgba(15,23,42,0.88)_46%,rgba(2,6,23,0.96))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
              <Shield className="size-3.5" />
              Opening Boss
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-800/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
              {boss.health}% base HP
            </span>
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-400">{boss.opening}</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white">{boss.bossName}</h3>
          <p className="mt-3 text-sm leading-7 text-neutral-300">{boss.proof}</p>

          <div className="mt-5 rounded-[1rem] border border-neutral-800 bg-neutral-800/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Live HP</p>
              <p className="text-lg font-semibold text-white">{health}%</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#f0abfc,#c084fc,#facc15)] transition-[width] duration-300"
                style={{ width: `${health}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-fuchsia-100">{defeated ? "Cleared. This opening owes you a rematch." : boss.weakness}</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950/55 p-4">
          <div className="rounded-[1rem] border border-amber-400/15 bg-amber-400/8 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
              <Swords className="size-4" />
              Best weapon
            </p>
            <p className="mt-2 text-sm leading-7 text-neutral-100">{boss.weapon}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {boss.quests.map((quest) => (
              <button
                key={quest.label}
                type="button"
                onClick={() => strikeBoss(quest)}
                className="rounded-[1rem] border border-neutral-800 bg-neutral-800/30 p-4 text-left transition hover:border-fuchsia-400/35 hover:bg-white/[0.07]"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                  <Trophy className="size-4" />
                  -{quest.reward} HP
                </span>
                <span className="mt-3 block text-sm font-semibold text-white">{quest.label}</span>
                <span className="mt-2 block text-xs leading-6 text-neutral-400">{quest.target}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyBoss}
              className="inline-flex items-center gap-2 rounded-full bg-fuchsia-400 px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] transition hover:bg-fuchsia-500"
            >
              <Clipboard className="size-4" />
              Copy boss
            </button>
            <button
              type="button"
              onClick={shareBoss}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/30 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700/40"
            >
              <Share2 className="size-4" />
              Share
            </button>
            <button
              type="button"
              onClick={() => {
                setHealth(boss.health);
                setStatus("Boss reset.");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/30 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700/40"
            >
              <RotateCcw className="size-4" />
              Reset
            </button>
            <Link
              href={challengeHref}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/30 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700/40"
            >
              <Sparkles className="size-4" />
              Fight puzzle
            </Link>
            {status ? <p className="text-sm text-neutral-200">{status}</p> : null}
          </div>

          {manualTextVisible ? (
            <textarea
              readOnly
              value={manualText ?? fallbackShareText}
              className="mt-4 min-h-36 w-full rounded-[1rem] border border-neutral-800 bg-neutral-950/80 p-4 text-sm leading-6 text-neutral-100 outline-none focus:border-fuchsia-400/60"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
