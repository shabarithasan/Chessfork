import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { Chess } from "chess.js";

import { evaluateFenMaterial, type PositionAnalysis } from "@/lib/chess/engine";
import { env } from "@/server/env";
import type { AnalysisDepth } from "@/types/platform";

const STOCKFISH_MATE_SCORE = 190_000;
const STOCKFISH_LINE_TIMEOUT_MS = 180_000;

export const STOCKFISH_RELEASE_TAG = "sf_18";
export const STOCKFISH_ENGINE_VERSION = "stockfish-18-depth-movetime-book-syzygy-1";

export interface StockfishSearchSettings {
  actualMoveDepth: number;
  depth: number;
  principalVariationCount: number;
  hashMb: number;
  moveTimeMs: number;
  principalVariationLength: number;
  searchLimit: "depth" | "movetime";
  threads: number;
}

function getBundledBinaryMatchers() {
  if (process.platform === "win32") {
    return [/^stockfish-.*\.exe$/i];
  }

  if (process.platform === "darwin" || process.platform === "linux") {
    return [/^stockfish-[^.]+$/i];
  }

  return [];
}

async function exists(targetPath: string) {
  const info = await stat(targetPath).catch(() => null);
  return Boolean(info?.isFile());
}

async function directoryExists(targetPath: string) {
  const info = await stat(/*turbopackIgnore: true*/ targetPath).catch(() => null);
  return Boolean(info?.isDirectory());
}

function resolveRuntimePath(configuredPath: string) {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  const normalizedPath = configuredPath.replaceAll("\\", "/");
  const vendorSyzygyPath = normalizedPath.startsWith("vendor/syzygy/")
    ? normalizedPath.slice("vendor/syzygy/".length)
    : path.basename(normalizedPath);

  return path.join(process.cwd(), "vendor", "syzygy", vendorSyzygyPath);
}

async function findBundledStockfishBinary() {
  const vendorRoot = path.join(process.cwd(), "vendor", "stockfish");
  const topLevelEntries = await readdir(vendorRoot, { withFileTypes: true }).catch(() => []);
  const candidateRoots = [
    vendorRoot,
    ...topLevelEntries
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => [path.join(vendorRoot, entry.name), path.join(vendorRoot, entry.name, "stockfish")]),
  ];
  const matchers = getBundledBinaryMatchers();

  for (const root of candidateRoots) {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      if (matchers.some((matcher) => matcher.test(entry.name))) {
        return path.join(root, entry.name);
      }
    }
  }

  return null;
}

export async function resolveStockfishBinaryPath() {
  if (env.STOCKFISH_PATH && (await exists(env.STOCKFISH_PATH))) {
    return env.STOCKFISH_PATH;
  }

  return findBundledStockfishBinary();
}

export async function stockfishAvailable() {
  return Boolean(await resolveStockfishBinaryPath());
}

export function getStockfishSearchSettings(
  requestedDepth: AnalysisDepth,
  surface: "report" | "position" = "report",
): StockfishSearchSettings {
  if (surface === "position") {
    return requestedDepth === "deep"
      ? {
          depth: env.DEEP_DEPTH,
          actualMoveDepth: env.DEEP_DEPTH,
          principalVariationCount: 3,
          principalVariationLength: 6,
          hashMb: env.STOCKFISH_HASH_MB,
          moveTimeMs: env.DEEP_MOVETIME,
          searchLimit: "depth",
          threads: env.STOCKFISH_THREADS,
        }
      : {
          depth: env.QUICK_DEPTH,
          actualMoveDepth: env.QUICK_DEPTH,
          principalVariationCount: 3,
          principalVariationLength: 5,
          hashMb: env.STOCKFISH_HASH_MB,
          moveTimeMs: env.QUICK_MOVETIME,
          searchLimit: "movetime",
          threads: env.STOCKFISH_THREADS,
        };
  }

  return requestedDepth === "deep"
    ? {
        depth: env.DEEP_DEPTH,
        actualMoveDepth: env.DEEP_DEPTH,
        principalVariationCount: 3,
        principalVariationLength: 5,
        hashMb: env.STOCKFISH_HASH_MB,
        moveTimeMs: env.DEEP_MOVETIME,
        searchLimit: "depth",
        threads: env.STOCKFISH_THREADS,
      }
    : {
        depth: env.QUICK_DEPTH,
        actualMoveDepth: env.QUICK_DEPTH,
        principalVariationCount: 3,
        principalVariationLength: 4,
        hashMb: env.STOCKFISH_HASH_MB,
        moveTimeMs: env.QUICK_MOVETIME,
        searchLimit: "movetime",
        threads: env.STOCKFISH_THREADS,
      };
}

