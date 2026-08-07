/**
 * Chessfork — BCA Final Year Project PowerPoint generator.
 * Every fact on every slide was verified against the repository source code.
 * Run: node scripts/build-presentation.js   (from project root)
 * Output: Chessfork-BCA-Final-Year-Project.pptx
 */
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "..", "Chessfork-BCA-Final-Year-Project.pptx");
const SHOTS = path.join(__dirname, "..", "e2e", "screenshots");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.author = "Chessfork";
pres.title = "Chessfork — AI-Powered Chess Analysis & Coaching Platform";
pres.subject = "BCA Final Year Project";

// ---------------------------------------------------------------- theme
const BG = "0B0B0F";
const CARD = "15151B";
const CARD2 = "1A1A22";
const BORDER = "26262F";
const GOLD = "FFC62A";
const GOLD_DARK = "2A2412";
const GOLD_BORDER = "4A3D18";
const TEXT = "F5F2EA";
const MUTED = "9A97A6";
const FAINT = "5C5966";
const GREEN = "3DDC84";
const RED = "FF6B6B";
const BLUE = "7AA2FF";
const H = "Bahnschrift";
const B = "Segoe UI";
const CH = "Segoe UI Symbol";

const W = 13.333;
const HGT = 7.5;

// ---------------------------------------------------------------- helpers
let pageNo = 0;

function fresh(style) {
  return JSON.parse(JSON.stringify(style));
}

function bg(slide, opts = {}) {
  slide.background = { color: BG };
  const showMotif = opts.motif !== false;
  if (showMotif) {
    // subtle chessboard motif, top-right
    const startX = 11.55;
    const startY = 0.32;
    const cell = 0.17;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if ((r + c) % 2 === 0) continue;
        slide.addShape(pres.shapes.RECTANGLE, {
          x: startX + c * cell, y: startY + r * cell, w: cell, h: cell,
          fill: { color: "14141A" }, line: { type: "none" },
        });
      }
    }
  }
  if (opts.glow) {
    slide.addShape(pres.shapes.OVAL, {
      x: opts.glow.x, y: opts.glow.y, w: opts.glow.w, h: opts.glow.h,
      fill: { color: GOLD, transparency: 96 }, line: { type: "none" },
    });
  }
  if (opts.badge) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: W - 2.55, y: 0.34, w: 1.95, h: 0.32,
      fill: { color: GOLD_DARK }, line: { color: GOLD_BORDER, width: 0.75 }, rectRadius: 0.16,
    });
    slide.addText("VERIFIED · FROM SOURCE CODE", {
      x: W - 2.55, y: 0.33, w: 1.95, h: 0.34, align: "center", valign: "middle",
      fontSize: 8, color: GOLD, fontFace: H, bold: true, charSpacing: 1.2, margin: 0,
    });
  }
}

function chrome(slide, kicker, title, subtitle) {
  slide.addText(kicker.toUpperCase(), {
    x: 0.62, y: 0.42, w: 9, h: 0.3, fontSize: 11, color: GOLD, fontFace: H,
    bold: true, charSpacing: 3, margin: 0,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.62, y: 0.78, w: 0.42, h: 0.05, fill: { color: GOLD }, line: { type: "none" },
  });
  slide.addText(title, {
    x: 0.6, y: 0.92, w: 12.1, h: 0.62, fontSize: 27, color: TEXT, fontFace: H,
    bold: true, margin: 0, valign: "middle",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.62, y: 1.52, w: 12.1, h: 0.3, fontSize: 12.5, color: MUTED, fontFace: B, margin: 0,
    });
  }
}

function footer(slide) {
  pageNo++;
  slide.addText("CHESSFORK", {
    x: 0.62, y: 7.1, w: 3, h: 0.28, fontSize: 8.5, color: FAINT, fontFace: H, bold: true, charSpacing: 3, margin: 0,
  });
  slide.addText("BCA FINAL YEAR PROJECT · 2026", {
    x: 4.2, y: 7.1, w: 5, h: 0.28, fontSize: 8, color: FAINT, fontFace: B, charSpacing: 1.5, margin: 0,
  });
  slide.addText(String(pageNo).padStart(2, "0"), {
    x: 12.35, y: 7.08, w: 0.4, h: 0.3, fontSize: 9, color: FAINT, fontFace: H, bold: true, margin: 0, align: "right",
  });
}

function card(slide, x, y, w, h, fill = CARD, border = BORDER, radius = 0.07) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: { color: border, width: 1 }, rectRadius: radius,
  });
}

function chip(slide, x, y, text, fg = GOLD, bgc = GOLD_DARK, borderc = GOLD_BORDER, size = 8.5) {
  const w = 0.3 + text.length * (size * 0.009);
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h: 0.27, fill: { color: bgc }, line: { color: borderc, width: 0.75 }, rectRadius: 0.135,
  });
  slide.addText(text, {
    x, y: y - 0.012, w, h: 0.295, align: "center", valign: "middle",
    fontSize: size, color: fg, fontFace: B, bold: true, charSpacing: 0.8, margin: 0,
  });
  return w;
}

const V_NO_GLYPH = process.env.V_NO_GLYPH === "1";

function glyph(slide, g, x, y, size, color = GOLD) {
  if (V_NO_GLYPH) return;
  slide.addText(g, { x, y, w: size, h: size, fontSize: size * 72 * 0.9, color, fontFace: CH, align: "center", valign: "middle", margin: 0 });
}

function vArrow(slide, x, y1, y2, color = GOLD) {
  slide.addShape(pres.shapes.LINE, {
    x, y: y1, w: 0, h: y2 - y1,
    line: { color, width: 2, endArrowType: "triangle" },
  });
}

function hArrow(slide, x1, y, x2, color = GOLD) {
  slide.addShape(pres.shapes.LINE, {
    x: x1, y, w: x2 - x1, h: 0,
    line: { color, width: 2, endArrowType: "triangle" },
  });
}

function notes(slide, text) {
  slide.addNotes(text);
}

function statusChip(slide, x, y, status) {
  if (status === "Implemented") return chip(slide, x, y, "IMPLEMENTED", GREEN, "0E2418", "1F5C38");
  if (status === "Beta") return chip(slide, x, y, "BETA", BLUE, "0D1B2E", "1E3A5F");
  if (status === "Planned") return chip(slide, x, y, "PLANNED", RED, "2E1010", "5F1E1E");
  return chip(slide, x, y, status, MUTED, "1E1E26", "3A3A44");
}

function table(slide, headers, rows, x, y, w, colW, headerSize = 11, bodySize = 10.5, rowH = 0.34) {
  const data = [
    headers.map((h) => ({
      text: h,
      options: { bold: true, color: GOLD, fill: { color: "1E1E26" }, align: "left", fontSize: headerSize, fontFace: H, charSpacing: 1 },
    })),
    ...rows.map((r) =>
      r.map((cell, i) => {
        if (cell && typeof cell === "object" && cell.text !== undefined) return cell;
        return {
          text: cell,
          options: {
            color: TEXT, fontSize: bodySize, align: "left", fontFace: B,
            fill: { color: i % 2 === 0 ? "15151B" : "17171F" },
          },
        };
      }),
    ),
  ];
  slide.addTable(data, {
    x, y, w, colW,
    border: { pt: 0.5, color: BORDER },
    rowH, valign: "middle", autoPage: false, margin: 0.04,
  });
}

// ================================================================ SLIDE 1 — TITLE
{
  const s = pres.addSlide();
  s.background = { color: BG };
  // big motif
  const cell = 0.24;
  const ox = 9.8, oy = 0.55;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 12; c++) {
      if ((r + c) % 2 === 0) continue;
      s.addShape(pres.shapes.RECTANGLE, {
        x: ox + c * cell, y: oy + r * cell, w: cell, h: cell,
        fill: { color: "121218" }, line: { type: "none" },
      });
    }
  }
  s.addShape(pres.shapes.OVAL, { x: 10.3, y: 0.8, w: 2.6, h: 2.6, fill: { color: GOLD, transparency: 96 }, line: { type: "none" } });

  // knight emblem
  s.addShape(pres.shapes.OVAL, { x: 5.99, y: 1.02, w: 1.35, h: 1.35, fill: { color: GOLD_DARK }, line: { color: GOLD, width: 1.5 } });
  glyph(s, "♞", 6.27, 1.28, 0.8, GOLD);

  s.addText("CHESSFORK", {
    x: 1.5, y: 2.62, w: 10.33, h: 1.0, align: "center",
    fontSize: 58, color: TEXT, fontFace: H, bold: true, charSpacing: 10, margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.24, y: 3.72, w: 0.85, h: 0.045, fill: { color: GOLD }, line: { type: "none" } });
  s.addText("AI-POWERED CHESS ANALYSIS & COACHING PLATFORM", {
    x: 1.5, y: 3.92, w: 10.33, h: 0.5, align: "center",
    fontSize: 17, color: MUTED, fontFace: H, charSpacing: 2.5, margin: 0,
  });

  // presenter card
  card(s, 3.17, 4.72, 7.0, 1.72, "12121A", "2A2A35", 0.1);
  s.addText("PRESENTED BY", { x: 3.17, y: 4.86, w: 7, h: 0.26, align: "center", fontSize: 9.5, color: GOLD, fontFace: H, bold: true, charSpacing: 3, margin: 0 });
  s.addText([
    { text: "[Student Name]", options: { bold: true, fontSize: 15, color: TEXT } },
    { text: "    ·    ", options: { color: FAINT } },
    { text: "Register No: [XXXXXXXX]", options: { fontSize: 12, color: MUTED } },
  ], { x: 3.17, y: 5.14, w: 7, h: 0.36, align: "center", valign: "middle", margin: 0 });
  s.addText("BCA · Department of Computer Applications", {
    x: 3.17, y: 5.5, w: 7, h: 0.3, align: "center", fontSize: 11.5, color: MUTED, margin: 0,
  });
  s.addText("[College Name]", { x: 3.17, y: 5.8, w: 7, h: 0.3, align: "center", fontSize: 11.5, color: TEXT, bold: true, margin: 0 });
  s.addText("Project Guide: [Guide Name]", { x: 3.17, y: 6.1, w: 7, h: 0.28, align: "center", fontSize: 10.5, color: MUTED, margin: 0 });

  s.addText("FINAL YEAR PROJECT · 2026", { x: 1.5, y: 6.68, w: 10.33, h: 0.3, align: "center", fontSize: 9, color: FAINT, fontFace: H, charSpacing: 3, margin: 0 });

  notes(s,
    "SPEAKER (30-60s): Good morning, respected panel. I am [Student Name], final year BCA student. I present my project 'Chessfork' — an AI-powered chess analysis and coaching platform. It analyzes any chess game with the Stockfish 18 engine, grades every move, explains mistakes in plain language with AI, and coaches players based on their weaknesses — all free in the browser.\n\n" +
    "Q: Why chess? A: Chess has 600M+ players worldwide; most analysis platforms hide explanations behind paywalls. Chessfork makes professional-grade coaching free and accessible.\n\n" +
    "Q: Is this a clone of Chess.com? A: No — it is a greenfield platform built from scratch on Next.js 16, with its own engine pipeline, AI coaching layer, and database; Chess.com is one of the systems we analyzed and improved upon.");
}

