"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, RefreshCw, Search } from "lucide-react";

import { AnalysisLoadingOverlay } from "@/components/analysis/analysis-loading-overlay";
import { mergeGamePages } from "@/lib/chess/game-utils";
import { cn } from "@/lib/utils";
import type {
  AnalysisDepth,
  ImportGameLibraryFilters,
  ImportGameLibraryResponse,
  ImportGameResultFilter,
  ImportablePlayerProfile,
  ImportableGameOption,
} from "@/types/platform";

type ImportResponse = Partial<ImportGameLibraryResponse> & {
  analysisId?: string;
  message?: string;
  shareUrl?: string;
};

const defaultFilters: ImportGameLibraryFilters = {
  search: "",
  result: "all",
  timeClass: "all",
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

  throw new Error(`${getResponsePath(response)} returned a non-JSON response. Restart the dev server and try again.`);
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function formatPlayedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatPlayedAtParts(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { monthDay: value, year: "" };
  }

  return {
    monthDay: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
    }).format(parsed),
    year: new Intl.DateTimeFormat("en-US", {
      year: "numeric",
    }).format(parsed),
  };
}

function formatTimeControlLabel(value: string) {
  const [baseTime] = value.split("+");
  const seconds = Number(baseTime);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return value;
  }

  if (seconds >= 86_400) {
    const days = seconds / 86_400;
    return `${Number.isInteger(days) ? days : days.toFixed(1)} day${days === 1 ? "" : "s"}`;
  }

  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} min`;
  }

  return `${seconds} sec`;
}

function outcomeTone(outcome: ImportableGameOption["outcome"]) {
  if (outcome === "win") {
    return "border-amber-200/25 bg-amber-200/16 text-amber-100";
  }

  if (outcome === "loss") {
    return "border-rose-300/20 bg-rose-500/25 text-rose-100";
  }

  return "border-slate-300/20 bg-slate-300/10 text-slate-100";
}

function compactOutcomeLabel(outcome: ImportableGameOption["outcome"]) {
  if (outcome === "win") return "Win";
  if (outcome === "loss") return "Loss";
  return "Draw";
}

function countryFlagEmoji(countryCode?: string) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return "";
  }

  return String.fromCodePoint(...[...countryCode].map((letter) => 127397 + letter.charCodeAt(0)));
}

function PlayerAvatar({
  profile,
  username,
}: {
  profile?: ImportablePlayerProfile;
  username: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.08] text-xs font-semibold text-slate-100">
      {profile?.avatarUrl && !imageFailed ? (
        <Image
          alt={`${username} Chess.com profile`}
          className="object-cover"
          fill
          loading="lazy"
          sizes="36px"
          src={profile.avatarUrl}
          unoptimized
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function PlayerIdentity({
  highlighted,
  profile,
  rating,
  username,
}: {
  highlighted: boolean;
  profile?: ImportablePlayerProfile;
  rating?: number;
  username: string;
}) {
  const countryLabel = profile?.countryName ?? profile?.countryCode;
  const flag = countryFlagEmoji(profile?.countryCode);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <PlayerAvatar profile={profile} username={username} />
      <div className="min-w-0">
        <p className={cn("flex min-w-0 items-center gap-1.5 font-semibold", highlighted ? "text-amber-300" : "text-slate-100")}>
          <span className="truncate">{username}</span>
          {rating ? <span className="shrink-0 text-slate-400">({rating})</span> : null}
        </p>
        {countryLabel ? (
          <p className="mt-0.5 truncate text-xs text-slate-500" title={countryLabel}>
            {flag ? `${flag} ` : ""}
            {countryLabel}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-600">Country unavailable</p>
        )}
      </div>
    </div>
  );
}

function selectedGameOpening(game: ImportableGameOption | null) {
  if (!game) {
    return "Chess.com archive";
  }

  return game.openingName ?? game.eco ?? "Recent public game";
}

export function ChessComGameBrowserPage({
  initialUsername,
  linkedUsername,
  viewerDisplayName,
}: {
  initialUsername?: string;
  linkedUsername?: string;
  viewerDisplayName?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? linkedUsername ?? "");
  const [loadedUsername, setLoadedUsername] = useState<string | null>(null);
  const [games, setGames] = useState<ImportableGameOption[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [stats, setStats] = useState<ImportGameLibraryResponse["stats"] | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [resultFilter, setResultFilter] = useState<ImportGameResultFilter>("all");
  const [timeClassFilter, setTimeClassFilter] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState<ImportGameLibraryFilters>(defaultFilters);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>("quick");
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  const [analyzingGameId, setAnalyzingGameId] = useState<string | null>(null);
  const navigatingToReportRef = useRef(false);

  const normalizedUsername = normalizeUsername(username);
  const canFetch = normalizedUsername.length >= 2;
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? games[0] ?? null;
  const hasLoadedLibrary = loadedUsername === normalizedUsername && stats !== null;
  const hasPendingFilterChanges =
    hasLoadedLibrary &&
    (appliedFilters.search !== searchValue.trim() ||
      appliedFilters.result !== resultFilter ||
      appliedFilters.timeClass !== timeClassFilter);
  const timeClassOptions = stats?.timeClasses ?? [];
  const statusLabel = analyzingGameId
    ? "Analyzing clicked game"
    : isPending
      ? "Fetching public games"
      : hasPendingFilterChanges
        ? "Filters changed"
        : hasLoadedLibrary
          ? `${filteredCount} matches loaded`
          : "Ready to fetch";
  const selectedPreview = useMemo(
    () => ({
      black: selectedGame?.black ?? "Public opponent",
      openingLabel: selectedGameOpening(selectedGame),
      previewFen: selectedGame?.previewFen,
      previewMove: selectedGame?.previewMove,
      previewMoveCount: selectedGame?.previewMoveCount,
      timeControl: selectedGame?.timeControl ?? "600+0",
      white: selectedGame?.white ?? (username || "Chess.com player"),
    }),
    [selectedGame, username],
  );

  function resetLibrary() {
    setLoadedUsername(null);
    setGames([]);
    setSelectedGameId(null);
    setFilteredCount(0);
    setNextPage(null);
    setStats(null);
    setAppliedFilters(defaultFilters);
  }

  async function loadGames(options?: { append?: boolean; page?: number }) {
    if (!canFetch) {
      setMessage("Enter a Chess.com username first.");
      return;
    }

    const page = options?.page ?? 0;
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/import/chesscom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "list",
          page,
          pageSize: 24,
          requestedDepth: "quick",
          result: resultFilter,
          search: searchValue.trim() || undefined,
          timeClass: timeClassFilter !== "all" ? timeClassFilter : undefined,
          username: normalizedUsername,
        }),
      });

      const data = await readImportResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to fetch Chess.com games.");
      }

      const incomingGames = data.games ?? [];
      const nextGames = options?.append ? mergeGamePages(games, incomingGames) : incomingGames;

      setGames(nextGames);
      setSelectedGameId((current) => (current && nextGames.some((game) => game.id === current) ? current : nextGames[0]?.id ?? null));
      setLoadedUsername(normalizedUsername);
      setFilteredCount(data.filteredCount ?? nextGames.length);
      setNextPage(data.hasMore ? (data.page ?? page) + 1 : null);
      setStats(data.stats ?? null);
      setAppliedFilters(
        data.filters ?? {
          search: searchValue.trim(),
          result: resultFilter,
          timeClass: timeClassFilter,
        },
      );
      setMessage(
        data.message ??
          (nextGames.length > 0
            ? `Imported ${nextGames.length} visible games for ${normalizedUsername}.`
            : `No public Chess.com games matched ${normalizedUsername}.`),
      );
    } catch (error) {
      resetLibrary();
      setMessage(error instanceof Error ? error.message : "Unable to fetch Chess.com games.");
    } finally {
      setIsPending(false);
    }
  }

  const loadInitialGames = useEffectEvent(() => {
    void loadGames({ page: 0 });
  });

  useEffect(() => {
    if (!initialUsername && !linkedUsername) {
      return;
    }

    const timeoutId = window.setTimeout(loadInitialGames, 0);
    return () => window.clearTimeout(timeoutId);
  }, [initialUsername, linkedUsername]);

  async function analyzeGame(game: ImportableGameOption, depth: AnalysisDepth = "quick") {
    navigatingToReportRef.current = false;
    setSelectedGameId(game.id);
    setAnalysisDepth(depth);
    setShowAnalysisOverlay(true);
    setAnalyzingGameId(game.id);
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/import/chesscom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          archiveUrl: game.archiveUrl,
          gameId: game.id,
          requestedDepth: depth,
          username: normalizedUsername,
        }),
      });

      const data = await readImportResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to analyze selected game.");
      }

      const reportLink = data.shareUrl ?? (data.analysisId ? `/analysis/${data.analysisId}` : null);
      setMessage(data.message ?? "Analysis ready.");

      if (reportLink) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));

        if (depth === "quick") {
          void router.prefetch(reportLink);
          navigatingToReportRef.current = true;
          router.push(reportLink);
        } else {
          setMessage(`Deep report queued. Open it here: ${reportLink}`);
        }
      }
    } catch (error) {
      navigatingToReportRef.current = false;
      setMessage(error instanceof Error ? error.message : "Unable to analyze selected game.");
    } finally {
      if (!navigatingToReportRef.current) {
        setShowAnalysisOverlay(false);
        setAnalyzingGameId(null);
        setIsPending(false);
      }
    }
  }

  return (
    <>
      <section className="mx-auto w-full max-w-[1180px] py-4 lg:py-6">
        <div className="space-y-6">
          <div className="min-w-0 space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(44,38,32,0.96),rgba(21,19,18,0.98))] p-5 shadow-[0_34px_90px_rgba(0,0,0,0.32)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Chess.com games</p>
                  <h1 className="mt-3 max-w-full text-[2.55rem] font-semibold leading-[0.98] text-white sm:text-5xl sm:leading-[0.98]">
                    Games for{" "}
                    <span className="block max-w-full break-words font-bold text-amber-200 [overflow-wrap:anywhere] sm:inline">
                      {loadedUsername ?? (normalizedUsername || "username")}
                    </span>
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                    Click any game row to start quick analysis immediately.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/analyze"
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    Import Games
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void loadGames({ page: 0 });
                    }}
                    disabled={isPending || !canFetch}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Refresh games
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setMessage(null);
                      resetLibrary();
                    }}
                    className="h-14 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/80 pl-11 pr-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/70"
                    placeholder="Chess.com username"
                  />
                </div>

                {linkedUsername ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(linkedUsername);
                      setMessage(null);
                      resetLibrary();
                    }}
                    className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                  >
                    Use linked username
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    void loadGames({ page: 0 });
                  }}
                  disabled={isPending || !canFetch}
                  className="rounded-[1.2rem] border border-amber-200/25 bg-amber-200/12 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-200/18 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Fetch Recent Games
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="h-12 min-w-0 rounded-[1.1rem] border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/70"
                  placeholder="Search opponent, ECO, opening, or date"
                />
                <select
                  value={resultFilter}
                  onChange={(event) => setResultFilter(event.target.value as ImportGameResultFilter)}
                  className="h-12 rounded-[1.1rem] border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/70"
                >
                  <option value="all">All results</option>
                  <option value="win">Wins</option>
                  <option value="loss">Losses</option>
                  <option value="draw">Draws</option>
                </select>
                <select
                  value={timeClassFilter}
                  onChange={(event) => setTimeClassFilter(event.target.value)}
                  className="h-12 rounded-[1.1rem] border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-amber-300/70"
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
                    void loadGames({ page: 0 });
                  }}
                  disabled={isPending || !canFetch}
                  className={cn(
                    "rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                    hasPendingFilterChanges
                      ? "border-amber-300/35 bg-amber-300/12 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]",
                  )}
                >
                  Apply filters
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  {statusLabel}
                </span>
                {viewerDisplayName ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Signed in as {viewerDisplayName}
                  </span>
                ) : null}
                {message ? <span className="text-sm leading-6 text-slate-300">{message}</span> : null}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#242426] shadow-[0_34px_90px_rgba(0,0,0,0.28)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
                <p className="text-lg font-medium text-slate-300">
                  {games.length > 0 ? `Showing 1-${games.length} of ${filteredCount} games` : "No game library loaded yet"}
                </p>
                {stats ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      {stats.totalGames.toLocaleString()} total
                    </span>
                    <span className="rounded-full border border-amber-200/25 bg-amber-200/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                      {stats.wins.toLocaleString()} wins
                    </span>
                    <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                      {stats.losses.toLocaleString()} losses
                    </span>
                  </div>
                ) : null}
              </div>

              {games.length > 0 ? (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-6 py-4 font-semibold">Players</th>
                          <th className="px-6 py-4 font-semibold">Time</th>
                          <th className="px-6 py-4 font-semibold">Result</th>
                          <th className="px-6 py-4 text-right font-semibold">Game</th>
                        </tr>
                      </thead>
                      <tbody>
                        {games.map((game) => {
                          const dateParts = formatPlayedAtParts(game.playedAt);
                          const isAnalyzingThisGame = analyzingGameId === game.id;
                          const playerIsWhite = game.playerColor === "white";

                          return (
                            <tr
                              key={game.id}
                              role="button"
                              tabIndex={0}
                              title="Click to analyze this game"
                              onClick={() => {
                                if (!isPending) {
                                  void analyzeGame(game);
                                }
                              }}
                              onKeyDown={(event) => {
                                if ((event.key === "Enter" || event.key === " ") && !isPending) {
                                  event.preventDefault();
                                  void analyzeGame(game);
                                }
                              }}
                              className={cn(
                                "cursor-pointer border-b border-white/6 transition hover:bg-white/[0.045] focus-visible:bg-white/[0.055] focus-visible:outline-none",
                                isAnalyzingThisGame ? "bg-amber-300/[0.08]" : "",
                              )}
                            >
                              <td className="w-28 px-6 py-4 align-middle">
                                <p className="font-semibold text-white">{dateParts.monthDay}</p>
                                <p className="mt-1 text-sm text-slate-500">{dateParts.year}</p>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <div className="grid gap-2.5">
                                  <PlayerIdentity
                                    highlighted={playerIsWhite}
                                    profile={game.whiteProfile}
                                    rating={game.whiteRating}
                                    username={game.white}
                                  />
                                  <PlayerIdentity
                                    highlighted={!playerIsWhite}
                                    profile={game.blackProfile}
                                    rating={game.blackRating}
                                    username={game.black}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <p className="font-semibold text-white">{formatTimeControlLabel(game.timeControl)}</p>
                                <p className="mt-1 text-sm capitalize text-slate-500">{game.timeClass ?? "chess"}</p>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <span className={cn("inline-flex rounded-md border px-3 py-1 text-xs font-semibold", outcomeTone(game.outcome))}>
                                  {compactOutcomeLabel(game.outcome)}
                                </span>
                                <p className="mt-1 text-sm text-slate-100">{game.rated ? "Rated" : "Casual"}</p>
                              </td>
                              <td className="px-6 py-4 text-right align-middle">
                                <span className="inline-grid size-9 place-items-center rounded-lg border border-amber-200/25 bg-amber-200/14 text-lg text-amber-100">
                                  {isAnalyzingThisGame ? <Loader2 className="size-4 animate-spin" /> : "SF"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 p-5 lg:hidden">
                    {games.map((game) => {
                      const isAnalyzingThisGame = analyzingGameId === game.id;

                      return (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => {
                            void analyzeGame(game);
                          }}
                          disabled={isPending}
                          className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.055] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">vs {game.opponent}</p>
                              <p className="mt-1 text-sm text-slate-500">{formatPlayedAt(game.playedAt)}</p>
                            </div>
                            <span className={cn("rounded-md border px-3 py-1 text-xs font-semibold", outcomeTone(game.outcome))}>
                              {isAnalyzingThisGame ? "Analyzing" : compactOutcomeLabel(game.outcome)}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2.5 text-sm">
                            <PlayerIdentity
                              highlighted={game.playerColor === "white"}
                              profile={game.whiteProfile}
                              rating={game.whiteRating}
                              username={game.white}
                            />
                            <PlayerIdentity
                              highlighted={game.playerColor === "black"}
                              profile={game.blackProfile}
                              rating={game.blackRating}
                              username={game.black}
                            />
                          </div>
                          <p className="mt-3 text-sm text-slate-500">
                            {game.eco ?? "ECO"} / {game.openingName ?? "Opening unknown"}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                              {formatTimeControlLabel(game.timeControl)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                              {game.rated ? "Rated" : "Casual"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {nextPage !== null ? (
                    <div className="border-t border-white/10 p-5 sm:px-6">
                      <button
                        type="button"
                        onClick={() => {
                          void loadGames({ append: true, page: nextPage });
                        }}
                        disabled={isPending}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending ? "Loading more..." : "Load 24 more games"}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="px-6 py-8">
                  <p className="text-lg font-semibold text-white">Fetch recent games first</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Enter a public Chess.com username and press Fetch Recent Games. This page becomes the match list before analysis starts.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {showAnalysisOverlay ? (
        <AnalysisLoadingOverlay
          black={selectedPreview.black}
          depth={analysisDepth}
          openingLabel={selectedPreview.openingLabel}
          previewFen={selectedPreview.previewFen}
          previewMove={selectedPreview.previewMove}
          previewMoveCount={selectedPreview.previewMoveCount}
          source="chesscom"
          timeControl={selectedPreview.timeControl}
          white={selectedPreview.white}
        />
      ) : null}
    </>
  );
}
