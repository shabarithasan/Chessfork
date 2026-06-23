"use client";

import { Clipboard, Download, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { siteConfig } from "@/lib/site";
import type { Puzzle } from "@/types/platform";

type ShareFormat = "post" | "story" | "short";

const shareFormats: Record<
  ShareFormat,
  {
    aspectClass: string;
    height: number;
    label: string;
    width: number;
  }
> = {
  post: {
    aspectClass: "aspect-square",
    height: 1080,
    label: "Post",
    width: 1080,
  },
  story: {
    aspectClass: "aspect-[9/16]",
    height: 1920,
    label: "Story",
    width: 1080,
  },
  short: {
    aspectClass: "aspect-[9/16]",
    height: 1920,
    label: "Short",
    width: 1080,
  },
};

const hookOptions = [
  "Find the perfect move before the reveal.",
  "I turned one chess miss into a perfect-move card.",
  "One move turns panic into proof.",
];

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxLength: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 4);
}

function buildCaption(params: {
  hook: string;
  perfectMove: string;
  prompt: string;
  themes: string;
}) {
  return [
    params.hook,
    `Position: ${params.prompt}`,
    `Perfect move: ${params.perfectMove}`,
    `Pattern: ${params.themes}`,
    `Train it on ${siteConfig.name}.`,
  ].join("\n");
}