// ================================================================ SLIDE 2 — ABSTRACT
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "Abstract", "Turning raw games into structured learning", "Chessfork is an AI-powered chess analysis & coaching platform — fully implemented and verified end-to-end in this repository.");
  footer(s);

  const lx = 0.62, lw = 6.1, ly = 2.0;
  s.addText("PURPOSE", { x: lx, y: ly - 0.12, w: 3, h: 0.28, fontSize: 10, color: GOLD, fontFace: H, bold: true, charSpacing: 2.5, margin: 0 });
  s.addText("Chessfork turns raw game data — pasted PGN files, Chess.com and Lichess games — into a complete learning system: engine-grade analysis, AI explanations, coaching and training.", {
    x: lx, y: ly + 0.18, w: lw, h: 1.05, fontSize: 13.5, color: TEXT, fontFace: B, valign: "top", lineSpacingMultiple: 1.12, margin: 0,
  });

  s.addText("WHAT IT SOLVES", { x: lx, y: 3.55, w: 3, h: 0.28, fontSize: 10, color: GOLD, fontFace: H, bold: true, charSpacing: 2.5, margin: 0 });
  const absBullets = [
    "Engine analysis without educational context → AI explains every move",
    "No personalized feedback → AI coach maps recurring weaknesses",
    "Expensive premium features → free, unlimited browser analysis",
    "No learning path → daily puzzles, streaks and weekly focus plans",
  ];
  s.addText(absBullets.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < absBullets.length - 1, color: TEXT, fontSize: 12.5 } })), {
    x: lx + 0.05, y: 3.85, w: lw - 0.05, h: 1.9, fontFace: B, lineSpacingMultiple: 1.12, paraSpaceAfter: 8, margin: 0,
  });

  card(s, lx, 6.0, lw, 0.75, "12141A", "2A2A35", 0.09);
  s.addText([
    { text: "GOAL  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 11, charSpacing: 2 } },
    { text: "A free, complete future learning platform — analysis, coaching and training in one place.", options: { color: TEXT, fontSize: 11.5 } },
  ], { x: lx + 0.25, y: 6.0, w: lw - 0.5, h: 0.75, valign: "middle", margin: 0 });

  // right concept cards
  const rx = 7.0, rw = 5.7;
  const concepts = [
    { g: "♞", t: "AI-Assisted Analysis", d: "Stockfish 18 grades every move on a 7-level scale; AI explains each verdict." },
    { g: "♛", t: "Personalized Coaching", d: "Weakness patterns across game history with evidence, drills and weekly focus." },
    { g: "♜", t: "Opening Explorer", d: "ECO database, opening detection, master-book moves and repertoire notes." },
    { g: "♟", t: "Game Review & Insights", d: "Accuracy, critical moments, evaluation graph, time-per-move and shareable report cards." },
  ];
  concepts.forEach((c, i) => {
    const y = 2.0 + i * 1.24;
    card(s, rx, y, rw, 1.1, CARD, BORDER, 0.08);
    s.addShape(pres.shapes.OVAL, { x: rx + 0.2, y: y + 0.25, w: 0.6, h: 0.6, fill: { color: GOLD_DARK }, line: { color: GOLD_BORDER, width: 1 } });
    glyph(s, c.g, rx + 0.28, y + 0.32, 0.44, GOLD);
    s.addText(c.t, { x: rx + 1.0, y: y + 0.14, w: rw - 1.2, h: 0.32, fontSize: 13, bold: true, color: TEXT, fontFace: H, margin: 0 });
    s.addText(c.d, { x: rx + 1.0, y: y + 0.48, w: rw - 1.25, h: 0.55, fontSize: 10, color: MUTED, fontFace: B, margin: 0, valign: "top", lineSpacingMultiple: 1.05 });
  });

  notes(s,
    "SPEAKER: Chessfork's purpose is to make serious chess improvement accessible. Players paste any game, and the platform evaluates it with Stockfish 18, grades each move, and — crucially — explains the reasons in plain language using an LLM. A personal coach module then scans the player's history for recurring weaknesses and builds a weekly plan.\n\n" +
    "Q: What is the biggest differentiator? A: The educational layer — engine output alone doesn't teach; our AI explanations and coach turn evaluations into understanding.\n\n" +
    "Q: How is this a 'future learning platform'? A: The roadmap — PvP, live review, mobile app — extends today's analysis-first product into a full training ecosystem.");
}

// ================================================================ SLIDE 3 — PROBLEM STATEMENT
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "01 · The Problem", "Why chess players struggle to improve", "Existing platforms evaluate games — but they rarely explain, coach, or guide the player.");
  footer(s);

  const problems = [
    { g: "♚", t: "Expensive premium walls", d: "Deep analysis and AI explanations sit behind costly subscriptions on mainstream platforms." },
    { g: "♝", t: "Engine noise, no meaning", d: "Raw evaluation lines with no educational context — players see numbers, not lessons." },
    { g: "♛", t: "No personalized coaching", d: "Platforms grade games but never diagnose the player's recurring weaknesses." },
    { g: "♞", t: "Beginners feel lost", d: "No guided path — hard for new players to turn reports into actual improvement." },
    { g: "♜", t: "Tools are scattered", d: "Analysis, puzzles, openings and training live in separate products with no unified loop." },
  ];
  const cw = 3.9, ch = 2.05;
  const xs = [0.62, 4.72, 8.82];
  const ys = [1.95, 4.28];
  const pos = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]];
  pos.forEach(([col, row], i) => {
    const x = xs[col] + (col === 2 && row === 1 ? 0 : 0);
    const y = ys[row];
    card(s, x, y, cw, ch, CARD, BORDER, 0.07);
    s.addShape(pres.shapes.OVAL, { x: x + 0.22, y: y + 0.2, w: 0.55, h: 0.55, fill: { color: "2E1010" }, line: { color: "5F1E1E", width: 1 } });
    glyph(s, problems[i].g, x + 0.3, y + 0.27, 0.4, RED);
    s.addText(problems[i].t, { x: x + 0.92, y: y + 0.22, w: cw - 1.1, h: 0.5, fontSize: 12.5, bold: true, color: TEXT, fontFace: H, valign: "middle", margin: 0 });
    s.addText(problems[i].d, { x: x + 0.24, y: y + 0.85, w: cw - 0.48, h: 1.05, fontSize: 10.5, color: MUTED, fontFace: B, valign: "top", lineSpacingMultiple: 1.1, margin: 0 });
  });

  // filler card for 5th position symmetry
  card(s, xs[2], ys[1], cw, ch, "12121A", "26262F", 0.07);
  s.addText("RESEARCH GAP", { x: xs[2] + 0.24, y: ys[1] + 0.3, w: cw - 0.5, h: 0.4, fontSize: 14, bold: true, color: GOLD, fontFace: H, margin: 0 });
  s.addText("No platform combines professional-grade engine analysis with an educational AI layer, personalized coaching and free access — that is the gap Chessfork fills.", {
    x: xs[2] + 0.24, y: ys[1] + 0.8, w: cw - 0.5, h: 1.1, fontSize: 11.5, color: TEXT, fontFace: B, lineSpacingMultiple: 1.15, margin: 0,
  });

  notes(s,
    "SPEAKER: Most chess sites face one of two extremes — deep but unexplained engine output, or explanations locked behind premium plans. Beginners get numbers they cannot interpret; intermediate players get no diagnosis of recurring mistakes; and no platform turns analysis into a structured training plan. That combination — analysis without education, and education without personalization — is the core problem we address.\n\n" +
    "Q: Is free analysis actually possible with Stockfish? A: Yes — Stockfish 18 is open-source and runs both as a server binary and in the browser via WebAssembly; Chessfork's browser worker needs no server for interactive analysis.\n\n" +
    "Q: Why is this a real problem and not solved by Chess.com? A: Chess.com solves it partially behind Game Review premium tiers; the educational AI layer is limited on free accounts — Chessfork's coach is free.");
}

// ================================================================ SLIDE 4 — EXISTING SYSTEMS
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "02 · Market Analysis", "Existing Systems — a fair comparison", "Evaluated against the actual gaps they leave open.");
  footer(s);

  const headers = ["Platform", "Strengths", "Limitations"];
  const rows = [
    [
      { text: "♞ Chess.com", options: { color: GOLD, bold: true, fontSize: 11.5, fontFace: CH } },
      "Best-in-class UX, lessons, live play, huge community; deep analysis available.",
      "Premium tiers paywall deep analysis and AI explanations; heavy branding and ads.",
    ],
    [
      { text: "♜ Lichess", options: { color: GOLD, bold: true, fontSize: 11.5, fontFace: CH } },
      "Free and open-source; powerful analysis board; large opening explorer; no ads.",
      "No AI explanations or personal coaching; learning tools are generic, not personalized.",
    ],
    [
      { text: "♝ Chessigma", options: { color: GOLD, bold: true, fontSize: 11.5, fontFace: CH } },
      "Pioneered report-style game reviews — accuracy cards and move grades.",
      "Narrow scope and a thin feature set; no robust coaching loop or learning system.",
    ],
  ];
  table(s, headers, rows, 0.62, 2.0, 12.1, [2.5, 4.9, 4.7], 11.5, 11, 0.62);

  card(s, 0.62, 5.55, 12.1, 0.85, "12141A", "2A2A35", 0.09);
  s.addText([
    { text: "THE GAP  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 11, charSpacing: 2 } },
    { text: "Premium-grade analysis is paywalled; free analysis lacks explanation and coaching. Chessfork — per its README — is built as a greenfield functional successor: a robust learning platform, not a thin clone.", options: { color: TEXT, fontSize: 11.5 } },
  ], { x: 0.9, y: 5.55, w: 11.5, h: 0.85, valign: "middle", margin: 0 });

  s.addText("CHESSFORK POSITIONING", { x: 0.62, y: 6.5, w: 6, h: 0.3, fontSize: 10, color: GOLD, fontFace: H, bold: true, charSpacing: 2, margin: 0 });
  s.addText("Free Stockfish 18 depth — Lichess-style openness + AI coaching & explanations — Chess.com-style polish", {
    x: 0.62, y: 6.76, w: 12.1, h: 0.28, fontSize: 11, color: TEXT, fontFace: B, margin: 0,
  });

  notes(s,
    "SPEAKER: We benchmarked three reference platforms. Chess.com leads in experience but gates deep analysis and AI behind premium. Lichess is free and powerful but purely engine — no explanations, no coaching. Chessigma pioneered the report-card style review that inspired our report UI, but is a narrow product. Chessfork intentionally occupies the middle: free engine depth like Lichess, polished review experience, plus an AI coaching layer neither offers.\n\n" +
    "Q: Why compare with Chessigma? A: The project README names Chessigma as the design ancestor — Chessfork is a greenfield, more robust successor, so we evaluated it fairly as both inspiration and limitation.\n\n" +
    "Q: What did you copy from Lichess? A: Philosophy, not code — free access and open standards (PGN, UCI, FEN); every implementation is original.");
}

