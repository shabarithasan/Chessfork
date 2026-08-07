type StockfishEngine = import("stockfish").StockfishEngine;

let engineInstance: StockfishEngine | null = null;
let ChessClass: typeof import("chess.js").Chess | null = null;

async function getChess(): Promise<typeof import("chess.js").Chess> {
  if (!ChessClass) {
    const mod = await import("chess.js");
    ChessClass = mod.Chess;
  }
  return ChessClass;
}

export interface TopMoveCandidate {
  uci: string;
  from: string;
  to: string;
  san: string;
  eval: number;
  mate: number | null;
  line: string[];
}

interface AnalyzeResult {
  eval: number;
  mate: number | null;
  bestMove: string;
  bestLine: string[];
  depth: number;
  topMoves?: TopMoveCandidate[];
}

interface InfoLine {
  depth: number;
  score: number;
  mate: number | null;
  pv: string[];
  multipv: number;
}

function parseInfoLine(line: string): InfoLine | null {
  if (!line.startsWith("info ") || !line.includes(" score ")) return null;

  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  const pvMatch = line.match(/\bpv\s+(.+)$/);
  const multipvMatch = line.match(/\bmultipv\s+(\d+)/);

  if (!scoreMatch) return null;

  const isMate = scoreMatch[1] === "mate";
  const rawScore = Number(scoreMatch[2]);

  return {
    depth: depthMatch ? Number(depthMatch[1]) : 0,
    score: isMate ? (rawScore > 0 ? 100000 - rawScore * 100 : -100000 + rawScore * 100) : rawScore,
    mate: isMate ? rawScore : null,
    pv: pvMatch ? pvMatch[1].trim().split(/\s+/) : [],
    multipv: multipvMatch ? Number(multipvMatch[1]) : 1,
  };
}

async function getLineForFen(pv: string[], fen: string): Promise<string[]> {
  const Chess = await getChess();
  const chess = new Chess(fen);
  const moves: string[] = [];
  for (const uci of pv) {
    try {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4) : undefined;
      const move = chess.move({ from, to, promotion } as Parameters<typeof chess.move>[0]);
      moves.push(move.san);
    } catch {
      break;
    }
  }
  return moves;
}

async function createEngine(): Promise<StockfishEngine> {
  const mod = await import("stockfish");
  const initEngine = mod.default;
  return new Promise((resolve, reject) => {
    initEngine((err: Error | null, engine: StockfishEngine) => {
      if (err) {
        reject(new Error(`Failed to initialize Stockfish: ${err.message}`));
        return;
      }
      resolve(engine);
    });
  });
}

async function getEngine(): Promise<StockfishEngine> {
  if (engineInstance) return engineInstance;
  engineInstance = await createEngine();
  await sendCommandAndWait(engineInstance, "uci", (msg) => msg === "uciok");
  return engineInstance;
}

function sendCommandAndWait(
  engine: StockfishEngine,
  command: string,
  predicate: (msg: string) => boolean,
  timeoutMs = 10000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      engine.onmessage = undefined;
      reject(new Error(`Timeout waiting for response to: ${command}`));
    }, timeoutMs);

    engine.onmessage = (msg: string) => {
      if (predicate(msg.trim())) {
        clearTimeout(timeout);
        engine.onmessage = undefined;
        resolve();
      }
    };

    engine.sendCommand(command);
  });
}

/* ── Serialized engine access ── */
let engineOpMutex = Promise.resolve();

async function evaluateFenInternal(
  fen: string,
  depth = 20,
  maxTimeMs = 3000,
  multiPv = 1,
): Promise<AnalyzeResult> {
  const engine = await getEngine();
  const effectiveDepth = Math.min(Math.max(depth, 15), 20);

  // 1. Kill any ongoing search, then wait for idle
  await sendCommandAndWait(engine, "stop", (msg) => msg.startsWith("bestmove"), 2000).catch(() => {});
  await sendCommandAndWait(engine, "isready", (msg) => msg.trim() === "readyok");

  // 2. Configure MultiPV
  engine.sendCommand(`setoption name MultiPV value ${multiPv}`);
  await sendCommandAndWait(engine, "isready", (msg) => msg.trim() === "readyok");

  // 3. Run search
  const parsedLines: InfoLine[] = [];
  let bestMoveUci = "";

  const searchPromise = new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      engine.onmessage = undefined;
      engine.sendCommand("stop");
      resolve();
    }, maxTimeMs);

    engine.onmessage = (msg: string) => {
      const trimmed = msg.trim();

      if (trimmed.startsWith("bestmove ")) {
        const parts = trimmed.split(/\s+/);
        bestMoveUci = parts[1] ?? "";
        clearTimeout(timeout);
        engine.onmessage = undefined;
        resolve();
        return;
      }

      const info = parseInfoLine(trimmed);
      if (info) {
        parsedLines.push(info);
      }
    };

    engine.sendCommand(`position fen ${fen}`);
    engine.sendCommand(`go depth ${effectiveDepth}`);
  });

  await searchPromise;

  // 4. Reset MultiPV for next caller
  engine.sendCommand("setoption name MultiPV value 1");

  // 5. Compile results
  const bestInfo = parsedLines
    .filter((l) => l.multipv === 1)
    .sort((a, b) => b.depth - a.depth)[0];

  const topInfo = parsedLines
    .sort((a, b) => b.depth - a.depth)
    .filter((l, i, arr) => arr.findIndex((x) => x.multipv === l.multipv) === i)
    .slice(0, multiPv);

  const bestLine = bestInfo ? await getLineForFen(bestInfo.pv, fen) : [];
  const bestMove = bestLine[0] ?? "";

  let topMoves: TopMoveCandidate[] | undefined;
  if (multiPv > 1 && topInfo.length > 0) {
    topMoves = [];
    for (const info of topInfo) {
      const firstUci = info.pv[0];
      if (!firstUci) continue;
      const line = await getLineForFen(info.pv, fen);
      const san = line[0] ?? "";
      if (!san) continue;
      topMoves.push({
        uci: firstUci,
        from: firstUci.slice(0, 2),
        to: firstUci.slice(2, 4),
        san,
        eval: info.score,
        mate: info.mate,
        line,
      });
    }
  }

  return {
    eval: bestInfo?.score ?? 0,
    mate: bestInfo?.mate ?? null,
    bestMove,
    bestLine,
    depth: bestInfo?.depth ?? effectiveDepth,
    topMoves,
  };
}

export async function evaluateFen(
  fen: string,
  depth = 20,
  maxTimeMs = 3000,
  multiPv = 1,
): Promise<AnalyzeResult> {
  const op = engineOpMutex.then(() => evaluateFenInternal(fen, depth, maxTimeMs, multiPv));
  engineOpMutex = op.then(
    () => {},
    () => {},
  );
  return op;
}

export async function resetEngine(): Promise<void> {
  if (engineInstance) {
    try {
      engineInstance.sendCommand("quit");
    } catch {}
    engineInstance = null;
  }
}
