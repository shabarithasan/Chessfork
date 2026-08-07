"use client";

import { FileText, Globe, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AnalysisLoadingOverlay } from "@/components/analysis/analysis-loading-overlay";
import { LiveAnalysisScreen } from "@/components/analysis/live-analysis-screen";
import { useLiveAnalysisSession } from "@/hooks/useLiveAnalysisSession";
import { samplePgn } from "@/data/sample-data";
import { readHeaders } from "@/lib/chess/pgn";
import { buildGameLoadingPreview } from "@/lib/chess/pgn-preview";
import { mergeGamePages } from "@/lib/chess/game-utils";
import { cn } from "@/lib/utils";
import type {
  AnalysisDepth,
  ImportGameLibraryFilters,
  ImportGameLibraryResponse,
  ImportGameResultFilter,
  ImportableGameOption,
  LinkedChessAccount,
  SourceType,
} from "@/types/platform";

type ImportResponse = Partial<ImportGameLibraryResponse> & {
  message?: string;
  analysisId?: string;
  shareUrl?: string;
  pgn?: string;
};

function getResponsePath(response: Response) {
  try {
    return new URL(response.url).pathname;
  } catch {
    return "The server route";
  }
}

async function readImportResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (!body) {
    return {} as ImportResponse;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(body) as ImportResponse;
    } catch {
      throw new Error(`${getResponsePath(response)} returned malformed JSON. Restart the dev server and try again.`);
    }
  }

  throw new Error(
    `${getResponsePath(response)} returned ${response.status || "a"} non-JSON response. Restart the dev server and try again.`,
  );
}

const defaultChessComFilters: ImportGameLibraryFilters = {
  search: "",
  result: "all",
  timeClass: "all",
};

const sourceDetails: Record<
  SourceType,
  {
    accent: string;
    label: string;
    shortCopy: string;
    placeholder: string;
    title: string;
    copy: string;
    note: string;
  }
> = {
  pgn: {
    accent: "border-sky-400/25 bg-sky-400/10 text-sky-400",
    label: "PGN",
    shortCopy: "Paste moves and go straight into a saved report.",
    placeholder: "Paste PGN here",
    title: "Paste a game and get a saved report in seconds",
    copy: "Best when you already have the moves and want a direct, deterministic review with no extra setup.",
    note: "Include the headers and move list when you can. That gives the report the opening, result, and final position immediately.",
  },
  chesscom: {
    accent: "border-amber-400/25 bg-amber-400/10 text-amber-400",
    label: "Chess.com",
    shortCopy: "Fetch recent public games before choosing one.",
    placeholder: "Enter a Chess.com username",
    title: "Browse a player's archive, filter it, then analyze the exact game you want",
    copy: "This works more like a real review product now: load the public archive, narrow it to the right game, and jump straight into a saved report.",
    note: "Enter a public username, browse the public archive, and analyze the exact game you want instead of relying on a single latest-game import.",
  },
  lichess: {
    accent: "border-neutral-700 bg-neutral-800/30 text-neutral-100",
    label: "Lichess",
    shortCopy: "Pull a public game without changing the workflow.",
    placeholder: "Enter a Lichess username",
    title: "Import a public Lichess game",
    copy: "Keep the same workflow while preserving the source metadata so the saved report still knows where the game came from.",
    note: "If no recent public game is reachable, the importer falls back gracefully so you can still test the full UI.",
  },
};

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function formatPlayedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function describeGameResult(game: Pick<ImportableGameOption, "black" | "result" | "white">) {
  if (game.result === "1-0") {
    return `${game.white} won`;
  }

  if (game.result === "0-1") {
    return `${game.black} won`;
  }

  return "Draw";
}

function describePlayerOutcome(game: Pick<ImportableGameOption, "outcome" | "playerColor">) {
  const side = game.playerColor === "white" ? "as White" : "as Black";

  if (game.outcome === "win") {
    return `You won ${side}`;
  }

  if (game.outcome === "loss") {
    return `You lost ${side}`;
  }

  return `You drew ${side}`;
}