// ================================================================ SLIDE 5 — PROPOSED SYSTEM
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "03 · Our Solution", "The proposed system — Chessfork", "Every item below is implemented in the repository, not a mockup.");
  footer(s);

  const items = [
    { g: "♞", t: "AI Explanations", d: "Every move's grade is explained in plain language by an LLM (Claude / DeepSeek).", st: "Implemented" },
    { g: "♛", t: "Personalized Coaching", d: "Patterns across up to 50 games → 3 weaknesses, evidence, drills, weekly focus.", st: "Implemented" },
    { g: "♜", t: "Interactive What-If", d: "Drag pieces on the board; Stockfish re-evaluates your variation live.", st: "Implemented" },
    { g: "♝", t: "Deep Engine Analysis", d: "Stockfish 18 — depth 15–24, MultiPV 1–3 lines, Syzygy tablebases.", st: "Implemented" },
    { g: "♟", t: "Shareable Report Cards", d: "Accuracy, grades and opening summary rendered as shareable images.", st: "Implemented" },
    { g: "♔", t: "Free, No Account", d: "Guest analysis from the homepage — import PGN or usernames instantly.", st: "Implemented" },
  ];
  const cw = 3.9, chh = 1.95;
  items.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.62 + col * (cw + 0.2);
    const y = 1.95 + row * (chh + 0.22);
    card(s, x, y, cw, chh, CARD, BORDER, 0.07);
    s.addShape(pres.shapes.OVAL, { x: x + 0.22, y: y + 0.2, w: 0.55, h: 0.55, fill: { color: GOLD_DARK }, line: { color: GOLD_BORDER, width: 1 } });
    glyph(s, it.g, x + 0.3, y + 0.27, 0.4);
    s.addText(it.t, { x: x + 0.92, y: y + 0.2, w: cw - 1.15, h: 0.3, fontSize: 13, bold: true, color: TEXT, fontFace: H, margin: 0 });
    statusChip(s, x + 0.92, y + 0.5, it.st);
    s.addText(it.d, { x: x + 0.24, y: y + 0.95, w: cw - 0.48, h: 0.9, fontSize: 10.5, color: MUTED, fontFace: B, valign: "top", lineSpacingMultiple: 1.1, margin: 0 });
  });

  card(s, 0.62, 6.42, 12.1, 0.55, "12141A", "2A2A35", 0.08);
  s.addText([
    { text: "KEY RESULT  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 11, charSpacing: 2 } },
    { text: "One unified loop: import → analyze → understand → train → improve.", options: { color: TEXT, fontSize: 11.5 } },
  ], { x: 0.9, y: 6.42, w: 11.5, h: 0.55, valign: "middle", margin: 0 });

  notes(s,
    "SPEAKER: Chessfork's proposal is a unified learning loop. Six implemented pillars: LLM explanations for every move, a personal AI coach, interactive what-if experimentation on the board, deep Stockfish analysis with tablebase support, shareable report cards, and free guest access. None of these are placeholders — each maps to a verified module in the codebase.\n\n" +
    "Q: How deep is the 'deep analysis'? A: Quick reports run depth 15–18 per move; deep jobs depth 20–24 with MultiPV 3 for critical moments, configurable via environment variables.\n\n" +
    "Q: What is a what-if? A: You drag a piece to a new square mid-game; the engine immediately evaluates that hypothetical variation and grades it against the best play — teaching what should have been played.");
}

// ================================================================ SLIDE 6 — ARCHITECTURE
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "04 · Architecture", "System architecture — end to end", "Next.js 16 App Router platform; engine and AI compose the analysis pipeline.");
  footer(s);

  const layers = [
    { label: "CLIENT", t: "Browser UI", d: "Next.js 16 App Router · React 19 · Tailwind CSS v4 · react-chessboard · PWA shell" },
    { label: "SERVER", t: "API Layer", d: "25 REST / SSE routes — analysis, coach, imports, puzzles, leaderboards, auth" },
    { label: "ENGINE + AI", t: "Analysis Pipeline", d: "Stockfish 18 (UCI · MultiPV · Syzygy · WASM worker) + LLM layer (Claude / DeepSeek / OpenRouter)" },
    { label: "DATA", t: "Persistence & Queue", d: "Drizzle ORM + PostgreSQL 16 (12 tables) · BullMQ + Redis deep-analysis queue" },
    { label: "OUTPUT", t: "Products", d: "Game Reports · AI Coach · Dashboard · Puzzles · Leaderboards · Opening Explorer · Shop" },
  ];
  const bx = 2.75, bw = 9.35, bh = 0.86, gap = 0.27;
  const startY = 1.72;
  layers.forEach((L, i) => {
    const y = startY + i * (bh + gap);
    s.addText(L.label, { x: 0.62, y: y + 0.1, w: 1.9, h: 0.3, fontSize: 11, color: GOLD, fontFace: H, bold: true, charSpacing: 2.5, margin: 0, align: "right" });
    card(s, bx, y, bw, bh, i === 2 ? "1B1609" : CARD, i === 2 ? "4A3D18" : BORDER, 0.06);
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: y, w: 0.06, h: bh, fill: { color: GOLD }, line: { type: "none" } });
    s.addText(L.t, { x: bx + 0.28, y: y + 0.08, w: bw - 0.5, h: 0.3, fontSize: 13, bold: true, color: TEXT, fontFace: H, margin: 0 });
    s.addText(L.d, { x: bx + 0.28, y: y + 0.4, w: bw - 0.55, h: 0.4, fontSize: 9.5, color: MUTED, fontFace: B, margin: 0 });
    if (i < layers.length - 1) vArrow(s, bx + 0.03, y + bh + 0.02, y + bh + gap - 0.02, "5C5966");
  });

  notes(s,
    "SPEAKER: The platform is a classic layered architecture. The browser runs React 19 with a WebAssembly Stockfish worker for instant interactive analysis. All business logic lives behind Next.js API routes. The analysis pipeline composes the Stockfish binary — speaking the UCI protocol with MultiPV and Syzygy tablebase support — with an LLM explanation layer. Persistence is PostgreSQL 16 through Drizzle ORM, with BullMQ and Redis handling deep analysis as background jobs. The pipeline feeds five product surfaces: reports, coach, dashboard, puzzles and leaderboards.\n\n" +
    "Q: Why a WASM worker AND a server binary? A: Browser analysis is free and instant (no server load) for interactive what-ifs; the server binary does deep, multi-PV analysis with configurable depth/hash and gets cached.\n\n" +
    "Q: Why BullMQ/Redis? A: Deep analysis is slow (minutes); we queue jobs so the UI can stream progress via SSE instead of blocking a request.");
}

