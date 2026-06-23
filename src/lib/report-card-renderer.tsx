import { readFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

import type { ReportCardData } from "@/lib/report-card-data";
import { normalizeReportCardData } from "@/lib/report-card-data";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const geistFontPath = path.join(process.cwd(), "node_modules", "next", "dist", "compiled", "@vercel", "og", "Geist-Regular.ttf");

let geistFontPromise: Promise<ArrayBuffer> | undefined;

function loadGeistFont() {
  geistFontPromise ??= readFile(geistFontPath).then((buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  return geistFontPromise;
}

function accuracyColor(score: number) {
  if (score > 90) {
    return "#22c55e";
  }

  if (score >= 70) {
    return "#f59e0b";
  }

  return "#ef4444";
}

function resultTone(result: string) {
  const lower = result.toLowerCase();

  if (lower.includes("draw")) {
    return { background: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.26)", color: "#cbd5e1" };
  }

  if (lower.includes("black")) {
    return { background: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.32)", color: "#bfdbfe" };
  }

  return { background: "rgba(0,212,170,0.12)", border: "rgba(0,212,170,0.32)", color: "#9fffea" };
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

type StatIconKind = "best" | "blunder" | "brilliant" | "mistake";

function StatIcon({ color, kind }: { color: string; kind: StatIconKind }) {
  if (kind === "brilliant") {
    return (
      <svg height="34" viewBox="0 0 48 48" width="34">
        <polygon
          fill={color}
          points="24 3 30.3 16.5 45 18.7 34.4 29.1 36.9 43.8 24 36.8 11.1 43.8 13.6 29.1 3 18.7 17.7 16.5 24 3"
        />
      </svg>
    );
  }

  if (kind === "best") {
    return (
      <svg height="34" viewBox="0 0 48 48" width="34">
        <path d="M18.5 33.7 8.8 24l-4.3 4.3 14 14L44 16.8l-4.3-4.3Z" fill={color} />
      </svg>
    );
  }

  return (
    <div style={{ color, display: "flex", fontSize: 30, fontWeight: 800 }}>
      {kind === "mistake" ? "?" : "!!"}
    </div>
  );
}

function StatBlock({ color, kind, label, value }: { color: string; kind: StatIconKind; label: string; value: number }) {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        height: 118,
        justifyContent: "center",
        width: 248,
      }}
    >
      <StatIcon color={color} kind={kind} />
      <div style={{ color: "#ffffff", display: "flex", fontSize: 34, fontWeight: 800, marginTop: 4 }}>{value}</div>
      <div style={{ color: "#94a3b8", display: "flex", fontSize: 18, fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PlayerPanel({ accuracy, align, name }: { accuracy: number; align: "left" | "right"; name: string }) {
  return (
    <div
      style={{
        alignItems: align === "left" ? "flex-start" : "flex-end",
        display: "flex",
        flexDirection: "column",
        width: 430,
      }}
    >
      <div
        style={{
          color: "#ffffff",
          display: "flex",
          fontSize: 48,
          fontWeight: 800,
          lineHeight: 1.05,
          maxWidth: 430,
          textAlign: align,
        }}
      >
        {name}
      </div>
      <div
        style={{
          alignItems: "baseline",
          color: accuracyColor(accuracy),
          display: "flex",
          marginTop: 18,
        }}
      >
        <span style={{ fontSize: 76, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1 }}>{accuracy}</span>
        <span style={{ fontSize: 34, fontWeight: 800, marginLeft: 6 }}>%</span>
      </div>
      <div style={{ color: "#64748b", display: "flex", fontSize: 18, fontWeight: 600, marginTop: 4 }}>Accuracy</div>
    </div>
  );
}

function ReportCard({ data }: { data: ReportCardData }) {
  const result = resultTone(data.result);

  return (
    <div
      style={{
        backgroundColor: "#0a0a0f",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Geist",
        height: CARD_HEIGHT,
        overflow: "hidden",
        padding: 56,
        position: "relative",
        width: CARD_WIDTH,
      }}
    >
      <svg
        height={CARD_HEIGHT}
        style={{
          left: -110,
          opacity: 0.05,
          position: "absolute",
          top: -125,
          transform: "rotate(-14deg)",
        }}
        width={CARD_WIDTH + 220}
      >
        <defs>
          <pattern height="96" id="knightowl-board-pattern" patternUnits="userSpaceOnUse" width="96">
            <rect fill="#ffffff" height="48" width="48" x="0" y="0" />
            <rect fill="#ffffff" height="48" width="48" x="48" y="48" />
          </pattern>
        </defs>
        <rect fill="url(#knightowl-board-pattern)" height={CARD_HEIGHT + 250} width={CARD_WIDTH + 220} x="0" y="0" />
      </svg>

      <div
        style={{
          background: "radial-gradient(circle at 18% 12%, rgba(0,212,170,0.18), transparent 34%)",
          display: "flex",
          height: "100%",
          inset: 0,
          position: "absolute",
          width: "100%",
        }}
      />

      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", position: "relative", width: "100%" }}>
        <div style={{ color: "#f7d569", display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: "2px" }}>CHESSFORK</div>
        <div style={{ color: "#94a3b8", display: "flex", fontSize: 21, fontWeight: 500 }}>Powered by Stockfish 18</div>
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flex: 1,
          justifyContent: "space-between",
          marginTop: 38,
          position: "relative",
          width: "100%",
        }}
      >
        <PlayerPanel accuracy={data.whiteAccuracy} align="left" name={data.whitePlayer} />
        <div
          style={{
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999,
            color: "#94a3b8",
            display: "flex",
            fontSize: 22,
            fontWeight: 800,
            height: 70,
            justifyContent: "center",
            width: 70,
          }}
        >
          vs
        </div>
        <PlayerPanel accuracy={data.blackAccuracy} align="right" name={data.blackPlayer} />
      </div>

      <div style={{ display: "flex", gap: 18, justifyContent: "space-between", marginTop: 22, position: "relative", width: "100%" }}>
        <StatBlock color="#00c2ff" kind="brilliant" label="Brilliant" value={data.brilliantMoves} />
        <StatBlock color="#22c55e" kind="best" label="Best moves" value={data.bestMoves} />
        <StatBlock color="#f97316" kind="mistake" label="Mistakes" value={data.mistakes} />
        <StatBlock color="#ef4444" kind="blunder" label="Blunders" value={data.blunders} />
      </div>

      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginTop: 28, position: "relative", width: "100%" }}>
        <div style={{ alignItems: "center", display: "flex", gap: 12, maxWidth: 820 }}>
          <div
            style={{
              backgroundColor: "#1e1e2e",
              border: "1px solid #2a2a4e",
              borderRadius: 999,
              color: "#e2e8f0",
              display: "flex",
              fontSize: 19,
              fontWeight: 600,
              maxWidth: 520,
              padding: "11px 18px",
            }}
          >
            {data.opening}
          </div>
          <div
            style={{
              backgroundColor: result.background,
              border: `1px solid ${result.border}`,
              borderRadius: 999,
              color: result.color,
              display: "flex",
              fontSize: 19,
              fontWeight: 700,
              padding: "11px 18px",
            }}
          >
            {data.result}
          </div>
          <div style={{ color: "#64748b", display: "flex", fontSize: 19, fontWeight: 600 }}>{formatDate(data.date)}</div>
        </div>
        <div style={{ color: "rgba(148,163,184,0.72)", display: "flex", fontSize: 18, fontWeight: 600 }}>chessfork.app</div>
      </div>
    </div>
  );
}

export async function renderReportCardPng(input: ReportCardData) {
  const data = normalizeReportCardData(input);
  const fontData = await loadGeistFont();
  const svg = await satori(<ReportCard data={data} />, {
    fonts: [
      { data: fontData, name: "Geist", style: "normal", weight: 400 },
      { data: fontData, name: "Geist", style: "normal", weight: 500 },
      { data: fontData, name: "Geist", style: "normal", weight: 600 },
      { data: fontData, name: "Geist", style: "normal", weight: 700 },
      { data: fontData, name: "Geist", style: "normal", weight: 800 },
    ],
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
  });

  return new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: CARD_WIDTH,
    },
  }).render().asPng();
}