function formatRatingLine(game: Pick<ImportableGameOption, "blackRating" | "playerColor" | "whiteRating">) {
  const playerRating = game.playerColor === "white" ? game.whiteRating : game.blackRating;
  const opponentRating = game.playerColor === "white" ? game.blackRating : game.whiteRating;

  if (!playerRating && !opponentRating) {
    return null;
  }

  return `${playerRating ?? "?"} vs ${opponentRating ?? "?"}`;
}

export function ImportWorkbench({
  linkedAccounts,
  viewerDisplayName,
  signInHref = "/auth",
  defaultSource = "pgn",
  variant = "default",
}: {
  linkedAccounts?: Partial<Record<LinkedChessAccount["source"], string>>;
  viewerDisplayName?: string;
  signInHref?: string;
  defaultSource?: SourceType;
  variant?: "default" | "spotlight";
}) {
  const router = useRouter();
  const [source, setSource] = useState<SourceType>(defaultSource);
  const [input, setInput] = useState(defaultSource === "pgn" ? samplePgn : linkedAccounts?.[defaultSource] ?? "");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [availableGames, setAvailableGames] = useState<ImportableGameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loadedUsername, setLoadedUsername] = useState<string | null>(null);
  const [filteredGameCount, setFilteredGameCount] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [gameStats, setGameStats] = useState<ImportGameLibraryResponse["stats"] | null>(null);
  const [gameSearch, setGameSearch] = useState("");
  const [gameResultFilter, setGameResultFilter] = useState<ImportGameResultFilter>("all");
  const [gameTimeClassFilter, setGameTimeClassFilter] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState<ImportGameLibraryFilters>(defaultChessComFilters);
  const [analysisPendingDepth, setAnalysisPendingDepth] = useState<AnalysisDepth>("quick");
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  const navigatingToReportRef = useRef(false);

  const liveSession = useLiveAnalysisSession();

  const details = sourceDetails[source];
  const isSpotlight = variant === "spotlight";
  const normalizedInput = input.trim();
  const normalizedUsername = normalizeUsername(normalizedInput);
  const isChessCom = source === "chesscom";
  const canSubmit = source === "pgn" ? normalizedInput.length >= 10 : normalizedInput.length >= 2;

  const helperLabel = useMemo(() => {
    if (source === "pgn") return "Paste PGN";
    if (source === "chesscom") return "Chess.com username";
    return "Lichess username";
  }, [source]);

  const linkedDefault = source === "pgn" ? samplePgn : linkedAccounts?.[source] ?? "";
  const hasLoadedChessComLibrary = isChessCom && loadedUsername === normalizedUsername && gameStats !== null;
  const selectedGame = isChessCom ? availableGames.find((game) => game.id === selectedGameId) ?? availableGames[0] ?? null : null;
  const pgnHeaders = useMemo(
    () => (source === "pgn" && normalizedInput.length >= 10 ? readHeaders(normalizedInput) : null),
    [normalizedInput, source],
  );
  const hasPendingFilterChanges =
    source === "chesscom" &&
    hasLoadedChessComLibrary &&
    (appliedFilters.search !== gameSearch.trim() ||
      appliedFilters.result !== gameResultFilter ||
      appliedFilters.timeClass !== gameTimeClassFilter);
  const timeClassOptions = gameStats?.timeClasses ?? [];
  const statusTone =
    isPending
      ? "border-sky-400/20 bg-sky-400/10 text-sky-400"
      : source === "chesscom" && hasPendingFilterChanges
        ? "border-amber-400/20 bg-amber-400/10 text-amber-400"
        : source === "chesscom" && hasLoadedChessComLibrary
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
          : canSubmit
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
            : "border-neutral-800 bg-neutral-950/55 text-neutral-300";
  const statusLabel = isPending
    ? source === "chesscom" && !selectedGame
      ? "Loading games"
      : source === "pgn"
        ? "Analyzing"
        : "Importing"
    : source === "chesscom" && hasPendingFilterChanges
      ? "Filters changed"
      : source === "chesscom" && hasLoadedChessComLibrary
        ? `${filteredGameCount} matches`
        : canSubmit
          ? "Ready to run"
          : source === "pgn"
            ? "Paste a full PGN"
            : "Enter a username";
  const sourceIcons = {
    pgn: FileText,
    chesscom: Search,
    lichess: Globe,
  } satisfies Record<SourceType, typeof FileText>;
  const sourceLogos: Partial<Record<SourceType, { src: string; alt: string }>> = {
    chesscom: { src: "/images/platforms/chesscom.svg", alt: "Chess.com" },
    lichess: { src: "/images/platforms/lichess.svg", alt: "Lichess" },
  };
  const sampleHandles =
    source === "chesscom"
      ? ["MagnusCarlsen", "GothamChess", "Hikaru"]
      : source === "lichess"
        ? ["DrNykterstein", "DanielNaroditsky", "lichess"]
        : [];
  const primaryButtonLabel =
    source === "chesscom" && !hasLoadedChessComLibrary
      ? isPending
        ? "Fetching recent games..."
        : "Fetch Recent Games"
      : source === "chesscom" && hasPendingFilterChanges
        ? "Refresh games"
        : source === "chesscom"
          ? isPending
            ? "Running quick analysis..."
            : "Analyze Selected Game"
        : source === "lichess"
          ? isPending
            ? "Importing latest game..."
            : "Import Latest Game"
          : isPending
            ? "Running analysis..."
            : "Analyze Game";
  const secondaryButtonLabel =
    source === "pgn"
      ? isPending
        ? "Queueing deep analysis..."
        : "Queue Deep Analysis"
      : source === "lichess"
        ? isPending
          ? "Queueing deep import..."
          : "Queue Deep Report"
        : source === "chesscom" && !hasLoadedChessComLibrary
          ? isPending
            ? "Loading archive..."
            : "Load archive"
          : source === "chesscom" && hasPendingFilterChanges
            ? "Apply filters first"
            : source === "chesscom" && !selectedGame
              ? "Select a game first"
              : isPending
                ? "Queueing deep report..."
                : "Queue Deep Report";
  const loadingPreview = useMemo(() => {
    if (source === "pgn") {
      const preview = buildGameLoadingPreview(normalizedInput);

      return {
        black: pgnHeaders?.Black ?? "Black",
        openingLabel: pgnHeaders?.Event ?? pgnHeaders?.Site ?? "Fresh PGN report",
        previewFen: preview.previewFen,
        previewMove: preview.previewMove,
        previewMoveCount: preview.previewMoveCount,
        timeControl: pgnHeaders?.TimeControl ?? "600+0",
        white: pgnHeaders?.White ?? "White",
      };
    }

    if (source === "chesscom" && selectedGame) {
      return {
        black: selectedGame.black,
        openingLabel: selectedGame.openingName ?? selectedGame.eco ?? "Recent public game",
        previewFen: selectedGame.previewFen,
        previewMove: selectedGame.previewMove,
        previewMoveCount: selectedGame.previewMoveCount,
        timeControl: selectedGame.timeControl,
        white: selectedGame.white,
      };
    }

    return {
      black: source === "chesscom" ? "Public opponent" : "Latest opponent",
      openingLabel: source === "chesscom" ? "Public archive import" : "Latest public game",
      previewFen: undefined,
      previewMove: undefined,
      previewMoveCount: undefined,
      timeControl: "600+0",
      white: normalizedInput || "Player",
    };
  }, [normalizedInput, pgnHeaders, selectedGame, source]);

  useEffect(() => {
    if (liveSession.isFinished && liveSession.analysisId) {
      const reportLink = `/analysis/${liveSession.analysisId}`;
      navigatingToReportRef.current = true;
      void router.prefetch(reportLink);
      router.push(reportLink);
    }
  }, [liveSession.isFinished, liveSession.analysisId, router]);

  function linkedUsernameForSource(option: SourceType) {
    return option === "pgn" ? "" : linkedAccounts?.[option] ?? "";
  }

  function clearFeedback() {
    setMessage(null);
    setLink(null);
  }

  function resetChessComSelection() {
    setAvailableGames([]);
    setSelectedGameId(null);
    setLoadedUsername(null);
    setFilteredGameCount(0);
    setNextPage(null);
    setGameStats(null);
    setAppliedFilters(defaultChessComFilters);
  }

  function openChessComGameBrowser() {
    if (!canSubmit) {
      setMessage("Enter a Chess.com username before fetching recent games.");
      return;
    }

    router.push(`/games/chesscom?username=${encodeURIComponent(normalizedInput)}`);
  }

  async function loadChessComGames(options?: { append?: boolean; page?: number }) {
    if (source !== "chesscom") {
      return;
    }

    if (!canSubmit) {
      setMessage("Enter a Chess.com username before loading public games.");
      return;
    }

    const page = options?.page ?? 0;
    setIsPending(true);
    clearFeedback();

    try {
      const response = await fetch("/api/import/chesscom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedInput,
          intent: "list",
          requestedDepth: "quick",
          page,
          pageSize: 24,
          search: gameSearch.trim() || undefined,
          result: gameResultFilter,
          timeClass: gameTimeClassFilter !== "all" ? gameTimeClassFilter : undefined,
        }),
      });

      const data = await readImportResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to load public Chess.com games.");
      }

      const incomingGames = data.games ?? [];
      const nextGames = options?.append ? mergeGamePages(availableGames, incomingGames) : incomingGames;
      const nextFilters = data.filters ?? {
        search: gameSearch.trim(),
        result: gameResultFilter,
        timeClass: gameTimeClassFilter,
      };

      setAvailableGames(nextGames);
      setSelectedGameId((current) => (current && nextGames.some((game) => game.id === current) ? current : nextGames[0]?.id ?? null));
      setLoadedUsername(normalizedUsername);
      setFilteredGameCount(data.filteredCount ?? nextGames.length);
      setNextPage(data.hasMore ? (data.page ?? page) + 1 : null);
      setGameStats(data.stats ?? null);
      setAppliedFilters(nextFilters);
      setMessage(
        data.message ??
          (nextGames.length > 0
            ? `Loaded ${Math.min(nextGames.length, data.filteredCount ?? nextGames.length)} games for ${normalizedInput}.`
            : `No public Chess.com games matched for ${normalizedInput}.`),
      );
    } catch (error) {
      resetChessComSelection();
      setMessage(error instanceof Error ? error.message : "Unable to load public Chess.com games.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit(depth: "quick" | "deep") {
    if (!canSubmit) {
      setMessage(source === "pgn" ? "Paste a longer PGN before starting analysis." : "Enter a username before importing.");
      return;
    }

    if (source === "chesscom" && hasLoadedChessComLibrary && !selectedGame) {
      setMessage("Load public Chess.com games and select one before starting analysis.");
      return;
    }

    if (source === "pgn") {
      setShowAnalysisOverlay(true);
      setIsPending(true);
      clearFeedback();
      await liveSession.startAnalysis(normalizedInput, depth);
      return;
    }

    const startedAt = Date.now();
    navigatingToReportRef.current = false;
    setAnalysisPendingDepth(depth);
    setShowAnalysisOverlay(true);
    setIsPending(true);
    clearFeedback();

    let handedOffToLive = false;

    try {
      const endpoint = source === "chesscom" ? "/api/import/chesscom" : "/api/import/lichess";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          source === "chesscom"
            ? {
                username: normalizedInput,
                requestedDepth: depth,
                intent: "fetch-pgn",
                archiveUrl: selectedGame?.archiveUrl,
                gameId: selectedGame?.id,
              }
            : {
                  username: normalizedInput,
                  requestedDepth: depth,
                  intent: "fetch-pgn",
                },
        ),
      });

      const data = await readImportResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Import failed.");
      }

      if (data.pgn) {
        handedOffToLive = true;
        await liveSession.startAnalysis(data.pgn, depth, source, normalizedInput);
        return;
      }

      const reportLink = data.shareUrl ?? (data.analysisId ? `/analysis/${data.analysisId}` : null);
      setMessage(
        reportLink && depth === "quick" ? "Analysis ready. Opening the saved report..." : (data.message ?? "Analysis ready."),
      );

      if (reportLink) {
        setLink(reportLink);
        const minimumOverlayMs = 900;
        const remaining = Math.max(0, minimumOverlayMs - (Date.now() - startedAt));

        if (remaining > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remaining));
        }

        if (depth === "quick") {
          void router.prefetch(reportLink);
          navigatingToReportRef.current = true;
          router.push(reportLink);
        }
      }
    } catch (error) {
      navigatingToReportRef.current = false;
      setMessage(error instanceof Error ? error.message : "The request failed. Check your payload and try again.");
    } finally {
      if (!navigatingToReportRef.current && !handedOffToLive) {
        setShowAnalysisOverlay(false);
        setIsPending(false);
      }
    }
  }

  return (
    <>
      <div className={cn("min-w-0", isSpotlight && "rounded-xl border border-white/10 bg-[#202020] p-4 shadow-[0_12px_35px_rgba(0,0,0,0.16)] sm:p-6")}>
      <div className={cn("flex min-w-0 flex-wrap items-center gap-2", isSpotlight ? "grid grid-cols-3 gap-3" : "")}>
        {(["pgn", "chesscom", "lichess"] as SourceType[]).map((option) => {
          const Icon = sourceIcons[option];
          const logo = sourceLogos[option];

          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSource(option);
                setInput(option === "pgn" ? samplePgn : linkedUsernameForSource(option));
                clearFeedback();
                resetChessComSelection();
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.97]",
                isSpotlight && "relative min-h-24 flex-col justify-center gap-2 border px-2 py-4 text-center sm:min-h-28",
                source === option
                  ? isSpotlight
                    ? "border-[#ffc629] bg-[#ffc629]/10 text-[#ffc629] shadow-[inset_0_0_0_1px_rgba(255,198,41,0.22)]"
                    : "bg-amber-400 text-[#0a0a0a]"
                  : isSpotlight
                    ? "border-white/10 bg-white/[0.015] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                    : "text-neutral-500 hover:text-white",
              )}
            >
              {logo ? (
                <Image
                  alt={logo.alt}
                  className={cn("size-4 rounded", isSpotlight && "size-7")}
                  height={28}
                  src={logo.src}
                  width={28}
                />
              ) : (
                <Icon className={cn("size-4", isSpotlight && "size-7 stroke-[1.7]")} />
              )}
              {sourceDetails[option].label}
              {isSpotlight && source === option ? <span className="absolute right-2 top-2 size-2 rounded-full bg-[#ffc629]" /> : null}
            </button>
          );
        })}
        <span
          aria-live="polite"
          className={cn(
            "rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]",
            isSpotlight && "hidden",
            statusTone,
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className={cn("mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500", isSpotlight && "hidden")}>
        {viewerDisplayName ? (
          <span>Importing for <span className="font-semibold text-neutral-300">{viewerDisplayName}</span></span>
        ) : (
          <Link href={signInHref} className="font-semibold text-amber-300 transition hover:text-amber-200">
            Sign in to keep this report in your library
          </Link>
        )}
      </div>

      <div className="mt-6 grid min-w-0 gap-5 sm:gap-6">
        <form
          className={cn("min-w-0 space-y-4", isSpotlight && "space-y-3")}
          onSubmit={(event) => {
            event.preventDefault();

            if (source === "chesscom" && !hasLoadedChessComLibrary) {
              openChessComGameBrowser();
              return;
            }

            if (source === "chesscom" && hasPendingFilterChanges) {
              void loadChessComGames({ page: 0 });
              return;
            }

            void handleSubmit("quick");
          }}
        >
          <div>
            <label htmlFor="import-workbench-input" className={cn("text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500", isSpotlight && "normal-case tracking-normal text-sm text-neutral-200")}>
              {helperLabel}
            </label>
            <div className={cn("mt-2 flex flex-wrap items-center gap-2", isSpotlight && "mt-1")}>
              <p className={cn("text-sm leading-7 text-neutral-300", isSpotlight && "hidden")}>{details.note}</p>
              {linkedDefault && source !== "pgn" ? (
                <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Previously used
                </span>
              ) : null}
            </div>
          </div>

          <div className={cn("flex flex-wrap items-center gap-2 text-xs text-neutral-400", isSpotlight && "hidden")}>
            {source === "pgn" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setInput(samplePgn);
                    clearFeedback();
                  }}
                  className="rounded-lg border border-neutral-700 bg-neutral-800/30 px-3 py-2 font-medium text-neutral-300 transition hover:bg-neutral-700/40 hover:text-white active:scale-[0.98]"
                >
                  Load sample PGN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    clearFeedback();
                  }}
                  className="rounded-lg border border-neutral-700 bg-neutral-800/30 px-3 py-2 font-medium text-neutral-300 transition hover:bg-neutral-700/40 hover:text-white active:scale-[0.98]"
                >
                  Clear input
                </button>
              </>
            ) : linkedDefault ? (
              <button
                type="button"
                onClick={() => {
                  setInput(linkedDefault);
                  clearFeedback();
                  resetChessComSelection();
                }}
                className="rounded-lg border border-neutral-700 bg-neutral-800/30 px-3 py-2 font-medium text-neutral-300 transition hover:bg-neutral-700/40 hover:text-white active:scale-[0.98]"
              >
                Use linked username
              </button>
            ) : (
              <span className="rounded-lg border border-neutral-800 bg-neutral-950/45 px-3 py-2">
                Public usernames work best for first-run imports.
              </span>
            )}
          </div>

          {source === "pgn" ? (
            <textarea
              id="import-workbench-input"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                clearFeedback();
              }}
              className="min-h-64 w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] px-4 py-4 text-sm leading-6 text-neutral-100 outline-none transition focus:border-amber-400/70"
              placeholder={details.placeholder}
            />
          ) : (
            <input
              id="import-workbench-input"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                clearFeedback();

                if (source === "chesscom") {
                  resetChessComSelection();
                }
              }}
              className={cn("h-14 w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] px-4 text-sm text-neutral-100 outline-none transition focus:border-amber-400/70", isSpotlight && "h-12 border-[#ffc629]/55 bg-[#414141] text-base focus:border-[#ffc629]")}
              placeholder={linkedDefault || details.placeholder}
            />
          )}

          {sampleHandles.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-500">Try it out:</span>
              {sampleHandles.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => {
                    setInput(handle);
                    clearFeedback();

                    if (source === "chesscom") {
                      resetChessComSelection();
                    }
                  }}
                  className={cn("rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-700/40", isSpotlight && "rounded-full px-3 py-1.5")}
                >
                  {handle}
                </button>
              ))}
            </div>
          ) : null}

          {source === "chesscom" ? (
            <div className={cn("min-w-0 rounded-xl border border-neutral-800 p-4 sm:p-5", isSpotlight ? "bg-neutral-950/50" : "bg-neutral-950/55")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">Game browser</p>
                  <p className="mt-2 text-sm leading-7 text-neutral-300">
                    {hasLoadedChessComLibrary
                      ? `Loaded ${availableGames.length} games on screen from ${filteredGameCount} matches. Filter the archive, choose a game, then analyze it.`
                      : "Fetch recent games first, or browse the public archive when you want a different opponent or time control."}
                  </p>
                </div>

                {gameStats ? (
                  <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                    {gameStats.totalGames.toLocaleString()} total games
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                <input
                  value={gameSearch}
                  onChange={(event) => {
                    setGameSearch(event.target.value);
                    clearFeedback();
                  }}
                  className="h-12 min-w-0 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-4 text-sm text-neutral-100 outline-none transition focus:border-amber-400/70 md:col-span-2"
                  placeholder="Search opponent, ECO, opening, or date"
                />

                <select
                  value={gameResultFilter}
                  onChange={(event) => {
                    setGameResultFilter(event.target.value as ImportGameResultFilter);
                    clearFeedback();
                  }}
                  className="h-12 min-w-0 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-4 text-sm text-neutral-100 outline-none transition focus:border-amber-400/70"
                >
                  <option value="all">All results</option>
                  <option value="win">Wins</option>
                  <option value="loss">Losses</option>
                  <option value="draw">Draws</option>
                </select>

                <select
                  value={gameTimeClassFilter}
                  onChange={(event) => {
                    setGameTimeClassFilter(event.target.value);
                    clearFeedback();
                  }}
                  className="h-12 min-w-0 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-4 text-sm text-neutral-100 outline-none transition focus:border-amber-400/70"
                >
                  <option value="all">All time classes</option>
                  {timeClassOptions.map((timeClass) => (
                    <option key={timeClass} value={timeClass}>
                      {timeClass}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    void loadChessComGames({ page: 0 });
                  }}
                  disabled={isPending || !canSubmit}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300 transition hover:bg-neutral-700/40 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
                >
                  {isPending && !hasLoadedChessComLibrary
                    ? "Loading..."
                    : hasLoadedChessComLibrary
                      ? "Refresh archive"
                      : "Browse archive"}
                </button>
              </div>

              {gameStats ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: "Wins", value: gameStats.wins.toLocaleString() },
                    { label: "Losses", value: gameStats.losses.toLocaleString() },
                    { label: "Draws", value: gameStats.draws.toLocaleString() },
                    { label: "Matches", value: filteredGameCount.toLocaleString() },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{metric.label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedGame ? (
                <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">vs {selectedGame.opponent}</p>
                      <p className="mt-1 break-words text-sm text-amber-400">
                        {selectedGame.white} vs {selectedGame.black} / {formatPlayedAt(selectedGame.playedAt)}
                      </p>
                    </div>
                    <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-100">
                      {describePlayerOutcome(selectedGame)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                      {selectedGame.timeClass ?? "chess"} / {selectedGame.timeControl}
                    </span>
                    <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                      {selectedGame.rated ? "Rated" : "Casual"}
                    </span>
                    {selectedGame.eco ? (
                      <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                        {selectedGame.eco}
                      </span>
                    ) : null}
                    {selectedGame.openingName ? (
                      <span className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                        {selectedGame.openingName}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                    <span>{describeGameResult(selectedGame)}</span>
                    {formatRatingLine(selectedGame) ? <span>Ratings {formatRatingLine(selectedGame)}</span> : null}
                  </div>

                  {selectedGame.url ? (
                    <a
                      href={selectedGame.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs font-medium uppercase tracking-[0.18em] text-neutral-400 transition hover:text-neutral-200"
                    >
                      View original on Chess.com
                    </a>
                  ) : null}
                </div>
              ) : null}

              {hasLoadedChessComLibrary ? (
                filteredGameCount > 0 ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Showing {availableGames.length} of {filteredGameCount} matching games
                    </p>
                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                      {availableGames.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => {
                            setSelectedGameId(game.id);
                            clearFeedback();
                          }}
                          className={cn(
                            "w-full rounded-lg border p-4 text-left transition",
                            selectedGame?.id === game.id
                              ? "border-amber-400/35 bg-amber-400/10"
                              : "border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-800/40",
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-white">vs {game.opponent}</p>
                              <p className="mt-1 break-words text-sm text-neutral-400">
                                {game.white} vs {game.black}
                              </p>
                            </div>
                            <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">{formatPlayedAt(game.playedAt)}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                              {describePlayerOutcome(game)}
                            </span>
                            <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                              {game.timeClass ?? "chess"}
                            </span>
                            <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                              {game.timeControl}
                            </span>
                            {game.eco ? (
                              <span className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-200">
                                {game.eco}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>

                    {nextPage !== null ? (
                      <button
                        type="button"
                        onClick={() => {
                          void loadChessComGames({ append: true, page: nextPage });
                        }}
                        disabled={isPending}
                        className="rounded-lg border border-neutral-700 bg-neutral-800/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300 transition hover:bg-neutral-700/40 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending ? "Loading more..." : "Load 24 more games"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-neutral-300">
                    The archive loaded, but nothing matched your current filters. Loosen the search, result, or time-class filters and try again.
                  </p>
                )
              ) : (
                <p className="mt-4 text-sm leading-7 text-neutral-300">
                  No game library loaded yet. Click Load archive to browse the public archive, then filter or select the exact game you want to review.
                </p>
              )}
            </div>
          ) : null}

          <div className={cn("gap-3", isSpotlight ? "grid" : "flex flex-wrap")}>
            <button
              type="submit"
              disabled={isPending || !canSubmit || (source === "chesscom" && hasLoadedChessComLibrary && (!selectedGame || hasPendingFilterChanges))}
              className={cn(
                "w-full rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-[#0a0a0a] transition hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto",
                isSpotlight ? "w-full bg-[#ffc629] py-3 text-base hover:bg-[#ffd152]" : "",
              )}
            >
              {primaryButtonLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (source === "chesscom" && !hasLoadedChessComLibrary) {
                  openChessComGameBrowser();
                  return;
                }

                void handleSubmit("deep");
              }}
              disabled={
                isPending ||
                !canSubmit ||
                (source === "chesscom" && hasLoadedChessComLibrary && (!selectedGame || hasPendingFilterChanges))
              }
              className={cn(
                "w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700/50 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto",
                isSpotlight ? "hidden" : "",
              )}
            >
              {secondaryButtonLabel}
            </button>
          </div>

          {(message || link) && (
            <div
              aria-live="polite"
              className={cn(
                "rounded-lg border p-4",
                link ? "border-emerald-400/20 bg-emerald-400/10" : "border-neutral-800 bg-neutral-950/60",
              )}
            >
              {message ? <p className="text-sm leading-7 text-neutral-300">{message}</p> : null}
              {link ? (
                <Link className="mt-3 inline-flex text-sm font-semibold text-amber-400 transition hover:text-amber-300" href={link}>
                  Open saved report
                </Link>
              ) : null}
            </div>
              )}
            >
              {secondaryButtonLabel}
            </button>
          </div>

          {(message || link) && (
            <div
              aria-live="polite"
              className={cn(
                "rounded-lg border p-4",
                link ? "border-emerald-400/20 bg-emerald-400/10" : "border-neutral-800 bg-neutral-950/60",
              )}
            >
              {message ? <p className="text-sm leading-7 text-neutral-300">{message}</p> : null}
              {link ? (
                <Link className="mt-3 inline-flex text-sm font-semibold text-amber-400 transition hover:text-amber-300" href={link}>
                  Open saved report
                </Link>
              ) : null}
            </div>
          )}
        </form>
      </div>
      </div>

      {showAnalysisOverlay && liveSession.isAnalyzing ? (
        <LiveAnalysisScreen
          session={liveSession}
          whitePlayer={loadingPreview.white}
          blackPlayer={loadingPreview.black}
        />
      ) : showAnalysisOverlay && !liveSession.isFinished ? (
        <AnalysisLoadingOverlay
          black={loadingPreview.black}
          depth={analysisPendingDepth}
          openingLabel={loadingPreview.openingLabel}
          previewFen={loadingPreview.previewFen}
          previewMove={loadingPreview.previewMove}
          previewMoveCount={loadingPreview.previewMoveCount}
          source={source}
          timeControl={loadingPreview.timeControl}
          white={loadingPreview.white}
        />
      ) : null}
    </>
  );
}