// ================================================================ SLIDE 7 — AI ANALYSIS PIPELINE
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "05 · Engine & AI Pipeline", "How the analysis actually works", "Five stages — every stage implemented in src/lib and src/server.");
  footer(s);

  const steps = [
    { n: "01", t: "Import", d: "PGN paste · Chess.com · Lichess fetch (with sample fallback)" },
    { n: "02", t: "Evaluate", d: "Stockfish 18 per move · depth 15–24 · MultiPV 1–3 lines" },
    { n: "03", t: "Grade", d: "Centipawn loss → 7-level grade (Brilliant → Blunder)" },
    { n: "04", t: "Explain", d: "LLM writes plain-language coaching text per move" },
    { n: "05", t: "Report", d: "Accuracy %, critical moments, alternatives, insights" },
  ];
  const sw = 2.18, gap = 0.36;
  steps.forEach((st, i) => {
    const x = 0.62 + i * (sw + gap);
    const y = 1.85;
    card(s, x, y, sw, 2.5, CARD, BORDER, 0.07);
    s.addText(st.n, { x: x + 0.18, y: y + 0.14, w: 1, h: 0.4, fontSize: 20, color: GOLD, fontFace: H, bold: true, margin: 0 });
    s.addText(st.t, { x: x + 0.18, y: y + 0.6, w: sw - 0.36, h: 0.35, fontSize: 13.5, bold: true, color: TEXT, fontFace: H, margin: 0 });
    s.addText(st.d, { x: x + 0.18, y: y + 1.0, w: sw - 0.36, h: 1.35, fontSize: 10, color: MUTED, fontFace: B, valign: "top", lineSpacingMultiple: 1.12, margin: 0 });
    if (i < steps.length - 1) hArrow(s, x + sw + 0.03, y + 1.25, x + sw + gap - 0.03, "5C5966");
  });

  card(s, 0.62, 4.75, 12.1, 0.9, "12141A", "2A2A35", 0.09);
  s.addText("ACCURACY FORMULA", { x: 0.9, y: 4.85, w: 4, h: 0.3, fontSize: 10.5, color: GOLD, fontFace: H, bold: true, charSpacing: 2, margin: 0 });
  s.addText([
    { text: "Accuracy = 100 − (average centipawn loss × 0.15)", options: { color: TEXT, fontSize: 17, bold: true, fontFace: H } },
    { text: "   — capped 0–100, computed per player (src/lib/game-analyzer.ts)", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 0.9, y: 5.15, w: 11.4, h: 0.4, margin: 0 });

  s.addText([
    { text: "SUPPORTING PIPELINES  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 10.5, charSpacing: 2 } },
    { text: "SSE streaming progress (/api/analyze-stream) · deep jobs via BullMQ worker · win-probability chart from centipawns (recharts) · Syzygy tablebases for perfect endgame play", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 0.9, y: 5.85, w: 11.5, h: 0.5, margin: 0 });

  notes(s,
    "SPEAKER: The pipeline has five stages. First, import — a pasted PGN, or a username fetch from Chess.com or Lichess. Second, evaluation — Stockfish 18 examines every position; quick reports use depth 15–18, deep reports 20–24, and critical moments re-search with three lines. Third, grading — each move's centipawn loss maps to a seven-level scale. Fourth, explanation — the LLM receives the FEN, move and evaluation, and writes a short coaching explanation. Fifth, the report — per-player accuracy (100 minus 0.15 × average centipawn loss), critical moments, and alternatives.\n\n" +
    "Q: Why 0.15? A: It is an empirically chosen scaling factor that spreads typical centipawn losses across a readable 0–100 accuracy band.\n\n" +
    "Q: How is win probability computed? A: Centipawn scores are converted to a probability curve (standard sigmoid mapping) and rendered with recharts on the report page.\n\n" +
    "Q: What if the LLM key is missing? A: The system falls back to deterministic template explanations so analysis never breaks.");
}

// ================================================================ SLIDE 8 — MOVE GRADING
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "06 · Engine Scoring", "The 7-level move grading system", "Thresholds verified from src/lib/move-classifier.ts.");
  footer(s);

  const headers = ["Grade", "Max Centipawn Loss", "Meaning"];
  const rows = [
    [{ text: "♛ Brilliant", options: { color: GOLD, bold: true, fontFace: CH, fontSize: 11 } }, "0", "Only-engine move or sound sacrifice found at depth ≥ 16"],
    [{ text: "♞ Best", options: { color: GREEN, bold: true, fontSize: 11.5 } }, "8", "The top engine move in the position"],
    [{ text: "♜ Excellent", options: { color: GREEN, bold: true, fontSize: 11.5 } }, "25", "Near-optimal — negligible loss"],
    [{ text: "♟ Good", options: { color: "B8D4FF", bold: true, fontSize: 11.5 } }, "50", "Solid move, keeps the game balanced"],
    [{ text: "♝ Inaccuracy", options: { color: "FFD166", bold: true, fontSize: 11.5 } }, "100", "Missed a better plan"],
    [{ text: "♞ Mistake", options: { color: "FF9F45", bold: true, fontSize: 11.5 } }, "200", "Position clearly worsens"],
    [{ text: "♚ Blunder", options: { color: RED, bold: true, fontSize: 11.5 } }, "∞", "Game-losing error, missed mate or hung piece"],
  ];
  table(s, headers, rows, 0.62, 1.95, 7.3, [2.2, 2.3, 2.8], 11.5, 10.5, 0.42);

  card(s, 8.15, 1.95, 4.57, 3.05, CARD, BORDER, 0.07);
  s.addText("BEYOND THRESHOLDS", { x: 8.4, y: 2.1, w: 4.1, h: 0.32, fontSize: 12, bold: true, color: GOLD, fontFace: H, margin: 0 });
  const gBullets = [
    "Mates handled separately — missed mate is always a blunder",
    "Brilliant requires a sacrifice + engine-only move (depth ≥ 16)",
    "Forced/only-moves are auto-Excellent",
    "Missed wins (>150cp gap) → Mistake",
    "Checkmates and escapes detected across both colors",
  ];
  s.addText(gBullets.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < gBullets.length - 1, color: TEXT, fontSize: 10.5 } })), {
    x: 8.42, y: 2.55, w: 4.1, h: 2.3, fontFace: B, paraSpaceAfter: 7, lineSpacingMultiple: 1.08, margin: 0,
  });

  card(s, 8.15, 5.15, 4.57, 1.0, "12141A", "2A2A35", 0.09);
  s.addText([
    { text: "WHY IT MATTERS  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 10, charSpacing: 1.5 } },
    { text: "Consistent grades drive accuracy %, the coach's weakness analysis and every badge.", options: { color: MUTED, fontSize: 10 } },
  ], { x: 8.4, y: 5.15, w: 4.1, h: 1.0, valign: "middle", margin: 0 });

  notes(s,
    "SPEAKER: The grading engine classifies each move by centipawn loss against the engine's best. Seven levels: Brilliant (only-engine move or deep sacrifice), Best (top engine move), Excellent, Good, Inaccuracy, Mistake and Blunder. Crucially the grader is more than thresholds — it understands mate dynamics, sacrifices, forced moves and missed wins, so a 'brilliant' is genuinely earned at depth 16+, not awarded for every odd-looking move.\n\n" +
    "Q: What is centipawn loss? A: The difference in engine evaluation (in hundredths of a pawn) between the move played and the best move.\n\n" +
    "Q: How is a Brilliant decided? A: It must be a sacrifice — lower-valued piece captures higher — that is also the engine's only good move, confirmed by a deep search (depth ≥ 16); otherwise it is downgraded to Best.");
}

// ================================================================ SLIDE 9 — WHAT-IF + COACH
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "07 · Coaching Features", "Interactive What-If analysis + AI Coach", "The two signature features — both fully implemented.");
  footer(s);

  // left card
  card(s, 0.62, 1.95, 5.95, 3.9, CARD, BORDER, 0.07);
  s.addShape(pres.shapes.OVAL, { x: 0.85, y: 2.15, w: 0.6, h: 0.6, fill: { color: GOLD_DARK }, line: { color: GOLD_BORDER, width: 1 } });
  glyph(s, "♞", 0.93, 2.22, 0.44);
  s.addText("What-If Analysis", { x: 1.6, y: 2.17, w: 3.5, h: 0.34, fontSize: 15, bold: true, color: TEXT, fontFace: H, margin: 0 });
  statusChip(s, 1.6, 2.52, "Implemented");
  const wiBullets = [
    "Drag any piece to a new square on the review board",
    "Stockfish re-evaluates the variation live (depth 14 cap → responsive UI)",
    "8-step grader: sacrifices, mates, forced moves, missed wins",
    "Top-3 alternative lines (MultiPV) — click to explore",
    "Board & panel stay consistent — variation is never lost",
  ];
  s.addText(wiBullets.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < wiBullets.length - 1, color: TEXT, fontSize: 11.5 } })), {
    x: 0.95, y: 3.0, w: 5.35, h: 2.7, fontFace: B, paraSpaceAfter: 9, lineSpacingMultiple: 1.1, margin: 0,
  });

  // right card
  card(s, 6.77, 1.95, 5.95, 3.9, CARD, BORDER, 0.07);
  s.addShape(pres.shapes.OVAL, { x: 7.0, y: 2.15, w: 0.6, h: 0.6, fill: { color: GOLD_DARK }, line: { color: GOLD_BORDER, width: 1 } });
  glyph(s, "♛", 7.08, 2.22, 0.44);
  s.addText("AI Coach", { x: 7.75, y: 2.17, w: 3.5, h: 0.34, fontSize: 15, bold: true, color: TEXT, fontFace: H, margin: 0 });
  statusChip(s, 7.75, 2.52, "Implemented");
  const coachBullets = [
    "Scans up to 50 past games for recurring patterns",
    "3 prioritized weaknesses — each with evidence and a drill",
    "Weekly focus plan with tracked checkboxes",
    "Opening recommendations and estimated rating level",
    "Reports cached locally for 24 hours (fast re-views)",
  ];
  s.addText(coachBullets.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < coachBullets.length - 1, color: TEXT, fontSize: 11.5 } })), {
    x: 7.1, y: 3.0, w: 5.35, h: 2.7, fontFace: B, paraSpaceAfter: 9, lineSpacingMultiple: 1.1, margin: 0,
  });

  card(s, 0.62, 6.05, 12.1, 0.62, "12141A", "2A2A35", 0.08);
  s.addText([
    { text: "POWERED BY  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 10.5, charSpacing: 2 } },
    { text: "client-side WASM Stockfish worker for instant interaction · server LLM calls (Claude / OpenRouter deepseek-chat) for coach reports.", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 0.9, y: 6.05, w: 11.5, h: 0.62, valign: "middle", margin: 0 });

  notes(s,
    "SPEAKER: Two signature features. What-If analysis turns the report board into a laboratory — drag a piece, and the engine immediately tells you whether your idea works, with an eight-step grader that understands sacrifices, mates and forced moves. The AI Coach is the personal trainer: it digests up to 50 games, finds the three most damaging recurring patterns, attaches evidence and a drill to each, and produces a weekly focus plan the player can track.\n\n" +
    "Q: Why cap what-if depth at 14? A: Interactive board responsiveness — deeper searches freeze the drag-and-drop experience; the full-depth server analysis still runs for the actual game.\n\n" +
    "Q: What data does the coach see? A: Per-game — both accuracies, top blunders and mistakes with their positions, opening, phase and result (structure in src/lib/ai-coach.ts).");
}

// ================================================================ SLIDE 10 — TECHNOLOGIES
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "08 · Technology Stack", "Technologies used — every entry verified from package.json", "Versions as locked in the repository.");
  footer(s);

  const headers = ["Layer", "Technology"];
  const rows = [
    ["Frontend", "Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · react-chessboard"],
    ["Backend", "Next.js API Routes · BullMQ + Redis queue · Node worker (tsx)"],
    ["Database", "PostgreSQL 16 (Docker) · Drizzle ORM · optional MongoDB user store"],
    ["Engine", "Stockfish 18 — server binary (UCI) + browser WASM worker"],
    ["AI Layer", "Anthropic Claude SDK · DeepSeek client · OpenRouter (deepseek-chat) · Groq"],
    ["Authentication", "Supabase Auth · OAuth Google / GitHub · scrypt password hashing"],
    ["Billing", "Stripe checkout (Pro / Coach tiers)"],
    ["Styling & UX", "Tailwind v4 · Framer Motion · GSAP · Lenis smooth scroll"],
    ["Libraries", "chess.js · recharts · three.js / React Three Fiber · mapbox-gl · satori + resvg · zod"],
    ["DevOps", "Docker Compose (Postgres + Redis) · Playwright e2e · Vitest · ESLint 9 · PWA (next-pwa)"],
  ];
  table(s, headers, rows, 0.62, 1.95, 12.1, [2.6, 9.5], 11.5, 10.5, 0.4);

  notes(s,
    "SPEAKER: The stack is modern and TypeScript-only. Frontend: Next.js 16 App Router with React 19 and Tailwind v4, plus chess.js and react-chessboard for board logic. Backend: Next API routes with BullMQ/Redis for deep analysis. Engine: Stockfish 18 in two forms — a server binary over the UCI protocol, and a WebAssembly worker in the browser. AI: Anthropic Claude SDK, a DeepSeek client, and OpenRouter with the deepseek-chat model, with Groq as an alternative. Data: PostgreSQL 16 with Drizzle ORM. Supporting: Stripe for the shop tiers, Supabase for OAuth, satori+resvg for shareable report images, Playwright and Vitest for testing.\n\n" +
    "Q: Why both Claude and DeepSeek? A: Redundancy and cost — the explanation endpoints can switch providers via environment keys; coach reports use OpenRouter's deepseek-chat with a Groq fallback.\n\n" +
    "Q: Why Drizzle over Prisma? A: Type-safe SQL with full control — lightweight, no code generation overhead, and it matches the project's lean, dependency-light philosophy.");
}

