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
pres.title = "Chessfork - AI-Powered Chess Analysis & Coaching Platform";
pres.subject = "BCA Final Year Project";

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

const TF = "Georgia";
const BF = "Segoe UI";

const SHOTS = "C:/Users/shaba/AppData/Local/Temp/opencode/shots";

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

function bg(s) {
  s.background = { color: BG };
}

function header(s, kicker, title, tsize = 30) {
  s.addText(kicker.toUpperCase(), { x: M, y: 0.3, w: 8.5, h: 0.28, fontFace: BF, fontSize: 10, color: GOLD, bold: true, charSpacing: 4, margin: 0 });
  s.addText(title, { x: M, y: 0.6, w: 12.13, h: 0.72, fontFace: TF, fontSize: tsize, bold: true, color: WHITE, margin: 0 });
}

function footer(s, n) {
  s.addText("Chessfork  |  AI-Powered Chess Analysis", { x: M, y: 7.06, w: 7, h: 0.26, fontFace: BF, fontSize: 8.5, color: FAINT, margin: 0 });
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
  let n = "SPEAKER SCRIPT (30-60 s):\n" + script + "\n\nEXPECTED EXAMINER QUESTIONS:\n";
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

function statusChip(s, x, y, label, status) {
  const col = status === "Implemented" ? GREEN : status === "Beta" ? GOLD : GRAY;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.5, h: 0.3, rectRadius: 0.15, fill: { color: "17171A" }, line: { color: col, width: 0.75 } });
  s.addText(label, { x, y, w: 1.5, h: 0.3, fontFace: BF, fontSize: 8.5, color: col, bold: true, align: "center", valign: "middle", margin: 0 });
}

function iconRow(s, icon, x, y, size, tint = GOLD) {
  s.addImage({ data: icon, x, y, w: size, h: size });
}