function parseUciMove(uciMove: string) {
  return {
    from: uciMove.slice(0, 2),
    to: uciMove.slice(2, 4),
    promotion: uciMove.length > 4 ? uciMove.slice(4, 5) : undefined,
  };
}

function convertUciMovesToSan(fen: string, uciMoves: string[], limit: number) {
  const chess = new Chess(fen);
  const sans: string[] = [];

  for (const uciMove of uciMoves.slice(0, limit)) {
    const move = chess.move(parseUciMove(uciMove));
    if (!move) {
      break;
    }

    sans.push(move.san);
  }

  return sans;
}

function convertScoreToWhitePerspective(
  scoreType: "cp" | "mate",
  scoreValue: number,
  rootTurn: "w" | "b",
) {
  const signedScore =
    scoreType === "mate"
      ? Math.sign(scoreValue || 1) * (STOCKFISH_MATE_SCORE - Math.min(Math.abs(scoreValue), 100) * 100)
      : scoreValue;

  return rootTurn === "w" ? signedScore : -signedScore;
}

type ParsedInfo = {
  depth: number;
  multipv: number;
  nodes: number;
  pv: string[];
  score: number;
  tablebaseHits: number;
};

function parseInfoLine(line: string, fen: string): ParsedInfo | null {
  if (!line.startsWith("info ") || !line.includes(" score ") || !line.includes(" pv ")) {
    return null;
  }

  const multiPvMatch = line.match(/\bmultipv\s+(\d+)/);
  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  const pvMatch = line.match(/\bpv\s+(.+)$/);
  const nodesMatch = line.match(/\bnodes\s+(\d+)/);
  const tablebaseHitsMatch = line.match(/\btbhits\s+(\d+)/);

  if (!depthMatch || !scoreMatch || !pvMatch) {
    return null;
  }

  const chess = new Chess(fen);
  const rootTurn = chess.turn();
  const pv = pvMatch[1].trim().split(/\s+/);

  return {
    depth: Number(depthMatch[1]),
    multipv: Number(multiPvMatch?.[1] ?? "1"),
    nodes: Number(nodesMatch?.[1] ?? "0"),
    pv,
    score: convertScoreToWhitePerspective(scoreMatch[1] as "cp" | "mate", Number(scoreMatch[2]), rootTurn),
    tablebaseHits: Number(tablebaseHitsMatch?.[1] ?? "0"),
  };
}

function buildGoCommand(params: { depth: number; moveTimeMs: number; searchLimit: "depth" | "movetime" }) {
  if (params.searchLimit === "movetime") {
    return `go movetime ${params.moveTimeMs}`;
  }

  return `go depth ${params.depth}`;
}

class StockfishSession {
  private buffer = "";
  private lineWaiter: ((line: string) => void) | null = null;
  private pendingCommand = "startup";

  private constructor(
    private readonly processHandle: ReturnType<typeof spawn>,
    private readonly binaryPath: string,
  ) {
    this.processHandle.stdout!.setEncoding("utf8");
    this.processHandle.stdout!.on("data", (chunk: string) => {
      this.buffer += chunk;
      const lines = this.buffer.split(/\r?\n/);
      this.buffer = lines.pop() ?? "";

      for (const line of lines.map((entry) => entry.trim()).filter(Boolean)) {
        this.lineWaiter?.(line);
      }

      const pendingLine = this.buffer.trim();
      if (pendingLine === "uciok" || pendingLine === "readyok" || pendingLine.startsWith("bestmove ")) {
        this.buffer = "";
        this.lineWaiter?.(pendingLine);
      }
    });
  }