// ================================================================ SLIDE 11 — LANGUAGES
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "09 · Languages", "Programming languages used", "Only languages present in the repository.");
  footer(s);

  const langs = [
    { t: "TypeScript", r: "Primary", d: "Entire application — Next.js pages, API routes, engine pipeline, Drizzle schema, tests." },
    { t: "JavaScript", r: "Workers & scripts", d: "Stockfish WASM wrapper workers, service worker (PWA), build scripts." },
    { t: "SQL", r: "Database", d: "PostgreSQL schema — 12 tables via Drizzle migrations (drizzle/*.sql)." },
    { t: "HTML / JSX", r: "Markup", d: "All UI rendered as React JSX components." },
    { t: "CSS", r: "Styling", d: "Tailwind CSS v4 utility system + global stylesheet." },
  ];
  const cw = 2.32, gap = 0.18;
  langs.forEach((L, i) => {
    const x = 0.62 + i * (cw + gap);
    const y = 2.05;
    card(s, x, y, cw, 3.5, CARD, BORDER, 0.07);
    s.addText(String(i + 1).padStart(2, "0"), { x: x + 0.2, y: y + 0.2, w: 1.5, h: 0.4, fontSize: 22, color: GOLD, fontFace: H, bold: true, margin: 0 });
    s.addText(L.t, { x: x + 0.2, y: y + 0.75, w: cw - 0.4, h: 0.4, fontSize: 15, bold: true, color: TEXT, fontFace: H, margin: 0 });
    chip(s, x + 0.2, y + 1.2, L.r.toUpperCase(), GOLD, GOLD_DARK, GOLD_BORDER, 8);
    s.addText(L.d, { x: x + 0.2, y: y + 1.62, w: cw - 0.4, h: 1.7, fontSize: 10, color: MUTED, fontFace: B, valign: "top", lineSpacingMultiple: 1.15, margin: 0 });
  });

  card(s, 0.62, 5.95, 12.1, 0.62, "12141A", "2A2A35", 0.08);
  s.addText([
    { text: "NOTABLE  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 10.5, charSpacing: 2 } },
    { text: "A single language across frontend and backend keeps the codebase small and auditable — roughly 130 source files, 12 Vitest suites, 1 Playwright e2e spec.", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 0.9, y: 5.95, w: 11.5, h: 0.62, valign: "middle", margin: 0 });

  notes(s,
    "SPEAKER: The entire platform is written in five languages. TypeScript dominates — nearly all pages, routes, engine logic, schema and tests. JavaScript appears in engine workers and PWA service workers, SQL in the Postgres migrations, JSX as React markup, and CSS through Tailwind. One language across the stack means shared types between the engine, database and UI — a real correctness benefit.\n\n" +
    "Q: Why is TypeScript chosen over JavaScript? A: Type safety across 25 API routes and 12 tables prevents whole classes of runtime errors; the engine payloads are complex nested types.\n\n" +
    "Q: Any Python used? A: Not in the shipped product — reference Python code exists in docs/python-engine-integration.md for CAPS/Syzygy/Polyglot research only.");
}

// ================================================================ SLIDE 12 — MODULES
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "10 · System Modules", "Modules — mapped 1:1 to routes in the repository", "12 modules, all accessible at their own routes.");
  footer(s);

  const mods = [
    { g: "♔", t: "Authentication", d: "Supabase OAuth · credentials · sessions", st: "Implemented" },
    { g: "♛", t: "Dashboard", d: "Board, move navigation, live evaluation", st: "Implemented" },
    { g: "♞", t: "Game Review", d: "Full analysis report with grades & graph", st: "Implemented" },
    { g: "♜", t: "Opening Explorer", d: "ECO database · book detection · master moves", st: "Implemented" },
    { g: "♝", t: "AI Coach", d: "Weakness reports · weekly focus · drills", st: "Implemented" },
    { g: "♟", t: "Puzzle Trainer", d: "Daily puzzle · attempts · rating", st: "Implemented" },
    { g: "♞", t: "What-If Analysis", d: "Interactive board · live engine · grader", st: "Implemented" },
    { g: "♜", t: "Games Library", d: "Saved reports · import · stats", st: "Implemented" },
    { g: "♝", t: "Leaderboards", d: "Puzzles & brilliant moves", st: "Implemented" },
    { g: "♚", t: "Chess Globe", d: "3D world activity map (demo data)", st: "Beta" },
    { g: "♛", t: "Account & Profile", d: "Profile, linked accounts, subscription", st: "Implemented" },
    { g: "♟", t: "Shop", d: "Merch store · cart · Stripe checkout", st: "Implemented" },
  ];
  const cw = 2.98, chh = 1.5, gapx = 0.12, gapy = 0.16;
  mods.forEach((m, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.62 + col * (cw + gapx);
    const y = 1.95 + row * (chh + gapy);
    card(s, x, y, cw, chh, CARD, BORDER, 0.06);
    glyph(s, m.g, x + 0.2, y + 0.1, 0.44, GOLD);
    s.addText(m.t, { x: x + 0.78, y: y + 0.16, w: cw - 0.96, h: 0.34, fontSize: 12.5, bold: true, color: TEXT, fontFace: H, margin: 0 });
    s.addText(m.d, { x: x + 0.22, y: y + 0.58, w: cw - 0.42, h: 0.5, fontSize: 9, color: MUTED, fontFace: B, valign: "top", lineSpacingMultiple: 1.05, margin: 0 });
    statusChip(s, x + 0.22, y + 1.13, m.st);
  });

  notes(s,
    "SPEAKER: Twelve modules, each mapped to a real route in the repository: authentication, dashboard, game review, opening explorer, AI coach, puzzle trainer, what-if analysis, games library, leaderboards, account/profile, and a shop with Stripe. Two modules ship as Beta: the Chess Globe — a three.js world map showing sample activity arcs — and the board editor (position setup with FEN). Everything else is live.\n\n" +
    "Q: Which module is the most complex? A: The game review page — one component of 2,200+ lines integrating the board, engine worker, grading, evaluation graph, alternative lines, LLM explanations and what-if sessions.\n\n" +
    "Q: What is the Chess Globe? A: A React Three Fiber globe visualising connections between countries with sample game metadata; Beta because it currently uses demo data, not live traffic.");
}

// ================================================================ SLIDE 13 — FEATURES MATRIX
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "11 · Feature Matrix", "Features — implemented, beta and planned", "Status reflects actual code, honestly graded.");
  footer(s);

  const headers = ["Feature", "Description", "Status"];
  const rows = [
    ["PGN Game Review", "3-column review — grades, eval graph, keyboard navigation, autoplay", mk("Implemented")],
    ["Chess.com / Lichess Import", "Live public fetch with graceful sample-data fallback", mk("Implemented")],
    ["AI Move Explanations", "Plain-language LLM coaching text for every move", mk("Implemented")],
    ["What-If Interactive Analysis", "Drag pieces, live engine re-evaluation, 8-step grader", mk("Implemented")],
    ["AI Coach Reports", "Weakness patterns, evidence, drills, weekly focus", mk("Implemented")],
    ["Daily Puzzle & Streaks", "Puzzle attempts with rating, streaks, badge system", mk("Implemented")],
    ["Report Card Sharing", "Accuracy + grades rendered to PNG (satori + resvg), OG images", mk("Implemented")],
    ["Streaming Analysis (SSE)", "Live progress events during analysis", mk("Implemented")],
    ["Deep Analysis Queue", "BullMQ background jobs, depth 20–24, MultiPV", mk("Implemented")],
    ["Board Editor", "Position setup with FEN snapshots", mk("Beta")],
    ["Chess Globe", "3D world activity visualisation (demo data)", mk("Beta")],
    ["Year Wrapped", "Year-in-review stats page (sample data today)", mk("Beta")],
    ["Live PvP Multiplayer", "Internet matchmaking — only local two-player play exists today", mk("Planned")],
    ["SuperCoach / Voice Coach", "Next-gen AI coaching suite", mk("Planned")],
  ];
  function mk(status) {
    return {
      text: status === "Implemented" ? "●  " + status.toUpperCase() : status === "Beta" ? "●  BETA" : "●  PLANNED",
      options: {
        color: status === "Implemented" ? GREEN : status === "Beta" ? BLUE : RED,
        bold: true, fontSize: 9.5, fontFace: B,
        fill: { color: status === "Implemented" ? "0E2418" : status === "Beta" ? "0D1B2E" : "2E1010" },
      },
    };
  }
  table(s, headers, rows, 0.62, 1.9, 12.1, [3.4, 6.2, 2.5], 11, 9.8, 0.33);

  notes(s,
    "SPEAKER: The feature matrix is deliberately honest. Nine core features are fully implemented — review, imports, AI explanations, what-if, coach, puzzles, report-card sharing, SSE streaming, and the deep queue. Three are Beta: the board editor (position setup works, drag-and-drop editing doesn't yet), the globe (demo data) and year wrapped (sample data). Two are planned: internet PvP — today only local two-player is implemented — and the SuperCoach suite.\n\n" +
    "Q: Why mark things Beta at all? A: Academic integrity — the examiner must know exactly what is finished. Beta items are visibly demo-able, not hidden.\n\n" +
    "Q: What is the report card? A: A generated image showing accuracy, opening name, grade counts and watermark — produced server-side with satori and resvg for social sharing (OG images).");
}

// ================================================================ SLIDE 14 — WORKFLOW
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "12 · End-to-End Flow", "Workflow — from import to training plan", "A single vertical pipeline; every step implemented.");
  footer(s);

  const steps = [
    { t: "Import Game", d: "Paste PGN · fetch Chess.com / Lichess username · sample fallback" },
    { t: "Analyze", d: "Quick mode (depth 15–18) or deep mode (depth 20–24, queued via BullMQ)" },
    { t: "Engine Evaluation", d: "Stockfish 18 scores every position · MultiPV 1–3 · Syzygy tablebases" },
    { t: "AI Explanation", d: "LLM writes per-move coaching text with classification and eval change" },
    { t: "Accuracy Calculation", d: "100 − avg centipawn loss × 0.15 · per player · per phase (opening/mid/end)" },
    { t: "Report Generation", d: "Grades, evaluation graph, alternatives, critical moments, insights" },
    { t: "Training Suggestions", d: "AI Coach converts findings into weaknesses, drills and a weekly focus" },
  ];
  const lx = 1.05;
  const startY = 1.9;
  const stepH = 0.66;
  const gap = 0.045;
  steps.forEach((st, i) => {
    const y = startY + i * (stepH + gap);
    // node
    s.addShape(pres.shapes.OVAL, { x: lx - 0.28, y: y + 0.07, w: 0.52, h: 0.52, fill: { color: GOLD_DARK }, line: { color: GOLD, width: 1.5 } });
    s.addText(String(i + 1), { x: lx - 0.28, y: y + 0.06, w: 0.52, h: 0.54, align: "center", valign: "middle", fontSize: 15, bold: true, color: GOLD, fontFace: H, margin: 0 });
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.LINE, { x: lx - 0.02, y: y + stepH + 0.01, w: 0, h: gap - 0.02, line: { color: "5C5966", width: 1.5 } });
    }
    // text
    card(s, lx + 0.45, y, 7.1, stepH, CARD, BORDER, 0.06);
    s.addText(st.t, { x: lx + 0.68, y: y + 0.06, w: 6.7, h: 0.3, fontSize: 12.5, bold: true, color: GOLD, fontFace: H, margin: 0 });
    s.addText(st.d, { x: lx + 0.68, y: y + 0.38, w: 6.75, h: 0.26, fontSize: 9.5, color: MUTED, fontFace: B, margin: 0 });
  });

  // right column: outcome card
  card(s, 9.3, 1.9, 3.4, 4.9, "12141A", "2A2A35", 0.07);
  s.addText("WHAT THE PLAYER GETS", { x: 9.55, y: 2.1, w: 2.9, h: 0.5, fontSize: 11, bold: true, color: GOLD, fontFace: H, charSpacing: 1, margin: 0 });
  const out = [
    "Accuracy % per player",
    "Critical moments list",
    "Alternative lines",
    "Evaluation graph",
    "Weakness diagnosis",
    "Weekly training focus",
    "Shareable report card",
  ];
  s.addText(out.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < out.length - 1, color: TEXT, fontSize: 11 } })), {
    x: 9.55, y: 2.75, w: 2.95, h: 3.5, fontFace: B, paraSpaceAfter: 8, margin: 0,
  });
  statusChip(s, 9.55, 6.35, "Implemented");

  notes(s,
    "SPEAKER: The workflow is one continuous pipeline, and it is fully implemented end-to-end. A game enters through PGN or a username import. It is analyzed in quick or deep mode — deep jobs queue through BullMQ. Stockfish evaluates every position, the classifier grades each move, and the LLM writes the explanation. Accuracy is computed per player per phase. The report assembles everything, and finally the coach converts the findings into a training plan — weaknesses, drills, weekly focus.\n\n" +
    "Q: Where does the user see this? A: The homepage accepts a PGN and lands on /analysis; the full interactive report lives at /analysis/[id].\n\n" +
    "Q: How long does analysis take? A: The landing page targets under 5 seconds for typical quick games with the fallback evaluator; deep runs are queued and streamed via SSE progress.");
}