function buildSvg(params: {
  format: ShareFormat;
  hook: string;
  perfectMove: string;
  prompt: string;
  themes: string;
}) {
  const format = shareFormats[params.format];
  const promptLines = wrapText(params.prompt, params.format === "post" ? 30 : 24);
  const themeLines = wrapText(params.themes, params.format === "post" ? 34 : 25);
  const promptText = promptLines
    .map((line, index) => `<text x="118" y="${430 + index * 58}" fill="#f8fafc" font-family="Arial, sans-serif" font-size="48" font-weight="700">${escapeXml(line)}</text>`)
    .join("");
  const themeText = themeLines
    .map((line, index) => `<text x="86" y="${900 + index * 46}" fill="#fde68a" font-family="Arial, sans-serif" font-size="34" font-weight="700">${escapeXml(line)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${format.width}" height="${format.height}" viewBox="0 0 ${format.width} ${format.height}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#271c13"/>
      <stop offset="0.48" stop-color="#111827"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="14%" r="72%">
      <stop offset="0" stop-color="#f59e0b" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <rect x="54" y="54" width="${format.width - 108}" height="${format.height - 108}" rx="52" fill="#020617" fill-opacity="0.36" stroke="#f59e0b" stroke-opacity="0.28" stroke-width="3"/>
  <text x="86" y="140" fill="#fbbf24" font-family="Arial, sans-serif" font-size="32" font-weight="800" letter-spacing="10">${escapeXml(siteConfig.name.toUpperCase())}</text>
  <text x="86" y="220" fill="#ffffff" font-family="Arial, sans-serif" font-size="72" font-weight="900">Problem to Perfect</text>
  <text x="86" y="296" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="36" font-weight="700">${escapeXml(params.hook)}</text>
  <rect x="86" y="354" width="${format.width - 172}" height="230" rx="36" fill="#0f172a" fill-opacity="0.82" stroke="#ffffff" stroke-opacity="0.12"/>
  <text x="118" y="402" fill="#94a3b8" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="8">POSITION</text>
  ${promptText}
  <rect x="86" y="668" width="${format.width - 172}" height="112" rx="32" fill="#064e3b" fill-opacity="0.72" stroke="#34d399" stroke-opacity="0.26"/>
  <text x="124" y="738" fill="#ecfdf5" font-family="Arial, sans-serif" font-size="42" font-weight="900">Perfect move: ${escapeXml(params.perfectMove)}</text>
  <text x="86" y="862" fill="#94a3b8" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="8">PROOF PATTERN</text>
  ${themeText}
  <text x="86" y="${format.height - 116}" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="30" font-weight="700">Save the miss. Repeat the perfect.</text>
  <text x="${format.width - 86}" y="${format.height - 116}" text-anchor="end" fill="#fbbf24" font-family="Arial, sans-serif" font-size="30" font-weight="900">${escapeXml(siteConfig.name)}</text>
</svg>`;
}

async function writeClipboardText(text: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback for browser contexts without Clipboard API access.
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

export function PerfectShareStudio({
  profileHref = "/u/maya-lopez",
  puzzle,
}: {
  profileHref?: string;
  puzzle: Puzzle;
}) {
  const [format, setFormat] = useState<ShareFormat>("post");
  const [hook, setHook] = useState(hookOptions[0]);
  const [status, setStatus] = useState<string | null>(null);

  const perfectMove = puzzle.solution[0] ?? "the engine move";
  const themes = puzzle.themes.join(" / ");
  const selectedFormat = shareFormats[format];
  const caption = useMemo(
    () =>
      buildCaption({
        hook,
        perfectMove,
        prompt: puzzle.prompt,
        themes,
      }),
    [hook, perfectMove, puzzle.prompt, themes],
  );
  const svg = useMemo(
    () =>
      buildSvg({
        format,
        hook,
        perfectMove,
        prompt: puzzle.prompt,
        themes,
      }),
    [format, hook, perfectMove, puzzle.prompt, themes],
  );
  const previewSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  async function copyCaption() {
    const copied = await writeClipboardText(caption);
    setStatus(copied ? "Caption copied." : "Copy is unavailable in this browser.");
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${siteConfig.shortName.toLowerCase()}-perfect-card.svg`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("SVG card downloaded.");
  }

  async function shareCard() {
    const url = `${window.location.origin}/puzzles`;

    try {
      if (navigator.share) {
        await navigator.share({
          text: caption,
          title: `${siteConfig.name} Perfect card`,
          url,
        });
        setStatus("Share sheet opened.");
        return;
      }

      const copied = await writeClipboardText(`${caption}\n${url}`);
      setStatus(copied ? "Share text copied." : "Copy is unavailable in this browser.");
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        return;
      }

      setStatus("Sharing did not open. Try copying the caption.");
    }
  }

  return (
    <section
      id="share-studio"
      className="mt-12 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.94))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.24)] sm:p-7"
    >
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Share Studio</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white">Make the Perfect travel.</h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Turn the current drill into a creator-ready card, caption, and downloadable SVG for posts, stories, or short-form videos.
          </p>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Format</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(shareFormats) as ShareFormat[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFormat(key);
                    setStatus(null);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    format === key
                      ? "bg-amber-300 text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {shareFormats[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Hook</p>
            <div className="mt-3 grid gap-2">
              {hookOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setHook(option);
                    setStatus(null);
                  }}
                  className={`rounded-[1.1rem] border px-4 py-3 text-left text-sm transition ${
                    hook === option
                      ? "border-amber-300/40 bg-amber-300/12 text-amber-100"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[1.3rem] border border-white/10 bg-slate-950/55 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Caption</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-200">{caption}</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copyCaption}
              className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              <Clipboard className="size-4" />
              Copy caption
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <Download className="size-4" />
              Download SVG
            </button>
            <button
              type="button"
              onClick={shareCard}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <Share2 className="size-4" />
              Share
            </button>
            {status ? <p className="text-sm text-slate-200">{status}</p> : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live preview</p>
              <p className="mt-2 text-sm text-slate-300">
                {selectedFormat.width} x {selectedFormat.height}
              </p>
            </div>
            <Link href={profileHref} className="text-sm font-semibold text-amber-300 transition hover:text-amber-200">
              Public profile
            </Link>
          </div>
          <div className="mt-5 flex justify-center rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
            <Image
              alt={`${siteConfig.name} Problem to Perfect social preview`}
              className={`max-h-[42rem] w-full max-w-[28rem] rounded-[1.2rem] border border-white/10 object-contain shadow-[0_24px_70px_rgba(0,0,0,0.34)] ${selectedFormat.aspectClass}`}
              height={selectedFormat.height}
              loading="lazy"
              unoptimized
              src={previewSrc}
              width={selectedFormat.width}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Problem", value: puzzle.prompt },
              { label: "Perfect", value: perfectMove },
              { label: "Proof", value: themes },
            ].map((item) => (
              <div key={item.label} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-2 break-words text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