  static async create() {
    const binaryPath = await resolveStockfishBinaryPath();
    if (!binaryPath) {
      throw new Error("Stockfish binary not found. Run `npm run stockfish:install` or set STOCKFISH_PATH.");
    }

    const processHandle = spawn(binaryPath, [], {
      stdio: "pipe",
      windowsHide: true,
    });
    const session = new StockfishSession(processHandle, binaryPath);

    await session.initialize();
    return session;
  }

  private send(command: string) {
    this.pendingCommand = command;
    this.processHandle.stdin!.write(`${command}\n`);
  }

  private waitForLine(
    predicate: (line: string) => boolean,
    onLine?: (line: string) => void,
    timeoutMs = STOCKFISH_LINE_TIMEOUT_MS,
  ) {
    return new Promise<void>((resolve, reject) => {
      if (this.lineWaiter) {
        reject(new Error("Stockfish session is already handling a command."));
        return;
      }

      const timeout = setTimeout(() => {
        this.lineWaiter = null;
        reject(new Error(`Timed out waiting for Stockfish output from ${this.binaryPath} after \`${this.pendingCommand}\`.`));
      }, timeoutMs);

      this.lineWaiter = (line: string) => {
        onLine?.(line);

        if (predicate(line)) {
          clearTimeout(timeout);
          this.lineWaiter = null;
          resolve();
        }
      };
    });
  }

  private async ready() {
    const readyPromise = this.waitForLine((line) => line === "readyok");
    this.send("isready");
    await readyPromise;
  }

  private async initialize() {
    const uciPromise = this.waitForLine((line) => line === "uciok");
    this.send("uci");
    await uciPromise;
    this.send(`setoption name Threads value ${env.STOCKFISH_THREADS}`);
    this.send(`setoption name Hash value ${env.STOCKFISH_HASH_MB}`);
    this.send("setoption name UCI_AnalyseMode value true");
    if (env.STOCKFISH_SYZYGY_PATH) {
      const syzygyPath = resolveRuntimePath(env.STOCKFISH_SYZYGY_PATH);
      if (await directoryExists(syzygyPath)) {
        this.send(`setoption name SyzygyPath value ${syzygyPath}`);
        this.send(`setoption name SyzygyProbeDepth value ${env.STOCKFISH_SYZYGY_PROBE_DEPTH}`);
        this.send(`setoption name SyzygyProbeLimit value ${env.STOCKFISH_SYZYGY_PROBE_LIMIT}`);
        console.info(
          `[stockfish] Syzygy enabled path=${syzygyPath} probeDepth=${env.STOCKFISH_SYZYGY_PROBE_DEPTH} probeLimit=${env.STOCKFISH_SYZYGY_PROBE_LIMIT}`,
        );
      } else {
        console.warn(`[stockfish] Syzygy path does not exist, skipping tablebases: ${syzygyPath}`);
      }
    }
    await this.ready();
    await this.warmUp();
  }

  private async warmUp() {
    const warmupPromise = this.waitForLine((line) => line.startsWith("bestmove "));
    this.send("position startpos");
    this.send("go depth 1");
    await warmupPromise;
    await this.ready();
  }

