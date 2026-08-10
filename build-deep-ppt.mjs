import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pptxgen = require("pptxgenjs");

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import * as Fa from "react-icons/fa";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Chessfork";
pres.title = "Chessfork - Deep Technical Presentation";
pres.subject = "BCA Final Year Project - Technical Deep Dive";

// ─── CONSTANTS ────────────────────────────────────────────────────────────
const W = 13.333;
const H = 7.5;
const M = 0.6;

const BG = "0A0A0B";
const CARD = "151517";
const CARD2 = "1B1B1F";
const BORDER = "2B2B30";
const GOLD = "FFC62B";
const WHITE = "F7F5F1";
const MUTED = "A8A8B0";
const FAINT = "6E6E78";
const GREEN = "4ADE80";
const GRAY = "9CA3AF";
const RED = "EF4444";
const BLUE = "60A5FA";
const CYAN = "22D3EE";
const PURPLE = "A78BFA";

const TF = "Georgia";
const BF = "Segoe UI";
const CF = "Consolas";

// ─── ICON CACHE & HELPERS ─────────────────────────────────────────────────
const iconCache = {};
async function makeIcon(name, color, size = 256) {
  const key = name + "|" + color;
  if (iconCache[key]) return iconCache[key];
  const Comp = Fa[name];
  if (!Comp) throw new Error("Unknown icon " + name);
  const svg = renderToStaticMarkup(React.createElement(Comp, { color, size: String(size) }));
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const data = "image/png;base64," + png.toString("base64");
  iconCache[key] = data;
  return data;
}

async function makeLogo() {
  const buf = await sharp("C:/Projects/Chessfork/public/chessfork-logo.svg").resize(512, 512).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// ─── LAYOUT HELPERS ────────────────────────────────────────────────────────
function bg(s) {
  s.background = { color: BG };
}

function header(s, kicker, title, tsize = 30) {
  s.addText(kicker.toUpperCase(), { x: M, y: 0.3, w: 8.5, h: 0.28, fontFace: BF, fontSize: 10, color: GOLD, bold: true, charSpacing: 4, margin: 0 });
  s.addText(title, { x: M, y: 0.6, w: 12.13, h: 0.72, fontFace: TF, fontSize: tsize, bold: true, color: WHITE, margin: 0 });
}

function footer(s, n) {
  s.addText("Chessfork  |  Deep Technical Presentation", { x: M, y: 7.06, w: 7, h: 0.26, fontFace: BF, fontSize: 8.5, color: FAINT, margin: 0 });
  s.addText(String(n).padStart(2, "0"), { x: 12.33, y: 7.06, w: 0.5, h: 0.26, fontFace: BF, fontSize: 8.5, color: FAINT, align: "right", margin: 0 });
}

function cornerMotif(s) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: W - 0.9 + c * 0.16, y: 0.32 + r * 0.16, w: 0.16, h: 0.16,
        fill: { color: (r + c) % 2 === 0 ? "1D1D21" : "101014" },
        line: { type: "none" },
      });
    }
  }
  s.addShape(pres.shapes.RECTANGLE, { x: W - 0.9, y: 0.32, w: 0.16, h: 0.16, fill: { color: GOLD }, line: { type: "none" } });
}

function card(s, x, y, w, h, fill = CARD, border = BORDER) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.07, fill: { color: fill }, line: { color: border, width: 0.75 } });
}

function chip(s, x, y, w, h, text, opts = {}) {
  const col = opts.color || GOLD;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.5, fill: { color: "1B1B1F" }, line: { color: col, width: 1 } });
  s.addText(text, { x, y, w, h, fontFace: BF, fontSize: opts.size || 10.5, color: col, bold: true, align: "center", valign: "middle", margin: 0 });
}

function blist(s, x, y, w, h, items, opts = {}) {
  const runs = items.map((it, i) => {
    const isObj = typeof it === "object";
    const o = {
      bullet: { code: "2022", indent: 14 },
      breakLine: i < items.length - 1,
      fontFace: opts.fontFace || BF,
      fontSize: opts.size || 13,
      color: isObj && it.color ? it.color : opts.color || WHITE,
      paraSpaceAfter: opts.space || 7,
      valign: "top",
    };
    if (isObj && it.bold) o.bold = true;
    return { text: isObj ? it.text : it, options: o };
  });
  s.addText(runs, { x, y, w, h, valign: "top", margin: 0, fit: "shrink" });
}

function addNotes(s, script, questions, answers) {
  let n = "SPEAKER SCRIPT (60 s):\n" + script + "\n\nEXPECTED EXAMINER QUESTIONS:\n";
  n += questions.map((q) => "- " + q).join("\n");
  n += "\n\nSUGGESTED ANSWERS:\n";
  n += answers.map((a) => "- " + a).join("\n");
  s.addNotes(n);
}

function table(s, rows, opts = {}) {
  const colW = opts.colW;
  const data = rows.map((row, r) =>
    row.map((cell, c) => {
      if (cell && typeof cell === "object" && cell.t) {
        return { text: cell.t, options: cell.o || {} };
      }
      const head = r === 0;
      return {
        text: String(cell),
        options: {
          fill: { color: head ? GOLD : r % 2 === 0 ? "161618" : "1C1C20" },
          color: head ? "0A0A0B" : c === 0 && opts.firstColBold ? WHITE : "E8E8EC",
          bold: head || (c === 0 && (opts.firstColBold || false)),
          fontFace: BF,
          fontSize: opts.size || 11.5,
          align: head ? "left" : opts.align ? (typeof opts.align === "function" ? opts.align(c) : opts.align) : "left",
          valign: "middle",
          margin: 3,
        },
      };
    })
  );
  s.addTable(data, {
    x: opts.x || M,
    y: opts.y,
    w: opts.w || 12.13,
    colW,
    rowH: opts.rowH || 0.36,
    border: { pt: 0.5, color: "26262B" },
    autoPage: false,
    valign: "middle",
  });
}

function iconRow(s, icon, x, y, size, tint = GOLD) {
  s.addImage({ data: icon, x, y, w: size, h: size });
}

function codeBlock(s, x, y, w, h, code, opts = {}) {
  card(s, x, y, w, h, "0D0D10", "26262B");
  s.addText(code, { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: h - 0.16, fontFace: CF, fontSize: opts.size || 9.5, color: opts.color || CYAN, margin: 0, valign: "top", fit: "shrink" });
}

function arrowRight(s, I, x, y) {
  iconRow(s, I["FaArrowRight"].muted, x, y, 0.26);
}

function sectionDivider(s, x, y, w) {
  s.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color: "26262B", width: 0.5 } });
}

