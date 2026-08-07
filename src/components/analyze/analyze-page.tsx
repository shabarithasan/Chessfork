"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, Gauge, ScanSearch, Sparkles } from "lucide-react";
import { ImportWorkbench } from "@/components/analysis/import-workbench";
import type { LinkedChessAccount } from "@/types/platform";

/* ------------------------------------------------------------------ */
/*  Analyze Page – landing-page style                                  */
/* ------------------------------------------------------------------ */

export function AnalyzePageContent({
  linkedAccounts,
  viewerDisplayName,
  recentRuns,
  runs,
}: {
  linkedAccounts?: Partial<Record<LinkedChessAccount["source"], string>>;
  viewerDisplayName?: string;
  recentRuns: { id: string; white: string; black: string; source: string; opening: { eco: string; name: string }; accuracy?: { white: number; black: number } }[];
  runs: { length: number };
}) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 lg:py-12">
      {/* ── Two promo cards side by side ── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="flex min-h-[280px] flex-col justify-between rounded-xl border border-white/10 bg-[#202020] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.16)] sm:p-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><BrainCircuit className="size-6" /></div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400"><Sparkles className="size-4 text-amber-300" />Personal training</div>
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-white">Turn every game into your next lesson.</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">Chessfork Coach finds the patterns behind your misses and builds a training plan around your games.</p>
          </div>
          <Link href="/coach" className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#ffc629] px-5 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 active:scale-[0.98]">Meet your coach <ArrowRight className="size-4" /></Link>
        </div>

        <div className="flex min-h-[280px] flex-col justify-between rounded-xl border border-white/10 bg-[#202020] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.16)] sm:p-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><ScanSearch className="size-6" /></div>
              <p className="text-xs font-semibold text-neutral-400">Stockfish 17 analysis</p>
            </div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-white">See what changed the game.</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">Review every critical moment, understand your mistakes, and find the best continuation in seconds.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 bg-black/15 p-3"><Gauge className="size-4 text-emerald-300" /><p className="mt-2 text-sm font-semibold text-white">Move grades</p></div>
              <div className="rounded-lg border border-white/10 bg-black/15 p-3"><ScanSearch className="size-4 text-amber-300" /><p className="mt-2 text-sm font-semibold text-white">Best lines</p></div>
            </div>
          </div>
          <Link href="#analyze-game" className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 active:scale-[0.98]">Analyze a game <ArrowRight className="size-4" /></Link>
        </div>
      </div>

      {/* ── Import Workbench ── */}
      <div id="analyze-game" className="mx-auto max-w-2xl scroll-mt-6">
        <ImportWorkbench
          linkedAccounts={linkedAccounts}
          viewerDisplayName={viewerDisplayName}
          signInHref="/auth"
          defaultSource="chesscom"
          variant="spotlight"
        />
      </div>

      {/* ── Informational Content ── */}
      <div className="mx-auto mt-20 max-w-3xl space-y-16">

        {/* Section 1: Free Chess Analysis for Every Game */}
        <ContentSection title="Free Chess Analysis for Every Game">
          <p>
            Chessfork is a free chess analysis platform powered by Stockfish 17. Paste your Chess.com or Lichess
            username, pick a game, and get a full move-by-move analysis report in seconds. No daily limit, no premium wall,
            and no sign-up required to start analyzing.
          </p>
          <p>
            Every move gets a grade from Brilliant to Blunder based on centipawn loss. The report shows your
            overall accuracy, identifies the most critical key moments, highlights your best and worst moves, and gives
            clear coaching tips for every position. It&apos;s the same kind of feedback that makes chess games like
            Chess.com&apos;s paid tool behind a premium subscription.
          </p>
        </ContentSection>

        {/* Section 2: What Your Game Report Shows */}
        <ContentSection title="What Your Game Report Shows">
          <p>
            The chess game analysis breaks down every move you played. Each move gets a quality grade and a
            centipawn loss value so you can see exactly where you gained or lost advantage. The results display both
            sides of the game so you can study the full picture from opening to endgame.
          </p>
          <p>
            You can step through the game on the <span className="text-amber-300">analysis workbench</span>, toggle engine lines, and explore the
            variations you missed. Openings are identified automatically so you know what you played and where it went
            wrong. Every game becomes a learning tool, not just a record of results.
          </p>
          <p>
            You also get a <Link href="/more" className="text-amber-300 hover:underline">Roast Card</Link>, the chess game analysis that highlights your two most important critical
            mistakes. If you want to track your moves, the <Link href="/more" className="text-amber-300 hover:underline">Chess DNA card</Link> shows your chess style profile based on
            your opening, endgame, and accuracy trends from any PGN in seconds.
          </p>
        </ContentSection>

        {/* Section 3: Works with Chess.com, Lichess and PGN */}
        <ContentSection title="Works with Chess.com, Lichess and PGN">
          <p>
            Type your Chess.com or Lichess username above and your recent games load automatically. If you
            have games saved as PGN files, paste the text or upload a file directly.
          </p>
          <p>
            On Chess.com, you&apos;ll get auto-imported results, daily/rapid/blitz/classic/unlimited/monthly formats by full
            engine viewer. On Chessfork, we can retrieve every game in your history with full Stockfish analysis for
            free: blitz, rapid, bullet, classical. No restrictions on time controls or number of games. Our base has a
            20+ engine depth to run searches deeper on higher-level games.
          </p>
        </ContentSection>

        {/* Section 4: Frequently Asked Questions */}
        <ContentSection title="Frequently Asked Questions">
          <div className="space-y-6">
            <FaqItem question="Is Chessfork really free?">
              Yes, completely. This is for you yourself and not just a demo/trial. You can create an account to save your
              games/reports and access more puzzles, but it&apos;s not required to analyze. The chess analysis is powered by
              Stockfish 17 and runs locally in your browser, which is how we keep it free for everyone.
            </FaqItem>

            <FaqItem question="How is this different from Chess.com analysis?">
              Chess.com gives you free, one-game reviews per day and locks full game analysis behind a premium
              subscription. Chessfork removes that limit. You get unlimited game reviews with the same Stockfish
              engine, full move grading, accuracy scores, and a complete report every time.
            </FaqItem>

            <FaqItem question="What does the analysis report show?">
              Every move gets a quality rating: from Brilliant to Blunder, based on centipawn loss. You also get an
              overall accuracy percentage, the opening you played, an evaluation graph that shows how the
              advantage shifted, and the engine&apos;s best move for every position. You can explore all of this on the
              analysis board.
            </FaqItem>

            <FaqItem question="Do I need to create an account?">
              Not to analyze. Type your Chess.com or Lichess username, or paste PGN, and you can start right
              away. Creating an account lets you save your games/reports, track match-day puzzles, and access puzzles,
              but the analysis works without one.
            </FaqItem>

            <FaqItem question="Which platforms can I import games from?">
              Chess.com, Lichess, and any standard PGN file. Try Chess.com and Lichess: enter your username and
              your recent games load automatically. For PGN, paste the text or upload a .pgn file.
            </FaqItem>

            <FaqItem question="How accurate is the chess analysis?">
              Chessfork uses Stockfish 17, the strongest open-source chess engine in the world. It&apos;s the same
              engine used by every major chess platform. The analysis quality is identical to what you would get from
              any full Stockfish analyzer.
            </FaqItem>
          </div>
        </ContentSection>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="mx-auto mt-16 max-w-3xl text-center">
        <Link
          href="/blog/analysis-guide"
          className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
        >
          Learn more about how the analysis works →
        </Link>
      </div>
    </div>
  );
}

/* ── Reusable sub-components ── */

function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-400">
        {children}
      </div>
    </div>
  );
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{question}</h3>
      <p className="mt-2 text-sm leading-7 text-neutral-400">{children}</p>
    </div>
  );
}