  async analyzeFen(
    fen: string,
    settings: Pick<
      StockfishSearchSettings,
      | "depth"
      | "hashMb"
      | "moveTimeMs"
      | "principalVariationCount"
      | "principalVariationLength"
      | "searchLimit"
      | "threads"
    >,
  ): Promise<PositionAnalysis> {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });

    if (legalMoves.length === 0) {
      return {
        bestMove: "none",
        depth: settings.depth,
        engineLines: [],
        line: [],
        moveScores: {},
        nodes: 0,
        score: evaluateFenMaterial(fen),
        tablebaseHits: 0,
      };
    }

    const resultState: {
      bestMoveUci: string;
      parsedInfoByRank: Map<number, ParsedInfo>;
    } = {
      bestMoveUci: "",
      parsedInfoByRank: new Map(),
    };
    const multiPv = Math.min(settings.principalVariationCount, legalMoves.length);

    this.send(`setoption name MultiPV value ${multiPv}`);
    this.send(`position fen ${fen}`);

    const runSearch = async (command: string, stopAfterMs: number | null) => {
      let stopTimer: ReturnType<typeof setTimeout> | null = null;
      const bestMovePromise = this.waitForLine(
        (line) => line.startsWith("bestmove "),
        (line) => {
          const info = parseInfoLine(line, fen);
          const currentInfo = info ? resultState.parsedInfoByRank.get(info.multipv) : null;
          if (info && (!currentInfo || info.depth >= currentInfo.depth)) {
            resultState.parsedInfoByRank.set(info.multipv, info);
          }

          if (line.startsWith("bestmove ")) {
            resultState.bestMoveUci = line.split(/\s+/)[1] ?? resultState.bestMoveUci;
          }
        },
      );

      this.send(command);
      if (stopAfterMs) {
        stopTimer = setTimeout(() => {
          this.processHandle.stdin!.write("stop\n");
        }, stopAfterMs);
      }

      try {
        await bestMovePromise;
      } finally {
        if (stopTimer) {
          clearTimeout(stopTimer);
        }
      }
    };

    const goCommand = buildGoCommand({
      depth: settings.depth,
      moveTimeMs: settings.moveTimeMs,
      searchLimit: settings.searchLimit,
    });
    await runSearch(goCommand, settings.searchLimit === "depth" ? settings.moveTimeMs : null);
    await this.ready();

    const finalInfo = resultState.parsedInfoByRank.get(1) ?? null;
    const tablebaseHits = [...resultState.parsedInfoByRank.values()].reduce(
      (total, info) => total + info.tablebaseHits,
      0,
    );
    if (tablebaseHits > 0) {
      console.info(`[stockfish] Syzygy probe hits: ${tablebaseHits} for ${fen.split(" ").slice(0, 4).join(" ")}`);
    }
    const bestMoveSan =
      resultState.bestMoveUci && resultState.bestMoveUci !== "(none)"
        ? convertUciMovesToSan(fen, [resultState.bestMoveUci], 1)[0] ?? legalMoves[0].san
        : legalMoves[0].san;
    const line = finalInfo?.pv?.length
      ? convertUciMovesToSan(fen, finalInfo.pv, settings.principalVariationLength)
      : [bestMoveSan];
    const engineLines = [...resultState.parsedInfoByRank.entries()]
      .sort(([leftRank], [rightRank]) => leftRank - rightRank)
      .slice(0, multiPv)
      .map(([rank, info]) => {
        const sanLine = convertUciMovesToSan(fen, info.pv, settings.principalVariationLength);

        return {
          depth: info.depth,
          line: sanLine,
          nodes: info.nodes,
          rank,
          san: sanLine[0] ?? bestMoveSan,
          score: info.score,
          tablebaseHits: info.tablebaseHits,
        };
      })
      .filter((candidate) => candidate.san !== "none");

    return {
      bestMove: bestMoveSan,
      depth: finalInfo?.depth ?? settings.depth,
      engineLines:
        engineLines.length > 0
          ? engineLines
          : [
              {
                depth: finalInfo?.depth ?? settings.depth,
                line,
                nodes: finalInfo?.nodes ?? 0,
                rank: 1,
                san: bestMoveSan,
                score: finalInfo?.score ?? evaluateFenMaterial(fen),
                tablebaseHits,
              },
            ],
      line,
      moveScores: {},
      nodes: finalInfo?.nodes ?? 0,
      score: finalInfo?.score ?? evaluateFenMaterial(fen),
      tablebaseHits,
    };
  }

  async dispose() {
    if (!this.processHandle.killed) {
      this.send("quit");
      this.processHandle.kill();
    }
  }
}

export async function withStockfishSession<T>(run: (session: StockfishSession) => Promise<T>) {
  const session = await StockfishSession.create();

  try {
    return await run(session);
  } finally {
    await session.dispose();
  }
}