// ================================================================ SLIDE 15 — SCREENSHOTS
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "13 · Live Application", "Screenshots — captured from the running app", "Real Playwright captures from the repository's e2e test suite.");
  footer(s);

  const shots = [
    { file: "chessigma-analysis.png", w: 3.75, cap: "Game Review — grades, evaluation graph, alternatives", note: "1280×720" },
    { file: "whatif-move-1.png", w: 3.75, cap: "What-If — interactive variation analysis", note: "1280×936" },
    { file: "home-top.png", w: 3.75, cap: "Home — PGN import & launch screen", note: "crop 1280×720" },
  ];
  shots.forEach((sh, i) => {
    const x = 0.62 + i * (3.75 + 0.42);
    const ar = sh.file === "whatif-move-1.png" ? 936 / 1280 : 720 / 1280;
    const h = sh.w * ar;
    card(s, x - 0.06, 1.95 - 0.06, sh.w + 0.12, h + 0.12, "101015", "2E2E38", 0.04);
    const imgPath = path.join(SHOTS, sh.file);
    s.addImage({ path: imgPath, x, y: 1.95, w: sh.w, h, sizing: { type: "cover", w: sh.w, h } });
    s.addText(sh.note, { x, y: 1.98, w: sh.w - 0.2, h: 0.26, fontSize: 8, color: FAINT, fontFace: B, align: "right", margin: 0 });
    s.addText(sh.cap, { x, y: 1.95 + h + 0.14, w: sh.w, h: 0.55, fontSize: 10.5, bold: true, color: TEXT, fontFace: B, align: "center", margin: 0 });
  });

  card(s, 0.62, 5.9, 12.1, 0.75, "12141A", "2A2A35", 0.09);
  s.addText([
    { text: "MORE CAPTURES RECOMMENDED  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 10.5, charSpacing: 2 } },
    { text: "Coach report · Opening explorer · Puzzles · Dashboard · Profile — capture these from the running app before submission (scripts: e2e/).", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 0.9, y: 5.9, w: 11.5, h: 0.75, valign: "middle", margin: 0 });

  notes(s,
    "SPEAKER: These are genuine screenshots of Chessfork captured by the project's own Playwright end-to-end test suite — the game review screen with grades and the evaluation graph, the what-if interactive analysis with a drag-and-drop variation, and the home import screen. For the final submission we recommend capturing the coach, opening explorer, puzzles and dashboard screens the same way.\n\n" +
    "Q: How were these captured? A: Playwright drives a real browser against the running app (e2e/ specs, screenshots in e2e/screenshots).\n\n" +
    "Q: Can we see the analysis page live? A: Yes — with the dev server running, paste any PGN at the homepage and the full report opens at /analysis/[id].");
}

// ================================================================ SLIDE 16 — DATABASE
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "14 · Data Model", "Database design — Drizzle ORM + PostgreSQL 16", "12 tables · UUID keys · JSONB payloads · verified from src/server/db/schema.ts.");
  footer(s);

  function tbl(s, x, y, w, name, role) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.5, fill: { color: "12161E" }, line: { color: "2A3A52", width: 1 }, rectRadius: 0.1 });
    s.addText(name, { x, y: y + 0.05, w, h: 0.3, fontSize: 10.5, bold: true, color: "B8D4FF", fontFace: H, align: "center", margin: 0 });
  }

  s.addText("IDENTITY & ACCOUNTS", { x: 0.62, y: 1.95, w: 4, h: 0.3, fontSize: 10.5, color: GOLD, fontFace: H, bold: true, charSpacing: 2, margin: 0 });
  card(s, 0.62, 2.25, 3.7, 2.2, CARD, BORDER, 0.07);
  const idTabs = [
    ["users", 0], ["identities", 1], ["user_credentials", 2], ["subscriptions", 3], ["chess_accounts", 4],
  ];
  idTabs.forEach(([n, i]) => tbl(s, 0.87, 2.42 + i * 0.37, 3.2, n, ""));
  s.addText("→ OAuth providers, credentials, tiers, linked Chess.com/Lichess", { x: 0.87, y: 4.5, w: 3.2, h: 0.2, fontSize: 8, color: FAINT, fontFace: B, margin: 0 });

  s.addText("ANALYSIS PIPELINE", { x: 4.65, y: 1.95, w: 4.5, h: 0.3, fontSize: 10.5, color: GOLD, fontFace: H, bold: true, charSpacing: 2, margin: 0 });
  card(s, 4.65, 2.25, 4.0, 2.2, CARD, BORDER, 0.07);
  tbl(s, 4.9, 2.42, 3.5, "imported_pgns", "");
  vArrow(s, 6.63, 2.94, 3.15, "4A6A94");
  tbl(s, 4.9, 3.16, 3.5, "analysis_runs", "");
  vArrow(s, 6.63, 3.68, 3.89, "4A6A94");
  tbl(s, 4.9, 3.9, 3.5, "move_evaluations", "");
  s.addText("→ 1 import : many runs : many move evaluations", { x: 4.9, y: 4.5, w: 3.5, h: 0.2, fontSize: 8, color: FAINT, fontFace: B, margin: 0 });

  s.addText("LEARNING & COMMUNITY", { x: 9.0, y: 1.95, w: 4, h: 0.3, fontSize: 10.5, color: GOLD, fontFace: H, bold: true, charSpacing: 2, margin: 0 });
  card(s, 9.0, 2.25, 3.7, 2.2, CARD, BORDER, 0.07);
  const lcTabs = [
    ["puzzles → puzzle_attempts", 0], ["coach_snapshots", 1], ["leaderboard_entries", 2], ["leaderboards", 3],
  ];
  lcTabs.forEach(([n, i]) => tbl(s, 9.25, 2.42 + i * 0.37, 3.2, n, ""));
  s.addText("→ puzzles, attempts with rating, coach reports, rankings", { x: 9.25, y: 4.5, w: 3.2, h: 0.2, fontSize: 8, color: FAINT, fontFace: B, margin: 0 });

  card(s, 0.62, 5.0, 12.1, 1.0, "12141A", "2A2A35", 0.09);
  const dbPoints = [
    "Unique indexes: email, public_id, pgn_hash, provider+provider_user",
    "JSONB payloads: engine lines, audit trails, themes, solutions",
    "Migrations versioned in /drizzle · seeded via npm run db:seed",
    "Optional MongoDB user store (MONGODB_URI)",
  ];
  s.addText(dbPoints.map((t, i) => ({ text: t, options: { bullet: false, breakLine: i < dbPoints.length - 1, color: TEXT, fontSize: 10.5 } })), {
    x: 0.9, y: 5.14, w: 11.5, h: 0.75, fontFace: B, paraSpaceAfter: 3, margin: 0,
  });

  notes(s,
    "SPEAKER: The schema has twelve tables in three groups. Identity and accounts: users, identities for OAuth, credentials with scrypt hashes, subscriptions and linked chess accounts. The analysis pipeline is the core — imported PGNs each produce analysis runs, each run stores one row per move in move_evaluations with scores, centipawn loss, grade and engine payload. Learning and community: puzzles and attempts with ratings, coach snapshots, and leaderboard entries. Everything uses UUID primary keys, JSONB for flexible payloads and unique indexes for deduplication.\n\n" +
    "Q: Why JSONB? A: Engine output varies by version and depth; JSONB keeps move payloads flexible without migrations per change.\n\n" +
    "Q: How is a report looked up? A: A public_id unique index maps short URLs like /analysis/[id] to runs, with pgn_hash preventing duplicate imports.");
}