(async () => {
  const need = [
    "FaChessKnight", "FaRobot", "FaChartLine", "FaChartBar", "FaBullseye", "FaCode", "FaDatabase", "FaLock",
    "FaGlobeAsia", "FaChessBoard", "FaChessRook", "FaPuzzlePiece", "FaBookOpen", "FaLayerGroup", "FaSave",
    "FaLightbulb", "FaGraduationCap", "FaTrophy", "FaMobileAlt", "FaCloud", "FaMicrophone", "FaSitemap",
    "FaServer", "FaNetworkWired", "FaTerminal", "FaShieldAlt", "FaExclamationTriangle", "FaInfinity",
    "FaArrowRight", "FaPlayCircle", "FaFileAlt", "FaWrench", "FaListUl", "FaClock", "FaRedo", "FaExchangeAlt",
    "FaDumbbell", "FaCheckCircle", "FaUserCircle", "FaUsers", "FaStar", "FaBolt", "FaQuoteRight", "FaBrain",
    "FaPlay", "FaColumns", "FaSync", "FaUserGraduate", "FaChessQueen", "FaSearch", "FaCommentDots",
    "FaPaintBrush", "FaShareAlt",
  ];
  const entries = await Promise.all(
    need.map(async (n) => {
      const gold = await makeIcon(n, "#FFC62B");
      const muted = await makeIcon(n, "#A8A8B0");
      const green = await makeIcon(n, "#4ADE80");
      return [n, { gold, muted, green }];
    })
  );
  const I = Object.fromEntries(entries);
  const logo = await makeLogo();
  const png = (f) => SHOTS + "/" + f;
  let deckIndex = 0;
  const n = () => {
    deckIndex += 1;
    return deckIndex;
  };
  const S = () => {
    const idx = n();
    const s = pres.addSlide();
    bg(s);
    footer(s, idx);
    return s;
  };

  // ============ 1. TITLE ============
  {
    const s = pres.addSlide();
    bg(s);
    for (let i = 0; i < 10; i++) {
      s.addShape(pres.shapes.RECTANGLE, { x: i * (W / 10), y: H - 0.34, w: W / 10, h: 0.34, fill: { color: i % 2 === 0 ? "1C1C20" : "131316" }, line: { type: "none" } });
    }
    s.addShape(pres.shapes.RECTANGLE, { x: W / 2 - 2.2, y: H - 0.34, w: 4.4, h: 0.34, fill: { color: GOLD }, line: { type: "none" } });
    s.addImage({ data: logo, x: (W - 1.55) / 2, y: 0.6, w: 1.55, h: 1.55 });
    s.addText("FINAL-YEAR PROJECT", { x: 0, y: 2.32, w: W, h: 0.3, fontFace: BF, fontSize: 12, color: GOLD, align: "center", bold: true, charSpacing: 7 });
    s.addText("Chessfork", { x: 0, y: 2.66, w: W, h: 1.05, fontFace: TF, fontSize: 58, bold: true, color: WHITE, align: "center" });
    s.addText("AI-Powered Chess Analysis & Coaching Platform", { x: 0, y: 3.68, w: W, h: 0.44, fontFace: BF, fontSize: 17, color: MUTED, align: "center" });
    s.addShape(pres.shapes.LINE, { x: W / 2 - 1.4, y: 4.34, w: 2.8, h: 0, line: { color: GOLD, width: 1.4 } });
    const info = [
      { text: "BCA Final Year Project  |  2025-26", options: { breakLine: true, fontSize: 12.5, color: FAINT } },
      { text: "[Your Full Name]    [Register Number]", options: { breakLine: true, bold: true, color: WHITE, fontSize: 13.5 } },
      { text: "Department of Computer Applications (BCA)", options: { breakLine: true, color: MUTED, fontSize: 12.5 } },
      { text: "[College Name], [City]", options: { breakLine: true, color: MUTED, fontSize: 12.5 } },
      { text: "Project Guide: [Guide Name]", options: { color: MUTED, fontSize: 12.5 } },
    ];
    s.addText(info, { x: 0, y: 4.62, w: W, h: 1.8, align: "center", margin: 0, lineSpacing: 1.15 });
    addNotes(s,
      "Hello everyone. Today I will present Chessfork, my BCA final-year project - an AI-powered chess analysis and coaching platform. The problem I set out to solve is simple: most chess players know they should review their games, but engine numbers mean little without explanation, and personalized coaching is expensive. Chessfork closes that gap by combining a professional-grade chess engine, artificial intelligence explanations, and a personalized AI coach in one free web platform. I will walk through the problem, the existing systems, my architecture, the features I actually built, and the results.",
      ["What is your project about in one line?", "Why this domain?", "Who is it for?"],
      ["Chessfork is a web platform where a player imports a game from PGN, Chess.com, or Lichess, gets every move evaluated by Stockfish 18 with symbolic grades and accuracy, and then receives AI-generated explanations plus a personalized coaching report.",
        "It combines two of my interests: algorithms (minimax search, alpha-beta pruning, and a fallback neural-style evaluator I wrote in TypeScript) and AI applications (LLM-powered coaching). It also gave me full-stack experience: Next.js, PostgreSQL, Redis, OAuth, and deployment.",
        "Amateur chess players from beginners to club level who want to understand their mistakes rather than just see a number."]);
  }

  // ============ 2. ABSTRACT ============
  {
    const s = S();
    header(s, "Overview", "Abstract");
    cornerMotif(s);
    card(s, M, 1.5, 7.15, 5.05);
    s.addText("Chessfork is a complete chess improvement platform built around a single idea: every player deserves a coach that explains their mistakes.", {
      x: M + 0.35, y: 1.82, w: 6.45, h: 0.85, fontFace: TF, fontSize: 15.5, italic: true, color: GOLD, margin: 0, fit: "shrink",
    });
    const absBullets = [
      { text: "Purpose: review any chess game and turn engine analysis into an understandable learning report.", bold: true },
      { text: "Problem solved: engine numbers without context are useless for improvers; coaching is expensive." },
      { text: "AI-assisted analysis: every move is searched twice by Stockfish 18 and classified into 9 quality grades." },
      { text: "Personalized coaching: an LLM (Groq / DeepSeek) converts game statistics into strengths, weaknesses, drills and a weekly goal." },
      { text: "Opening explorer: 14 guided opening pages with ECO codes, variations and stats from analyzed games." },
      { text: "Game review: move-by-move board, evaluation bar, win-probability chart, critical moments and shareable report cards." },
      { text: "Performance insights: per-move accuracy (CAPS), estimated rating, motifs and trends on the profile." },
    ];
    blist(s, M + 0.35, 2.75, 6.5, 3.7, absBullets, { size: 12.5, space: 6.5 });
    s.addText("Chessfork is built as a future-ready learning platform - architecture supports adding multiplayer, live game review and more.", {
      x: M + 0.35, y: 6.15, w: 6.45, h: 0.35, fontFace: BF, fontSize: 11, color: MUTED, italic: true, margin: 0,
    });
    const stats = [
      ["FaChessRook", "1", "Engine", "Stockfish 18"],
      ["FaExchangeAlt", "3", "Import paths", "PGN, Chess.com, Lichess"],
      ["FaChartBar", "2", "Analysis modes", "Quick / Deep"],
      ["FaStar", "9", "Move grades", "Brilliant to Blunder"],
      ["FaGlobeAsia", "6", "Locales", "en, es, fr, hi, ru, ar"],
    ];
    let sy = 1.5;
    for (const [icn, big, lab, sub] of stats) {
      card(s, 8.0, sy, 4.73, 0.92, CARD2);
      iconRow(s, I[icn].gold, 8.25, sy + 0.21, 0.5);
      s.addText(big, { x: 8.95, y: sy + 0.08, w: 1.0, h: 0.5, fontFace: TF, fontSize: 21, bold: true, color: WHITE, margin: 0 });
      s.addText(lab + "\n" + sub, { x: 9.85, y: sy + 0.1, w: 2.85, h: 0.72, fontFace: BF, fontSize: 9.5, color: MUTED, margin: 0 });
      sy += 1.03;
    }
    addNotes(s,
      "The abstract is the executive summary. Chessfork takes a game of chess, analyzes every single move with the Stockfish 18 engine, converts the engine evaluations into 9 human-readable grades and an accuracy percentage, then uses an LLM-based coach to write strengths, weaknesses and a practice plan in plain language. Import is easy: paste PGN, or connect a Chess.com or Lichess account. The whole report is shareable as a link. The right panel shows the numbers I want you to remember: one engine, three import paths, two analysis modes, nine move grades, and six languages.",
      ["What exactly does 'AI-powered' mean here?", "How is this different from a basic PGN analyzer?", "Is the AI your own model?"],
      ["Two things: the engine (Stockfish) provides the analysis, and an LLM - Groq's Llama 3.3 70B or DeepSeek - provides the coaching layer that explains the numbers in words. Both are real integrations in the code.",
        "A basic analyzer shows an evaluation bar. Chessfork adds per-move classification, accuracy, an opening name, win-probability charting, critical moments, AI explanations for each move, and a personalized coach report - all generated from the user's own games.",
        "No. The AI coaching layer uses hosted LLM APIs (Groq / OpenRouter). I built the prompt engineering, the data pipeline that feeds game statistics to the model, and the validation layer that guarantees structured output."]);
  }

  // ============ 3. PROBLEM STATEMENT ============
  {
    const s = S();
    header(s, "Why This Project", "Problem Statement");
    cornerMotif(s);
    s.addText("Amateur players rarely improve from raw engine output - the tools that explain their mistakes are locked behind subscriptions.", {
      x: M, y: 1.46, w: 12.1, h: 0.5, fontFace: BF, fontSize: 14, color: MUTED, margin: 0,
    });
    const probs = [
      ["FaDumbbell", "Expensive premium features", "Real analysis depth, reports and training tools are paywalled on major platforms."],
      ["FaCommentDots", "Limited explanations", "Evaluation bars and engine lines, but rarely a plain-language reason why a move is wrong."],
      ["FaUserCircle", "No personalized AI coaching", "No system that studies your games and tells you what to fix this week."],
      ["FaUserGraduate", "Hard for beginners", "Raw engine numbers and long computer lines overwhelm new players."],
      ["FaLightbulb", "Analysis without context", "A +0.3 evaluation is meaningless without knowing what to do next in the position."],
      ["FaExchangeAlt", "Fragmented workflow", "Play on one site, analyze on another, train on a third - no connected learning loop."],
    ];
    let px = M, py = 2.12;
    probs.forEach(([icn, t, d], i) => {
      const x = M + (i % 3) * 4.16;
      const y = 2.12 + Math.floor(i / 3) * 2.35;
      card(s, x, y, 3.9, 2.12);
      iconRow(s, I[icn].gold, x + 0.28, y + 0.26, 0.44);
      s.addText(String(i + 1).padStart(2, "0"), { x: x + 3.1, y: y + 0.24, w: 0.6, h: 0.4, fontFace: TF, fontSize: 17, bold: true, color: FAINT, align: "right", margin: 0 });
      s.addText(t, { x: x + 0.28, y: y + 0.85, w: 3.35, h: 0.42, fontFace: BF, fontSize: 13.5, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.28, y: y + 1.28, w: 3.35, h: 0.72, fontFace: BF, fontSize: 10.5, color: MUTED, margin: 0, fit: "shrink" });
    });
    addNotes(s,
      "I surveyed the landscape as a chess player myself. The problems are: one, quality analysis and coaching are subscription-gated on major platforms; two, even free analyzers give numbers but no explanations - a beginner sees the blunder symbol but not why; three, nothing studies a player's own games to personalize training; and four, the workflow is fragmented across sites. These six cards summarize it: paywalls, shallow explanations, no personalization, overwhelm, lack of context, and fragmentation.",
      ["Why is 'no context' a real problem?", "Is this a real market gap or a student excuse?", "How do you quantify the problem?"],
      ["If a player cannot convert a winning position, an engine line tells them nothing. Chessfork converts the evaluation into a graded move, a comment, and a reason - that is educational context.",
        "It is a real gap: premium analysis on major platforms costs 10-15 USD/month. Chessfork makes the educational layer free and open, and documents its thresholds openly. That is the research gap this project addresses.",
        "A typical amateur game has 2-5 mistakes; an average accuracy under 85%. Chessfork quantifies each game: accuracy per player, per-move cp loss, number of blunders/mistakes, and a rating estimate, so improvement becomes measurable."]);
  }

  // ============ 4. OBJECTIVES ============
  {
    const s = S();
    header(s, "Goals", "Objectives");
    cornerMotif(s);
    const objs = [
      ["FaChessBoard", "Engine-powered game review", "Analyze any PGN with Stockfish 18 and produce classified moves, chart data and statistics."],
      ["FaCommentDots", "AI explanations", "Generate plain-language, grade-consistent explanations for each move via LLM APIs."],
      ["FaRobot", "Personalized coaching", "Turn game history into strengths, weaknesses, drills and a weekly goal - per player."],
      ["FaBookOpen", "Opening explorer", "Ship 14 opening guides with ECO codes, variations, accuracy stats and example games."],
      ["FaChartLine", "Performance insights", "Accuracy per move and per game, rating estimates, motifs, critical moments, trends."],
      ["FaGraduationCap", "Learning loop", "Games -> analysis -> coach plan -> puzzles - a closed loop that helps players improve."],
    ];
    let ox = M, oy = 1.62;
    objs.forEach(([icn, t, d], i) => {
      const x = M + (i % 2) * 6.18;
      const y = 1.62 + Math.floor(i / 2) * 1.62;
      card(s, x, y, 5.95, 1.42);
      iconRow(s, I[icn].gold, x + 0.25, y + 0.45, 0.5);
      s.addText(t, { x: x + 0.95, y: y + 0.14, w: 4.8, h: 0.4, fontFace: BF, fontSize: 14.5, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.95, y: y + 0.56, w: 4.8, h: 0.76, fontFace: BF, fontSize: 10.5, color: MUTED, margin: 0, fit: "shrink" });
    });
    addNotes(s,
      "My objectives map one-to-one onto shipped features: engine-powered review, AI explanations, a personalized coach, an opening explorer, measurable performance insights, and a learning loop that ties them together. Every objective on this slide has working code behind it, which I will prove in the features and demo sections.",
      ["Which objective was hardest?", "How did you prioritize?", "How do you verify the objectives were met?"],
      ["Engine integration was hardest - spawning Stockfish correctly, parsing its UCI stream, and normalizing evaluations across depths and MultiPV settings.",
        "I prioritized the core loop first (import - analyze - report), then the AI layer, then the supporting surfaces like openings, puzzles and profile.",
        "Each objective has a traceable route and UI: analysis report for objective 1, explain-move API for 2, /coach page for 3, /opening pages for 4, report/insights tabs for 5, and the puzzle+coach workflow for 6."]);
  }

  // ============ 5. EXISTING SYSTEMS ============
  {
    const s = S();
    header(s, "Market Landscape", "Existing Systems");
    cornerMotif(s);
    const rows = [
      ["Platform", "Strengths", "Limitations"],
      ["Chess.com", "Largest user base; interactive lessons; huge library of content and tools.", "Core analysis depth, game review and coaching are premium-only (approx. $10-15/month); explanations are shallow."],
      ["Lichess", "Free and open source; unlimited cloud analysis; clean board; fair comparison tool.", "No AI explanations or personalized coaching; training content is self-driven."],
      ["Chessigma", "AI-written move explanations; concept teaching; modern design.", "Subscription model; analysis depth and report features gated; not self-hosted or open."],
    ];
    table(s, rows, { x: M, y: 1.55, w: 12.13, colW: [1.7, 5.3, 5.13], rowH: 0.62, size: 11.5 });
    s.addText("Fair assessment: these platforms are excellent for what they do. None of them, however, combines free engine analysis with an AI coach that studies the player's own games.", {
      x: M, y: 4.05, w: 12.13, h: 0.5, fontFace: BF, fontSize: 12.5, italic: true, color: MUTED, margin: 0, fit: "shrink",
    });
    card(s, M, 4.72, 12.13, 1.85);
    s.addText("Chessfork's position", { x: M + 0.3, y: 4.92, w: 4, h: 0.4, fontFace: BF, fontSize: 13.5, bold: true, color: GOLD, margin: 0 });
    const gap = [
      "Free Stockfish 18 analysis with quick and deep modes",
      "AI explanations for every classified move",
      "Personalized coach report from your own games",
      "Shareable report cards and opening guides",
      "Open architecture - every threshold and formula is documented",
    ];
    blist(s, M + 0.3, 5.35, 11.6, 1.15, gap, { size: 11.5, space: 4 });
    addNotes(s,
      "I compared against the three relevant players. Chess.com has the best content ecosystem, but its analysis depth and game review are premium-gated, and explanations are minimal. Lichess is free and open-source, which I respect deeply, but it does not explain moves or coach you personally. Chessigma pioneered AI move explanations - it is my direct inspiration - but it is a paid, closed subscription. I must be fair: all three do what they do well. The research gap is: no platform that is simultaneously free, engine-powered, explanation-rich, and personalized. That is Chessfork's slot.",
      ["How is Chessfork better than Lichess if Lichess is free?", "Chessigma already does AI explanations - what is new?", "Is this a viable business?"],
      ["Lichess gives you evaluations; it does not tell you what to fix. Chessfork adds the AI coaching layer on top of free analysis - a different product, not a clone.",
        "Chessigma explains individual moves. Chessfork goes one step further: it aggregates many games into a personalized coach report - weaknesses, drills, weekly goal - which is closer to a human coach.",
        "The architecture includes a freemium plan (free / pro / coach tiers modeled in the database and Stripe integration interface) - that is future scope in my project; the priority is a working learning platform."]);
  }

  // ============ 6. PROPOSED SYSTEM ============
  {
    const s = S();
    header(s, "Research Gap", "Proposed System - Chessfork");
    cornerMotif(s);
    const flow = [
      ["FaSearch", "Research gap", "No free engine + AI coach combination exists"],
      ["FaChessRook", "Our approach", "Engine analysis, AI explanations and coaching in one open platform"],
      ["FaCheckCircle", "Outcome", "A measurable, personalized learning loop for every player"],
    ];
    let fx = M;
    flow.forEach(([icn, t, d], i) => {
      card(s, fx, 1.55, 3.7, 1.7);
      iconRow(s, I[icn].gold, fx + 0.26, 1.8, 0.46);
      s.addText(t, { x: fx + 0.26, y: 2.35, w: 3.2, h: 0.35, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: fx + 0.26, y: 2.72, w: 3.2, h: 0.5, fontFace: BF, fontSize: 10, color: MUTED, margin: 0, fit: "shrink" });
      if (i < 2) iconRow(s, I["FaArrowRight"].muted, fx + 3.82, 2.15, 0.34);
      fx += 4.21;
    });
    const feats = [
      ["FaCommentDots", "AI explanations", "Implemented"],
      ["FaRobot", "Personalized coaching", "Implemented"],
      ["FaChessBoard", "What-If variation analysis", "Implemented"],
      ["FaPlayCircle", "Live position analysis", "Implemented"],
      ["FaUsers", "Local PvP games", "Implemented"],
      ["FaGlobeAsia", "Chess Globe (world activity)", "Beta"],
      ["FaInfinity", "SuperCoach plan & drills", "Beta"],
    ];
    let fy = 3.62;
    feats.forEach(([icn, t, st], i) => {
      const x = M + (i % 2) * 6.18;
      const y = 3.62 + Math.floor(i / 2) * 0.95;
      card(s, x, y, 5.95, 0.78, CARD2);
      iconRow(s, I[icn].gold, x + 0.24, y + 0.19, 0.4);
      s.addText(t, { x: x + 0.8, y, w: 3.4, h: 0.78, fontFace: BF, fontSize: 12.5, bold: true, color: WHITE, valign: "middle", margin: 0, fit: "shrink" });
      statusChip(s, x + 4.25, y + 0.24, st, st);
    });
    addNotes(s,
      "The proposed system is the answer to the gap I just described. Left to right: the research gap, our approach, and the outcome. Below, the six pillars I actually built - AI explanations, personalized coaching, What-If variation analysis where you can drag a piece and immediately see how the engine evaluates your alternative, live position analysis, local PvP play, and the Chess Globe - a world activity visualization which is in beta with mock data. SuperCoach is my label for the coaching suite; the coach report is implemented, and the training plan modules are beta.",
      ["What is What-If analysis?", "What is the SuperCoach?", "What does 'Beta' mean in your project context?"],
      ["While reviewing a game you can try your own alternative move on the board. Chessfork evaluates it with Stockfish, grades it against the best move, and (when configured) asks the LLM why it is better or worse - interactive learning.",
        "SuperCoach is the coaching product family: the AI coach report (implemented, real LLM), the coach snapshot with 5 training pillars and daily plan (implemented), and planned modules like Blunder Shield and Woodpecker drills.",
        "It means the feature is functional but uses seed data or limited scope - for example the Chess Globe uses a mock data population, and puzzle catalog is small. I will clearly mark statuses in the features slide."]);
  }

  // ============ 7. SYSTEM ADVANTAGES ============
  {
    const s = S();
    header(s, "Who Benefits", "System Advantages");
    cornerMotif(s);
    const cols = [
      ["FaUserGraduate", "Beginners", GOLD, [
        "Plain-language move explanations",
        "Clear 9-level grade ladder (Brilliant to Blunder)",
        "PGN paste - zero setup, no account needed",
        "Free full game review with accuracy score",
      ]],
      ["FaChartLine", "Intermediate players", GOLD, [
        "Critical moments - where games are won or lost",
        "What-If analysis to explore alternatives",
        "AI coach report with weaknesses & drills",
        "Opening guides matched to your games",
      ]],
      ["FaTrophy", "Advanced players", GOLD, [
        "Deep mode: Stockfish 18 at depth 24, MultiPV lines",
        "Opening book + Syzygy tablebase support",
        "Full PGN export and report card sharing",
        "Puzzle Elo and leaderboard tracking",
      ]],
    ];
    let cx = M;
    cols.forEach(([icn, t, c, items], i) => {
      const x = M + i * 4.16;
      card(s, x, 1.55, 3.9, 4.95);
      s.addShape(pres.shapes.RECTANGLE, { x, y: 1.55, w: 3.9, h: 0.08, fill: { color: GOLD }, line: { type: "none" } });
      iconRow(s, I[icn].gold, x + 1.62, 1.85, 0.66);
      s.addText(t, { x, y: 2.62, w: 3.9, h: 0.4, fontFace: BF, fontSize: 15, bold: true, color: WHITE, align: "center", margin: 0 });
      blist(s, x + 0.28, 3.15, 3.35, 3.2, items, { size: 11.5, space: 8 });
    });
    addNotes(s,
      "The advantages slide is structured by audience. For beginners: explanations in plain language, a simple grade ladder, and no account required. For intermediates: critical moments, What-If exploration, and the AI coach. For advanced players: deep analysis with configurable depth, opening books and tablebases, export and sharing, and competitive tracking. One product, three clear value propositions.",
      ["Which audience is the product best suited for?", "What is the 'grade ladder'?", "Why support tablebases?"],
      ["The core loop serves intermediates best, but the free, no-account flow makes beginners the largest entry group.",
        "Every move receives one of nine grades - Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Blunder - computed from win-probability changes and cp-loss thresholds. It converts a float evaluation into a teachable label.",
        "Syzygy tablebases give perfect play in 7-man endings, so endgame moves can be judged with mathematical certainty, not estimation. This is optional, configurable infrastructure in my engine module."]);
  }

  // ============ 8. TECHNOLOGIES USED ============
  {
    const s = S();
    header(s, "Tech Stack", "Technologies Used", 29);
    cornerMotif(s);
    const rows = [
      ["Category", "Technology", "Purpose"],
      ["Framework", "Next.js 16.2.6 (App Router), React 19", "Pages, SSR/SSG, API routes"],
      ["Language", "TypeScript 5 (strict)", "Type-safe full-stack code"],
      ["Styling", "Tailwind CSS v4", "Design system, dark UI"],
      ["Chess logic", "chess.js 1.4, react-chessboard", "PGN/FEN handling, board UI"],
      ["Engine", "Stockfish 18 (native + WASM)", "Deep analysis, live analysis"],
      ["AI / LLM", "Groq Llama 3.3 70B, DeepSeek (OpenRouter)", "Coach reports, move explanations"],
      ["Database", "PostgreSQL 16 + Drizzle ORM", "12-table relational schema"],
      ["Queue & cache", "BullMQ + Redis 7, IndexedDB", "Deep-analysis jobs, client cache"],
      ["Auth", "Custom HMAC sessions, scrypt, Google/GitHub OAuth", "Sign-in, guest merge"],
      ["Charts / 3D", "Recharts, Three.js, react-three-fiber, Mapbox", "Win-prob charts, Chess Globe"],
      ["Content & i18n", "MDX blog, next-intl", "Blog, 6 locales"],
      ["Quality", "Vitest, Playwright, ESLint", "Unit, e2e and lint checks"],
    ];
    table(s, rows, { x: M, y: 1.5, w: 12.13, colW: [2.3, 4.83, 5.0], rowH: 0.38, size: 10.5 });
    addNotes(s,
      "The stack is deliberately modern and full-stack. Next.js 16 with the App Router serves pages and API routes; TypeScript keeps the entire codebase type-safe. Chess logic uses chess.js; the board is react-chessboard. The engine is real Stockfish 18 - a native binary on the server for deep analysis, and a WASM build in the browser for instant live analysis. The AI layer calls Groq's Llama 3.3 70B and DeepSeek via OpenRouter. Persistence is PostgreSQL via Drizzle ORM with a 12-table schema, plus Redis/BullMQ for deep-analysis jobs and IndexedDB on the client. Auth is custom and secure. Charts, 3D, PWA, i18n and testing round out the stack.",
      ["Why Next.js and not a simpler stack?", "Why two Stockfish builds?", "Why did you write your own auth instead of using NextAuth?"],
      ["Next.js gives server-side rendering (fast SEO pages like opening guides), API routes in the same codebase, and excellent deployment on Vercel - one repository for the entire product.",
        "Native Stockfish gives depth 24 analysis on the server; the WASM build runs in the browser worker so What-If analysis stays instant and offline-friendly without loading the server.",
        "The requirements were specific: guest sessions that merge into accounts, multiple OAuth providers, and no vendor lock-in. Writing a compact HMAC-cookie + scrypt + PKCE implementation (about 600 lines) gave me full control and a great viva story. It is also a security learning experience."]);
  }

  // ============ 9. PROGRAMMING LANGUAGES ============
  {
    const s = S();
    header(s, "Implementation", "Programming Languages & Tools");
    cornerMotif(s);
    const langs = [
      ["FaCode", "TypeScript", "95%+ of the application - pages, components, hooks, services, engine fallback, tests."],
      ["FaCode", "JavaScript", "Browser workers (stockfishWorker.js, engineWorker.js) and Node scripts."],
      ["FaDatabase", "SQL", "PostgreSQL schema, migrations and seed data via Drizzle ORM."],
      ["FaColumns", "HTML / JSX", "Server and client components rendered by React."],
      ["FaPaintBrush", "CSS", "Tailwind CSS v4 utilities and design tokens."],
      ["FaBookOpen", "MDX", "Blog content with frontmatter and embedded React components."],
    ];
    let ly = 1.55;
    langs.forEach(([icn, t, d], i) => {
      const x = M + (i % 2) * 6.18;
      const y = 1.55 + Math.floor(i / 2) * 1.42;
      card(s, x, y, 5.95, 1.22);
      iconRow(s, I[icn].gold, x + 0.25, y + 0.36, 0.5);
      s.addText(t, { x: x + 0.95, y: y + 0.12, w: 4.8, h: 0.36, fontFace: BF, fontSize: 14.5, bold: true, color: WHITE, margin: 0 });
      s.addText(d, { x: x + 0.95, y: y + 0.52, w: 4.8, h: 0.62, fontFace: BF, fontSize: 10.5, color: MUTED, margin: 0, fit: "shrink" });
    });
    card(s, M, 6.02, 12.13, 0.62, CARD2);
    s.addText("Tooling: npm scripts (dev, build, lint, test, db:push, db:seed, worker, engine:diagnostics)  |  Docker (Postgres 16, Redis 7)  |  Git  |  ESLint  |  Vitest  |  Playwright", {
      x: M, y: 6.02, w: 12.13, h: 0.62, fontFace: BF, fontSize: 11, color: MUTED, valign: "middle", align: "center", margin: 0, fit: "shrink",
    });
    addNotes(s,
      "The languages are exactly what the repository contains. TypeScript dominates - about 95 percent of the codebase. JavaScript appears only where workers and scripts are plain JS. SQL is real: a Drizzle-generated migration for a 12-table PostgreSQL schema. HTML and CSS arrive through JSX and Tailwind. MDX powers the blog. On tooling: everything is scripted - one command boots Postgres and Redis with Docker, another pushes the schema, another seeds data, and engine diagnostics validates the Stockfish installation.",
      ["Why TypeScript over plain JavaScript?", "Where does SQL appear in the project?", "What is engine:diagnostics?"],
      ["Type safety across the API boundary: the same types are shared between server responses and client components, so a schema change breaks the build instead of breaking at runtime.",
        "Drizzle ORM generates parameterized SQL from a typed schema; there is a single migration file in the drizzle folder, and the seed script inserts sample puzzles, leaderboards and a demo analysis.",
        "It is an npm script that checks the Stockfish binary, verifies Syzygy tablebase probing, tests opening-book hits, and runs a full game analysis, printing a JSON diagnostic - my own engine health tool."]);
  }

  // ============ 10. ARCHITECTURE ============
  {
    const s = S();
    header(s, "System Design", "Project Architecture", 29);
    cornerMotif(s);
    const box = (x, y, w, h, fill, border) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.06, fill: { color: fill }, line: { color: border, width: 1 } });
    const label = (x, y, w, h, t, sub, subC) => {
      s.addText(t, { x, y: y - 0.02, w, h: 0.32, fontFace: BF, fontSize: 12, bold: true, color: WHITE, align: "center", margin: 0, fit: "shrink" });
      if (sub) s.addText(sub, { x, y: y + 0.3, w, h: 0.24, fontFace: BF, fontSize: 8.5, color: subC || MUTED, align: "center", margin: 0, fit: "shrink" });
    };
    const down = (x, y) => iconRow(s, I["FaArrowRight"].muted, x, y, 0.26, "6E6E78");

    box(M, 1.52, 12.13, 0.72, "161619", "3A3A42");
    label(M, 1.52, 12.13, 0.72, "User", "Next.js client - React 19, Tailwind, chessboard, WASM Stockfish worker, IndexedDB cache");
    down(W / 2 - 0.13, 2.3);
    box(M, 2.6, 12.13, 0.72, "161619", "3A3A42");
    label(M, 2.6, 12.13, 0.72, "Next.js App Router", "40+ pages (analysis, coach, puzzles, games, openings)  |  25 REST/SSE API routes  |  server actions");
    down(W / 2 - 0.13, 3.38);
    box(M, 3.68, 12.13, 0.72, "161619", "3A3A42");
    label(M, 3.68, 12.13, 0.72, "Platform Service Layer", "import, analysis orchestration, persistence, rate limiting, report generation");
    down(W / 2 - 0.13, 4.46);
    const colW = 3.96;
    const cols = [
      ["FaChessRook", "Analysis Engine", "Stockfish 18 native (depth 24)  ·  WASM build  ·  TypeScript fallback engine (alpha-beta + neural-style eval)", "FFC62B"],
      ["FaBrain", "AI Layer", "Groq Llama 3.3 70B  ·  DeepSeek via OpenRouter  ·  zod-validated structured output", "FFC62B"],
      ["FaDatabase", "Data Layer", "PostgreSQL 16 + Drizzle  ·  Redis 7 + BullMQ  ·  optional MongoDB  ·  in-memory dev driver", "FFC62B"],
    ];
    cols.forEach(([icn, t, d, c], i) => {
      const x = M + i * (colW + 0.12);
      box(x, 4.76, colW, 1.28, "18181C", "3A3A42");
      iconRow(s, I[icn].gold, x + colW / 2 - 0.18, 4.86, 0.34);
      s.addText(t, { x, y: 5.24, w: colW, h: 0.3, fontFace: BF, fontSize: 11.5, bold: true, color: WHITE, align: "center", margin: 0 });
      s.addText(d, { x: x + 0.15, y: 5.56, w: colW - 0.3, h: 0.44, fontFace: BF, fontSize: 8, color: MUTED, align: "center", margin: 0, fit: "shrink" });
    });
    down(W / 2 - 0.13, 6.1);
    box(M, 6.38, 12.13, 0.58, "1F1F24", "4A4A54");
    s.addText("Outputs: game review report  |  AI coach snapshot  |  puzzle training  |  leaderboards  |  shareable report cards", {
      x: M, y: 6.38, w: 12.13, h: 0.58, fontFace: BF, fontSize: 11.5, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, fit: "shrink",
    });
    addNotes(s,
      "This is the architecture examiners love. At the top, the user's browser runs React with a WASM Stockfish worker for instant live analysis. Requests flow into the Next.js App Router - 40 pages and 25 API routes. The platform service layer orchestrates imports, analysis and persistence. Then three parallel pillars: the analysis engine (native Stockfish 18, a WASM build, and - critically - a pure-TypeScript fallback engine with alpha-beta search and a neural-style evaluation so the app works even without Stockfish), the AI layer (Groq and DeepSeek with structured output validation), and the data layer (PostgreSQL, Redis/BullMQ, optional MongoDB, and an in-memory driver for development). Outputs are the review report, coach snapshot, puzzles, leaderboards and shareable cards.",
      ["Why an in-memory driver?", "What happens if Stockfish is missing?", "Where does the LLM get its data?"],
      ["The repository layer has three backends - memory, hybrid, and database. The memory driver lets the entire app run without infrastructure for demos and CI, while the database driver is the production path. This is an adapter pattern I implemented myself.",
        "The fallback engine takes over: a TypeScript minimax engine with alpha-beta pruning, quiescence search, piece-square tables and a compact neural-style evaluator. Analysis continues at lower depth, so the product never breaks.",
        "The AI coach request carries pre-computed game summaries - accuracy, blunder counts, openings, phase distribution - so the LLM reasons over real numbers from the user's own games, not free text."]);
  }

  // ============ 11. ANALYSIS ENGINE ============
  {
    const s = S();
    header(s, "Core Pipeline", "How the Analysis Engine Works", 29);
    cornerMotif(s);
    const steps = [
      ["FaExchangeAlt", "1. Import", "PGN paste, Chess.com archive or Lichess - each move replayed with chess.js"],
      ["FaChessBoard", "2. Search", "Two Stockfish searches per move (before & after), MultiPV 3, quick depth 18 / deep depth 24"],
      ["FaBookOpen", "3. Opening book", "Polyglot book (Perfect2023) for the first 20 plies; optional Syzygy tablebases for endgames"],
      ["FaChartLine", "4. Classify", "cp-loss + win-probability deltas map every move to one of 9 grades"],
      ["FaStar", "5. Report", "Accuracy, critical moments, story, best-move chain, win-prob chart, statistics"],
      ["FaSave", "6. Persist", "AnalysisRun saved to PostgreSQL; deep mode also enqueues a Redis worker refinement"],
    ];
    let sx = M, syy = 1.55;
    steps.forEach(([icn, t, d], i) => {
      const x = M + (i % 3) * 4.16;
      const y = 1.55 + Math.floor(i / 3) * 2.12;
      card(s, x, y, 3.9, 1.92);
      iconRow(s, I[icn].gold, x + 0.27, y + 0.24, 0.42);
      s.addText(t, { x: x + 0.27, y: y + 0.76, w: 3.35, h: 0.36, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.27, y: y + 1.14, w: 3.35, h: 0.7, fontFace: BF, fontSize: 9.5, color: MUTED, margin: 0, fit: "shrink" });
    });
    s.addText("Facts: depth 18 / movetime 350 ms (quick)  -  depth 24 / up to 3 s per move (deep)  -  MultiPV up to 6  -  evaluations in centipawns, normalized to White's perspective", {
      x: M, y: 5.95, w: 12.13, h: 0.55, fontFace: BF, fontSize: 11, color: GOLD, align: "center", valign: "middle", margin: 0, fit: "shrink",
    });
    addNotes(s,
      "The heart of the product. After import, the orchestrator streams analysis over SSE so the UI updates move by move. For each ply, Stockfish searches the position before the move and after it - that difference is what makes classification possible. Opening-book moves skip the search and are graded Book. Each move's engine score is converted to centipawns from White's perspective, the cp-loss between best and played move is computed, and a win-probability classifier assigns one of nine grades. The report assembles accuracy, critical moments, and the narrative. Quick mode searches depth 18 with 350 ms per move; deep mode goes to depth 24 with up to three seconds and extra MultiPV probes.",
      ["Why analyze both before and after positions?", "What is cp-loss?", "Why SSE streaming?"],
      ["We need the best available score in the position before the move, and the score after the player's move. The gap between them is the actual cost of the move. Classifying from a single evaluation would be meaningless.",
        "Centipawn loss is the difference between the engine's best evaluation and the evaluation of the played move, in hundredths of a pawn. A blunder typically loses 200+ centipawns; a best move loses less than 5.",
        "Game review is a long operation - deep mode can take minutes. SSE lets the UI show progress per move, so the user sees the analysis being built instead of staring at a spinner."]);
  }

  // ============ 12. GRADES & ACCURACY ============
  {
    const s = S();
    header(s, "Scoring", "Move Quality, Accuracy & Rating", 28);
    cornerMotif(s);
    const grades = [
      ["Brilliant", "best move + big win-probability gain, all alternatives lose"],
      ["Great", "best move + meaningful win-probability gain"],
      ["Best", "matches engine best (within 5 cp)"],
      ["Excellent / Good", "small to moderate cp-loss"],
      ["Book", "matches the opening book"],
      ["Inaccuracy", "win probability drops 5-10%"],
      ["Mistake", "win probability drops 10-20%"],
      ["Blunder", "win probability drops 20%+ / big cp-loss"],
    ];
    table(s, grades.map(([g, d]) => [g, d]), {
      x: M, y: 1.52, w: 6.2, colW: [1.9, 4.3], rowH: 0.4, size: 10.5, firstColBold: true,
    });
    card(s, 7.05, 1.52, 5.68, 2.6);
    s.addText("Accuracy (CAPS)", { x: 7.35, y: 1.72, w: 5, h: 0.34, fontFace: BF, fontSize: 13, bold: true, color: GOLD, margin: 0 });
    s.addText("Per move: caps = (winProb(move) - winProb(worst)) / (winProb(best) - winProb(worst)) x 100", {
      x: 7.35, y: 2.1, w: 5.1, h: 0.5, fontFace: BF, fontSize: 11, color: WHITE, margin: 0, fit: "shrink",
    });
    s.addText("Game accuracy = mean caps per side, clamped 0-100. Worst-move baseline = -200 cp. Win probability = 1 / (1 + 10^(-cp/400)).", {
      x: 7.35, y: 2.62, w: 5.1, h: 0.6, fontFace: BF, fontSize: 10.5, color: MUTED, margin: 0, fit: "shrink",
    });
    s.addText("Sample game result (built-in demo):", { x: 7.35, y: 3.28, w: 5.1, h: 0.3, fontFace: BF, fontSize: 11, color: WHITE, bold: true, margin: 0 });
    s.addText("White 89.6% accuracy  -  Black 92.2%  -  22 moves  -  Ruy Lopez (C60)", {
      x: 7.35, y: 3.6, w: 5.1, h: 0.4, fontFace: BF, fontSize: 11, color: GOLD, margin: 0, fit: "shrink",
    });
    card(s, 7.05, 4.32, 5.68, 2.2);
    s.addText("Rating estimate", { x: 7.35, y: 4.52, w: 5, h: 0.34, fontFace: BF, fontSize: 13, bold: true, color: GOLD, margin: 0 });
    s.addText("estimated rating = 900 + accuracy x 12   (display estimate from game accuracy; Elo math also powers the puzzle rating system)", {
      x: 7.35, y: 4.9, w: 5.1, h: 0.55, fontFace: BF, fontSize: 11, color: WHITE, margin: 0, fit: "shrink",
    });
    s.addText("Example: 89.6% accuracy ~= 1975  |  92.2% ~= 2006. Moves are also tagged with motifs (fork, pin, mate threat...) on the Insights tab.", {
      x: 7.35, y: 5.5, w: 5.1, h: 0.9, fontFace: BF, fontSize: 10.5, color: MUTED, margin: 0, fit: "shrink",
    });
    addNotes(s,
      "How do we score a move? Stockfish gives the best evaluation and the evaluation after the played move; the difference is the cost. The classifier then maps that to a grade - the ladder on the left, from Brilliant down to Blunder, using win-probability deltas and cp-loss thresholds. Accuracy is a CAPS score: for each move we compare the win-probability of the played move against the best and the worst possible moves, giving 0-100 per move, then average per side. The demo game scores 89.6 and 92.2 percent. Finally, the UI shows an estimated rating derived from accuracy - 900 plus 12 times accuracy - clearly labeled as an estimate.",
      ["What makes a move Brilliant?", "How is accuracy different from average cp-loss?", "Is the rating estimate Elo?"],
      ["A Brilliant move must be the engine's top choice, occur in an equal-ish position, produce a big win-probability jump, and every alternative must lose at least 10 percent - so it is a genuinely creative, only-move winning idea, not just a good move.",
        "CAPS accuracy compares each move against the best and worst possible moves in that position - it is position-relative. Average cp-loss is position-absolute. CAPS is fairer because a 50-cp loss in a dead drawn position is irrelevant.",
        "It is a display heuristic (900 + 12 x accuracy). The real Elo machinery - expected score and K-factor updates - exists in the rating module and drives the puzzle rating system, where players gain or lose points on each attempt."]);
  }

  // ============ 13. AI COACHING LAYER ============
  {
    const s = S();
    header(s, "Intelligence", "The AI Coaching Layer", 29);
    cornerMotif(s);
    const flow = [
      ["FaDatabase", "1. Game data", "Up to 50 analyzed games: accuracy, blunders, openings, phases, PGN"],
      ["FaExchangeAlt", "2. API call", "POST /api/ai-coach (rate-limited, retries, backoff)"],
      ["FaBrain", "3. LLM", "Groq Llama 3.3 70B, fallback DeepSeek via OpenRouter"],
      ["FaCheckCircle", "4. Validation", "zod schema: strengths, weaknesses, drills, weekly goal, opening recommendation"],
      ["FaRobot", "5. Coach report", "Personalized plan rendered on /coach, cached 24h, badge reward"],
    ];
    let fx = M;
    flow.forEach(([icn, t, d], i) => {
      card(s, fx, 1.55, 2.34, 1.85);
      iconRow(s, I[icn].gold, fx + 0.28, 1.8, 0.42);
      s.addText(t, { x: fx + 0.2, y: 2.3, w: 1.95, h: 0.34, fontFace: BF, fontSize: 11, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: fx + 0.2, y: 2.66, w: 1.95, h: 0.72, fontFace: BF, fontSize: 8.3, color: MUTED, margin: 0, fit: "shrink" });
      if (i < 4) iconRow(s, I["FaArrowRight"].muted, fx + 2.4, 2.3, 0.26);
      fx += 2.45;
    });
    const rows2 = [
      ["Feature", "Implementation", "Status"],
      ["AI coach report", "Real LLM over your own games - strengths, weaknesses, drills, weekly goal", "Implemented"],
      ["Move explanations", "/api/explain-move - grade-consistent explanations, 200-word limit, JSON schema", "Implemented"],
      ["AI assistant chat", "SSE streaming chat panel (Groq/OpenRouter)", "Implemented"],
      ["What-If coaching", "Alternative moves graded by engine (depth 14); LLM commentary ready but off by default", "Beta"],
      ["Coach chat demo", "Heuristic canned responses", "Demo"],
      ["Chess Globe AI insights", "Mock data population", "Beta"],
    ];
    table(s, rows2, { x: M, y: 3.62, w: 12.13, colW: [2.6, 7.0, 2.53], rowH: 0.46, size: 10.5 });
    addNotes(s,
      "This is the differentiator. The pipeline: we take up to 50 analyzed games, summarize them into structured inputs, and call the AI coach API. The LLM - Groq's Llama 3.3 70B, with DeepSeek via OpenRouter as fallback - returns a plan that we validate with a zod schema: strengths, weaknesses with evidence and drills, a weekly goal, and an opening recommendation. The report is cached for 24 hours and rendered on the coach page. The table below shows the honest status: the coach report and move explanations are fully implemented; the What-If coach commentary and Chess Globe AI insights are in beta, and the coach chat demo is a canned heuristic - I will not claim it is an LLM.",
      ["How do you prevent the LLM from hallucinating?", "Why zod validation?", "What is the What-If coach status?"],
      ["The model never sees raw board state; it receives computed statistics (accuracy, blunder counts, opening names) which are factual by construction, and every weakness must cite evidence from the games. The output is schema-validated and re-requested on failure.",
        "The route declares a zod schema for the entire response. If the LLM returns malformed JSON or missing fields, the request retries with backoff; if it still fails, a deterministic fallback report is served so the UI never breaks.",
        "The engine grading is fully implemented at depth 14 for instant feedback. The LLM commentary endpoint exists and works, but is disabled by default in the UI because every drag-drop would trigger a slow, rate-limited AI call - a deliberate product trade-off."]);
  }

  // ============ 14. MODULES ============
  {
    const s = S();
    header(s, "Structure", "Modules", 30);
    cornerMotif(s);
    const mods = [
      ["FaUserCircle", "Authentication", "Email/password (scrypt), Google & GitHub OAuth (PKCE), guest session merge"],
      ["FaExchangeAlt", "Game Import", "PGN paste, Chess.com archive, Lichess - with live fetch and sample fallback"],
      ["FaChessRook", "Analysis Engine", "Stockfish 18 native + WASM, TS fallback engine, opening book, Syzygy"],
      ["FaChessBoard", "Game Review", "Classified moves, eval bar, win-prob chart, critical moments, story"],
      ["FaBolt", "What-If Analysis", "Drag an alternative move, engine-graded instantly, chained sessions"],
      ["FaRobot", "AI Coach", "LLM coach reports, coach snapshot, training modules, badge rewards"],
      ["FaPuzzlePiece", "Puzzle Training", "Elo-rated attempts, daily challenge, streak tracking"],
      ["FaBookOpen", "Opening Explorer", "14 SEO opening guides with ECO, variations, stats from analyzed games"],
      ["FaGlobeAsia", "Chess Globe", "3D world activity globe with live-game arcs (mock data - beta)"],
      ["FaSave", "Games Library", "Saved games with filters, accuracy, eval trends, roast-ready flags"],
      ["FaUsers", "Local Play", "PvP on one device with clocks, captured pieces, PGN export, one-click review"],
      ["FaLayerGroup", "Content & i18n", "MDX blog, pricing, legal, changelog, PWA, 6 locales"],
    ];
    mods.forEach(([icn, t, d], i) => {
      const x = M + (i % 3) * 4.16;
      const y = 1.5 + Math.floor(i / 3) * 1.34;
      card(s, x, y, 3.9, 1.18);
      iconRow(s, I[icn].gold, x + 0.24, y + 0.16, 0.34);
      s.addText(t, { x: x + 0.24, y: y + 0.52, w: 3.45, h: 0.28, fontFace: BF, fontSize: 11.5, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.24, y: y + 0.8, w: 3.45, h: 0.34, fontFace: BF, fontSize: 8.3, color: MUTED, margin: 0, fit: "shrink" });
    });
    addNotes(s,
      "The product is organized into twelve modules. Authentication is custom-built. Import connects PGN, Chess.com and Lichess. The analysis engine is the Stockfish integration with the TypeScript fallback. Game review renders the report. What-If analysis is the interactive explorer. The AI coach produces the personalized plan. Puzzle training has Elo rating. The opening explorer covers 14 openings. The Chess Globe is a 3D visualization (beta). The games library stores history. Local play supports PvP on one device, and content modules cover blog, pricing, PWA and six languages. There is no admin module - the database is managed through seed scripts and the schema directly.",
      ["Which module was the most complex?", "Why no admin panel?", "How do modules communicate?"],
      ["Game review - it orchestrates the streaming engine, classification, report assembly, caching, and persistence, plus the interactive board state. Everything else depends on it.",
        "The scope was already large; admin functions like seeding and diagnostics are covered by npm scripts (db:seed, engine:diagnostics). A management UI is on the roadmap.",
        "They communicate through the platform service layer and the repositories - pages call API routes, routes call services, services call repositories which switch between memory, MongoDB and PostgreSQL backends."]);
  }

  // ============ 15. FEATURES ============
  {
    const s = S();
    header(s, "Capability Matrix", "Features & Implementation Status", 28);
    cornerMotif(s);
    const rows = [
      ["Feature", "Description", "Status"],
      ["Game analysis (quick/deep)", "SSE streaming, Stockfish 18, 9-grade classification, accuracy", "Implemented"],
      ["PGN / Chess.com / Lichess import", "Live public fetch with bundled sample fallback", "Implemented"],
      ["Game review report", "Board, eval bar, chart, critical moments, story, share link", "Implemented"],
      ["What-If variation analysis", "Drag-drop alternative moves, engine-graded at depth 14", "Implemented"],
      ["AI move explanations", "LLM explanations consistent with the assigned grade", "Implemented"],
      ["AI coach report", "Strengths, weaknesses, drills, weekly goal from up to 50 games", "Implemented"],
      ["Live analysis board", "Any FEN position, engine lines, best move (browser WASM)", "Implemented"],
      ["Opening explorer", "14 guides: ECO, variations, stats, related analyses", "Implemented"],
      ["Puzzle training", "Elo-rated attempts, leaderboard", "Beta (small catalog)"],
      ["Daily challenge & streaks", "Date-seeded puzzle of the day", "Beta (stats hardcoded)"],
      ["Chess Globe", "3D world activity visualization", "Beta (mock data)"],
      ["Online multiplayer", "Play vs AI and online PvP", "Planned"],
    ];
    table(s, rows, { x: M, y: 1.5, w: 12.13, colW: [3.1, 6.1, 2.93], rowH: 0.4, size: 10.5 });
    addNotes(s,
      "This is my honest capability matrix. Twelve headline features with three statuses. Implemented: the full game analysis with both modes, all three import paths, the review report, What-If exploration, AI explanations, the AI coach, the live board, and the opening explorer. Beta: puzzle training - the loop works but the catalog is currently three puzzles - the daily challenge whose streak metrics are partially hardcoded, and the Chess Globe with mock data. Planned: online multiplayer. This transparency is deliberate - I would rather present partial honestly than claim work that does not exist in the repository.",
      ["What does Beta mean exactly?", "Why only three puzzles?", "Why is multiplayer planned and not done?"],
      ["A feature is marked Beta when its core loop is real but its content or data is limited - the daily challenge works but streak numbers are seeded; the globe renders but with a mock game population.",
        "The puzzle pipeline (storage, attempt API, Elo math, leaderboard) is complete; the catalog is small because puzzles are hand-curated. Bulk import from a public puzzle database is a roadmap item.",
        "Multiplayer needs real-time networking, rooms, and game state synchronization - a separate project. The local PvP module already proves the game rules engine, so online play is an incremental step."]);
  }

  // ============ 16. WORKFLOW ============
  {
    const s = S();
    header(s, "User Journey", "Workflow", 30);
    cornerMotif(s);
    const steps = [
      ["FaExchangeAlt", "Import Game", "PGN / Chess.com / Lichess"],
      ["FaChessRook", "Analyze", "Stockfish 18, quick or deep"],
      ["FaChartLine", "Engine Evaluation", "Every move scored, cp-loss"],
      ["FaCommentDots", "AI Explanation", "Why is it best / a mistake"],
      ["FaStar", "Accuracy", "CAPS score per player"],
      ["FaFileAlt", "Report", "Critical moments + story"],
      ["FaRobot", "Coach Suggestions", "Drills + weekly goal"],
      ["FaGraduationCap", "Improve", "Puzzles + next game"],
    ];
    const boxW = 1.34, boxH = 1.15;
    const startX = 0.55;
    steps.forEach(([icn, t, d], i) => {
      const x = startX + i * 1.56;
      card(s, x, 2.05, boxW, boxH);
      iconRow(s, I[icn].gold, x + (boxW - 0.4) / 2, 2.18, 0.4);
      s.addText(t, { x: x + 0.05, y: 2.62, w: boxW - 0.1, h: 0.3, fontFace: BF, fontSize: 9.5, bold: true, color: WHITE, align: "center", margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.05, y: 2.93, w: boxW - 0.1, h: 0.26, fontFace: BF, fontSize: 7, color: MUTED, align: "center", margin: 0, fit: "shrink" });
      if (i < steps.length - 1) {
        s.addShape(pres.shapes.CHEVRON, { x: x + boxW + 0.04, y: 2.45, w: 0.18, h: 0.34, fill: { color: GOLD }, line: { type: "none" }, rotate: 90 });
      }
    });
    s.addText("From first move to trained skill in one loop - analysis, explanation, report, and coaching all come from a single game import.", {
      x: M, y: 3.55, w: 12.13, h: 0.4, fontFace: BF, fontSize: 13, italic: true, color: MUTED, align: "center", margin: 0,
    });
    const cards = [
      ["FaPlay", "Streaming", "SSE events per move - live progress bar, no waiting"],
      ["FaRedo", "Repeatable", "Same PGN returns cached report in seconds (report cache + IndexedDB)"],
      ["FaSave", "Persistent", "Reports survive sessions; guests merge history into accounts"],
      ["FaShareAlt", "Shareable", "Every report gets a stable URL and an OG image card"],
    ];
    cards.forEach(([icn, t, d], i) => {
      const x = M + i * 3.16;
      card(s, x, 4.3, 2.9, 1.9);
      iconRow(s, I[icn].gold, x + 0.28, 4.55, 0.44);
      s.addText(t, { x: x + 0.28, y: 5.1, w: 2.35, h: 0.34, fontFace: BF, fontSize: 12.5, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.28, y: 5.46, w: 2.35, h: 0.65, fontFace: BF, fontSize: 9.3, color: MUTED, margin: 0, fit: "shrink" });
    });
    addNotes(s,
      "The end-to-end workflow: import a game, the engine analyzes every move, classifications arrive, the AI explains the important ones, accuracy is computed, a full report with critical moments and a narrative is generated, and the AI coach turns it into drills and a weekly goal - which feeds back into puzzle training. The lower cards highlight engineering properties: streaming progress over SSE, caching at three levels so re-analysis is instant, persistence with guest-account merge, and shareable reports with generated OG images.",
      ["How long does analysis take?", "What is the three-level cache?", "How does guest merge work?"],
      ["Quick mode is about a second per move, streaming live; deep mode can take minutes for long games but is one-time - the report is cached and instant on revisit.",
        "In-memory report cache keyed by PGN hash on the server, per-position caches inside a run, and a client IndexedDB cache with a 7-day TTL - revisiting a report costs no engine time.",
        "Guests get a localStorage ID; their analysis history is tracked server-side. On sign-up or sign-in, the server claims those report IDs and re-associates them with the new account - no work lost."]);
  }

  // ============ 17. SCREENSHOTS 1 ============
  {
    const s = S();
    header(s, "Application", "Screenshots - Home & Game Review");
    cornerMotif(s);
    const frame = (img, x, y, w, h, cap) => {
      card(s, x - 0.12, y - 0.12, w + 0.24, h + 0.52, "101013", "26262B");
      s.addImage({ path: img, x, y, w, h, sizing: { type: "contain", w, h } });
      s.addText(cap, { x: x - 0.12, y: y + h + 0.08, w: w + 0.24, h: 0.32, fontFace: BF, fontSize: 10.5, color: MUTED, align: "center", margin: 0 });
    };
    frame(png("01-home-hero.png"), 0.85, 1.62, 5.75, 3.83, "Home - hero, features and stats");
    frame(png("02-analysis.png"), 7.05, 1.62, 5.35, 3.34, "Game review - classified moves, eval bar, report");
    s.addText("The review screen is the flagship: every move is graded, accuracy is shown per player, and the report tab adds critical moments and a narrative.", {
      x: 7.05, y: 5.25, w: 5.35, h: 1.2, fontFace: BF, fontSize: 11, color: MUTED, margin: 0, fit: "shrink",
    });
    addNotes(s,
      "Live screenshots from the running application - this is the real product, not a mockup. The home page introduces the platform with feature cards and stats. The game review screen shows the board, the move list with grade badges, the evaluation bar, and the report tab with accuracy, critical moments and the game narrative. I captured these from the local build.",
      ["Is this a real product or a mockup?", "What is on the evaluation bar?", "Where is the report saved?"],
      ["These are actual screenshots of the app running locally, analyzing the built-in demo game with the TypeScript engine fallback.",
        "The bar shows the engine's centipawn evaluation converted to a win percentage, plus the best move and alternative lines.",
        "Reports are persisted as AnalysisRun records; every report has a stable URL (/analysis/:id) and an auto-generated Open Graph image for sharing."]);
  }

  // ============ 18. SCREENSHOTS 2 ============
  {
    const s = S();
    header(s, "Application", "Screenshots - Feature Surfaces", 28);
    cornerMotif(s);
    const thumbs = [
      ["03-analyze.png", "Import hub"],
      ["04-board.png", "Live analysis board"],
      ["05-puzzles.png", "Puzzle training"],
      ["06-coach.png", "AI coach workspace"],
      ["07-globe.png", "Chess Globe (beta)"],
      ["09-games.png", "Games library"],
    ];
    thumbs.forEach(([f, cap], i) => {
      const x = 0.65 + (i % 3) * 4.14;
      const y = 1.62 + Math.floor(i / 3) * 2.6;
      card(s, x - 0.08, y - 0.08, 3.9, 2.34, "101013", "26262B");
      s.addImage({ path: png("thumb-" + f), x, y, w: 3.74, h: 2.34 });
      s.addText(cap, { x: x - 0.08, y: y + 2.42, w: 3.9, h: 0.28, fontFace: BF, fontSize: 10, color: MUTED, align: "center", margin: 0 });
    });
    addNotes(s,
      "Six more screens from the running app: the import hub where you paste a PGN or connect Chess.com and Lichess, the live analysis board for any FEN position, puzzle training with Elo, the AI coach workspace that selects 10, 25 or 50 games, the Chess Globe visualization - marked beta because it currently uses mock data - and the games library with filters, accuracy and eval trends.",
      ["What is the import hub?", "What does the coach page do?", "Why is the globe beta?"],
      ["Three import paths in one screen: paste PGN text, enter a Chess.com username to fetch public archives, or a Lichess username. Each path lands in the same analysis pipeline.",
        "You pick how many games to analyze (10, 25, 50) and the LLM produces strengths, weaknesses with drills, a weekly goal, and an opening recommendation - cached for 24 hours.",
        "The globe renders beautifully with Three.js but its game arcs come from a mock population. The Lichess TV client code exists in the repo and is the planned real data source."]);
  }

  // ============ 19. DATABASE ============
  {
    const s = S();
    header(s, "Persistence", "Database Design - PostgreSQL (12 Tables)");
    cornerMotif(s);
    const groups = [
      ["Auth & Users", "users  ·  identities  ·  user_credentials  ·  subscriptions  ·  chess_accounts", "HMAC sessions, scrypt hashes, OAuth identities, tier free/pro/coach, linked Chess.com/Lichess accounts"],
      ["Analysis", "imported_pgns  ·  analysis_runs  ·  move_evaluations", "PGN audit trail + hash dedupe; report payload JSONB; per-ply score, cp-loss, grade"],
      ["Training & Social", "puzzles  ·  puzzle_attempts  ·  coach_snapshots  ·  leaderboard_entries", "Elo-rated attempts; coach report payloads; puzzle & brilliant boards"],
    ];
    let gy = 1.5;
    groups.forEach(([t, tables, desc]) => {
      card(s, M, gy, 6.55, 1.42);
      s.addShape(pres.shapes.RECTANGLE, { x: M, y: gy, w: 0.09, h: 1.42, fill: { color: GOLD }, line: { type: "none" } });
      s.addText(t, { x: M + 0.3, y: gy + 0.12, w: 6, h: 0.32, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0 });
      s.addText(tables, { x: M + 0.3, y: gy + 0.46, w: 6, h: 0.34, fontFace: "Consolas", fontSize: 10.5, color: GOLD, margin: 0, fit: "shrink" });
      s.addText(desc, { x: M + 0.3, y: gy + 0.85, w: 6, h: 0.5, fontFace: BF, fontSize: 9.5, color: MUTED, margin: 0, fit: "shrink" });
      gy += 1.56;
    });
    card(s, 7.45, 1.5, 5.28, 4.3);
    s.addText("Design highlights", { x: 7.75, y: 1.68, w: 4.6, h: 0.34, fontFace: BF, fontSize: 13, bold: true, color: GOLD, margin: 0 });
    blist(s, 7.75, 2.1, 4.7, 3.6, [
      "PostgreSQL 16 via Docker; Drizzle ORM + one generated migration",
      "UUID primary keys; unique indexes on email, public IDs, PGN hashes",
      "JSONB payloads keep reports flexible without schema churn",
      "Driver modes: memory / hybrid / database with graceful fallback",
      "Optional MongoDB store for user accounts (Atlas-ready)",
      "Redis 7 + BullMQ queue for deep-analysis refinement jobs",
      "Seed script: sample puzzles, leaderboards, demo analysis",
    ], { size: 11, space: 7 });
    addNotes(s,
      "Twelve tables in three groups. Auth and users: users, identities, credentials, subscriptions with the free/pro/coach tier enum, and linked chess accounts. Analysis: imported PGNs with audit trail and hash deduplication, analysis runs whose entire report is a JSONB payload, and move evaluations storing per-ply score, cp-loss and grade - the analytical core. Training and social: puzzles, attempts, coach snapshots and leaderboards. Highlights: Drizzle migrations, UUIDs, JSONB flexibility, three driver modes with graceful fallback, optional MongoDB for user accounts, and Redis-backed queues.",
      ["Why JSONB for reports?", "What is the driver-mode pattern?", "How is the schema versioned?"],
      ["Reports contain engine lines, chart data, comments and story text - shapes that differ between features. JSONB stores them without rigid columns while move evaluations stay relational because they are queried and aggregated.",
        "A repository layer exposes one interface with three implementations: in-memory Maps for development and demos, PostgreSQL for production, and a hybrid that falls back gracefully when the database is unreachable - an adapter pattern I implemented.",
        "Drizzle generates a single SQL migration file (drizzle folder) applied via npm run db:push; the schema file is the single source of truth."]);
  }

  // ============ 20. FUTURE ENHANCEMENTS ============
  {
    const s = S();
    header(s, "Roadmap", "Future Enhancements");
    cornerMotif(s);
    const fut = [
      ["FaUsers", "Online multiplayer PvP", "Real-time rooms on top of the proven local PvP rules module"],
      ["FaPlay", "Live game review", "Analyze games in progress (Lichess TV client is already built)"],
      ["FaGlobeAsia", "Chess Globe with live data", "Switch mock arcs to the real Lichess TV stream"],
      ["FaMicrophone", "AI voice coach", "Spoken explanations via the coaching pipeline"],
      ["FaMobileAlt", "Mobile app", "PWA is installed today; native apps with shared APIs"],
      ["FaLightbulb", "Opening recommendation AI", "Suggest openings from your game history and results"],
      ["FaCloud", "Cloud sync", "Cross-device profiles, badges and coach reports"],
      ["FaTrophy", "Tournament mode", "Multiplayer tournaments with brackets and ratings"],
    ];
    fut.forEach(([icn, t, d], i) => {
      const x = M + (i % 2) * 6.18;
      const y = 1.6 + Math.floor(i / 2) * 1.28;
      card(s, x, y, 5.95, 1.1);
      iconRow(s, I[icn].gold, x + 0.25, y + 0.3, 0.5);
      s.addText(t, { x: x + 0.95, y: y + 0.12, w: 4.8, h: 0.36, fontFace: BF, fontSize: 13, bold: true, color: WHITE, margin: 0, fit: "shrink" });
      s.addText(d, { x: x + 0.95, y: y + 0.5, w: 4.8, h: 0.5, fontFace: BF, fontSize: 9.8, color: MUTED, margin: 0, fit: "shrink" });
    });
    addNotes(s,
      "Everything on this slide is genuinely future work - none of it is claimed as built. Multiplayer online PvP is the biggest item; the rules engine already works through local PvP, so it is incremental. Live game review can reuse the Lichess TV client that already exists in the repository. The Chess Globe needs its real data feed. Then voice coaching, a mobile app, opening recommendations from history, cloud sync, and tournaments.",
      ["Which enhancement would you do first?", "Is the PWA really installed?", "How hard is multiplayer really?"],
      ["Live game review - the Lichess TV client code already exists and is tested; wiring it into the analysis pipeline is the smallest step with the biggest wow factor.",
        "The /download page registers the service worker (next-pwa), so the app is installable offline-capable today; the manifest and icons are in place.",
        "Local PvP already implements clocks, captures, move legality and PGN export. Online play needs WebSocket room management and state synchronization - a semester-sized add-on."]);
  }

  // ============ 21. CONCLUSION ============
  {
    const s = S();
    header(s, "Summary", "Conclusion");
    cornerMotif(s);
    card(s, M, 1.55, 12.13, 4.2);
    s.addText("Chessfork delivers on its promise: a free, AI-powered chess improvement platform built from first principles.", {
      x: M + 0.4, y: 1.85, w: 11.3, h: 0.5, fontFace: TF, fontSize: 16, italic: true, color: GOLD, margin: 0, fit: "shrink",
    });
    const concl = [
      "Full-stack product: Next.js 16, React 19, TypeScript, PostgreSQL, Redis - 40+ pages, 25 API routes, 12 tables",
      "Real engine work: Stockfish 18 integration with quick/deep modes, opening book, Syzygy, plus a pure-TypeScript fallback engine with alpha-beta search and a neural-style evaluator",
      "Real AI: LLM coach reports and move explanations with schema-validated structured output",
      "Interactive learning: What-If variation analysis grades the player's own ideas at depth 14",
      "9-grade move classification, CAPS accuracy, critical moments, and rating estimates make improvement measurable",
      "Honest scope: features are labeled Implemented, Beta or Planned - the repository matches this deck",
    ];
    blist(s, M + 0.4, 2.5, 11.3, 3.0, concl, { size: 12.5, space: 9 });
    s.addText("Chessfork is a foundation, not a finish line - the architecture is ready for multiplayer, live review and a global coaching community.", {
      x: M + 0.4, y: 5.35, w: 11.3, h: 0.35, fontFace: BF, fontSize: 11.5, color: MUTED, italic: true, margin: 0,
    });
    addNotes(s,
      "To conclude: I set out to build a tool that makes engine analysis educational. The result is a complete full-stack product - 40 pages, 25 API routes, a 12-table database - with a real Stockfish 18 integration and a fallback engine I wrote myself, real LLM coaching with structured validation, interactive What-If learning, and an honest capability matrix. The grading system, CAPS accuracy and rating estimates turn a chess game into a readable learning report. Every claim in this presentation is traceable to the repository; every limitation is stated openly.",
      ["What did you learn?", "What was the biggest challenge?", "Would you use it yourself?"],
      ["Everything from UCI engine protocol and minimax search to OAuth PKCE, SSE streaming, BullMQ jobs, and LLM prompt engineering with schema validation - plus disciplined scoping.",
        "The engine pipeline: two searches per move, MultiPV handling, score normalization across engines and depths, and the fallback engine's quiescence search - correctness here affects every downstream feature.",
        "Yes - it is already the tool I use after my own online games; the What-If feature is the one I use most."]);
  }

  // ============ 22. THANK YOU ============
  {
    const s = pres.addSlide();
    bg(s);
    for (let i = 0; i < 10; i++) {
      s.addShape(pres.shapes.RECTANGLE, { x: i * (W / 10), y: H - 0.34, w: W / 10, h: 0.34, fill: { color: i % 2 === 0 ? "1C1C20" : "131316" }, line: { type: "none" } });
    }
    s.addShape(pres.shapes.RECTANGLE, { x: W / 2 - 2.2, y: H - 0.34, w: 4.4, h: 0.34, fill: { color: GOLD }, line: { type: "none" } });
    s.addImage({ data: I["FaChessKnight"].gold, x: (W - 1.2) / 2, y: 1.1, w: 1.2, h: 1.2 });
    s.addText("Thank You", { x: 0, y: 2.5, w: W, h: 0.9, fontFace: TF, fontSize: 52, bold: true, color: WHITE, align: "center" });
    s.addText("Questions & Discussion", { x: 0, y: 3.5, w: W, h: 0.4, fontFace: BF, fontSize: 16, color: GOLD, align: "center" });
    s.addText("[Your Name]  ·  [Register Number]  ·  [Email]", { x: 0, y: 4.2, w: W, h: 0.4, fontFace: BF, fontSize: 13, color: MUTED, align: "center" });
    s.addText("Source: private repository  |  Live demo: local build", { x: 0, y: 4.75, w: W, h: 0.35, fontFace: BF, fontSize: 11, color: FAINT, align: "center" });
    s.addNotes("Thank the panel. Offer a live demo: import the built-in demo game or paste any PGN, show quick analysis streaming, open the report, try What-If, and generate the AI coach report. Invite questions. Answer confidently - every claim maps to code.");
  }

  // ============ APPENDIX A: REPOSITORY ============
  {
    const s = S();
    header(s, "Appendix A", "Repository Structure", 28);
    cornerMotif(s);
    const tree = [
      ["src/app", "40+ route pages + 25 API routes (App Router)"],
      ["src/components", "Analysis, coach, chess, landing, gamification, auth UI"],
      ["src/lib", "chess engines, analysis, ratings, AI clients, caching, reports"],
      ["src/server", "auth, db (Drizzle), repositories, queue, stockfish, billing"],
      ["src/hooks", "engine session, What-If sessions, live analysis, AI context"],
      ["src/data + src/content", "sample data, ECO database, blog posts (MDX)"],
      ["drizzle", "schema migrations + seed pipeline"],
      ["public", "Stockfish WASM, workers, piece sets, badge SVGs, PWA assets"],
      ["scripts", "stockfish/syzygy/opening-book install, engine diagnostics"],
      ["e2e + src/test", "Playwright e2e, Vitest unit coverage"],
    ];
    tree.forEach(([d, t], i) => {
      const y = 1.52 + i * 0.52;
      s.addText(d, { x: M, y, w: 2.4, h: 0.4, fontFace: "Consolas", fontSize: 10.5, color: GOLD, bold: true, margin: 0, valign: "middle" });
      s.addText(t, { x: 3.2, y, w: 9.5, h: 0.4, fontFace: BF, fontSize: 10.5, color: MUTED, margin: 0, valign: "middle", fit: "shrink" });
      if (i < tree.length - 1) s.addShape(pres.shapes.LINE, { x: M + 0.05, y: y + 0.46, w: 11.9, h: 0, line: { color: "232329", width: 0.5 } });
    });
    addNotes(s,
      "Appendix material for defense. The repository is organized around the App Router: pages and API routes in src/app, UI in src/components, the chess brains in src/lib, backend services in src/server, React hooks in src/hooks, content in src/content, migrations in drizzle, web assets in public, and tooling in scripts. Tests live in e2e and src/test.",
      ["How big is the codebase?", "What is in public?", "How are tests organized?"],
      ["Roughly 150 source files; the flagship game-analysis page alone is over 2,000 lines. Tests: Vitest covers the chess logic (rating math, engine scores, classification) and Playwright covers full journeys.",
        "The WASM Stockfish build and its worker wrappers, piece image sets, the approved annotation badge SVGs, and PWA service worker assets.",
        "Vitest unit tests sit next to the chess modules in src/test; e2e flows live in the e2e folder and run against the dev server via Playwright."]);
  }

  // ============ APPENDIX B: API ============
  {
    const s = S();
    header(s, "Appendix B", "API Endpoints (25)", 28);
    cornerMotif(s);
    const rows = [
      ["Group", "Routes", "Notes"],
      ["Analysis", "POST /api/analyze-stream  (SSE), /api/analysis/run, GET /api/analysis/[id]", "Streaming reports, run sessions, saved reports"],
      ["Evaluation", "/api/analyze, /api/analyze-game, /api/analyze-alternative, /api/positions/evaluate", "WASM eval, legacy flow, What-If, live board"],
      ["Import", "/api/import/pgn, /api/import/chesscom, /api/import/lichess", "15 req/min each, live fetch with fallback"],
      ["AI", "/api/ai-coach, /api/ai-assistant/chat, /api/explain, /api/explain-move, /api/coach/report, /api/coach/chat", "Coach, chat, explanations, snapshots"],
      ["Games & puzzles", "/api/puzzles/attempt, /api/leaderboards/[type]", "Elo updates, boards"],
      ["Auth", "/api/auth/oauth/[provider], /api/auth/oauth/callback/[provider]", "Google + GitHub, PKCE"],
      ["System", "/api/health, /api/generate-report-card, /api/player-profile, /api/tweet, /api/shop/checkout", "Health, OG cards, SEO, share, store (simulated)"],
    ];
    table(s, rows, { x: M, y: 1.5, w: 12.13, colW: [1.7, 6.63, 3.8], rowH: 0.52, size: 10 });
    addNotes(s,
      "Twenty-five API routes across six groups. The analysis family streams full reports and serves saved ones. Import routes fetch Chess.com archives and Lichess games with sample-data fallback. The AI family powers the coach, the chat assistant, and move explanations. Puzzles and leaderboards, OAuth callbacks for Google and GitHub, and system routes for health, OG image generation, SEO profiles and the simulated shop checkout.",
      ["How is the analysis streamed?", "Which routes are rate-limited?", "What is generate-report-card?"],
      ["The client POSTs to start a session, then opens an SSE stream that emits an event per analyzed move - opening, progress, complete - so the UI fills in live.",
        "Imports (15/min), analysis runs (15/min), evaluations (30/min), puzzle attempts (30/min), AI coach (20/min) and shop (10/min) - in-memory fixed-window rate limiting keyed by IP.",
        "It renders an Open Graph card for a report using Satori/resvg - a server-generated PNG showing the result, accuracy and players, used when reports are shared on social media."]);
  }

  // ============ APPENDIX C: LIBRARIES ============
  {
    const s = S();
    header(s, "Appendix C", "Key Libraries", 28);
    cornerMotif(s);
    const rows = [
      ["Runtime", "Next.js 16.2.6, React 19.2.4, TypeScript 5, Tailwind v4, zod 4"],
      ["Chess", "chess.js 1.4, react-chessboard 5.10, stockfish (WASM) 18"],
      ["Engine ops", "Node child-process UCI client (custom), chess-polyglot, Syzygy via Stockfish"],
      ["AI", "Groq + OpenRouter REST clients (custom, no SDK bloat), zod validation"],
      ["Data", "drizzle-orm 0.45, pg 8, ioredis 5, bullmq 5, mongodb 7"],
      ["UI/UX", "recharts 3, three 0.185, @react-three/fiber 9, mapbox-gl 3, gsap 3, framer-motion 12, animejs, lenis, lucide-react"],
      ["Content/PWA", "next-mdx-remote, gray-matter, next-pwa, next-intl, satori + @resvg/resvg-js"],
      ["Quality", "vitest 4, @playwright/test 1.61, eslint 9, sharp"],
    ];
    table(s, rows, { x: M, y: 1.5, w: 12.13, colW: [2.0, 10.13], rowH: 0.5, size: 10.5, firstColBold: true });
    addNotes(s,
      "The dependency sheet, all present in package.json. Two design notes: the AI clients are lightweight custom REST wrappers rather than heavy SDKs, and the UCI engine client is my own child-process implementation with line parsing, score normalization and watchdog timeouts.",
      ["Which libraries would you drop?", "Why a custom AI client?", "Any licensing concerns?"],
      ["None is dead weight - but the three.js stack is used only by the globe; if that stays beta, it is the first candidate for removal.",
        "The routes need exactly two endpoints each (chat completion and streaming); SDKs would add bundle weight and dependency churn for no benefit. Also, zod guarantees the LLM's output shape.",
        "Stockfish 18 is GPL - fine for a student project, and licensing is documented in the repository; Lichess and Chess.com APIs are used under their public terms."]);
  }

  // ============ APPENDIX D: SECURITY ============
  {
    const s = S();
    header(s, "Appendix D", "Security & Reliability", 28);
    cornerMotif(s);
    const sec = [
      ["FaLock", "Passwords", "scrypt with 16-byte salt, 64-byte derived key, timing-safe comparison"],
      ["FaUserCircle", "Sessions", "HMAC-SHA256 signed httpOnly cookies, 30-day expiry, server-side user lookup"],
      ["FaExchangeAlt", "OAuth", "Google & GitHub with PKCE (S256), signed state tokens, 10-min TTL"],
      ["FaDatabase", "Input safety", "zod schemas on every mutation route; PGN/FEN validated before engine use"],
      ["FaShieldAlt", "Rate limiting", "Fixed-window limiter on 8 sensitive routes (15-30 req/min by IP)"],
      ["FaSave", "Guest-to-account merge", "LocalStorage IDs claimed server-side on signup; 10-guest-analysis cap"],
      ["FaRedo", "Resilience", "Engine fallback chain (Stockfish -> TS engine), DB fallback chain (Postgres/Mongo -> memory)"],
      ["FaClock", "Operability", "/api/health checks DB, driver mode and Redis configuration"],
    ];
    sec.forEach(([icn, t, d], i) => {
      const x = M + (i % 2) * 6.18;
      const y = 1.55 + Math.floor(i / 2) * 1.24;
      card(s, x, y, 5.95, 1.08);
      iconRow(s, I[icn].gold, x + 0.25, y + 0.29, 0.5);
      s.addText(t, { x: x + 0.95, y: y + 0.1, w: 4.8, h: 0.32, fontFace: BF, fontSize: 12.5, bold: true, color: WHITE, margin: 0 });
      s.addText(d, { x: x + 0.95, y: y + 0.44, w: 4.8, h: 0.56, fontFace: BF, fontSize: 9.6, color: MUTED, margin: 0, fit: "shrink" });
    });
    addNotes(s,
      "Security was designed in, not bolted on. Passwords are scrypt-hashed with salts and timing-safe comparison. Session cookies are HMAC-signed and httpOnly. OAuth uses PKCE with signed state tokens. All mutation routes validate input with zod, and eight sensitive routes are rate-limited. Reliability: if Stockfish is missing, the TypeScript engine takes over; if the database is down, the memory repository serves; guests never lose their analysis because of the merge flow; and the health endpoint reports driver mode and database status.",
      ["Why scrypt and not bcrypt?", "What happens on a database outage?", "How do you stop abuse of the AI endpoints?"],
      ["scrypt is memory-hard and available in Node's standard library - no native dependencies, configurable cost, and it resists GPU-based cracking well.",
        "The hybrid driver catches connection failures and falls back to in-memory repositories, logging the event - the app keeps serving demos and the health endpoint reports the degraded mode.",
        "The AI coach route is rate-limited to 20 requests per minute per IP, requests carry only pre-computed game summaries (not raw PGN), and the client caches reports for 24 hours to avoid redundant calls."]);
  }

  // ============ APPENDIX E: LIMITATIONS ============
  {
    const s = S();
    header(s, "Appendix E", "Known Limitations & Roadmap", 28);
    cornerMotif(s);
    card(s, M, 1.55, 5.95, 4.9);
    s.addText("Honest limitations", { x: M + 0.3, y: 1.75, w: 5, h: 0.34, fontFace: BF, fontSize: 13.5, bold: true, color: GOLD, margin: 0 });
    blist(s, M + 0.3, 2.2, 5.35, 4.1, [
      "Default in-memory driver: restart clears runtime data (DB mode exists)",
      "Stripe billing is interface-only: tiers exist in schema, checkout is not wired",
      "Supabase client is scaffolded but unused (custom auth is the real path)",
      "Chess Globe and coach-chat use mock/demo data",
      "Puzzle catalog is small (3 seeded puzzles)",
      "Daily challenge streak metrics partially hardcoded",
      "Unbounded in-memory report caches on long-running servers",
      "LLM features need API keys (Groq / OpenRouter)",
    ], { size: 10.5, space: 7 });
    card(s, 6.75, 1.55, 5.98, 4.9);
    s.addText("Roadmap", { x: 7.05, y: 1.75, w: 5, h: 0.34, fontFace: BF, fontSize: 13.5, bold: true, color: GOLD, margin: 0 });
    blist(s, 7.05, 2.2, 5.4, 4.1, [
      "Wire real Stripe Checkout + webhooks for pro/coach tiers",
      "Online multiplayer and tournaments",
      "Live game review via the existing Lichess TV client",
      "Live Chess Globe data feed",
      "Bulk puzzle ingestion from public datasets",
      "Cache eviction policies for server-side report caches",
      "Deployment to Vercel + managed Postgres/Redis",
      "Cross-device sync and mobile apps",
    ], { size: 10.5, space: 7 });
    addNotes(s,
      "Final appendix - the parts I did not finish, stated plainly. The in-memory driver is the default for portability; production uses PostgreSQL when configured. Stripe exists as an interface with tiers modeled, but checkout is future work - the shop checkout in the repo is a simulated gateway, which I flag explicitly. The Supabase client is scaffolded but unused. The globe and coach chat are demo-grade. The puzzle catalog is three hand-picked puzzles. Caches are unbounded in-memory maps. And the LLM endpoints need API keys. The roadmap mirrors these: real billing, multiplayer, live review, live globe data, puzzle ingestion, cache policy, deployment, and mobile.",
      ["If something is simulated, is the project incomplete?", "How would production deployment change things?", "What would you do differently?"],
      ["No - the project is a complete vertical slice: the shop's simulated gateway and the globe's mock data are clearly labeled; every core learning feature works end to end with real engine and real AI when keys are present.",
        "Swap the driver to database, add managed Postgres/Redis, set the auth secret and OAuth keys, and deploy on Vercel - the app is built for exactly this path.",
        "I would have wired Stripe earlier and spent less time on marketing pages, though those did teach me SEO and SSR."]);
  }

  await pres.writeFile({ fileName: "C:/Projects/Chessfork/Chessfork-BCA-Presentation.pptx" });
  console.log("DONE - slides:", pres.slides ? pres.slides.length : "n/a");
})().catch((e) => {
  console.error("BUILD FAILED:", e);
  process.exit(1);
});
