"use client";

import { Chess } from "chess.js";
import { ChevronDown, ChevronUp, Download, Flag, FlipVertical2, Handshake, Play, RotateCcw, Swords, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ChessBoard from "@/components/ChessBoard";
import {
  buildLocalGamePgn,
  getAutomaticGameEnd,
  saveLocalGame,
  timeControlLabel,
  timeControlSeconds,
  type LocalGameEnd,
  type LocalTimeControl,
} from "@/lib/local-game";
import { cn } from "@/lib/utils";

type Setup = { white: string; black: string; control: LocalTimeControl; customMinutes: number; autoFlip: boolean };
type MoveRow = { san: string; moveNumber: number; side: "white" | "black" };

const initialSetup: Setup = { white: "", black: "", control: "unlimited", customMinutes: 15, autoFlip: true };

function clockLabel(seconds: number | null) {
  if (seconds === null) return "∞";
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function endTitle(end: LocalGameEnd, names: { white: string; black: string }) {
  if (!end.winner) return "Draw";
  return `${end.winner === "white" ? names.white : names.black} wins`;
}

export function LocalGamePage() {
  const router = useRouter();
  const gameRef = useRef(new Chess());
  const startedAtRef = useRef<number | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const [setup, setSetup] = useState(initialSetup);
  const [started, setStarted] = useState(false);
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [whiteClock, setWhiteClock] = useState<number | null>(null);
  const [blackClock, setBlackClock] = useState<number | null>(null);
  const [end, setEnd] = useState<LocalGameEnd | null>(null);
  const [showEnd, setShowEnd] = useState(false);
  const [moveListOpen, setMoveListOpen] = useState(false);
  const [drawOffer, setDrawOffer] = useState<"white" | "black" | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [captured, setCaptured] = useState({ white: [] as string[], black: [] as string[] });
  const [pgn, setPgn] = useState("");
  const [duration, setDuration] = useState(0);

  const names = useMemo(() => ({ white: setup.white.trim() || "White", black: setup.black.trim() || "Black" }), [setup.black, setup.white]);
  const timeControl = timeControlLabel(setup.control, setup.customMinutes);
  const isUnlimited = setup.control === "unlimited";

  const finishGame = useCallback((nextEnd: LocalGameEnd) => {
    const playedAt = new Date(startedAtRef.current ?? Date.now());
    setPgn(buildLocalGamePgn({ game: gameRef.current, ...names, result: nextEnd.result, timeControl, playedAt }));
    setDuration(Math.max(0, Math.floor((Date.now() - playedAt.getTime()) / 1000)));
    setEnd(nextEnd);
    setSelectedSquare(null);
    setDrawOffer(null);
    setShowEnd(true);
  }, [names, timeControl]);

  useEffect(() => {
    if (!started || end || isUnlimited || drawOffer) return;
    const timer = window.setInterval(() => {
      const isWhite = gameRef.current.turn() === "w";
      const update = isWhite ? setWhiteClock : setBlackClock;
      update((current) => {
        if (current === null) return current;
        if (current <= 1) {
          window.setTimeout(() => finishGame({ reason: "timeout", winner: isWhite ? "black" : "white", result: isWhite ? "0-1" : "1-0" }), 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [drawOffer, end, finishGame, isUnlimited, started, fen]);

  const startGame = useCallback(() => {
    gameRef.current = new Chess();
    const seconds = timeControlSeconds(setup.control, setup.customMinutes);
    setFen(gameRef.current.fen());
    setMoves([]);
    setLastMove(null);
    setSelectedSquare(null);
    setEnd(null);
    setReviewError(null);
    setPgn("");
    setDuration(0);
    setCaptured({ white: [], black: [] });
    setDrawOffer(null);
    setTurn("w");
    setWhiteClock(seconds);
    setBlackClock(seconds);
    // Local games are shared across one screen: keep the side to move at the bottom.
    setOrientation("white");
    startedAtRef.current = Date.now();
    gameIdRef.current = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`;
    setStarted(true);
  }, [setup]);

  const commitMove = useCallback((from: string, to: string) => {
    if (!started || end || drawOffer) return false;
    try {
      const move = gameRef.current.move({ from, to, promotion: "q" });
      if (!move) return false;
      setFen(gameRef.current.fen());
      setLastMove({ from: move.from, to: move.to });
      setMoves((current) => [...current, { san: move.san, moveNumber: Math.floor(current.length / 2) + 1, side: move.color === "w" ? "white" : "black" }]);
      setTurn(gameRef.current.turn());
      if (setup.autoFlip) setOrientation(gameRef.current.turn() === "w" ? "white" : "black");
      const capturedPiece = move.captured;
      if (capturedPiece) {
        setCaptured((current) => ({
          ...current,
          [move.color === "w" ? "black" : "white"]: [...current[move.color === "w" ? "black" : "white"], capturedPiece.toUpperCase()],
        }));
      }
      setSelectedSquare(null);
      setDrawOffer(null);
      const automaticEnd = getAutomaticGameEnd(gameRef.current);
      if (automaticEnd) finishGame(automaticEnd);
      return true;
    } catch {
      return false;
    }
  }, [drawOffer, end, finishGame, setup.autoFlip, started]);

  const handleSquareClick = useCallback((square: string) => {
    if (!started || end || drawOffer) return;
    const piece = gameRef.current.get(square as Parameters<Chess["get"]>[0]);
    const turn = gameRef.current.turn();
    const isOwnPiece = piece && piece.color === turn;
    if (!selectedSquare) {
      if (isOwnPiece) setSelectedSquare(square);
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }
    if (isOwnPiece) {
      setSelectedSquare(square);
      return;
    }
    if (!commitMove(selectedSquare, square)) setSelectedSquare(null);
  }, [commitMove, drawOffer, end, selectedSquare, started]);

  const saveSnapshot = useCallback((status: "pending" | "complete" | "failed", reportId?: string) => {
    if (!end) return;
    saveLocalGame({
      id: gameIdRef.current ?? `local-${Date.now()}`,
      ...names,
      result: end.result,
      winner: end.winner,
      moveCount: moves.length,
      pgn,
      finalFen: gameRef.current.fen(),
      createdAt: new Date(startedAtRef.current ?? Date.now()).toISOString(),
      timeControl,
      analysisStatus: status,
      reportId,
    });
  }, [end, moves.length, names, pgn, timeControl]);

  const reviewGame = useCallback(async () => {
    if (!end) return;
    setReviewing(true);
    setReviewError(null);
    saveSnapshot("pending");
    try {
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn, requestedDepth: "quick" }),
      });
      const data = (await response.json()) as { analysisId?: string; message?: string };
      if (!response.ok || !data.analysisId) throw new Error(data.message ?? "Unable to start the review.");
      saveSnapshot("complete", data.analysisId);
      router.push(`/analysis/${data.analysisId}`);
    } catch (error) {
      saveSnapshot("failed");
      setReviewError(error instanceof Error ? error.message : "Unable to start the review.");
      setReviewing(false);
    }
  }, [end, pgn, router, saveSnapshot]);

  const downloadPgn = useCallback(() => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([pgn], { type: "application/x-chess-pgn" }));
    link.download = `${names.white}-vs-${names.black}.pgn`.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(link.href);
  }, [names.black, names.white, pgn]);

  if (!started) {
    return <SetupDialog setup={setup} setSetup={setSetup} onStart={startGame} />;
  }

  return (
    <section className="mx-auto max-w-7xl py-2 text-white">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Play</p><h1 className="mt-1 text-3xl font-bold">Local game</h1></div>
        <div className="flex items-center gap-2"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">{timeControl}</span><button onClick={() => setOrientation((value) => value === "white" ? "black" : "white")} className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300" aria-label="Flip board"><FlipVertical2 className="size-4" /></button></div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="mx-auto w-full max-w-[44rem]">
          <PlayerCard name={orientation === "white" ? names.black : names.white} side={orientation === "white" ? "black" : "white"} clock={orientation === "white" ? blackClock : whiteClock} active={(turn === "b") === (orientation === "white")} captured={orientation === "white" ? captured.white : captured.black} drawOffer={drawOffer} onResign={() => finishGame({ reason: "resignation", winner: orientation === "white" ? "white" : "black", result: orientation === "white" ? "1-0" : "0-1" })} onOfferDraw={() => setDrawOffer((current) => current === (orientation === "white" ? "black" : "white") ? null : (orientation === "white" ? "black" : "white"))} />
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#111118] p-1.5 shadow-2xl sm:p-2">
            <ChessBoard fen={fen} onMove={commitMove} onSquareClick={handleSquareClick} canDragPiece={(piece) => !end && started && (piece.startsWith("w") ? turn === "w" : turn === "b")} lastMove={lastMove} orientation={orientation} boardWidth="100%" />
            {selectedSquare ? <p className="px-2 pt-2 text-center text-xs font-medium text-amber-300">Choose a destination for {selectedSquare}.</p> : null}
          </div>
          <div className="mt-3"><PlayerCard name={orientation === "white" ? names.white : names.black} side={orientation === "white" ? "white" : "black"} clock={orientation === "white" ? whiteClock : blackClock} active={(turn === "w") === (orientation === "white")} captured={orientation === "white" ? captured.black : captured.white} drawOffer={drawOffer} onResign={() => finishGame({ reason: "resignation", winner: orientation === "white" ? "black" : "white", result: orientation === "white" ? "0-1" : "1-0" })} onOfferDraw={() => setDrawOffer((current) => current === (orientation === "white" ? "white" : "black") ? null : (orientation === "white" ? "white" : "black"))} /></div>
        </div>
        <aside className="space-y-4 rounded-xl border border-white/10 bg-[#111118] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">Move list</h2>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-500">{moves.length} plies</span>
            </div>
            <button type="button" onClick={() => setMoveListOpen((value) => !value)} aria-expanded={moveListOpen} aria-label={moveListOpen ? "Minimize move list" : "Expand move list"} className="rounded-lg border border-white/10 p-1.5 text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300">{moveListOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}</button>
          </div>
          {moveListOpen ? <div className="max-h-[25rem] min-h-32 overflow-y-auto rounded-lg bg-black/20 p-2 font-mono text-sm">
            {moves.length === 0 ? <p className="p-2 text-xs text-slate-500">The recorded moves will appear here.</p> : <MoveList moves={moves} />}
          </div> : <p className="rounded-lg bg-black/20 p-2 text-xs text-slate-500">Move list hidden. Press the button above to view recorded moves.</p>}
        </aside>
      </div>
      {drawOffer ? <DrawOfferDialog names={names} side={drawOffer} onAccept={() => finishGame({ reason: "agreement", result: "1/2-1/2" })} onDeny={() => setDrawOffer(null)} /> : null}
      {end ? <ResultsDialog end={end} names={names} moves={moves.length} duration={duration} reviewing={reviewing} error={reviewError} onClose={() => setShowEnd(false)} visible={showEnd} onPlayAgain={startGame} onDownload={downloadPgn} onReview={() => void reviewGame()} /> : null}
    </section>
  );
}

function SetupDialog({ setup, setSetup, onStart }: { setup: Setup; setSetup: React.Dispatch<React.SetStateAction<Setup>>; onStart: () => void }) {
  const controls: Array<{ value: LocalTimeControl; label: string }> = [
    { value: "unlimited", label: "Unlimited" }, { value: "1", label: "1 min" }, { value: "3", label: "3 min" },
    { value: "5", label: "5 min" }, { value: "10", label: "10 min" }, { value: "custom", label: "Custom" },
  ];
  return <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-xl items-center py-8"><div className="w-full rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:p-8"><div className="mb-7 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><Swords className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">Play</p><h1 className="text-2xl font-bold text-white">Start local game</h1></div></div><div className="space-y-4"><label className="block text-sm font-semibold text-slate-200">White player<input value={setup.white} onChange={(e) => setSetup((current) => ({ ...current, white: e.target.value }))} placeholder="White" className="mt-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-400/60" /></label><label className="block text-sm font-semibold text-slate-200">Black player<input value={setup.black} onChange={(e) => setSetup((current) => ({ ...current, black: e.target.value }))} placeholder="Black" className="mt-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-400/60" /></label><fieldset><legend className="mb-2 text-sm font-semibold text-slate-200">Time control</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{controls.map((control) => <label key={control.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition", setup.control === control.value ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-white/10 bg-black/15 text-slate-300 hover:border-white/25")}><input className="accent-amber-400" type="radio" checked={setup.control === control.value} onChange={() => setSetup((current) => ({ ...current, control: control.value }))} />{control.label}</label>)}</div>{setup.control === "custom" ? <label className="mt-3 block text-sm text-slate-300">Minutes<input type="number" min="1" max="180" value={setup.customMinutes} onChange={(e) => setSetup((current) => ({ ...current, customMinutes: Number(e.target.value) || 1 }))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white outline-none focus:border-amber-400/60" /></label> : null}</fieldset><label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-black/15 px-3 py-3 text-sm font-semibold text-slate-200"><span>Auto-flip for side to move</span><input className="size-4 accent-amber-400" type="checkbox" checked={setup.autoFlip} onChange={(e) => setSetup((current) => ({ ...current, autoFlip: e.target.checked }))} /></label><button onClick={onStart} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 font-bold text-black shadow-lg transition hover:brightness-110"><Play className="size-4 fill-current" /> Start game</button><p className="text-center text-xs text-slate-500">Names are optional — unnamed players are shown as White and Black.</p></div></div></section>;
}

function PlayerCard({ name, side, clock, active, captured, drawOffer, onResign, onOfferDraw }: { name: string; side: "white" | "black"; clock: number | null; active: boolean; captured: string[]; drawOffer: "white" | "black" | null; onResign: () => void; onOfferDraw: () => void }) {
  const pending = drawOffer !== null && drawOffer !== side;
  const offered = drawOffer === side;
  return <div className={cn("rounded-xl border transition", active ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-[#111118]")}><div className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate font-bold text-white">{name}</p><p className="mt-1 text-xs tracking-[0.2em] text-slate-500">CAPTURED <span className="ml-1 tracking-normal text-slate-300">{captured.join(" ") || "—"}</span></p></div><div className="flex items-center gap-2"><span className={cn("rounded-lg px-3 py-2 font-mono text-xl font-bold", active ? "bg-amber-300 text-black" : "bg-black/30 text-slate-200")}>{clockLabel(clock)}</span><div className="flex flex-col gap-1"><button onClick={onOfferDraw} disabled={pending} className={cn("grid size-6 place-items-center rounded-md border transition", offered ? "border-amber-400/70 bg-amber-400/15 text-amber-300" : "border-white/10 text-slate-300 hover:border-amber-400/60 hover:text-amber-300", pending ? "cursor-not-allowed opacity-40" : "")} aria-label={offered ? `${name} withdraws the draw offer` : `${name} offers a draw`} title={offered ? "Withdraw draw offer" : "Offer draw"}><Handshake className="size-3.5" /></button><button onClick={onResign} className="grid size-6 place-items-center rounded-md border border-red-400/20 text-red-300 transition hover:bg-red-400/10" aria-label={`${name} resigns`} title="Resign"><Flag className="size-3.5" /></button></div></div></div></div>; }
function DrawOfferDialog({ names, side, onAccept, onDeny }: { names: { white: string; black: string }; side: "white" | "black"; onAccept: () => void; onDeny: () => void }) { return <div className="fixed inset-0 z-[65] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${side === "white" ? names.white : names.black} offers a draw`}><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15151d] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="grid size-11 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><Handshake className="size-5" /></span><h2 className="mt-4 text-2xl font-bold text-white">Draw offer</h2><p className="mt-1 text-slate-400">{side === "white" ? names.white : names.black} offers a draw to {side === "white" ? names.black : names.white}.</p></div></div><div className="mt-6 grid grid-cols-2 gap-2"><button onClick={onAccept} className="rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 font-bold text-black transition hover:brightness-110">Accept draw</button><button onClick={onDeny} className="rounded-lg border border-white/15 px-4 py-3 font-semibold text-slate-200 transition hover:border-red-400/50 hover:text-red-200">Deny</button></div></div></div>; }
function MoveList({ moves }: { moves: MoveRow[] }) { const pairs = []; for (let index = 0; index < moves.length; index += 2) pairs.push([moves[index], moves[index + 1]]); return <div className="space-y-1">{pairs.map(([white, black]) => <div key={white.moveNumber} className="grid grid-cols-[2rem_1fr_1fr] gap-2 rounded px-2 py-1 hover:bg-white/5"><span className="text-slate-600">{white.moveNumber}.</span><span className="font-semibold text-white">{white.san}</span><span className="text-slate-300">{black?.san}</span></div>)}</div>; }
function ResultsDialog({ end, names, moves, duration, reviewing, error, visible, onClose, onPlayAgain, onDownload, onReview }: { end: LocalGameEnd; names: { white: string; black: string }; moves: number; duration: number; reviewing: boolean; error: string | null; visible: boolean; onClose: () => void; onPlayAgain: () => void; onDownload: () => void; onReview: () => void }) { if (!visible) return <button onClick={onClose} className="fixed bottom-5 right-5 z-40 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black">Show result</button>; const reason = end.reason.replaceAll("-", " "); return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Game results"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15151d] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="grid size-11 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><Trophy className="size-5" /></span><h2 className="mt-4 text-2xl font-bold text-white">{endTitle(end, names)}</h2><p className="mt-1 capitalize text-slate-400">{reason}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Close results"><X className="size-5" /></button></div><dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10"><ResultStat label="White" value={names.white} /><ResultStat label="Black" value={names.black} /><ResultStat label="Moves" value={String(Math.ceil(moves / 2))} /><ResultStat label="Duration" value={durationLabel(duration)} /></dl>{error ? <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}<div className="mt-6 grid gap-2"><button onClick={onReview} disabled={reviewing} className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 font-bold text-black disabled:opacity-70">{reviewing ? "Preparing analysis…" : "★ Review game"}</button><div className="grid grid-cols-2 gap-2"><button onClick={onPlayAgain} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"><RotateCcw className="size-4" /> Play again</button><button onClick={onDownload} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"><Download className="size-4" /> Download PGN</button></div></div></div></div>; }
function ResultStat({ label, value }: { label: string; value: string }) { return <div className="min-w-0 bg-[#111118] p-3"><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</dt><dd className="mt-1 truncate font-semibold text-white">{value}</dd></div>; }