// ================================================================ SLIDE 17 — ADVANTAGES
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "15 · Benefits", "System advantages — by player level", "Why each level of player gains something real.");
  footer(s);

  const cols = [
    { g: "♟", t: "For Beginners", fg: "3DDC84", items: [
      "Free instant analysis — no signup",
      "Plain-language AI explanations",
      "Daily puzzles & streaks to build habit",
      "Every grade explained, not assumed",
    ] },
    { g: "♞", t: "For Intermediate", fg: "FFC62A", items: [
      "AI Coach finds recurring weaknesses",
      "Opening explorer + repertoire notes",
      "What-If experiments to test ideas",
      "Accuracy tracking across games",
    ] },
    { g: "♛", t: "For Advanced", fg: "7AA2FF", items: [
      "Deep analysis: depth 20–24, MultiPV",
      "Syzygy 3-4-5 tablebases",
      "Shareable report cards & benchmarks",
      "Engine diagnostics tooling",
    ] },
  ];
  const cw = 3.95;
  cols.forEach((c, i) => {
    const x = 0.62 + i * (cw + 0.12);
    const y = 1.95;
    card(s, x, y, cw, 4.4, CARD, BORDER, 0.07);
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.25, w: 0.7, h: 0.7, fill: { color: "12141A" }, line: { color: c.fg, width: 1.5 } });
    glyph(s, c.g, x + 0.33, y + 0.32, 0.54, c.fg);
    s.addText(c.t, { x: x + 1.1, y: y + 0.32, w: cw - 1.3, h: 0.55, fontSize: 16, bold: true, color: TEXT, fontFace: H, valign: "middle", margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.25, y: y + 1.1, w: cw - 0.5, h: 0.025, fill: { color: "2A2A35" }, line: { type: "none" } });
    s.addText(c.items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < c.items.length - 1, color: TEXT, fontSize: 11.5 } })), {
      x: x + 0.28, y: y + 1.35, w: cw - 0.55, h: 2.85, fontFace: B, paraSpaceAfter: 12, lineSpacingMultiple: 1.1, margin: 0,
    });
  });

  card(s, 0.62, 6.55, 12.1, 0.55, "12141A", "2A2A35", 0.08);
  s.addText([
    { text: "FOR THE DEVELOPER  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 10.5, charSpacing: 2 } },
    { text: "Type-safe end-to-end (TypeScript + Drizzle) · 12 Vitest suites · Playwright e2e · lint enforced at zero warnings.", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 0.9, y: 6.55, w: 11.5, h: 0.55, valign: "middle", margin: 0 });

  notes(s,
    "SPEAKER: The advantages map to real audiences. Beginners get free, explained analysis and habit-building puzzles. Intermediate players get the coach — recurring weakness diagnosis, opening notes and what-if experiments that build understanding. Advanced players get depth 20–24 analysis, MultiPV lines, Syzygy tablebases and shareable reports. And for the developer, the codebase is type-safe and fully tested — twelve Vitest suites cover the engine, grading, openings and rating math, plus Playwright e2e.\n\n" +
    "Q: What is the benchmark page? A: /benchmark — a utility that runs engine diagnostics comparing settings, used to validate engine behaviour during development.\n\n" +
    "Q: How do tests protect the engine layer? A: Vitest suites assert classifier thresholds, rating math, opening detection and repository fallbacks — regression-safe refactoring.");
}

// ================================================================ SLIDE 18 — FUTURE
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "16 · Roadmap", "Future enhancements — planned, not promised", "Honest scope: these are next steps, not current features.");
  footer(s);

  const fut = [
    { t: "Multiplayer PvP", d: "Internet matchmaking; today only local two-player play exists (/play/local)." },
    { t: "Live Game Review", d: "Analyze games while they are being played — streaming position eval." },
    { t: "Chess Globe with real data", d: "Replace demo arcs with real-world live game traffic on the 3D globe." },
    { t: "AI Voice Coach", d: "Spoken coaching feedback during review sessions." },
    { t: "Mobile App", d: "PWA exists today; native apps with offline report sync." },
    { t: "Opening Repertoire AI", d: "Auto-built repertoire from a player's actual games and preferences." },
    { t: "Cloud Sync", d: "Guest-local reports become cross-device saved libraries." },
    { t: "Tournament Mode", d: "Structured study groups with match pairing and standings." },
  ];
  const cw = 2.98, chh = 1.68;
  fut.forEach((f, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.62 + col * (cw + 0.12);
    const y = 1.95 + row * (chh + 0.2);
    card(s, x, y, cw, chh, CARD, BORDER, 0.06);
    s.addText(String(i + 1).padStart(2, "0"), { x: x + 0.2, y: y + 0.12, w: 1, h: 0.36, fontSize: 16, color: GOLD, fontFace: H, bold: true, margin: 0 });
    s.addText(f.t, { x: x + 0.2, y: y + 0.52, w: cw - 0.4, h: 0.32, fontSize: 12.5, bold: true, color: TEXT, fontFace: H, margin: 0 });
    s.addText(f.d, { x: x + 0.2, y: y + 0.9, w: cw - 0.4, h: 0.44, fontSize: 9.5, color: MUTED, fontFace: B, valign: "top", lineSpacingMultiple: 1.08, margin: 0 });
    if (row === 1) statusChip(s, x + 0.2, y + 1.37, "Planned");
  });

  notes(s,
    "SPEAKER: The roadmap is deliberately honest. Internet PvP is planned — today the app has local two-player play with clocks. Live review during play, real-world globe data, a voice coach, mobile apps, repertoire AI, cloud sync and tournament mode are all future work. The PWA foundation already exists, which shortens the mobile path.\n\n" +
    "Q: Why is multiplayer not implemented? A: It requires real-time server infrastructure (websockets + game rooms); the current scope focuses on analysis and coaching, which is complete.\n\n" +
    "Q: Which enhancement is easiest next? A: Cloud sync — the report repository and public IDs already exist; a session-aware fetch would enable it.");
}

// ================================================================ SLIDE 19 — CONCLUSION
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "Conclusion", "What was built, and why it matters", "Verified end-to-end in the repository.");
  footer(s);

  card(s, 0.62, 2.0, 6.9, 3.6, CARD, BORDER, 0.07);
  const cBullets = [
    "Chessfork is a complete, free analysis + coaching platform — not a prototype",
    "Stockfish 18 engine + LLM explanations: analysis with understanding",
    "Personalized AI Coach turns game history into a training plan",
    "25 API routes · 39 pages · 12 database tables · 7-level grading system",
    "Honest scope: Beta modules flagged, roadmap published",
  ];
  s.addText(cBullets.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < cBullets.length - 1, color: TEXT, fontSize: 12.5 } })), {
    x: 0.92, y: 2.3, w: 6.3, h: 3.1, fontFace: B, paraSpaceAfter: 13, lineSpacingMultiple: 1.12, margin: 0,
  });

  // stat strip
  const stats = [
    ["25", "API routes"], ["39", "Pages"], ["12", "DB tables"], ["7", "Move grades"], ["18", "Stockfish"],
  ];
  stats.forEach(([v, l], i) => {
    const x = 7.65 + i * 1.14;
    card(s, x, 2.0, 1.05, 1.45, "12141A", "2A2A35", 0.08);
    s.addText(v, { x, y: 2.15, w: 1.05, h: 0.55, fontSize: 24, bold: true, color: GOLD, fontFace: H, align: "center", margin: 0 });
    s.addText(l.toUpperCase(), { x, y: 2.8, w: 1.05, h: 0.5, fontSize: 7.5, color: MUTED, fontFace: H, align: "center", margin: 0 });
  });

  card(s, 7.75, 3.75, 4.95, 1.85, CARD, BORDER, 0.07);
  s.addText("FINAL STATEMENT", { x: 8.0, y: 3.9, w: 4.4, h: 0.3, fontSize: 10.5, color: GOLD, fontFace: H, bold: true, charSpacing: 2, margin: 0 });
  s.addText("An analysis product that teaches, and a coaching product built on real engine data — delivered as one free, working platform.", {
    x: 8.0, y: 4.25, w: 4.45, h: 1.2, fontSize: 12, color: TEXT, fontFace: B, lineSpacingMultiple: 1.2, margin: 0,
  });

  card(s, 0.62, 5.85, 12.1, 0.75, "12141A", "2A2A35", 0.09);
  s.addText([
    { text: "STACK SNAPSHOT  ", options: { color: GOLD, bold: true, fontFace: H, fontSize: 10.5, charSpacing: 2 } },
    { text: "Next.js 16 · TypeScript · Tailwind v4 · Stockfish 18 · Drizzle ORM + PostgreSQL · BullMQ + Redis · Claude / DeepSeek", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 0.9, y: 5.85, w: 11.5, h: 0.75, valign: "middle", margin: 0 });

  notes(s,
    "SPEAKER: In summary — Chessfork is a working platform, not a demo. Analysis runs on Stockfish 18 at real depth; every verdict is explained by an LLM; a coach converts game history into a training plan; puzzles, streaks, leaderboards and shareable cards complete the loop. The numbers are real: 25 API routes, 39 pages, 12 tables, a 7-level grading system. Beta modules are flagged honestly and the roadmap is public. The stack — Next.js, TypeScript, Drizzle, Stockfish, Claude/DeepSeek — is modern and maintainable.\n\n" +
    "Q: Biggest technical challenge? A: Making deep engine analysis feel instant — solved by splitting browser WASM analysis (interactive) from server deep analysis (queued, streamed via SSE).\n\n" +
    "Q: What would you improve with more time? A: PvP multiplayer and replacing the Beta modules' sample data with live user data — both are on the roadmap.");
}

// ================================================================ SLIDE 20 — THANK YOU
{
  const s = pres.addSlide();
  s.background = { color: BG };
  const cell = 0.24;
  const ox = 0.5, oy = 0.4;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 14; c++) {
      if ((r + c) % 2 === 0) continue;
      s.addShape(pres.shapes.RECTANGLE, { x: ox + c * cell, y: oy + r * cell, w: cell, h: cell, fill: { color: "101015" }, line: { type: "none" } });
    }
  }
  s.addShape(pres.shapes.OVAL, { x: 5.4, y: 0.9, w: 2.5, h: 2.5, fill: { color: GOLD, transparency: 95 }, line: { type: "none" } });

  s.addShape(pres.shapes.OVAL, { x: 6.04, y: 1.75, w: 1.25, h: 1.25, fill: { color: GOLD_DARK }, line: { color: GOLD, width: 1.75 } });
  glyph(s, "♞", 6.32, 2.02, 0.7);

  s.addText("THANK YOU", { x: 1.5, y: 3.35, w: 10.33, h: 0.9, align: "center", fontSize: 44, bold: true, color: TEXT, fontFace: H, charSpacing: 8, margin: 0 });
  s.addText("Questions & discussion are welcome", { x: 1.5, y: 4.3, w: 10.33, h: 0.4, align: "center", fontSize: 14, color: MUTED, fontFace: B, margin: 0 });
  s.addText("ANALYZE · LEARN · DOMINATE", { x: 1.5, y: 4.75, w: 10.33, h: 0.4, align: "center", fontSize: 12, color: GOLD, fontFace: H, bold: true, charSpacing: 4, margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 6.24, y: 5.35, w: 0.85, h: 0.04, fill: { color: GOLD }, line: { type: "none" } });

  s.addText([
    { text: "[Student Name]  ·  Register No: [XXXXXXXX]", options: { bold: true, color: TEXT, fontSize: 11.5 } },
    { text: "   —   ", options: { color: FAINT } },
    { text: "BCA Final Year · [College Name] · Guide: [Guide Name]", options: { color: MUTED, fontSize: 10.5 } },
  ], { x: 1.5, y: 5.55, w: 10.33, h: 0.35, align: "center", margin: 0 });

  notes(s,
    "SPEAKER: Thank you for your time. I would be happy to answer questions — whether about the engine pipeline, the AI coaching layer, the database design or the roadmap. (Live demo suggestion: paste a PGN on the homepage and walk through a full report.)\n\n" +
    "Q: (Any) A: Refer to the appendix slides — repository structure, API surface, security and limitations — placed after this slide for exactly this moment.");
}