// ─── BUILD ─────────────────────────────────────────────────────────────────
(async () => {
  const need = [
    "FaChessKnight", "FaRobot", "FaChartLine", "FaChartBar", "FaBullseye", "FaCode", "FaDatabase", "FaLock",
    "FaGlobeAsia", "FaChessBoard", "FaChessRook", "FaPuzzlePiece", "FaBookOpen", "FaLayerGroup", "FaSave",
    "FaLightbulb", "FaGraduationCap", "FaTrophy", "FaMobileAlt", "FaCloud", "FaMicrophone", "FaSitemap",
    "FaServer", "FaNetworkWired", "FaTerminal", "FaShieldAlt", "FaExclamationTriangle", "FaInfinity",
    "FaArrowRight", "FaPlayCircle", "FaFileAlt", "FaWrench", "FaListUl", "FaClock", "FaRedo", "FaExchangeAlt",
    "FaDumbbell", "FaCheckCircle", "FaUserCircle", "FaUsers", "FaStar", "FaBolt", "FaQuoteRight", "FaBrain",
    "FaPlay", "FaColumns", "FaSync", "FaUserGraduate", "FaChessQueen", "FaSearch", "FaCommentDots",
    "FaPaintBrush", "FaShareAlt", "FaCogs", "FaStream", "FaProjectDiagram", "FaCog", "FaHandPointer",
    "FaChartArea", "FaKey", "FaMemory", "FaMagic", "FaArrowDown", "FaArrowUp", "FaEquals",
    "FaFilter", "FaStopwatch", "FaTachometerAlt", "FaHdd",
  ];
  const entries = await Promise.all(
    need.map(async (n) => {
      const gold = await makeIcon(n, "#FFC62B");
      const muted = await makeIcon(n, "#A8A8B0");
      const green = await makeIcon(n, "#4ADE80");
      const white = await makeIcon(n, "#F7F5F1");
      const cyan = await makeIcon(n, "#22D3EE");
      const red = await makeIcon(n, "#EF4444");
      const blue = await makeIcon(n, "#60A5FA");
      const purple = await makeIcon(n, "#A78BFA");
      return [n, { gold, muted, green, white, cyan, red, blue, purple }];
    })
  );
  const I = Object.fromEntries(entries);
  const logo = await makeLogo();

  let deckIndex = 0;
  const n = () => { deckIndex += 1; return deckIndex; };
  const S = () => {
    const idx = n();
    const s = pres.addSlide();
    bg(s);
    footer(s, idx);
    return s;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 1: TITLE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    bg(s);
    for (let i = 0; i < 10; i++) {
      s.addShape(pres.shapes.RECTANGLE, { x: i * (W / 10), y: H - 0.34, w: W / 10, h: 0.34, fill: { color: i % 2 === 0 ? "1C1C20" : "131316" }, line: { type: "none" } });
    }
    s.addShape(pres.shapes.RECTANGLE, { x: W / 2 - 2.2, y: H - 0.34, w: 4.4, h: 0.34, fill: { color: GOLD }, line: { type: "none" } });
    s.addImage({ data: logo, x: (W - 1.55) / 2, y: 0.5, w: 1.55, h: 1.55 });
    s.addText("DEEP TECHNICAL PRESENTATION", { x: 0, y: 2.2, w: W, h: 0.3, fontFace: BF, fontSize: 11, color: GOLD, align: "center", bold: true, charSpacing: 7 });
    s.addText("Chessfork", { x: 0, y: 2.56, w: W, h: 1.05, fontFace: TF, fontSize: 56, bold: true, color: WHITE, align: "center" });
    s.addText("AI-Powered Chess Analysis & Coaching Platform", { x: 0, y: 3.58, w: W, h: 0.44, fontFace: BF, fontSize: 17, color: MUTED, align: "center" });
    s.addShape(pres.shapes.LINE, { x: W / 2 - 1.4, y: 4.22, w: 2.8, h: 0, line: { color: GOLD, width: 1.4 } });
    const info = [
      { text: "BCA Final Year Project  |  2025-26", options: { breakLine: true, fontSize: 12.5, color: FAINT } },
      { text: "[Your Full Name]    [Register Number]", options: { breakLine: true, bold: true, color: WHITE, fontSize: 13.5 } },
      { text: "Department of Computer Applications (BCA)", options: { breakLine: true, color: MUTED, fontSize: 12.5 } },
      { text: "[College Name], [City]", options: { breakLine: true, color: MUTED, fontSize: 12.5 } },
      { text: "Project Guide: [Guide Name]", options: { color: MUTED, fontSize: 12.5 } },
    ];
    s.addText(info, { x: 0, y: 4.5, w: W, h: 1.8, align: "center", margin: 0, lineSpacing: 1.15 });
    addNotes(s,
      "Good morning everyone. Today I will present the deep technical internals of Chessfork, my BCA final-year project. This is not the overview deck - this is the how-it-works presentation. I will walk through the exact algorithms, formulas, architecture decisions, and engineering trade-offs behind every major feature. We will cover the analysis pipeline step by step, the CAPS v2 accuracy formula, how Stockfish runs in the browser via WebAssembly, the move classification decision tree, Brilliant move detection logic, the AI coaching pipeline with prompt engineering and Zod validation, database design, security implementation, and performance optimizations. Every claim maps to running code in the repository.",
      ["What makes this different from your overview presentation?", "How technical will this get?", "Is all of this implemented?"],
      ["The overview deck shows what the product does. This deck shows how it works - the actual formulas, algorithms, data flows, and engineering decisions behind each feature.",
        "Very technical: you will see the sigmoid function for win probability, pseudocode for Brilliant move detection, the exact cp-loss thresholds for each grade, WebAssembly loading mechanics, and prompt engineering patterns.",
        "Yes. Every formula, algorithm, and architecture described here is implemented in the repository. I will point to specific files and functions throughout."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 2: THE PROBLEM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Motivation", "Why Raw Engine Scores Fail Beginners");
    cornerMotif(s);

    card(s, M, 1.5, 5.95, 2.5);
    s.addText("The core problem", { x: M + 0.3, y: 1.7, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: GOLD, margin: 0 });
    blist(s, M + 0.3, 2.12, 5.35, 1.8, [
      { text: "Stockfish says +1.3 → player has no idea what to do", bold: true },
      "Evaluation bars show advantage but not why or how",
      "Engine lines are 15-move computer variations nobody can follow",
      "No free tool explains: 'Your knight retreat lost because it gave up the d5 outpost'",
    ], { size: 11, space: 5 });

    card(s, 6.75, 1.5, 5.98, 2.5);
    s.addText("The gap in free tools", { x: 7.05, y: 1.7, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: GOLD, margin: 0 });
    const gapRows = [
      ["Platform", "Free Analysis", "Explains Why?", "AI Coach?"],
      ["Chess.com", "Depth 10 only", "No", "Paid"],
      ["Lichess", "Full depth", "No", "No"],
      ["Chessigma", "Limited", "Paid", "No"],
      ["Chessfork", "Full depth", "Yes (LLM)", "Yes (LLM)"],
    ];
    table(s, gapRows, { x: 7.05, y: 2.1, w: 5.48, colW: [1.35, 1.45, 1.3, 1.38], rowH: 0.35, size: 9.5 });

    card(s, M, 4.2, 12.13, 2.5);
    s.addText("What beginners actually need vs. what engines give", { x: M + 0.3, y: 4.4, w: 11, h: 0.34, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0 });
    const needs = [
      ["FaChartBar", "Raw cp score", "Engine outputs +1.3 centipawns", "Meaningless number to a 1200-rated player"],
      ["FaStar", "Grade label", "Move classified as 'Mistake'", "Immediately understood: this was bad"],
      ["FaCommentDots", "Explanation", "'Knight retreat lost the d5 outpost'", "Player learns the concept, not just the verdict"],
      ["FaRobot", "Coaching", "'Practice knight outpost exercises'", "Actionable improvement path from their own games"],
    ];
    let ny = 4.82;
    needs.forEach(([icn, label, engine, human]) => {
      iconRow(s, I[icn].gold, M + 0.3, ny + 0.02, 0.28);
      s.addText(label, { x: M + 0.7, y: ny, w: 1.5, h: 0.32, fontFace: BF, fontSize: 10, bold: true, color: GOLD, margin: 0, valign: "middle" });
      s.addText(engine, { x: 2.8, y: ny, w: 4.2, h: 0.32, fontFace: BF, fontSize: 10, color: MUTED, margin: 0, valign: "middle" });
      s.addText("→", { x: 7.0, y: ny, w: 0.4, h: 0.32, fontFace: BF, fontSize: 12, color: GOLD, margin: 0, valign: "middle", align: "center" });
      s.addText(human, { x: 7.4, y: ny, w: 5.0, h: 0.32, fontFace: BF, fontSize: 10, color: WHITE, margin: 0, valign: "middle" });
      ny += 0.42;
    });

    addNotes(s,
      "The problem is not that engines are bad - they are superhuman. The problem is that their output is designed for other engines, not for humans. A raw centipawn score like +1.3 tells a grandmaster something, but a 1200-rated player cannot interpret it. Evaluation bars show who is winning but not what to do about it. Engine lines are 15-move computer variations that no amateur can follow. And no free platform converts these numbers into plain-language explanations or a personalized practice plan. The comparison table shows the gap: Chess.com limits free analysis depth, Lichess gives full depth but no explanations, Chessigma explains but behind a paywall. Chessfork fills all four columns for free.",
      ["Isn't Lichess good enough since it's free?", "Why can't beginners just learn to read engine scores?", "What specific educational theory backs your approach?"],
      ["Lichess gives excellent raw analysis, but it stops at the number. A beginner sees -2.0 and knows they are losing, but not why or what to practice. Chessfork adds the explanation and coaching layers on top of the same engine quality.",
        "Even titled players often misinterpret engine scores in complex positions. The issue is that centipawns are context-dependent - losing 50cp in a dead-drawn endgame is irrelevant, but losing 50cp in a sharp middlegame is critical. Our win-probability conversion solves this.",
        "The grade ladder follows Bloom's taxonomy: from recall (seeing the grade) to understanding (reading the explanation) to application (following the coach's drill). Each layer adds cognitive depth."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 3: SYSTEM ARCHITECTURE OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Architecture", "System Architecture Overview", 28);
    cornerMotif(s);

    const box = (x, y, w, h, fill, border) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: border, width: 1 } });
    const label = (x, y, w, h, t, sub, subC) => {
      s.addText(t, { x, y: y + 0.06, w, h: 0.28, fontFace: BF, fontSize: 11.5, bold: true, color: WHITE, align: "center", margin: 0, fit: "shrink" });
      if (sub) s.addText(sub, { x, y: y + 0.34, w, h: 0.28, fontFace: BF, fontSize: 7.5, color: subC || MUTED, align: "center", margin: 0, fit: "shrink" });
    };
    const down = (x, y) => iconRow(s, I["FaArrowDown"].muted, x, y, 0.22);

    // Layer 1: Browser
    box(M, 1.48, 12.13, 0.68, "161619", "3A3A42");
    iconRow(s, I["FaGlobeAsia"].gold, M + 0.15, 1.58, 0.3);
    label(M, 1.48, 12.13, 0.68, "Browser Layer", "React 19 + Tailwind v4  |  react-chessboard  |  WASM Stockfish Worker  |  IndexedDB Cache  |  SSE Client");
    down(W / 2 - 0.11, 2.22);

    // Layer 2: Next.js
    box(M, 2.48, 12.13, 0.68, "161619", "3A3A42");
    iconRow(s, I["FaServer"].gold, M + 0.15, 2.58, 0.3);
    label(M, 2.48, 12.13, 0.68, "Next.js 16 App Router", "40+ pages  |  25 API routes (REST + SSE)  |  Server Actions  |  Middleware (rate limit, auth)");
    down(W / 2 - 0.11, 3.22);

    // Layer 3: Platform Service
    box(M, 3.48, 12.13, 0.68, "161619", "3A3A42");
    iconRow(s, I["FaCogs"].gold, M + 0.15, 3.58, 0.3);
    label(M, 3.48, 12.13, 0.68, "Platform Service Layer", "Import orchestration  |  Analysis pipeline  |  Report generation  |  Rate limiting  |  Caching");
    down(W / 2 - 0.11, 4.22);

    // Layer 4: Three pillars
    const colW = 3.96;
    const pillars = [
      ["FaChessRook", "Analysis Engine", "Stockfish 18 native (depth 24)\nWASM build (browser)\nTS fallback (alpha-beta + neural eval)\nPolyglot book + Syzygy TB", GOLD],
      ["FaBrain", "AI / LLM Layer", "Groq Llama 3.3 70B\nDeepSeek via OpenRouter\nZod-validated structured output\nPrompt templates per feature", GOLD],
      ["FaDatabase", "Data Layer", "PostgreSQL 16 + Drizzle ORM\nRedis 7 + BullMQ queue\nIndexedDB client cache\nDriver pattern: memory/hybrid/db", GOLD],
    ];
    pillars.forEach(([icn, t, d, c], i) => {
      const x = M + i * (colW + 0.12);
      box(x, 4.48, colW, 1.72, "18181C", "3A3A42");
      iconRow(s, I[icn].gold, x + colW / 2 - 0.18, 4.58, 0.34);
      s.addText(t, { x, y: 4.96, w: colW, h: 0.26, fontFace: BF, fontSize: 11, bold: true, color: WHITE, align: "center", margin: 0 });
      s.addText(d, { x: x + 0.15, y: 5.24, w: colW - 0.3, h: 0.9, fontFace: BF, fontSize: 7.5, color: MUTED, align: "center", margin: 0, fit: "shrink" });
    });

    // Output layer
    box(M, 6.4, 12.13, 0.52, "1F1F24", "4A4A54");
    s.addText("Outputs:  Game Review Report  |  AI Coach Snapshot  |  Move Explanations  |  Puzzle Training  |  Shareable Report Cards", {
      x: M, y: 6.4, w: 12.13, h: 0.52, fontFace: BF, fontSize: 10.5, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, fit: "shrink",
    });

    addNotes(s,
      "This is the full system architecture from top to bottom. The browser layer runs React 19 with a WASM Stockfish worker for instant live analysis, IndexedDB for client-side caching, and an SSE client for streaming analysis progress. Below that, Next.js 16 with the App Router serves 40+ pages and 25 API routes. The platform service layer orchestrates imports, analysis, report generation, rate limiting, and caching. Then three parallel pillars: the Analysis Engine with Stockfish 18 native binary, WASM build, and a TypeScript fallback engine; the AI/LLM layer with Groq and DeepSeek and Zod validation; and the Data layer with PostgreSQL, Redis/BullMQ, IndexedDB, and a driver pattern supporting memory, hybrid, and database modes. All outputs flow from this architecture.",
      ["Why is the architecture layered like this?", "What is the driver pattern?", "How do the three pillars communicate?"],
      ["Layering separates concerns: the browser handles UI and instant analysis, Next.js handles routing and API, the service layer handles business logic, and the pillars handle specialized concerns. Any pillar can be swapped independently.",
        "The repository layer has three backends - memory Maps for development, PostgreSQL for production, and a hybrid that gracefully falls back. The app works identically in all modes; only persistence changes.",
        "Through the platform service layer. For example, the analysis pipeline calls the engine for scores, then calls the data layer to persist, and optionally calls the AI layer for explanations. The pillars never call each other directly."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 4: TECHNOLOGY STACK & JUSTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Stack Decisions", "Technology Stack & Justification", 27);
    cornerMotif(s);

    const rows = [
      ["Category", "Technology", "WHY We Chose It"],
      ["Framework", "Next.js 16 (App Router)", "SSR for SEO pages (openings), API routes in same repo, Vercel deploy path"],
      ["Language", "TypeScript 5 (strict)", "Shared types across API boundary; schema change breaks build, not runtime"],
      ["Chess Logic", "chess.js 1.4", "Battle-tested PGN/FEN parser; legal move generation; no reinventing rules"],
      ["Engine", "Stockfish 18 (native + WASM)", "Strongest open-source engine; WASM enables browser-side analysis without server load"],
      ["AI / LLM", "Groq (Llama 3.3 70B)", "Fastest inference API (~200ms TTFT); 70B model for coaching quality"],
      ["AI Fallback", "DeepSeek via OpenRouter", "Provider redundancy; different model for diversity; OpenRouter abstracts billing"],
      ["Database", "PostgreSQL 16 + Drizzle", "Relational for 12-table schema; JSONB for flexible reports; Drizzle = type-safe ORM"],
      ["Queue", "BullMQ + Redis 7", "Deep-analysis jobs need background processing; Redis = fast, reliable broker"],
      ["Client Cache", "IndexedDB", "7-day TTL; survives refresh; 50MB+ capacity; no server round-trip for repeat visits"],
      ["Auth", "Custom (scrypt + HMAC)", "Full control over guest merge, OAuth PKCE, session semantics; ~600 lines total"],
      ["Validation", "Zod 4", "Runtime type checking for LLM outputs + API inputs; catches hallucinated JSON shapes"],
    ];
    table(s, rows, { x: M, y: 1.46, w: 12.13, colW: [1.6, 3.53, 7.0], rowH: 0.42, size: 9.5 });

    s.addText("Every technology was chosen for a specific engineering reason — not because it was trending.", {
      x: M, y: 6.62, w: 12.13, h: 0.3, fontFace: BF, fontSize: 11, italic: true, color: MUTED, align: "center", margin: 0,
    });

    addNotes(s,
      "This table justifies every major technology choice. Next.js gives us SSR for SEO-critical opening guide pages, API routes in the same codebase, and a clear Vercel deployment path. TypeScript's strict mode means the same type definitions are shared between server responses and client components - a schema change breaks at compile time, not in production. chess.js handles the complex rules of chess so we don't reinvent them. Stockfish 18 is the strongest open-source engine, and the WASM build means we can run it in the browser without loading our server. Groq was chosen for speed - about 200ms time-to-first-token - and the 70B model gives coaching-quality output. PostgreSQL handles our relational schema while JSONB stores flexible report payloads. Custom auth gives us exact control over guest-to-account merging and OAuth PKCE. Zod validates both API inputs and LLM outputs at runtime.",
      ["Why not use NextAuth for authentication?", "Why Groq over OpenAI?", "Why not use Prisma instead of Drizzle?"],
      ["NextAuth doesn't support our guest-session-to-account merge flow, and writing custom auth in about 600 lines gave me full control plus a deep understanding of HMAC, scrypt, and PKCE for the viva.",
        "Three reasons: speed (200ms TTFT vs 800ms+), cost (free tier is generous), and the 70B open model means no vendor lock-in. We also have DeepSeek as a fallback provider.",
        "Drizzle generates SQL that maps 1:1 to what executes, uses the TypeScript schema as the single source of truth, and has lighter runtime overhead. Prisma's query engine is heavier than we need."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 5: ANALYSIS PIPELINE (STEPS 1-3)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Pipeline Deep Dive", "Analysis Pipeline: Steps 1–3", 27);
    cornerMotif(s);

    // Step 1
    card(s, M, 1.5, 3.9, 5.15);
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: 1.5, w: 3.9, h: 0.06, fill: { color: GOLD }, line: { type: "none" } });
    iconRow(s, I["FaExchangeAlt"].gold, M + 0.25, 1.72, 0.4);
    s.addText("Step 1: PGN Import", { x: M + 0.25, y: 2.18, w: 3.4, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 2.58, 3.4, 1.8, [
      "Parse PGN with chess.js (handles variants, comments, NAGs)",
      "Extract headers: players, event, date, ECO, result",
      "Validate move legality via replay",
      "Hash PGN for deduplication (skip if already analyzed)",
      "Store in imported_pgns table with audit trail",
    ], { size: 9.5, space: 4 });
    codeBlock(s, M + 0.15, 4.5, 3.6, 1.5,
      "// Import flow\nconst game = new Chess();\ngame.loadPgn(rawPgn);\nconst moves = game.history({ verbose: true });\nconst hash = sha256(rawPgn);\n// Check cache → skip if exists\nawait db.importedPgns.insert({\n  pgn: rawPgn, hash, headers\n});", { size: 8 });
    chip(s, M + 0.8, 6.15, 2.3, 0.3, "3 import sources", { size: 9 });

    // Step 2
    card(s, 4.7, 1.5, 3.9, 5.15);
    s.addShape(pres.shapes.RECTANGLE, { x: 4.7, y: 1.5, w: 3.9, h: 0.06, fill: { color: GOLD }, line: { type: "none" } });
    iconRow(s, I["FaChessBoard"].gold, 4.95, 1.72, 0.4);
    s.addText("Step 2: Position Replay", { x: 4.95, y: 2.18, w: 3.4, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, 4.95, 2.58, 3.4, 1.8, [
      "Replay game move-by-move from start position",
      "At each ply: extract FEN (before-move position)",
      "Make the move → extract FEN (after-move position)",
      "Both FENs are needed for cp-loss calculation",
      "Track move number, side to move, move in SAN",
    ], { size: 9.5, space: 4 });
    codeBlock(s, 4.85, 4.5, 3.6, 1.5,
      "// Position extraction\nfor (const move of moves) {\n  const fenBefore = game.fen();\n  game.move(move.san);\n  const fenAfter = game.fen();\n  positions.push({\n    ply, fenBefore, fenAfter,\n    move: move.san,\n    side: ply % 2 === 0 ? 'w' : 'b'\n  });\n  ply++;\n}", { size: 8 });
    chip(s, 5.5, 6.15, 2.3, 0.3, "2 FENs per move", { size: 9 });

    // Step 3
    card(s, 8.8, 1.5, 3.93, 5.15);
    s.addShape(pres.shapes.RECTANGLE, { x: 8.8, y: 1.5, w: 3.93, h: 0.06, fill: { color: GOLD }, line: { type: "none" } });
    iconRow(s, I["FaChessRook"].gold, 9.05, 1.72, 0.4);
    s.addText("Step 3: Engine Search", { x: 9.05, y: 2.18, w: 3.4, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, 9.05, 2.58, 3.4, 1.8, [
      "Send FEN-before to Stockfish: 'go depth 18'",
      "Parse UCI output for bestmove + score",
      "MultiPV 3: get top 3 moves with evaluations",
      { text: "Quick mode: depth 18, movetime 350ms", color: CYAN },
      { text: "Deep mode: depth 24, movetime 3000ms", color: GOLD },
    ], { size: 9.5, space: 4 });
    codeBlock(s, 8.95, 4.5, 3.63, 1.5,
      "// UCI protocol\nengine.send('position fen ' + fen);\nengine.send('setoption name MultiPV value 3');\nengine.send('go depth 18 movetime 350');\n// Parse: info depth 18 score cp 45\n//        bestmove e2e4 ponder d7d5\n// Normalize: score from White's POV\n// mate scores → ±30000 cp", { size: 8 });
    chip(s, 9.5, 6.15, 2.8, 0.3, "2 searches × N moves", { size: 9 });

    addNotes(s,
      "The analysis pipeline has six steps; this slide covers the first three. Step 1 is PGN import: we parse the PGN with chess.js, which handles move validation, comments, and notation. We extract game headers, hash the PGN for deduplication so we never re-analyze the same game, and persist it. Step 2 is position replay: we replay the game move by move, extracting two FEN strings per ply - the position before the move and after the move. Both are essential because cp-loss is the difference between the engine's evaluation of these two positions. Step 3 is the engine search: for each position, we send the FEN to Stockfish via the UCI protocol, requesting MultiPV 3 at either depth 18 with 350ms per move in quick mode, or depth 24 with 3 seconds in deep mode. The engine returns the best move and its centipawn score, which we normalize to White's perspective. Mate scores are converted to ±30000 cp for consistent math downstream.",
      ["Why two FENs per move instead of one?", "What is MultiPV 3?", "Why normalize to White's perspective?"],
      ["We need the best available score BEFORE the move was played (what could have happened) and the score AFTER the move was played (what did happen). The gap between them is the actual cost of the move - that is cp-loss.",
        "MultiPV 3 means the engine reports not just the single best move, but the top 3 moves with their scores. This lets us show alternative moves in the review and is required for Brilliant move detection, which checks whether ALL alternatives lose significantly.",
        "Stockfish reports scores from the side-to-move's perspective. If we don't normalize, a +50 score for Black looks the same as +50 for White but means the opposite. Normalizing to White makes all downstream comparisons consistent."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 6: ANALYSIS PIPELINE (STEPS 4-6)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Pipeline Deep Dive", "Analysis Pipeline: Steps 4–6", 27);
    cornerMotif(s);

    // Step 4
    card(s, M, 1.5, 3.9, 5.15);
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: 1.5, w: 3.9, h: 0.06, fill: { color: GREEN }, line: { type: "none" } });
    iconRow(s, I["FaStar"].gold, M + 0.25, 1.72, 0.4);
    s.addText("Step 4: Classification", { x: M + 0.25, y: 2.18, w: 3.4, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 2.58, 3.4, 1.6, [
      "Compute cpLoss = bestScore - moveScore",
      "Convert cp to win probability (sigmoid)",
      "Compute winProbDelta = WP(before) - WP(after)",
      "Check opening book → grade as 'Book'",
      "Run Brilliant/Great detection logic",
      "Apply cp-loss thresholds → 9 grades",
    ], { size: 9.5, space: 3.5 });
    codeBlock(s, M + 0.15, 4.35, 3.6, 1.7,
      "// Classification core\nconst cpLoss = bestScore - moveScore;\nconst wpBefore = winProb(bestScore);\nconst wpAfter = winProb(moveScore);\nconst wpDelta = wpBefore - wpAfter;\n\nif (isBookMove(fen, move)) return 'Book';\nif (isBrilliant(move, lines)) return '!!';\nif (cpLoss <= 5) return 'Best';\nif (cpLoss <= 15) return 'Excellent';\n// ... thresholds continue", { size: 8 });
    chip(s, M + 0.6, 6.2, 2.7, 0.3, "9 grade categories", { size: 9 });

    // Step 5
    card(s, 4.7, 1.5, 3.9, 5.15);
    s.addShape(pres.shapes.RECTANGLE, { x: 4.7, y: 1.5, w: 3.9, h: 0.06, fill: { color: GREEN }, line: { type: "none" } });
    iconRow(s, I["FaChartLine"].gold, 4.95, 1.72, 0.4);
    s.addText("Step 5: Report Generation", { x: 4.95, y: 2.18, w: 3.4, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, 4.95, 2.58, 3.4, 1.6, [
      "Compute CAPS accuracy per side",
      "Identify critical moments (biggest WP swings)",
      "Build win-probability chart data array",
      "Count grade distribution (N blunders, mistakes…)",
      "Generate game narrative / story text",
      "Estimate player rating from accuracy",
    ], { size: 9.5, space: 3.5 });
    codeBlock(s, 4.85, 4.35, 3.6, 1.7,
      "// Report assembly\nconst report = {\n  accuracy: { white: capsAvg(w), black: capsAvg(b) },\n  criticalMoments: findSwings(evals, threshold: 15),\n  chartData: evals.map(e => ({\n    ply: e.ply,\n    wp: winProb(e.score),\n    grade: e.grade\n  })),\n  gradeCounts: countBy(evals, 'grade'),\n  rating: { w: 900 + acc_w * 12, b: 900 + acc_b * 12 }\n};", { size: 8 });
    chip(s, 5.3, 6.2, 2.7, 0.3, "Full report object", { size: 9 });

    // Step 6
    card(s, 8.8, 1.5, 3.93, 5.15);
    s.addShape(pres.shapes.RECTANGLE, { x: 8.8, y: 1.5, w: 3.93, h: 0.06, fill: { color: GREEN }, line: { type: "none" } });
    iconRow(s, I["FaSave"].gold, 9.05, 1.72, 0.4);
    s.addText("Step 6: Persistence", { x: 9.05, y: 2.18, w: 3.4, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, 9.05, 2.58, 3.4, 1.6, [
      "Save AnalysisRun to PostgreSQL (JSONB report)",
      "Save per-move evaluations as move_evaluations rows",
      "Stream progress via SSE (event per analyzed move)",
      "Deep mode: enqueue BullMQ refinement job",
      "Cache report in-memory (PGN hash → report)",
      "Client receives + caches in IndexedDB (7-day TTL)",
    ], { size: 9.5, space: 3.5 });
    codeBlock(s, 8.95, 4.35, 3.63, 1.7,
      "// Persistence flow\nawait db.analysisRuns.insert({\n  id: uuid(), userId, pgnHash,\n  report: reportJsonb, // JSONB column\n  mode: 'quick', depth: 18\n});\nfor (const ev of evals) {\n  await db.moveEvals.insert(ev);\n}\n// SSE: res.write('event: complete\\n');\n// Deep mode → bullmq.add('refine', { id });", { size: 8 });
    chip(s, 9.45, 6.2, 2.8, 0.3, "3-level caching", { size: 9 });

    addNotes(s,
      "Steps 4 through 6 complete the pipeline. Step 4 is classification: for each move we compute cp-loss (best score minus the played move's score), convert that to win probability using the sigmoid function, compute the win-probability delta, and then apply the decision tree - checking the opening book first, then Brilliant/Great detection, then cp-loss thresholds to assign one of 9 grades. Step 5 is report generation: we average CAPS scores per side for accuracy, find critical moments as the biggest win-probability swings, build the chart data array, count grade distributions, generate the narrative, and estimate ratings. Step 6 is persistence: the full report is stored as a JSONB payload in the analysis_runs table, individual move evaluations go into move_evaluations rows for querying, progress streams over SSE, deep mode enqueues a BullMQ refinement job, and the report is cached at three levels - server memory, database, and client IndexedDB.",
      ["Why JSONB for the report instead of normalized columns?", "How does SSE streaming work technically?", "What does the BullMQ refinement job do?"],
      ["The report contains nested, variable-shape data - chart arrays, critical moments, narrative text, grade distributions - that would require dozens of columns with frequent schema changes. JSONB stores the whole payload flexibly while move_evaluations stays relational for querying and aggregation.",
        "The API route opens a long-lived HTTP connection with Content-Type: text/event-stream. As each move is analyzed, we write an SSE event with the move number, grade, and score. The client's EventSource listener updates the UI in real-time - no polling.",
        "In deep mode, the initial analysis runs at depth 18 for speed. The BullMQ job re-analyzes at depth 24 in the background. When complete, it updates the analysis_run record and notifies the client on their next visit."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 7: HOW STOCKFISH RUNS IN THE BROWSER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "WebAssembly", "How Stockfish Runs in the Browser", 27);
    cornerMotif(s);

    // Left: WASM compilation
    card(s, M, 1.5, 5.95, 2.55);
    iconRow(s, I["FaCode"].gold, M + 0.25, 1.7, 0.4);
    s.addText("WebAssembly Compilation", { x: M + 0.75, y: 1.72, w: 4.9, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 2.14, 5.45, 1.8, [
      "Stockfish C++ source → Emscripten → .wasm + .js glue",
      "WASM binary is ~2MB compressed, loaded once and cached",
      "Runs at near-native speed (70-80% of native performance)",
      "No plugins, no installation — just a browser tab",
      "The .wasm file is served from /public/stockfish/ via hash URL trick",
    ], { size: 10.5, space: 4 });

    // Right: Web Worker isolation
    card(s, 6.75, 1.5, 5.98, 2.55);
    iconRow(s, I["FaNetworkWired"].gold, 6.95, 1.7, 0.4);
    s.addText("Web Worker Isolation", { x: 7.35, y: 1.72, w: 5.1, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, 6.95, 2.14, 5.55, 1.8, [
      "Stockfish runs in a dedicated Web Worker (separate thread)",
      "Worker communicates via postMessage (UCI commands/responses)",
      "Main thread stays responsive — no UI freeze during analysis",
      "Worker lifecycle: create → load WASM → send UCI → receive lines",
      "Each worker instance is stateful: holds the loaded engine",
    ], { size: 10.5, space: 4 });

    // Bottom left: Why not SharedArrayBuffer
    card(s, M, 4.25, 5.95, 2.55);
    iconRow(s, I["FaExclamationTriangle"].gold, M + 0.25, 4.45, 0.4);
    s.addText("Why NOT SharedArrayBuffer?", { x: M + 0.75, y: 4.47, w: 4.9, h: 0.34, fontFace: BF, fontSize: 13.5, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 4.9, 5.45, 1.8, [
      { text: "SharedArrayBuffer enables multi-threaded WASM Stockfish", color: MUTED },
      { text: "BUT requires Cross-Origin-Isolation headers (COOP + COEP)", bold: true },
      "These headers break OAuth popups, third-party scripts, and CDN images",
      "Trade-off: single-threaded WASM is 30% slower but 100% compatible",
      { text: "Decision: compatibility wins — OAuth and third-party embeds matter more", color: GOLD },
    ], { size: 10.5, space: 4 });

    // Bottom right: Hash URL trick
    card(s, 6.75, 4.25, 5.98, 2.55);
    iconRow(s, I["FaLightbulb"].gold, 6.95, 4.45, 0.4);
    s.addText("The Hash URL Trick for WASM Loading", { x: 7.35, y: 4.47, w: 5.1, h: 0.34, fontFace: BF, fontSize: 13.5, bold: true, color: WHITE, margin: 0 });
    blist(s, 6.95, 4.9, 5.55, 1.0, [
      "WASM loader expects .wasm file relative to worker script",
      "Next.js public files get hashed URLs in production builds",
    ], { size: 10.5, space: 4 });
    codeBlock(s, 7.0, 5.9, 5.55, 0.8,
      "// Trick: pass WASM URL via hash fragment\nconst worker = new Worker(\n  '/stockfish/worker.js#/stockfish/stockfish.wasm'\n);\n// Worker reads: location.hash.slice(1) → WASM path", { size: 8.5 });

    addNotes(s,
      "This slide explains the most impressive engineering detail: running a world-class chess engine in the browser. Stockfish is written in C++ and compiled to WebAssembly using Emscripten. The resulting .wasm binary is about 2MB compressed and runs at 70-80% of native speed. It runs inside a Web Worker - a separate JavaScript thread - so the main UI thread never freezes during analysis. Communication happens via postMessage, sending UCI commands in and receiving engine output back. The critical decision is why we don't use SharedArrayBuffer, which would enable multi-threaded WASM and faster analysis. The reason is that SharedArrayBuffer requires Cross-Origin-Isolation headers (COOP and COEP), which break OAuth popup flows, third-party scripts, and CDN-served images. We chose compatibility over speed. Finally, the hash URL trick: Next.js gives production assets hashed filenames, but the WASM loader needs to find the .wasm file. We pass the WASM URL via the worker URL's hash fragment, which the worker reads with location.hash.",
      ["How much slower is single-threaded vs multi-threaded WASM?", "Could you enable SharedArrayBuffer conditionally?", "What happens if the browser doesn't support WASM?"],
      ["About 30% slower in depth-per-second. For our use case (depth 14-18 for live analysis, with deep analysis done server-side), single-threaded performance is more than adequate.",
        "Technically yes, but the COOP header is set at the document level, not per-request. You would need a separate origin or iframe isolation, which adds enormous complexity for marginal analysis speed gain in a teaching tool.",
        "The TypeScript fallback engine activates - it implements alpha-beta search with quiescence search and piece-square tables. Analysis continues at lower depth but never breaks."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 8: ENGINE POOL ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Worker Design", "Engine Pool Architecture", 28);
    cornerMotif(s);

    // Two worker diagram
    card(s, M, 1.5, 5.95, 3.1);
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: 1.5, w: 5.95, h: 0.06, fill: { color: GOLD }, line: { type: "none" } });
    s.addText("Dual-Worker Isolation Model", { x: M + 0.25, y: 1.72, w: 5.5, h: 0.34, fontFace: BF, fontSize: 15, bold: true, color: WHITE, margin: 0 });

    // Heavy worker box
    card(s, M + 0.2, 2.2, 2.6, 2.15, "0D0D10", "3A3A42");
    iconRow(s, I["FaChessRook"].gold, M + 0.6, 2.35, 0.35);
    s.addText("Heavy Worker", { x: M + 0.3, y: 2.75, w: 2.4, h: 0.26, fontFace: BF, fontSize: 11.5, bold: true, color: GOLD, align: "center", margin: 0 });
    s.addText("Full game analysis\nDepth 18/24\nMultiPV 3-6\nStreaming results\nLong-running (minutes)", { x: M + 0.3, y: 3.02, w: 2.4, h: 1.2, fontFace: BF, fontSize: 8.5, color: MUTED, align: "center", margin: 0, fit: "shrink" });

    // Live worker box
    card(s, M + 3.1, 2.2, 2.6, 2.15, "0D0D10", "3A3A42");
    iconRow(s, I["FaBolt"].gold, M + 3.5, 2.35, 0.35);
    s.addText("Live Worker", { x: M + 3.2, y: 2.75, w: 2.4, h: 0.26, fontFace: BF, fontSize: 11.5, bold: true, color: CYAN, align: "center", margin: 0 });
    s.addText("What-If analysis\nLive board eval\nDepth 14\nInstant response\nShort-lived (< 1s)", { x: M + 3.2, y: 3.02, w: 2.4, h: 1.2, fontFace: BF, fontSize: 8.5, color: MUTED, align: "center", margin: 0, fit: "shrink" });

    // Right side: why two workers
    card(s, 6.75, 1.5, 5.98, 3.1);
    iconRow(s, I["FaProjectDiagram"].gold, 6.95, 1.72, 0.4);
    s.addText("Why Two Workers?", { x: 7.45, y: 1.72, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, 6.95, 2.2, 5.55, 2.3, [
      { text: "Problem: Stockfish is stateful — once started on a search, interrupting it corrupts state", bold: true },
      "If the user drags a What-If move during analysis, we can't reuse the busy worker",
      "Solution: two independent WASM instances in separate Workers",
      "Heavy worker handles the queued full-game analysis pipeline",
      "Live worker handles instant, on-demand evaluations",
      "Neither blocks the other; both communicate via postMessage to the React context",
      { text: "Memory cost: ~40MB total for two WASM instances — acceptable on modern browsers", color: GOLD },
    ], { size: 10, space: 4 });

    // Bottom: lifecycle diagram
    card(s, M, 4.8, 12.13, 1.9);
    s.addText("Worker Lifecycle & Communication", { x: M + 0.3, y: 5.0, w: 11, h: 0.3, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0 });

    const stages = [
      ["Create Worker", "new Worker(url)"],
      ["Load WASM", "~2s first load"],
      ["UCI Init", "'uci' → 'uciok'"],
      ["Set Options", "Hash, MultiPV"],
      ["Send Position", "'position fen ...'"],
      ["Search", "'go depth 18'"],
      ["Parse Output", "info lines → JSON"],
      ["Return Result", "postMessage(result)"],
    ];
    stages.forEach(([t, d], i) => {
      const x = M + 0.15 + i * 1.5;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.42, w: 1.3, h: 0.52, rectRadius: 0.04, fill: { color: "18181C" }, line: { color: "3A3A42", width: 0.5 } });
      s.addText(t, { x, y: 5.42, w: 1.3, h: 0.28, fontFace: BF, fontSize: 7.5, bold: true, color: WHITE, align: "center", margin: 0 });
      s.addText(d, { x, y: 5.68, w: 1.3, h: 0.24, fontFace: BF, fontSize: 6.5, color: MUTED, align: "center", margin: 0 });
      if (i < stages.length - 1) {
        s.addShape(pres.shapes.CHEVRON, { x: x + 1.34, y: 5.55, w: 0.12, h: 0.24, fill: { color: GOLD }, line: { type: "none" }, rotate: 90 });
      }
    });

    addNotes(s,
      "The dual-worker architecture solves a fundamental problem: Stockfish is stateful. Once you start a search, you cannot interrupt it cleanly to run a different search without corrupting the engine state. If a user drags a What-If move while a full-game analysis is running, we need a second engine instance ready to evaluate immediately. The heavy worker handles the long-running full-game analysis with depth 18 or 24 and MultiPV 3-6. The live worker handles instant What-If evaluations and live board analysis at depth 14. Each is a separate Web Worker with its own WASM Stockfish instance. The memory cost is about 40MB total for two instances, which is acceptable on modern browsers. The bottom diagram shows the worker lifecycle: create, load WASM (~2s first time, cached after), initialize UCI, set options like hash size and MultiPV, send the position, run the search, parse output lines into structured JSON, and return the result via postMessage.",
      ["Why not terminate and recreate the worker instead of having two?", "How does the React context manage two workers?", "What happens if a worker crashes?"],
      ["Creating a new worker means reloading the 2MB WASM binary and re-initializing the engine - that takes 2-3 seconds. The live worker needs sub-second response for What-If to feel instant. Two persistent workers eliminate this latency.",
        "A custom React context holds references to both workers. Components call hooks like useEngineSession (heavy) or useLiveEngine (live). Each hook wraps postMessage/onmessage into Promises with timeout handling.",
        "The hook detects the worker termination event, recreates the worker with a fresh WASM load, and retries the pending search. The UI shows a brief 'Engine reloading' indicator."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 9: THE MATH — CENTIPAWN LOSS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Core Math", "Centipawn Loss: The Foundation of Grading", 27);
    cornerMotif(s);

    card(s, M, 1.5, 5.95, 2.3);
    iconRow(s, I["FaChartBar"].gold, M + 0.25, 1.7, 0.4);
    s.addText("What is a Centipawn?", { x: M + 0.75, y: 1.72, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 2.15, 5.45, 1.5, [
      "1 centipawn (cp) = 1/100th of a pawn's value",
      "A pawn = 100 cp, Knight/Bishop ≈ 300 cp, Rook ≈ 500 cp, Queen ≈ 900 cp",
      "Engine evaluates: '+145 cp' means White is ahead by ~1.45 pawns",
      "Positive = White advantage, Negative = Black advantage",
    ], { size: 11, space: 5 });

    card(s, 6.75, 1.5, 5.98, 2.3);
    iconRow(s, I["FaBullseye"].gold, 6.95, 1.7, 0.4);
    s.addText("How CP-Loss is Calculated", { x: 7.45, y: 1.72, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    codeBlock(s, 6.95, 2.18, 5.55, 1.5,
      "// The fundamental formula:\ncpLoss = bestAvailableScore - playedMoveScore\n\n// Both scores from the SAME position (before-move)\n// bestAvailableScore = Stockfish's #1 choice evaluation\n// playedMoveScore  = evaluation of the move actually played\n// cpLoss is always ≥ 0 (best move has cpLoss = 0)", { size: 9.5 });

    // Real examples
    card(s, M, 4.0, 12.13, 2.7);
    s.addText("Real Calculation Examples", { x: M + 0.3, y: 4.2, w: 11, h: 0.34, fontFace: BF, fontSize: 13.5, bold: true, color: GOLD, margin: 0 });

    const examples = [
      ["Scenario", "Best Score", "Played Score", "CP Loss", "Grade", "Meaning"],
      ["Player plays engine's #1 move", "+145 cp", "+145 cp", "0 cp", "Best ✓", "Perfect choice"],
      ["Player plays #2 move", "+145 cp", "+132 cp", "13 cp", "Excellent", "Tiny inaccuracy, negligible"],
      ["Player misses a tactic", "+250 cp", "+45 cp", "205 cp", "Blunder", "Lost ~2 pawns of advantage"],
      ["Player plays in drawn position", "+5 cp", "-3 cp", "8 cp", "Good", "Small slip, position still equal"],
      ["Player hangs a piece", "+100 cp", "-200 cp", "300 cp", "Blunder", "Lost a full minor piece"],
    ];
    table(s, examples, { x: M + 0.15, y: 4.6, w: 11.83, colW: [2.6, 1.4, 1.5, 1.2, 1.5, 3.63], rowH: 0.33, size: 9 });

    addNotes(s,
      "This slide establishes the mathematical foundation. A centipawn is one-hundredth of a pawn's value - the universal unit of chess evaluation. Stockfish evaluates every position in centipawns: +145 means White is ahead by about 1.45 pawns. Centipawn loss is the core formula: cpLoss equals the best available score minus the played move's score. Both scores come from analyzing the same position (before the move was played). If you play the engine's top choice, cp-loss is zero. The table shows five real examples: playing the best move gives 0 cp-loss and a 'Best' grade. Playing the second-best move with only 13 cp difference gives 'Excellent'. Missing a tactic with 205 cp loss is a 'Blunder'. A small 8 cp slip in a drawn position is just 'Good'. And hanging a piece with 300 cp loss is clearly a 'Blunder'. These numbers map directly to the grade thresholds I will show in the classification slide.",
      ["Is cp-loss always accurate for judging move quality?", "What about positions where all moves are equally bad?", "How do you handle mate scores in cp-loss?"],
      ["No, and that is exactly why we also use win-probability deltas. In a completely won position, even a 50cp loss is irrelevant because the game is still won. Win probability captures this nuance - more on the next slide.",
        "When all moves lose equally (like a forced checkmate), cp-loss between moves is near zero, so the player does not get penalized. The CAPS system handles this correctly because the win-probability difference is also near zero.",
        "Mate scores are converted to ±30000 cp. A mate-in-3 and a mate-in-5 both register as extremely high scores, and the difference between them is small - which is correct, because finding any forced mate is excellent play."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 10: WIN PROBABILITY CURVE (CAPS v2)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Core Math", "Win Probability Curve (CAPS v2)", 27);
    cornerMotif(s);

    // Formula card
    card(s, M, 1.5, 12.13, 2.1);
    s.addText("The Sigmoid Formula", { x: M + 0.3, y: 1.68, w: 11, h: 0.34, fontFace: BF, fontSize: 15, bold: true, color: GOLD, margin: 0 });
    codeBlock(s, M + 0.15, 2.08, 7.0, 1.35,
      "Win% = 50 + 50 × (2 / (1 + exp(-0.00368208 × cp)) - 1)\n\n// Equivalent to:\n// Win% = 100 / (1 + exp(-0.00368208 × cp))\n// The constant 0.00368208 is calibrated from millions of games\n// Source: Lichess/CAPS v2 research papers", { size: 10 });

    // Why this matters card
    card(s, 7.55, 2.08, 5.18, 1.35, CARD2);
    s.addText("Why Not Raw Centipawns?", { x: 7.75, y: 2.18, w: 4.7, h: 0.28, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    blist(s, 7.75, 2.5, 4.7, 0.85, [
      { text: "+100cp → +200cp is a BIG jump (55% → 65%)", color: CYAN },
      { text: "+500cp → +600cp barely matters (95% → 97%)", color: GOLD },
      "The sigmoid captures diminishing returns",
    ], { size: 9.5, space: 3 });

    // Curve table (simulated graph with values)
    card(s, M, 3.8, 6.6, 3.0);
    s.addText("Win Probability vs Centipawn Score", { x: M + 0.25, y: 3.98, w: 6.1, h: 0.3, fontFace: BF, fontSize: 12.5, bold: true, color: WHITE, margin: 0 });

    const curveRows = [
      ["cp Score", "Win %", "Interpretation"],
      ["-500", "14%", "Black is losing badly"],
      ["-300", "25%", "Black has significant disadvantage"],
      ["-100", "41%", "Slight Black disadvantage"],
      ["0", "50%", "Equal position"],
      ["+100", "59%", "Slight White advantage"],
      ["+200", "67%", "Clear White advantage"],
      ["+300", "75%", "White is winning"],
      ["+500", "86%", "White is winning easily"],
      ["+1000", "97%", "Completely won for White"],
    ];
    table(s, curveRows, { x: M + 0.15, y: 4.32, w: 6.3, colW: [1.2, 1.0, 4.1], rowH: 0.24, size: 8.5 });

    // Key insight
    card(s, 6.8, 3.8, 5.93, 3.0);
    iconRow(s, I["FaLightbulb"].gold, 7.0, 4.0, 0.38);
    s.addText("Why This Matters for Grading", { x: 7.45, y: 4.0, w: 5, h: 0.34, fontFace: BF, fontSize: 13.5, bold: true, color: WHITE, margin: 0 });
    blist(s, 7.0, 4.42, 5.5, 2.3, [
      { text: "Raw cp-loss is position-blind:", bold: true },
      "Losing 50cp when you're +500 (95% WP) → still winning (93% WP) → negligible",
      "Losing 50cp when you're +100 (59% WP) → now only 55% WP → significant!",
      { text: "Win-probability delta captures actual impact on game outcome", bold: true, color: GOLD },
      "This is why CAPS v2 uses WP deltas, not raw cp-loss alone",
      "A 'Mistake' at +800 cp is not the same as a 'Mistake' at +50 cp",
      "The sigmoid makes grading fair across all positions",
    ], { size: 9.5, space: 3.5 });

    addNotes(s,
      "This is the most important mathematical concept in the project. Raw centipawn scores are not linear in terms of winning chances. Going from +100 to +200 cp is a big jump in winning probability (59% to 67%), but going from +500 to +600 barely matters (86% to 88%). The sigmoid function captures this diminishing returns curve. The formula is Win% = 50 + 50 × (2 / (1 + exp(-0.00368208 × cp)) - 1). The constant 0.00368208 is empirically calibrated from millions of real games - it comes from the CAPS v2 research. The table shows the mapping: 0 cp = 50% (equal), +300 cp = 75% (winning), +500 cp = 86% (winning easily), +1000 cp = 97% (completely won). Why this matters for grading: losing 50 centipawns when you are +500 barely changes your winning chances, but losing 50 centipawns when you are +100 significantly hurts you. Win-probability deltas capture the actual impact on the game outcome, making grading fair across all positions.",
      ["Where does the constant 0.00368208 come from?", "Why not use a lookup table instead of a formula?", "Is this the same formula Chess.com uses?"],
      ["It comes from fitting the sigmoid to the observed relationship between engine evaluations and actual game outcomes across millions of games in the Lichess database. It is the CAPS v2 standard constant.",
        "A lookup table would need interpolation for arbitrary cp values and would not be differentiable. The sigmoid is continuous, smooth, and computes in a single Math.exp call - simpler and more elegant.",
        "Chess.com's exact formula is proprietary, but CAPS v2 is the public standard. Our implementation matches the published research. The key insight - diminishing returns of cp at extreme advantages - is universal."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 11: THE MATH — ACCURACY SCORE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Core Math", "Accuracy Score: From Moves to a Single Number", 26);
    cornerMotif(s);

    // Per-move CAPS formula
    card(s, M, 1.5, 6.6, 2.7);
    s.addText("Per-Move CAPS Score", { x: M + 0.3, y: 1.68, w: 6, h: 0.3, fontFace: BF, fontSize: 14, bold: true, color: GOLD, margin: 0 });
    codeBlock(s, M + 0.15, 2.05, 6.3, 1.5,
      "// Per-move accuracy (CAPS v2)\ncapsMove = (WP(playedMove) - WP(worstMove))\n         / (WP(bestMove) - WP(worstMove)) × 100\n\n// WP(x) = winProbability of evaluation x\n// worstMove baseline = current score - 200cp\n// Clamped to [0, 100]\n\n// If bestMove == worstMove (forced move), caps = 100", { size: 9.5 });
    s.addText("This gives 0-100 per move: 0 = worst possible, 100 = best possible", {
      x: M + 0.3, y: 3.6, w: 6, h: 0.28, fontFace: BF, fontSize: 10, italic: true, color: MUTED, margin: 0,
    });

    // Game accuracy
    card(s, 6.8, 1.5, 5.93, 2.7);
    s.addText("Game Accuracy (Per Side)", { x: 7.1, y: 1.68, w: 5.3, h: 0.3, fontFace: BF, fontSize: 14, bold: true, color: GOLD, margin: 0 });
    codeBlock(s, 6.95, 2.05, 5.63, 1.0,
      "// Game-level accuracy\ngameAccuracy_white = mean(capsMove for all White moves)\ngameAccuracy_black = mean(capsMove for all Black moves)\n\n// Final: clamped to [0, 100], rounded to 1 decimal", { size: 9.5 });
    s.addText("What Accuracy Numbers Mean", { x: 7.1, y: 3.2, w: 5.3, h: 0.28, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    const accRows = [
      ["Accuracy", "Level", "Typical Player"],
      ["95-100%", "Engine-level", "Cheating or trivial game"],
      ["85-95%", "Strong club", "1800-2200 Elo"],
      ["70-85%", "Intermediate", "1200-1800 Elo"],
      ["50-70%", "Beginner", "Below 1200 Elo"],
      ["< 50%", "Severe errors", "Many blunders"],
    ];
    table(s, accRows, { x: 7.1, y: 3.52, w: 5.43, colW: [1.1, 1.5, 2.83], rowH: 0.26, size: 8.5 });

    // Worked example
    card(s, M, 4.4, 12.13, 2.3);
    s.addText("Worked Example: 3-Move Sequence", { x: M + 0.3, y: 4.58, w: 11, h: 0.3, fontFace: BF, fontSize: 13.5, bold: true, color: GOLD, margin: 0 });
    const workRows = [
      ["Move", "Best Score", "Played Score", "Worst (best-200)", "WP(best)", "WP(played)", "WP(worst)", "CAPS"],
      ["1. e4", "+40 cp", "+40 cp", "-160 cp", "57%", "57%", "36%", "100.0"],
      ["2. Nf3", "+55 cp", "+30 cp", "-145 cp", "60%", "55%", "37%", "78.3"],
      ["3. Bb5", "+45 cp", "-120 cp", "-155 cp", "58%", "39%", "36%", "13.6"],
    ];
    table(s, workRows, { x: M + 0.15, y: 4.96, w: 11.83, colW: [1.1, 1.3, 1.5, 1.7, 1.2, 1.4, 1.3, 1.0], rowH: 0.32, size: 8 });
    s.addText("White's accuracy for these 3 moves = mean(100.0, 78.3, 13.6) = 63.97% → classified as 'Beginner level'", {
      x: M + 0.3, y: 6.42, w: 11, h: 0.24, fontFace: BF, fontSize: 10, bold: true, color: WHITE, margin: 0,
    });

    addNotes(s,
      "Here is how per-move CAPS scores become the game accuracy number you see in the UI. For each move, we compute: CAPS = (WP of played move minus WP of worst move) divided by (WP of best move minus WP of worst move), times 100. The worst-move baseline is the current best score minus 200 centipawns - this prevents division-by-zero in equal positions and sets a floor for 'how bad could this move have been'. The result is clamped to 0-100. Game accuracy is simply the arithmetic mean of all CAPS scores for one side. The worked example shows three moves: move 1 is the engine's best (CAPS 100), move 2 has a small loss (CAPS 78.3), and move 3 is a significant error (CAPS 13.6). The average is 63.97%, which maps to beginner level. The accuracy band table on the right shows what these numbers mean: 95%+ is engine-level play, 85-95% is strong club, 70-85% is intermediate, and below 70% suggests significant errors.",
      ["Why use -200cp as the worst-move baseline?", "Is the mean the right average for accuracy?", "Could a player have 100% accuracy?"],
      ["It prevents degenerate cases. If bestMove and worstMove have the same win probability (forced move, or completely drawn position), the denominator would be zero. The -200cp baseline ensures there is always a meaningful range to score against. It also represents 'a reasonably bad move' rather than 'the absolute worst'.",
        "The arithmetic mean gives equal weight to every move. Some systems use weighted means (weighting complex positions more), but the unweighted mean is the CAPS v2 standard and is simpler to explain and reproduce.",
        "Yes, if every single move matches the engine's top choice. In practice this happens only in very short games or forced sequences. Sustained 100% over a full game is statistically implausible for a human and would trigger cheating detection on major platforms."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 12: MOVE CLASSIFICATION DECISION TREE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Classification", "Move Classification: The Decision Tree", 26);
    cornerMotif(s);

    card(s, M, 1.5, 12.13, 5.3);
    s.addText("Complete Classification Algorithm", { x: M + 0.3, y: 1.68, w: 11, h: 0.3, fontFace: BF, fontSize: 14, bold: true, color: GOLD, margin: 0 });

    // The decision tree as pseudocode
    codeBlock(s, M + 0.15, 2.08, 5.8, 4.55,
      "function classifyMove(move, engineData) {\n" +
      "  // 1. Opening book check\n" +
      "  if (isInPolyglotBook(fen, move))\n" +
      "    return { grade: 'Book', color: '#8B8B96' }\n\n" +
      "  // 2. Brilliant detection (multi-condition)\n" +
      "  if (isBrilliant(move, multiPV, wpDelta))\n" +
      "    return { grade: 'Brilliant', color: '#22D3EE' }\n\n" +
      "  // 3. Great move detection\n" +
      "  if (isTopEngine && wpGain >= 5)\n" +
      "    return { grade: 'Great', color: '#60A5FA' }\n\n" +
      "  // 4. CP-loss based grading\n" +
      "  const cpLoss = bestScore - moveScore;\n" +
      "  const wpDelta = WP(bestScore) - WP(moveScore);\n\n" +
      "  if (cpLoss <= 5)   return { grade: 'Best' }\n" +
      "  if (cpLoss <= 15)  return { grade: 'Excellent' }\n" +
      "  if (cpLoss <= 30)  return { grade: 'Good' }\n\n" +
      "  // 5. Win-probability based (worse moves)\n" +
      "  if (wpDelta >= 20) return { grade: 'Blunder' }\n" +
      "  if (wpDelta >= 10) return { grade: 'Mistake' }\n" +
      "  if (wpDelta >= 5)  return { grade: 'Inaccuracy' }\n\n" +
      "  return { grade: 'Good' }  // fallback\n" +
      "}", { size: 8.5 });

    // Visual ladder on the right
    const grades = [
      ["Book", "8B8B96", "In opening book (first 20 plies)"],
      ["Brilliant !!", "22D3EE", "Top engine + WP gain + all alts lose"],
      ["Great !", "60A5FA", "Top engine + meaningful WP gain ≥5%"],
      ["Best", "4ADE80", "Matches engine best (≤5 cp loss)"],
      ["Excellent", "4ADE80", "Very small loss (≤15 cp)"],
      ["Good", "6EC977", "Small loss (≤30 cp)"],
      ["Inaccuracy ?!", "FFC62B", "Win probability drops 5-10%"],
      ["Mistake ?", "EF4444", "Win probability drops 10-20%"],
      ["Blunder ??", "DC2626", "Win probability drops 20%+"],
    ];
    let gy = 2.08;
    grades.forEach(([label, color, desc], i) => {
      const x = 6.55;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: gy, w: 5.55, h: 0.47, rectRadius: 0.04, fill: { color: "18181C" }, line: { color: "26262B", width: 0.5 } });
      s.addShape(pres.shapes.RECTANGLE, { x, y: gy, w: 0.06, h: 0.47, fill: { color }, line: { type: "none" } });
      s.addText(label, { x: x + 0.2, y: gy + 0.02, w: 1.5, h: 0.43, fontFace: BF, fontSize: 10, bold: true, color, valign: "middle", margin: 0 });
      s.addText(desc, { x: x + 1.7, y: gy + 0.02, w: 3.7, h: 0.43, fontFace: BF, fontSize: 9, color: MUTED, valign: "middle", margin: 0, fit: "shrink" });
      gy += 0.51;
    });

    addNotes(s,
      "This is the complete move classification algorithm, shown as pseudocode on the left and as the 9-grade visual ladder on the right. The order of checks matters. First, we check if the move is in the Polyglot opening book (first 20 plies) - if yes, it gets the Book grade regardless of engine evaluation, because opening moves are theoretical, not tactical. Second, we check for Brilliant moves using multi-condition logic (detailed on the next slide). Third, we check for Great moves: top engine choice with at least 5% win-probability gain. Fourth, for good-to-best moves, we use cp-loss thresholds: 0-5 cp is Best, 5-15 is Excellent, 15-30 is Good. Fifth, for bad moves, we switch to win-probability deltas because they are fairer in extreme positions: 20%+ WP drop is a Blunder, 10-20% is a Mistake, 5-10% is an Inaccuracy. The fallback for anything not caught is Good.",
      ["Why use cp-loss for good moves but WP-delta for bad moves?", "Where do these thresholds come from?", "What if a move is both Brilliant and a Book move?"],
      ["Good moves have small losses where cp is precise enough. But for bad moves, the position context matters: losing 50cp when you are +800 is not a real mistake (WP barely changes), while losing 50cp at +100 is significant (WP drops noticeably). WP-delta captures this automatically.",
        "The thresholds are calibrated against Chess.com's and Lichess's published grade distributions for different rating ranges. I tuned them so that a 1500-rated game produces a realistic mix of grades. They are configurable constants in the codebase.",
        "Book check runs first, so it always wins. This is intentional: a move being theory should not be called Brilliant even if it happens to meet the criteria, because the player did not 'find' it through calculation."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 13: BRILLIANT MOVE DETECTION DEEP DIVE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Special Detection", "Brilliant Move Detection Deep Dive", 26);
    cornerMotif(s);

    card(s, M, 1.5, 7.6, 5.2);
    s.addText("The Three Conditions (ALL must be true)", { x: M + 0.3, y: 1.68, w: 7, h: 0.3, fontFace: BF, fontSize: 15, bold: true, color: CYAN, margin: 0 });

    // Condition 1
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M + 0.2, y: 2.15, w: 7.2, h: 0.75, rectRadius: 0.04, fill: { color: "0D0D10" }, line: { color: "22D3EE", width: 1 } });
    s.addText("1", { x: M + 0.35, y: 2.25, w: 0.4, h: 0.5, fontFace: TF, fontSize: 22, bold: true, color: CYAN, margin: 0, valign: "middle" });
    s.addText("Must be the engine's TOP choice", { x: M + 0.85, y: 2.2, w: 6.2, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    s.addText("The played move must match Stockfish's #1 ranked move (MultiPV rank 1)", { x: M + 0.85, y: 2.48, w: 6.2, h: 0.3, fontFace: BF, fontSize: 9.5, color: MUTED, margin: 0 });

    // Condition 2
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M + 0.2, y: 3.05, w: 7.2, h: 0.75, rectRadius: 0.04, fill: { color: "0D0D10" }, line: { color: "22D3EE", width: 1 } });
    s.addText("2", { x: M + 0.35, y: 3.15, w: 0.4, h: 0.5, fontFace: TF, fontSize: 22, bold: true, color: CYAN, margin: 0, valign: "middle" });
    s.addText("Must produce a significant win-probability gain", { x: M + 0.85, y: 3.1, w: 6.2, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    s.addText("Win probability must increase by ≥5% compared to the previous position's evaluation", { x: M + 0.85, y: 3.38, w: 6.2, h: 0.3, fontFace: BF, fontSize: 9.5, color: MUTED, margin: 0 });

    // Condition 3
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M + 0.2, y: 3.95, w: 7.2, h: 0.75, rectRadius: 0.04, fill: { color: "0D0D10" }, line: { color: "22D3EE", width: 1 } });
    s.addText("3", { x: M + 0.35, y: 4.05, w: 0.4, h: 0.5, fontFace: TF, fontSize: 22, bold: true, color: CYAN, margin: 0, valign: "middle" });
    s.addText("ALL alternative moves must lose significantly", { x: M + 0.85, y: 4.0, w: 6.2, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    s.addText("Every other move in MultiPV must lose ≥10% win probability — the Brilliant move is the ONLY good option", { x: M + 0.85, y: 4.28, w: 6.2, h: 0.3, fontFace: BF, fontSize: 9.5, color: MUTED, margin: 0 });

    // Pseudocode
    codeBlock(s, M + 0.15, 4.9, 7.3, 1.65,
      "function isBrilliant(playedMove, multiPVLines, wpBefore) {\n" +
      "  // Condition 1: Must be engine's #1 choice\n" +
      "  if (playedMove !== multiPVLines[0].bestmove) return false;\n\n" +
      "  // Condition 2: Significant win-probability gain (≥5%)\n" +
      "  const wpAfter = winProb(multiPVLines[0].score);\n" +
      "  if ((wpAfter - wpBefore) < 5) return false;\n\n" +
      "  // Condition 3: ALL alternatives lose ≥10% WP\n" +
      "  for (const alt of multiPVLines.slice(1)) {\n" +
      "    if ((wpAfter - winProb(alt.score)) < 10) return false;\n" +
      "  }\n" +
      "  return true;  // Genuinely brilliant: only winning move!\n" +
      "}", { size: 8.5 });

    // Right side: example
    card(s, 8.3, 1.5, 4.43, 5.2, CARD2);
    s.addText("Real Example", { x: 8.55, y: 1.7, w: 4, h: 0.3, fontFace: BF, fontSize: 14, bold: true, color: GOLD, margin: 0 });
    s.addText("Position: White to move, seemingly equal", { x: 8.55, y: 2.05, w: 4, h: 0.24, fontFace: BF, fontSize: 10, color: MUTED, margin: 0 });

    const exRows = [
      ["Move", "Score", "Win%"],
      ["Nxf7!! (played)", "+350 cp", "78%"],
      ["Bd3", "+20 cp", "53%"],
      ["Re1", "+15 cp", "52%"],
    ];
    table(s, exRows, { x: 8.55, y: 2.4, w: 3.98, colW: [1.8, 1.09, 1.09], rowH: 0.3, size: 9 });

    s.addText("Check all 3 conditions:", { x: 8.55, y: 3.65, w: 4, h: 0.24, fontFace: BF, fontSize: 10.5, bold: true, color: WHITE, margin: 0 });
    blist(s, 8.55, 3.95, 4, 2.6, [
      { text: "✓ Nxf7 is engine's #1 choice", color: GREEN },
      { text: "✓ WP gain: 78% - 52% = +26% (≥5%)", color: GREEN },
      { text: "✓ Bd3 loses 78%-53% = 25% WP (≥10%)", color: GREEN },
      { text: "✓ Re1 loses 78%-52% = 26% WP (≥10%)", color: GREEN },
      { text: "= BRILLIANT !! — the only winning move", bold: true, color: CYAN },
    ], { size: 9.5, space: 4 });

    addNotes(s,
      "Brilliant move detection is one of the most satisfying algorithms in the project. A Brilliant move is not just a good move - it is a move that only a creative, calculating mind would find. All three conditions must be true simultaneously. Condition 1: the move must be the engine's absolute top choice. If you play the second-best move, it is not Brilliant even if it is very good. Condition 2: the move must produce a significant win-probability gain of at least 5 percentage points. A Brilliant move changes the evaluation meaningfully. Condition 3: every single alternative move must lose at least 10% win probability compared to the Brilliant move. This means the Brilliant move is the ONLY good option - every other legal move is significantly worse. The pseudocode shows the implementation: check rank 1, check WP gain, then loop through all alternatives. The real example shows a knight sacrifice on f7: it is the only move that keeps the advantage, while both alternatives drop win probability by 25%+. This three-condition gate ensures Brilliant is rare and meaningful.",
      ["How rare are Brilliant moves in practice?", "Why require ALL alternatives to lose?", "Is this the same as Chess.com's Brilliant detection?"],
      ["Very rare - typically 0-2 per game for strong players, and many games have none. This rarity is by design: if Brilliant were common, it would lose its meaning. The three-condition gate keeps the bar high.",
        "If even one alternative maintains a similar advantage, the position is 'obviously good' rather than 'uniquely creative'. The point of Brilliant is that the player found the one needle in the haystack - every other thread leads to a worse position.",
        "The exact implementation differs (Chess.com's is proprietary), but the core concept - top engine choice where alternatives are significantly worse - is shared. Our implementation adds the explicit WP gain threshold to avoid Brilliant marks in dead-drawn positions."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 14: THE 9 GRADE SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Classification", "The Complete 9-Grade System", 28);
    cornerMotif(s);

    const gradeRows = [
      ["Grade", "Symbol", "CP-Loss Range", "WP Delta", "Detection Method", "Chess Example"],
      ["Brilliant", "!!", "0 cp", "+5% gain", "MultiPV: only winning move", "Nxf7!! sacrifice — all alternatives lose"],
      ["Great", "!", "0 cp", "+5% gain", "Top engine + WP gain", "Bg5! pinning the knight — strong gain"],
      ["Best", "✓", "0–5 cp", "< 1%", "Matches engine #1", "e4 — exactly what Stockfish recommends"],
      ["Excellent", "≈", "5–15 cp", "1–3%", "Near-best by cp-loss", "Nf3 instead of d4 — negligible difference"],
      ["Good", "○", "15–30 cp", "3–5%", "Small cp-loss", "Developing a piece slightly out of order"],
      ["Book", "📖", "N/A", "N/A", "Polyglot book match", "1. e4 e5 2. Nf3 — opening theory"],
      ["Inaccuracy", "?!", "> 30 cp", "5–10%", "WP delta threshold", "Missing a better pawn break"],
      ["Mistake", "?", "> 50 cp", "10–20%", "WP delta threshold", "Leaving a piece undefended"],
      ["Blunder", "??", "> 100 cp", "20%+", "WP delta threshold", "Hanging the queen to a fork"],
    ];
    table(s, gradeRows, { x: M, y: 1.48, w: 12.13, colW: [1.1, 0.8, 1.3, 1.2, 2.5, 5.23], rowH: 0.5, size: 9.5, firstColBold: true });

    card(s, M, 6.18, 12.13, 0.65, CARD2);
    s.addText("Key insight: good moves use cp-loss thresholds (precise at small differences), bad moves use WP-delta (fair across all positions). Book moves bypass engine analysis entirely.", {
      x: M + 0.3, y: 6.2, w: 11.5, h: 0.6, fontFace: BF, fontSize: 10.5, italic: true, color: GOLD, valign: "middle", margin: 0, fit: "shrink",
    });

    addNotes(s,
      "This table is the complete reference for the 9-grade system. Each row shows the grade name, its symbol used in the UI, the centipawn-loss range, the win-probability delta range, the detection method, and a concrete chess example. The design insight is that we use two different metrics depending on the quality of the move. For good-to-best moves (Best, Excellent, Good), we use cp-loss thresholds because they are precise at small differences. For bad moves (Inaccuracy, Mistake, Blunder), we switch to win-probability deltas because they are fairer across different position types - losing 50cp in a completely won position is not the same as losing 50cp in a balanced position. Book moves are a special category: they match the Polyglot opening book and skip engine analysis entirely, because theoretical opening moves should not be graded on engine evaluation. Brilliant and Great are also special: they require the move to be the engine's top choice AND produce meaningful win-probability gains.",
      ["Why have both Excellent and Good? Isn't that redundant?", "What happens to a move that falls between the cracks?", "Can a Book move also be a Blunder?"],
      ["They serve different feedback purposes. Excellent tells the player 'you basically found the right idea, the difference is trivial'. Good tells them 'this was fine but there was a noticeably better option'. The distinction helps learning: Excellent means 'keep doing this', Good means 'look a bit deeper next time'.",
        "The fallback at the bottom of the decision tree is 'Good'. Any move that does not trigger any specific threshold defaults to Good. In practice this happens for moves with 15-30 cp loss but less than 5% WP delta, which is a reasonable 'decent but not perfect' classification.",
        "No. Book check runs first in the decision tree, before any engine evaluation. If a move is in the Polyglot book, it is always Book regardless of engine analysis. However, if the opening book does not cover a position (past the first 20 plies), the move goes through normal engine classification."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 15: AI COACHING LAYER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Intelligence", "AI Coaching Layer: Full Pipeline", 27);
    cornerMotif(s);

    // Pipeline flow
    const stages = [
      ["FaDatabase", "Game Stats", "Up to 50 games\naccuracy, blunders,\nopenings, phases"],
      ["FaFilter", "Prompt\nTemplate", "System prompt +\nuser data injection\n+ output schema"],
      ["FaBrain", "LLM Call", "Groq Llama 3.3 70B\n(fallback: DeepSeek\nvia OpenRouter)"],
      ["FaCheckCircle", "Zod\nValidation", "Schema enforces\nstructured JSON\nretry on failure"],
      ["FaRobot", "Coach\nReport", "Rendered on /coach\ncached 24h\nbadge reward"],
    ];
    stages.forEach(([icn, t, d], i) => {
      const x = M + i * 2.5;
      card(s, x, 1.5, 2.3, 2.2);
      iconRow(s, I[icn].gold, x + 0.85, 1.65, 0.4);
      s.addText(t, { x: x + 0.1, y: 2.1, w: 2.1, h: 0.42, fontFace: BF, fontSize: 10, bold: true, color: WHITE, align: "center", margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.1, y: 2.55, w: 2.1, h: 0.95, fontFace: BF, fontSize: 7.5, color: MUTED, align: "center", margin: 0, fit: "shrink" });
      if (i < 4) {
        s.addShape(pres.shapes.CHEVRON, { x: x + 2.34, y: 2.35, w: 0.12, h: 0.24, fill: { color: GOLD }, line: { type: "none" }, rotate: 90 });
      }
    });

    // Prompt engineering detail
    card(s, M, 3.9, 5.95, 2.8);
    s.addText("Prompt Engineering", { x: M + 0.3, y: 4.05, w: 5.3, h: 0.28, fontFace: BF, fontSize: 13, bold: true, color: GOLD, margin: 0 });
    codeBlock(s, M + 0.15, 4.4, 5.65, 2.15,
      "// System prompt structure:\n" +
      "const systemPrompt = `You are a chess coach.\n" +
      "Analyze the player's game history and provide:\n" +
      "1. Three strengths with game evidence\n" +
      "2. Three weaknesses with specific drills\n" +
      "3. A weekly goal (one focus area)\n" +
      "4. An opening recommendation\n\n" +
      "Rules:\n" +
      "- Reference actual game numbers (accuracy, blunders)\n" +
      "- Each weakness MUST have a concrete drill\n" +
      "- Never mention you are an AI\n" +
      "- Keep language at club-player level`;\n\n" +
      "// User message: inject computed game stats\n" +
      "const userData = JSON.stringify(gameStats);", { size: 7.5 });

    // Zod schema detail
    card(s, 6.75, 3.9, 5.98, 2.8);
    s.addText("Zod Schema Validation", { x: 7.05, y: 4.05, w: 5.3, h: 0.28, fontFace: BF, fontSize: 13, bold: true, color: GOLD, margin: 0 });
    codeBlock(s, 6.9, 4.4, 5.68, 2.15,
      "const CoachReportSchema = z.object({\n" +
      "  strengths: z.array(z.object({\n" +
      "    title: z.string(),\n" +
      "    description: z.string(),\n" +
      "    evidence: z.string(),   // must cite game data\n" +
      "  })).length(3),\n" +
      "  weaknesses: z.array(z.object({\n" +
      "    title: z.string(),\n" +
      "    description: z.string(),\n" +
      "    drill: z.string(),      // actionable exercise\n" +
      "  })).length(3),\n" +
      "  weeklyGoal: z.string(),\n" +
      "  openingRec: z.object({\n" +
      "    name: z.string(), eco: z.string(),\n" +
      "    reason: z.string()\n" +
      "  }),\n" +
      "});\n" +
      "// parse() throws → retry with backoff", { size: 7.5 });

    addNotes(s,
      "The AI coaching layer is the differentiator. The pipeline flows left to right: we collect statistics from up to 50 analyzed games - accuracy numbers, blunder counts, opening names, phase distribution. These are pre-computed facts, not raw PGN, which prevents hallucination. The stats are injected into a carefully engineered prompt template. The system prompt instructs the LLM to act as a chess coach, produce exactly three strengths with evidence, three weaknesses with drills, a weekly goal, and an opening recommendation. The prompt explicitly forbids mentioning it is an AI and requires citing actual game numbers. The LLM call goes to Groq's Llama 3.3 70B with DeepSeek via OpenRouter as fallback. The response is parsed through a Zod schema that enforces exact structure - three strengths, three weaknesses each with a drill, a weekly goal, and an opening recommendation with ECO code. If the LLM returns malformed JSON or missing fields, Zod's parse() throws, and we retry with exponential backoff. After three failures, a deterministic fallback report is served so the UI never breaks.",
      ["How do you prevent the LLM from hallucinating game statistics?", "Why Zod instead of just try/catch JSON.parse?", "What is the fallback report?"],
      ["The model never sees raw board positions or PGN - it receives pre-computed statistics like 'accuracy: 78.3%, blunders: 4, most common opening: Sicilian'. These numbers come from our analysis pipeline and are factual by construction. The prompt also requires citing evidence from these specific numbers.",
        "JSON.parse only checks syntax - it cannot enforce that 'strengths' is an array of exactly 3 objects each with 'title', 'description', and 'evidence' fields. Zod validates the entire shape at runtime, catching partial responses, missing fields, wrong types, and array length violations that raw JSON parsing would miss.",
        "A deterministic report generated from the game statistics without the LLM: 'Your accuracy averages X%. Your most common error is Y. Practice: Z.' It is less personalized but always correct and always available."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 16: DATABASE DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Persistence", "Database Design: 12-Table PostgreSQL Schema", 25);
    cornerMotif(s);

    // Table schema overview
    const dbRows = [
      ["Table", "Key Columns", "Purpose"],
      ["users", "id (UUID), email, displayName, role, createdAt", "Core user record with role enum"],
      ["identities", "userId, provider, providerId, email", "OAuth identities (Google, GitHub)"],
      ["user_credentials", "userId, passwordHash, salt", "scrypt-hashed passwords with 16-byte salt"],
      ["subscriptions", "userId, tier (free/pro/coach), stripeId", "Subscription tier management"],
      ["chess_accounts", "userId, platform, username, lastSync", "Linked Chess.com / Lichess accounts"],
      ["imported_pgns", "id, userId, pgn, pgnHash, headers", "PGN audit trail + hash deduplication"],
      ["analysis_runs", "id, userId, pgnHash, report (JSONB), mode", "Full analysis report as JSONB payload"],
      ["move_evaluations", "runId, ply, score, cpLoss, grade, bestMove", "Per-ply evaluation data for queries"],
      ["puzzles", "id, fen, solution, rating, theme", "Puzzle catalog with Elo rating"],
      ["puzzle_attempts", "userId, puzzleId, correct, ratingDelta", "Elo-rated attempt tracking"],
      ["coach_snapshots", "userId, report (JSONB), createdAt", "Cached AI coach reports (24h TTL)"],
      ["leaderboard_entries", "userId, board, score, rank", "Puzzle + Brilliant leaderboards"],
    ];
    table(s, dbRows, { x: M, y: 1.42, w: 12.13, colW: [1.9, 4.73, 5.5], rowH: 0.37, size: 8.5 });

    // Design patterns
    card(s, M, 6.35, 5.95, 0.55, CARD2);
    s.addText("JSONB for reports  |  UUID PKs  |  Hash dedup  |  Driver pattern: memory → hybrid → PostgreSQL", {
      x: M + 0.15, y: 6.35, w: 5.65, h: 0.55, fontFace: BF, fontSize: 9.5, color: GOLD, valign: "middle", margin: 0, fit: "shrink",
    });
    card(s, 6.75, 6.35, 5.98, 0.55, CARD2);
    s.addText("Drizzle ORM  |  Single migration  |  Typed schema = source of truth  |  Seed script for demo data", {
      x: 6.9, y: 6.35, w: 5.68, h: 0.55, fontFace: BF, fontSize: 9.5, color: GOLD, valign: "middle", margin: 0, fit: "shrink",
    });

    addNotes(s,
      "The database schema has 12 tables in three groups. Auth tables: users, identities for OAuth, credentials for password hashes, subscriptions for tier management, and chess_accounts for linked platform accounts. Analysis tables: imported_pgns with PGN hash deduplication, analysis_runs storing the full report as a JSONB payload, and move_evaluations with per-ply relational data for querying and aggregation. Training tables: puzzles, puzzle_attempts with Elo rating updates, coach_snapshots for cached AI reports, and leaderboard_entries. Key design decisions: JSONB for reports because their shape varies across features; UUID primary keys for security; PGN hash deduplication to prevent re-analyzing identical games; and the driver pattern with three backends. Drizzle ORM generates a single SQL migration from the typed TypeScript schema, which serves as the single source of truth.",
      ["Why JSONB instead of normalized columns for reports?", "How does the driver pattern work?", "Why not use Prisma?"],
      ["Reports contain nested, variable-shape data: chart arrays of varying length, critical moments with different detail levels, narrative text, and grade distributions. Normalizing this would require 10+ additional tables and constant schema changes as features evolve. JSONB stores it flexibly while move_evaluations remains relational for SQL queries.",
        "A repository interface defines methods like findAnalysis, saveReport, etc. Three implementations exist: MemoryRepository uses JavaScript Maps (for demos/CI), HybridRepository tries PostgreSQL and falls back to memory, and DatabaseRepository uses PostgreSQL exclusively. The active driver is chosen by environment variable.",
        "Drizzle maps 1:1 to SQL, uses the TypeScript schema as the source of truth, and has lighter runtime overhead. Prisma's query engine adds an extra binary and abstraction layer we don't need for 12 tables."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 17: SECURITY & AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Security", "Authentication & Security Implementation", 26);
    cornerMotif(s);

    // Password hashing
    card(s, M, 1.5, 3.9, 2.65);
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: 1.5, w: 3.9, h: 0.06, fill: { color: RED }, line: { type: "none" } });
    iconRow(s, I["FaLock"].gold, M + 0.25, 1.72, 0.38);
    s.addText("Password Hashing (scrypt)", { x: M + 0.72, y: 1.74, w: 3, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 2.14, 3.4, 1.2, [
      "16-byte random salt per password",
      "64-byte derived key (scrypt)",
      "Memory-hard: resists GPU attacks",
      "Timing-safe comparison (no timing leaks)",
    ], { size: 9, space: 3 });
    codeBlock(s, M + 0.15, 3.3, 3.6, 0.7,
      "const salt = crypto.randomBytes(16);\nconst hash = crypto.scryptSync(\n  password, salt, 64\n);\n// Compare: crypto.timingSafeEqual()", { size: 7.5 });

    // HMAC Sessions
    card(s, 4.7, 1.5, 3.9, 2.65);
    s.addShape(pres.shapes.RECTANGLE, { x: 4.7, y: 1.5, w: 3.9, h: 0.06, fill: { color: GOLD }, line: { type: "none" } });
    iconRow(s, I["FaUserCircle"].gold, 4.95, 1.72, 0.38);
    s.addText("HMAC Sessions", { x: 5.42, y: 1.74, w: 3, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    blist(s, 4.95, 2.14, 3.4, 1.2, [
      "HMAC-SHA256 signed cookies",
      "httpOnly + Secure + SameSite=Lax",
      "30-day expiry, server-side lookup",
      "No JWT: server validates every request",
    ], { size: 9, space: 3 });
    codeBlock(s, 4.85, 3.3, 3.6, 0.7,
      "const sig = hmacSha256(secret, sessionId);\nres.cookie('session', sessionId + '.' + sig, {\n  httpOnly: true, secure: true,\n  sameSite: 'lax', maxAge: 30d\n});", { size: 7.5 });

    // OAuth PKCE
    card(s, 8.8, 1.5, 3.93, 2.65);
    s.addShape(pres.shapes.RECTANGLE, { x: 8.8, y: 1.5, w: 3.93, h: 0.06, fill: { color: BLUE }, line: { type: "none" } });
    iconRow(s, I["FaExchangeAlt"].gold, 9.05, 1.72, 0.38);
    s.addText("OAuth PKCE (S256)", { x: 9.52, y: 1.74, w: 3, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    blist(s, 9.05, 2.14, 3.4, 1.2, [
      "PKCE: code_verifier + code_challenge",
      "SHA256 challenge (not plain)",
      "Signed state token (10-min TTL)",
      "Google + GitHub providers",
    ], { size: 9, space: 3 });
    codeBlock(s, 8.95, 3.3, 3.63, 0.7,
      "const verifier = crypto.randomBytes(32);\nconst challenge = sha256(verifier);\n// State = HMAC-signed JSON w/ 10min exp\n// Callback: exchange code + verifier", { size: 7.5 });

    // Bottom: Rate limiting + Zod + Guest merge
    card(s, M, 4.35, 4.0, 2.45);
    iconRow(s, I["FaShieldAlt"].gold, M + 0.25, 4.55, 0.38);
    s.addText("Rate Limiting", { x: M + 0.72, y: 4.57, w: 3, h: 0.28, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 4.92, 3.5, 1.7, [
      "Fixed-window limiter (in-memory)",
      "8 sensitive routes protected",
      "15-30 req/min per IP",
      "Import: 15/min, AI coach: 20/min",
      "Analysis: 15/min, Puzzles: 30/min",
    ], { size: 9, space: 3 });

    card(s, 4.8, 4.35, 4.0, 2.45);
    iconRow(s, I["FaCheckCircle"].gold, 5.05, 4.55, 0.38);
    s.addText("Zod Input Validation", { x: 5.52, y: 4.57, w: 3, h: 0.28, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    blist(s, 5.05, 4.92, 3.5, 1.7, [
      "Every mutation route validates with Zod",
      "PGN validated before engine use",
      "FEN format checked before Stockfish",
      "LLM outputs validated on receipt",
      "No unvalidated user input reaches engine",
    ], { size: 9, space: 3 });

    card(s, 9.0, 4.35, 3.73, 2.45);
    iconRow(s, I["FaUsers"].gold, 9.25, 4.55, 0.38);
    s.addText("Guest → Account Merge", { x: 9.72, y: 4.57, w: 3, h: 0.28, fontFace: BF, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    blist(s, 9.25, 4.92, 3.25, 1.7, [
      "Guest gets localStorage ID",
      "Analysis history tracked server-side",
      "On signup: claim guest reports",
      "Re-associate with new account",
      "10-analysis cap for guests",
    ], { size: 9, space: 3 });

    addNotes(s,
      "Security was designed in from the start, not bolted on. Passwords use scrypt with 16-byte random salts and 64-byte derived keys. scrypt is memory-hard, meaning it resists GPU-based cracking attacks better than bcrypt. Comparison uses timing-safe equality to prevent timing side-channel attacks. Sessions are HMAC-SHA256 signed cookies - not JWTs, because we want server-side session validation on every request. Cookies are httpOnly, Secure, and SameSite=Lax. OAuth uses PKCE with SHA256 challenges for Google and GitHub, with signed state tokens that expire in 10 minutes to prevent CSRF. Rate limiting uses fixed-window counters in memory, protecting 8 sensitive routes at 15-30 requests per minute per IP. Every mutation route validates input with Zod schemas - PGN and FEN are validated before they reach the engine. Guest-to-account merging tracks guest analysis server-side and re-associates reports when the guest creates an account.",
      ["Why scrypt over bcrypt?", "Why not use JWTs?", "How do you prevent someone from exhausting the rate limiter?"],
      ["scrypt is available in Node's standard crypto library (no native dependencies), is memory-hard (configurable cost), and offers stronger resistance to ASIC/GPU attacks. It is also newer and recommended by OWASP.",
        "JWTs are stateless - once issued, they cannot be revoked without a blocklist, which negates the stateless benefit. Our HMAC cookies are verified against server-side session records, so we can instantly revoke sessions on logout or suspicious activity.",
        "The rate limiter is per-IP with fixed windows. In a production deployment, we would use Redis-backed rate limiting with sliding windows. For the project scope, in-memory fixed-window is sufficient and demonstrates the concept."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 18: WHAT-IF ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Interactive Learning", "What-If Analysis: Explore Alternatives", 26);
    cornerMotif(s);

    // Flow diagram
    card(s, M, 1.5, 12.13, 2.3);
    s.addText("What-If Flow: From Drag to Grade", { x: M + 0.3, y: 1.68, w: 11, h: 0.3, fontFace: BF, fontSize: 14, bold: true, color: GOLD, margin: 0 });

    const wiSteps = [
      ["FaHandPointer", "User Drags\nPiece", "Drag-drop on\nchessboard"],
      ["FaChessBoard", "Validate\nMove", "chess.js checks\nlegality"],
      ["FaBolt", "Live Worker\nSearch", "Stockfish WASM\ndepth 14"],
      ["FaStar", "Grade\nAlternative", "cp-loss vs best\nmove grade"],
      ["FaChartLine", "Compare\nResults", "Original grade\nvs What-If grade"],
      ["FaCommentDots", "LLM Explain\n(optional)", "Why is this\nbetter/worse?"],
    ];
    wiSteps.forEach(([icn, t, d], i) => {
      const x = M + 0.1 + i * 2.0;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.1, w: 1.8, h: 1.4, rectRadius: 0.04, fill: { color: "18181C" }, line: { color: "3A3A42", width: 0.5 } });
      iconRow(s, I[icn].gold, x + 0.62, 2.2, 0.34);
      s.addText(t, { x: x + 0.05, y: 2.56, w: 1.7, h: 0.42, fontFace: BF, fontSize: 8, bold: true, color: WHITE, align: "center", margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.05, y: 2.98, w: 1.7, h: 0.42, fontFace: BF, fontSize: 7, color: MUTED, align: "center", margin: 0, fit: "shrink" });
      if (i < 5) s.addShape(pres.shapes.CHEVRON, { x: x + 1.84, y: 2.6, w: 0.12, h: 0.24, fill: { color: GOLD }, line: { type: "none" }, rotate: 90 });
    });

    // Technical detail
    card(s, M, 4.0, 5.95, 2.7);
    s.addText("Technical Implementation", { x: M + 0.3, y: 4.15, w: 5.3, h: 0.28, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0 });
    codeBlock(s, M + 0.15, 4.5, 5.65, 2.05,
      "// What-If hook: useWhatIfSession()\nasync function evaluateAlternative(fen, altMove) {\n  // 1. Validate move legality\n  const game = new Chess(fen);\n  if (!game.move(altMove)) return null;\n\n  // 2. Send to LIVE worker (not heavy worker!)\n  const result = await liveWorker.evaluate(fen, 14);\n\n  // 3. Grade the alternative\n  const grade = classifyMove({\n    bestScore: result.bestScore,\n    moveScore: result.altScore,\n    wpBefore, wpAfter\n  });\n\n  // 4. Return comparison\n  return { altGrade: grade, originalGrade, delta };\n}", { size: 8 });

    // Why it matters
    card(s, 6.75, 4.0, 5.98, 2.7);
    iconRow(s, I["FaLightbulb"].gold, 6.95, 4.15, 0.38);
    s.addText("Why This Matters for Learning", { x: 7.42, y: 4.17, w: 5, h: 0.28, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0 });
    blist(s, 6.95, 4.55, 5.55, 2.0, [
      { text: "Active learning: player tests their own ideas, not just reads verdicts", bold: true },
      "Immediate feedback: <1 second evaluation via the live WASM worker",
      "Graded comparison: 'Your Bc4 would be an Excellent move (your Bd3 was Good)'",
      "Chained sessions: try multiple alternatives for the same position",
      "Uses the live worker, so it never interrupts ongoing game analysis",
      { text: "LLM explanation is optional (disabled by default to avoid API rate limits)", color: MUTED },
      { text: "This is the feature that makes Chessfork interactive, not just informational", color: GOLD },
    ], { size: 9.5, space: 3.5 });

    addNotes(s,
      "What-If analysis is the interactive learning feature. While reviewing a game, the player can drag any piece to try an alternative move. Here is what happens technically: the drag event is captured by react-chessboard, the move is validated with chess.js for legality, then the position is sent to the live WASM worker (never the heavy worker, which might be busy with full-game analysis). The live worker runs Stockfish at depth 14, evaluates the alternative, and our classification algorithm grades it. The UI then shows a comparison: 'Your Bc4 would have been Excellent; the move you played (Bd3) was only Good'. The player can chain multiple alternatives for the same position. The LLM explanation endpoint exists but is disabled by default because every drag-drop would trigger a rate-limited API call. This is a deliberate product trade-off: instant grading via the engine is always available, while natural-language explanation is opt-in.",
      ["Why depth 14 instead of 18?", "How do you prevent the heavy worker from being interrupted?", "Why is LLM explanation disabled by default?"],
      ["Depth 14 gives reliable evaluation in under 1 second on the WASM engine, which is critical for the 'instant feedback' experience. Depth 18 would take 2-3 seconds and break the interactive flow. The accuracy difference at depth 14 vs 18 is marginal for classification purposes.",
        "The architecture uses two completely separate Web Workers with independent WASM instances. The React context manages them through different hooks: useEngineSession for the heavy worker and useLiveEngine for the live worker. They never share state or interfere.",
        "Every drag-drop in What-If mode would trigger an LLM API call. With players trying 5-10 alternatives per position, that is 50+ API calls per review session. The rate limiter would throttle the user, and the cost would be significant. Engine grading is instant and free."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 19: LIVE ENGINE & DYNAMIC LINES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Real-Time", "Live Engine & Dynamic Lines", 28);
    cornerMotif(s);

    // Auto-start behavior
    card(s, M, 1.5, 5.95, 2.5);
    iconRow(s, I["FaPlay"].gold, M + 0.25, 1.7, 0.4);
    s.addText("Auto-Start on Analysis Tab", { x: M + 0.75, y: 1.72, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, M + 0.25, 2.14, 5.45, 1.7, [
      { text: "Live engine starts automatically when user opens Analysis tab", bold: true },
      "Evaluates the current board position in real-time",
      "Shows top 3 engine lines with evaluations",
      "Updates as the user navigates through game moves",
      "Uses the live WASM worker (separate from game analysis)",
    ], { size: 10.5, space: 4 });

    // Depth progression
    card(s, 6.75, 1.5, 5.98, 2.5);
    iconRow(s, I["FaChartArea"].gold, 6.95, 1.7, 0.4);
    s.addText("Depth Progression", { x: 7.45, y: 1.72, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    blist(s, 6.95, 2.14, 5.55, 1.7, [
      "Engine starts at depth 1, progressively deepens",
      "UI shows current depth: 'Depth: 12/20'",
      "Score stabilizes as depth increases (convergence)",
      { text: "Each depth increment refines the evaluation", color: MUTED },
      { text: "User sees the engine 'thinking' in real-time", color: GOLD },
    ], { size: 10.5, space: 4 });

    // Throttled updates
    card(s, M, 4.2, 5.95, 2.55);
    iconRow(s, I["FaStopwatch"].gold, M + 0.25, 4.4, 0.4);
    s.addText("Throttled UI Updates", { x: M + 0.75, y: 4.42, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    codeBlock(s, M + 0.15, 4.85, 5.65, 1.75,
      "// Problem: Stockfish emits 20+ info lines/second\n" +
      "// Updating React state on every line = flickering UI\n\n" +
      "// Solution: throttle updates to 100ms intervals\n" +
      "const throttledUpdate = useThrottle((data) => {\n" +
      "  setEngineLines(data.lines);\n" +
      "  setCurrentDepth(data.depth);\n" +
      "  setEvaluation(data.score);\n" +
      "}, 100); // Max 10 updates/second\n\n" +
      "// Worker posts every info line; React processes 10/sec", { size: 8.5 });

    // Position change handling
    card(s, 6.75, 4.2, 5.98, 2.55);
    iconRow(s, I["FaSync"].gold, 6.95, 4.4, 0.4);
    s.addText("Position Change Handling", { x: 7.45, y: 4.42, w: 5, h: 0.34, fontFace: BF, fontSize: 14, bold: true, color: WHITE, margin: 0 });
    codeBlock(s, 6.9, 4.85, 5.68, 1.75,
      "// When user navigates to a new move:\nuseEffect(() => {\n  // 1. Stop current search immediately\n  liveWorker.send('stop');\n\n  // 2. Wait for engine to acknowledge\n  await liveWorker.waitForBestmove();\n\n  // 3. Start new search on new position\n  liveWorker.send('position fen ' + newFen);\n  liveWorker.send('go depth 20');\n\n  // 4. Reset depth indicator\n  setCurrentDepth(0);\n}, [currentPly]);  // Triggers on ply change", { size: 8.5 });

    addNotes(s,
      "The live engine feature provides real-time analysis as the user navigates through a game. When the user opens the Analysis tab, the live WASM worker automatically starts evaluating the current position. It shows the top 3 engine lines with their evaluations, and the depth indicator shows progress as the engine thinks deeper. A critical engineering challenge is UI flickering: Stockfish emits 20+ info lines per second, and updating React state on every line causes visual flickering. The solution is throttled updates at 100ms intervals, giving at most 10 smooth updates per second. When the user navigates to a different move, we need to handle position changes cleanly: stop the current search with the UCI 'stop' command, wait for the engine to acknowledge with a bestmove response, then start a new search on the new position. This prevents stale evaluations from appearing and ensures the engine is always analyzing the position the user is looking at.",
      ["Why throttle to 100ms specifically?", "What happens if the user clicks through moves very quickly?", "Does the live engine affect battery life?"],
      ["100ms gives 10 updates per second, which is visually smooth (human perception of animation is ~60fps, but text updates are legible at 10fps). Going faster causes text flickering; going slower makes the display feel laggy. 100ms is the sweet spot for evaluation text.",
        "Each ply change sends a 'stop' command followed by a new 'go' command. If the user clicks rapidly, the engine effectively does shallow searches (depth 2-3) on each position before being stopped. The depth indicator shows this: it never reaches high depths during fast navigation, which is correct behavior.",
        "The WASM worker consumes one CPU core at 100%. On mobile, this could affect battery life. The live engine only runs when the Analysis tab is active and stops when the user switches tabs. This is a deliberate optimization."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 20: PERFORMANCE & CACHING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Optimization", "Performance & Caching Strategy", 27);
    cornerMotif(s);

    // Three-level cache
    card(s, M, 1.5, 12.13, 2.5);
    s.addText("Three-Level Cache Architecture", { x: M + 0.3, y: 1.68, w: 11, h: 0.3, fontFace: BF, fontSize: 15, bold: true, color: GOLD, margin: 0 });

    const caches = [
      ["FaMemory", "L1: Server Memory", "In-memory Map\nPGN hash → report\nInstant lookup (< 1ms)\nLost on server restart\nUnbounded (limitation)", CYAN],
      ["FaDatabase", "L2: PostgreSQL", "analysis_runs table\nJSONB report column\nPersists across restarts\n~5ms lookup by hash\nPermanent storage", GREEN],
      ["FaHdd", "L3: Client IndexedDB", "Browser-side cache\n7-day TTL\n~50MB capacity\nNo server round-trip\nSurvives tab refresh", GOLD],
    ];
    caches.forEach(([icn, t, d, c], i) => {
      const x = M + 0.1 + i * 4.04;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.1, w: 3.84, h: 1.65, rectRadius: 0.04, fill: { color: "18181C" }, line: { color: c === CYAN ? "22D3EE" : c === GREEN ? "4ADE80" : "FFC62B", width: 1 } });
      iconRow(s, I[icn][c === CYAN ? "cyan" : c === GREEN ? "green" : "gold"], x + 1.52, 2.18, 0.36);
      s.addText(t, { x, y: 2.56, w: 3.84, h: 0.26, fontFace: BF, fontSize: 10.5, bold: true, color: c, align: "center", margin: 0 });
      s.addText(d, { x: x + 0.15, y: 2.84, w: 3.54, h: 0.85, fontFace: BF, fontSize: 8, color: MUTED, align: "center", margin: 0, fit: "shrink" });
    });

    // SSE streaming
    card(s, M, 4.2, 5.95, 2.55);
    iconRow(s, I["FaStream"].gold, M + 0.25, 4.4, 0.38);
    s.addText("SSE Streaming for Progress", { x: M + 0.72, y: 4.42, w: 5, h: 0.28, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0 });
    codeBlock(s, M + 0.15, 4.82, 5.65, 1.75,
      "// Server: SSE stream during analysis\nres.writeHead(200, {\n  'Content-Type': 'text/event-stream',\n  'Cache-Control': 'no-cache',\n  'Connection': 'keep-alive'\n});\n\n// Per-move events:\nres.write(`event: move\\ndata: ${JSON.stringify({\n  ply: 5, grade: 'Best', score: 45,\n  progress: '5/40 moves'\n})}\\n\\n`);\n\n// Client: EventSource listener updates UI live", { size: 8 });

    // Performance numbers
    card(s, 6.75, 4.2, 5.98, 2.55);
    iconRow(s, I["FaTachometerAlt"].gold, 6.95, 4.4, 0.38);
    s.addText("Performance Benchmarks", { x: 7.42, y: 4.42, w: 5, h: 0.28, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0 });
    const perfRows = [
      ["Operation", "Time", "Notes"],
      ["Quick analysis (30 moves)", "~15s", "Depth 18, streaming"],
      ["Deep analysis (30 moves)", "~90s", "Depth 24, background job"],
      ["Cached report load", "<100ms", "L1 hit (memory)"],
      ["Database report load", "~5ms", "L2 hit (PostgreSQL)"],
      ["IndexedDB report load", "~3ms", "L3 hit (browser)"],
      ["What-If evaluation", "<1s", "Depth 14, live worker"],
      ["AI coach report", "3-8s", "LLM inference + validation"],
    ];
    table(s, perfRows, { x: 6.95, y: 4.82, w: 5.55, colW: [2.3, 1.0, 2.25], rowH: 0.22, size: 8 });

    addNotes(s,
      "The three-level cache architecture ensures that analysis is expensive only once. Level 1 is an in-memory Map on the server, keyed by PGN hash - instant lookup under 1 millisecond, but lost on server restart and currently unbounded (a known limitation). Level 2 is PostgreSQL, where the analysis_runs table stores the full report as JSONB - ~5ms lookup, persistent across restarts. Level 3 is IndexedDB in the browser with a 7-day TTL and ~50MB capacity - completely eliminates server round-trips for repeat visits. SSE streaming solves the UX problem of long analysis: instead of showing a spinner for 15-90 seconds, we stream events per move so the user watches the analysis build in real-time. The performance benchmarks show the system in practice: quick analysis takes about 15 seconds for a 30-move game, deep analysis about 90 seconds, cached loads are under 100ms, and What-If evaluation is under 1 second.",
      ["Why is the server cache unbounded?", "How do you handle cache invalidation?", "What happens if the browser's IndexedDB is full?"],
      ["It is a known limitation listed in the appendix. In production, we would add an LRU eviction policy or use Redis with TTL. For the project scope with a single-user server, unbounded Maps are sufficient and simpler to implement.",
        "Analysis reports are immutable - once generated, they never change (the same PGN always produces the same analysis at the same depth). So there is no invalidation problem. If a user re-analyzes at a higher depth, it creates a new cache entry keyed by PGN hash + depth.",
        "IndexedDB has a generous quota (typically 50% of free disk space in Chrome). If it is full, the cache write fails silently and the next request goes to the server. The 7-day TTL ensures old entries are eventually cleaned up."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 21: CONCLUSION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = S();
    header(s, "Summary", "Conclusion: Technical Achievements");
    cornerMotif(s);

    card(s, M, 1.5, 12.13, 5.2);
    s.addText("Every feature is backed by real algorithms, real engineering decisions, and real running code.", {
      x: M + 0.4, y: 1.78, w: 11.3, h: 0.45, fontFace: TF, fontSize: 15, italic: true, color: GOLD, margin: 0, fit: "shrink",
    });

    const achievements = [
      ["FaChessRook", "Engine Integration", "Stockfish 18 via UCI (native + WASM) with TypeScript fallback engine (alpha-beta + neural eval)"],
      ["FaChartLine", "CAPS v2 Accuracy", "Sigmoid win-probability curve, per-move CAPS scores, 9-grade classification decision tree"],
      ["FaBolt", "Brilliant Detection", "Three-condition algorithm using MultiPV analysis — only truly creative, unique moves qualify"],
      ["FaBrain", "AI Coaching Pipeline", "Prompt engineering → Zod validation → structured JSON → deterministic fallback"],
      ["FaCode", "WebAssembly Engine", "Stockfish compiled to WASM, running in Web Workers with hash URL trick for loading"],
      ["FaNetworkWired", "Dual-Worker Architecture", "Heavy + Live workers: independent WASM instances that never block each other"],
      ["FaDatabase", "Data Architecture", "12-table PostgreSQL schema, JSONB reports, 3-driver pattern, 3-level caching"],
      ["FaLock", "Security by Design", "scrypt passwords, HMAC sessions, OAuth PKCE, rate limiting, Zod input validation"],
    ];
    let ay = 2.35;
    achievements.forEach(([icn, t, d], i) => {
      const x = M + 0.2 + (i % 2) * 5.95;
      const y = 2.35 + Math.floor(i / 2) * 1.05;
      iconRow(s, I[icn].gold, x + 0.1, y + 0.08, 0.34);
      s.addText(t, { x: x + 0.55, y, w: 5.1, h: 0.32, fontFace: BF, fontSize: 11.5, bold: true, color: WHITE, margin: 0, valign: "middle" });
      s.addText(d, { x: x + 0.55, y: y + 0.34, w: 5.1, h: 0.55, fontFace: BF, fontSize: 9, color: MUTED, margin: 0, fit: "shrink", valign: "top" });
    });

    s.addText("Every claim in this presentation is traceable to the repository. Every limitation is stated openly.", {
      x: M + 0.4, y: 6.4, w: 11.3, h: 0.3, fontFace: BF, fontSize: 11.5, bold: true, italic: true, color: GOLD, margin: 0, align: "center",
    });

    addNotes(s,
      "To summarize the technical achievements: we integrated Stockfish 18 through the UCI protocol in both native and WebAssembly builds, with a TypeScript fallback engine as insurance. We implemented the CAPS v2 accuracy system with the sigmoid win-probability curve and a 9-grade classification decision tree. Brilliant move detection uses a three-condition algorithm that ensures only truly unique, creative moves qualify. The AI coaching pipeline includes prompt engineering, Zod schema validation, structured JSON output, and deterministic fallback. The WebAssembly engine runs in Web Workers with the hash URL trick for production loading. The dual-worker architecture prevents analysis and What-If from blocking each other. The data architecture spans 12 PostgreSQL tables with JSONB reports, a 3-driver pattern, and 3-level caching. Security is designed in with scrypt, HMAC, PKCE, rate limiting, and Zod validation. Every claim maps to code; every limitation is stated openly.",
      ["What was the hardest technical challenge?", "What would you do differently?", "What did you learn most from?"],
      ["The engine pipeline: normalizing scores across different depths, handling mate scores, ensuring the classification thresholds produce realistic grade distributions across rating ranges, and making the fallback engine's quiescence search correct. Correctness here affects every downstream feature.",
        "I would have started with PostgreSQL from day one instead of building the memory driver first. The driver pattern is elegant but the memory driver consumed development time that could have gone into more features.",
        "The WebAssembly integration taught me the most. Understanding Emscripten compilation, Web Worker communication patterns, the SharedArrayBuffer trade-off, and the hash URL trick for production builds was a deep dive into browser internals I would not have encountered otherwise."]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDE 22: THANK YOU / Q&A
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide();
    bg(s);
    for (let i = 0; i < 10; i++) {
      s.addShape(pres.shapes.RECTANGLE, { x: i * (W / 10), y: H - 0.34, w: W / 10, h: 0.34, fill: { color: i % 2 === 0 ? "1C1C20" : "131316" }, line: { type: "none" } });
    }
    s.addShape(pres.shapes.RECTANGLE, { x: W / 2 - 2.2, y: H - 0.34, w: 4.4, h: 0.34, fill: { color: GOLD }, line: { type: "none" } });

    s.addImage({ data: I["FaChessKnight"].gold, x: (W - 1.2) / 2, y: 0.9, w: 1.2, h: 1.2 });
    s.addText("Thank You", { x: 0, y: 2.3, w: W, h: 0.9, fontFace: TF, fontSize: 52, bold: true, color: WHITE, align: "center" });
    s.addText("Questions & Discussion", { x: 0, y: 3.3, w: W, h: 0.4, fontFace: BF, fontSize: 16, color: GOLD, align: "center" });

    s.addShape(pres.shapes.LINE, { x: W / 2 - 2, y: 4.0, w: 4, h: 0, line: { color: GOLD, width: 1 } });

    s.addText("[Your Name]  ·  [Register Number]  ·  [Email]", { x: 0, y: 4.3, w: W, h: 0.4, fontFace: BF, fontSize: 13, color: MUTED, align: "center" });
    s.addText("Source: Private Repository  |  Live Demo: Local Build", { x: 0, y: 4.8, w: W, h: 0.35, fontFace: BF, fontSize: 11, color: FAINT, align: "center" });

    // Key topics for Q&A
    card(s, W / 2 - 4.5, 5.3, 9.0, 1.3, CARD2);
    s.addText("Key Technical Topics Covered", { x: W / 2 - 4.2, y: 5.45, w: 8.4, h: 0.28, fontFace: BF, fontSize: 11, bold: true, color: GOLD, align: "center", margin: 0 });
    s.addText("Analysis Pipeline  ·  CAPS v2 Accuracy  ·  Win Probability Sigmoid  ·  Move Classification  ·  Brilliant Detection\nWebAssembly Engine  ·  Dual-Worker Architecture  ·  AI Coaching Pipeline  ·  Database Design  ·  Security Implementation", {
      x: W / 2 - 4.2, y: 5.78, w: 8.4, h: 0.7, fontFace: BF, fontSize: 10, color: MUTED, align: "center", margin: 0, fit: "shrink",
    });

    addNotes(s,
      "Thank the panel. This presentation covered the deep technical internals of Chessfork: the 6-step analysis pipeline, CAPS v2 accuracy with the sigmoid win-probability curve, the 9-grade classification decision tree, Brilliant move detection, WebAssembly engine in the browser, dual-worker architecture, the AI coaching pipeline with prompt engineering and Zod validation, database design patterns, security implementation, and performance optimizations. Every algorithm, formula, and architecture decision presented here has running code behind it. Offer a live demo: import the built-in demo game, show the analysis streaming, open the report with grades and accuracy, try a What-If move, and generate the AI coach report. Invite questions on any technical topic covered.",
      ["Can you show us the code?", "How would this scale to many users?", "What is the one thing you are most proud of?"],
      ["Yes — the repository is organized by feature: analysis pipeline in src/lib/chess, engine integration in src/server/stockfish, AI coaching in src/app/api/ai-coach, classification in src/lib/chess/grades. I can navigate to any function discussed today.",
        "The architecture is already designed for horizontal scaling: the stateless API layer can run multiple instances behind a load balancer, PostgreSQL handles concurrent reads, Redis/BullMQ distributes analysis jobs, and the WASM engine runs entirely client-side. The main bottleneck would be LLM API rate limits, which are handled by the provider's infrastructure.",
        "The Brilliant move detection algorithm. It is a small function, but it captures something genuinely creative about chess — finding the one move that nobody else would see. Making that computable and fair across all positions was deeply satisfying."]);
  }

  // ─── WRITE FILE ──────────────────────────────────────────────────────────
  await pres.writeFile({ fileName: "C:/Projects/Chessfork/Chessfork-Deep-Technical.pptx" });
  console.log("DONE — slides:", pres.slides ? pres.slides.length : "n/a");
})().catch((e) => {
  console.error("BUILD FAILED:", e);
  process.exit(1);
});