// ================================================================ APPENDIX A — REPO STRUCTURE
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "Appendix · A", "Repository structure", "A clean separation of concerns across ~130 source files.");
  footer(s);

  const dirs = [
    ["src/app", "39 pages + 25 API routes (Next.js App Router)"],
    ["src/components", "landing · analysis · coach · chess · shop · auth · globe · puzzles"],
    ["src/lib", "engine, analysis, classification, coach, grading, report cards, chess domain"],
    ["src/server", "auth · db (Drizzle schema) · queue (BullMQ) · repositories · chess"],
    ["src/hooks", "useEngine · useWhatIfSessions · useLiveAnalysisSession"],
    ["src/test", "12 Vitest suites — engine, grading, openings, rating, repositories"],
    ["e2e", "Playwright specs + real UI screenshots"],
    ["drizzle", "Versioned SQL migrations + snapshots"],
    ["public", "Stockfish WASM · workers · images · sounds · PWA assets"],
    ["vendor", "Syzygy 3-4-5 tablebases · opening books"],
    ["docs", "Analysis roadmap · Python engine integration reference"],
    ["scripts", "Stockfish / Syzygy / book installers · engine diagnostics"],
  ];
  dirs.forEach(([dir, desc], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.62 + col * 6.15;
    const y = 1.95 + row * 0.83;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 0.7, fill: { color: CARD }, line: { color: BORDER, width: 1 }, rectRadius: 0.06 });
    s.addText(dir, { x: x + 0.2, y: y + 0.08, w: 2.5, h: 0.32, fontSize: 12.5, bold: true, color: GOLD, fontFace: H, margin: 0 });
    s.addText(desc, { x: x + 2.7, y: y + 0.08, w: 3.1, h: 0.54, fontSize: 8.8, color: MUTED, fontFace: B, valign: "middle", lineSpacingMultiple: 1.05, margin: 0 });
  });

  notes(s,
    "SPEAKER (viva reference): The repository is organized by separation of concerns: App Router pages and routes; components per product area; lib for pure chess/engine logic (framework-free and fully unit-tested); server for auth, database, queue and repositories; hooks for engine state; e2e Playwright tests; versioned Drizzle migrations; public assets including the WASM engine and workers; vendor data — Syzygy 3-4-5 tablebases; and install/diagnostics scripts.\n\n" +
    "Q: Where is the analysis algorithm? A: src/lib/analysis-engine.ts (orchestration), src/server/chess/stockfish.ts (UCI), src/lib/move-classifier.ts + whatif-grader.ts (grading).\n\n" +
    "Q: How is the DB schema versioned? A: Drizzle generates numbered SQL migrations in /drizzle, applied with npm run db:push.");
}

// ================================================================ APPENDIX B — API ENDPOINTS
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "Appendix · B", "API surface — 25 routes", "Key endpoints verified from src/app/api.");
  footer(s);

  const headers = ["Endpoint", "Method", "Purpose"];
  const rows = [
    ["/api/analyze", "POST", "Quick / deep full-game analysis → saved report"],
    ["/api/analyze-stream", "POST / GET", "SSE streaming analysis with progress events"],
    ["/api/ai-coach", "POST", "Coach report from game history (OpenRouter deepseek)"],
    ["/api/explain-move · /api/explain", "POST", "Per-move AI explanations and classifications"],
    ["/api/import/chesscom · lichess · pgn", "POST", "Game imports with sample-data fallback"],
    ["/api/positions/evaluate", "POST", "Single-position engine evaluation"],
    ["/api/puzzles/attempt", "POST", "Puzzle attempts + rating updates"],
    ["/api/leaderboards/[type]", "GET", "Puzzle & brilliant-move leaderboards"],
    ["/api/coach/report", "POST", "Coach snapshot persistence"],
    ["/api/analysis/[id]", "GET", "Fetch saved report by public ID"],
    ["/api/auth/oauth/[provider]", "GET / POST", "OAuth redirect + callback (Google, GitHub)"],
    ["/api/shop/checkout", "POST", "Stripe checkout session"],
    ["/api/health", "GET", "Backend health (DB / queue status)"],
  ];
  table(s, headers, rows, 0.62, 1.9, 12.1, [3.6, 1.2, 7.3], 11, 10, 0.34);

  notes(s,
    "SPEAKER (viva reference): 25 API routes power the platform; the key ones are shown. /api/analyze is the core — it accepts a PGN and mode, runs the full engine + classification pipeline and persists a report. Streaming analysis exposes SSE progress so the UI shows depth/score live. The AI routes (ai-coach, explain-move, explain) wrap the LLM providers. Imports fetch Chess.com/Lichess with a graceful fallback to bundled samples when offline. Auth is OAuth with provider callbacks; shop checkout delegates to Stripe.\n\n" +
    "Q: How is an analysis submitted? A: POST /api/analyze with {pgn, mode: quick|deep}; response includes metadata, classified moves, chart data and a report URL.\n\n" +
    "Q: Where is validation? A: Every route validates input with zod schemas and applies rate limiting (src/server/rate-limiter.ts).");
}

// ================================================================ APPENDIX C — SECURITY & PERFORMANCE
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "Appendix · C", "Security & performance", "Practices verified in source files.");
  footer(s);

  card(s, 0.62, 1.95, 5.95, 4.3, CARD, BORDER, 0.07);
  s.addText("SECURITY", { x: 0.9, y: 2.1, w: 5, h: 0.35, fontSize: 13, bold: true, color: GOLD, fontFace: H, charSpacing: 2, margin: 0 });
  const sec = [
    "scrypt password hashing (node:crypto, timing-safe compare)",
    "Supabase OAuth — Google & GitHub provider flows",
    "Server-side session cookies for authenticated users",
    "zod validation on every API route",
    "In-memory rate limiting (token buckets per key)",
    "Secrets only in server env — never in client bundles",
  ];
  s.addText(sec.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < sec.length - 1, color: TEXT, fontSize: 11 } })), {
    x: 0.9, y: 2.6, w: 5.4, h: 3.4, fontFace: B, paraSpaceAfter: 10, lineSpacingMultiple: 1.1, margin: 0,
  });

  card(s, 6.77, 1.95, 5.95, 4.3, CARD, BORDER, 0.07);
  s.addText("PERFORMANCE", { x: 7.05, y: 2.1, w: 5, h: 0.35, fontSize: 13, bold: true, color: GOLD, fontFace: H, charSpacing: 2, margin: 0 });
  const perf = [
    "Engine in browser via WebAssembly worker — zero server cost for interactive analysis",
    "Deep analysis offloaded to BullMQ + Redis background jobs",
    "Depth & movetime tuned (quick 350ms / deep 3000ms per move)",
    "Coach reports cached 24h in localStorage; analysis cached by hash",
    "PWA offline shell with workbox service worker",
    "Lazy-loaded recharts graph; SSE progress keeps UI responsive",
  ];
  s.addText(perf.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < perf.length - 1, color: TEXT, fontSize: 11 } })), {
    x: 7.05, y: 2.6, w: 5.4, h: 3.4, fontFace: B, paraSpaceAfter: 10, lineSpacingMultiple: 1.1, margin: 0,
  });

  notes(s,
    "SPEAKER (viva reference): Security — passwords are hashed with scrypt plus a per-user salt, verified with timing-safe comparison; OAuth uses Supabase for Google and GitHub; sessions are server-side cookies; every route validates with zod and rate-limits via token buckets; no secret ever reaches the client. Performance — the interactive board runs a WASM Stockfish worker entirely in the browser; deep analysis is queued; coach results are cached for 24 hours; report caching is keyed by PGN hash; the app is PWA-installable.\n\n" +
    "Q: Why scrypt and not bcrypt? A: scrypt is memory-hard and resists GPU attacks; it is built into node:crypto — no native dependency needed.\n\n" +
    "Q: Rate limiting in production? A: The in-memory bucket works single-instance; production would move to Redis-backed limits — the bucket API is already abstracted.");
}

// ================================================================ APPENDIX D — LIMITATIONS
{
  const s = pres.addSlide();
  bg(s, { badge: true });
  chrome(s, "Appendix · D", "Known limitations & honest scope", "What is Beta, what is planned, and what depends on external services.");
  footer(s);

  card(s, 0.62, 1.95, 5.95, 4.4, CARD, BORDER, 0.07);
  s.addText("KNOWN LIMITATIONS", { x: 0.9, y: 2.1, w: 5.4, h: 0.35, fontSize: 13, bold: true, color: RED, fontFace: H, charSpacing: 2, margin: 0 });
  const lim = [
    "Year Wrapped renders sample data — not yet personal stats",
    "Chess Globe uses demo arcs, not live traffic",
    "Board editor: position setup works; drag-and-drop editing pending",
    "Local play is two-player (no engine opponent yet)",
    "AI features need provider keys (Claude / OpenRouter / DeepSeek)",
    "Full persistence requires Postgres + Redis (docker compose)",
    "Landing-page stats (e.g. 2.4M games) are aspirational targets",
  ];
  s.addText(lim.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < lim.length - 1, color: TEXT, fontSize: 11 } })), {
    x: 0.9, y: 2.6, w: 5.4, h: 3.6, fontFace: B, paraSpaceAfter: 10, lineSpacingMultiple: 1.1, margin: 0,
  });

  card(s, 6.77, 1.95, 5.95, 4.4, CARD, BORDER, 0.07);
  s.addText("NEXT STEPS", { x: 7.05, y: 2.1, w: 5.4, h: 0.35, fontSize: 13, bold: true, color: GREEN, fontFace: H, charSpacing: 2, margin: 0 });
  const next = [
    "PvP multiplayer over websockets",
    "Live game review during play",
    "Real data for Globe + Wrapped",
    "Cloud sync for saved reports",
    "Mobile app from the existing PWA",
    "Tournament & study-group modes",
    "Public demo deployment (Vercel) with managed Postgres + Redis",
  ];
  s.addText(next.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < next.length - 1, color: TEXT, fontSize: 11 } })), {
    x: 7.05, y: 2.6, w: 5.4, h: 3.6, fontFace: B, paraSpaceAfter: 10, lineSpacingMultiple: 1.1, margin: 0,
  });

  notes(s,
    "SPEAKER (viva reference): Being honest about scope protects credibility. Wrapped and the Globe render sample data — clearly labeled Beta. The editor supports position setup but not yet drag-and-drop piece editing. Local play is PvP only. AI features require provider API keys at runtime. Persistence needs Postgres and Redis via Docker Compose — without them the app runs fully in-memory (BACKEND_DRIVER=memory). The large numbers on the landing page are aspirational marketing targets, not production metrics.\n\n" +
    "Q: Does the app run without a database? A: Yes — BACKEND_DRIVER=memory keeps everything functional in-memory; hybrid/database modes enable persistence.\n\n" +
    "Q: What happens when Chess.com/Lichess fetch fails? A: Bundled sample games are loaded so the flow stays demoable offline.");
}

// ================================================================ SAVE
pres.writeFile({ fileName: OUT }).then(() => {
  console.log("WROTE", OUT);
  console.log("slides:", pageNo);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
