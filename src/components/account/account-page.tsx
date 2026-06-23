import Link from "next/link";
import { redirect } from "next/navigation";

import { ChessAccountLinkForm, ProfileSettingsForm } from "@/components/account/account-forms";
import { localeNames } from "@/lib/locales";
import { listAnalysisResponses } from "@/lib/platform-service";
import { getCurrentUser } from "@/server/auth/session";
import { getAccountProfile } from "@/server/repositories/user-repository";
import type { Locale } from "@/types/platform";

function routePrefix(locale?: Locale, localized?: boolean) {
  return localized && locale ? `/${locale}` : "";
}

function formatSourceLabel(source: "pgn" | "chesscom" | "lichess") {
  if (source === "chesscom") {
    return "Chess.com";
  }

  if (source === "lichess") {
    return "Lichess";
  }

  return "PGN";
}

export async function AccountPage({
  locale,
  localized = false,
}: {
  locale?: Locale;
  localized?: boolean;
}) {
  const prefix = routePrefix(locale, localized);
  const viewer = await getCurrentUser();

  if (!viewer) {
    redirect(`${prefix}/auth?next=${encodeURIComponent(`${prefix}/account`)}`);
  }

  const profile = await getAccountProfile(viewer.id);
  if (!profile) {
    redirect(`${prefix}/auth?next=${encodeURIComponent(`${prefix}/account`)}`);
  }

  const runs = await listAnalysisResponses(viewer.id);
  const linkedChessCom = profile.linkedAccounts.find((account) => account.source === "chesscom");
  const linkedLichess = profile.linkedAccounts.find((account) => account.source === "lichess");
  const latestRun = runs[0];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Account</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
            Your training identity, linked imports, and report history in one place.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            This is the operational layer behind the polished UI: who you are, where your games come from, and which saved reports
            should drive the next coach or puzzle surface.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Plan", value: profile.user.subscriptionTier.toUpperCase() },
              { label: "Linked accounts", value: profile.linkedAccounts.length.toString() },
              { label: "Saved reports", value: runs.length.toString().padStart(2, "0") },
              { label: "Locale", value: localeNames[profile.user.locale] },
            ].map((metric) => (
              <div key={metric.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Primary account</p>
            <p className="mt-3 text-3xl font-semibold text-white">{profile.user.displayName}</p>
            <p className="mt-2 text-sm text-slate-400">{profile.user.email}</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Created {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(profile.user.createdAt))}
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Profile settings</p>
          <p className="mt-3 text-2xl font-semibold text-white">Keep the shell and coach copy aligned with your profile.</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Display name and locale updates feed the authenticated surface immediately, including the analyze page and the coach
            subject line.
          </p>
          <div className="mt-6">
            <ProfileSettingsForm user={profile.user} />
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Linked imports</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Make Chess.com and Lichess imports one step shorter.
              </h2>
            </div>
            <Link href={`${prefix}/analyze`} className="text-sm font-semibold text-amber-300 transition hover:text-amber-200">
              Open analyze
            </Link>
          </div>

          <div className="mt-8 grid gap-5">
            <ChessAccountLinkForm source="chesscom" account={linkedChessCom} />
            <ChessAccountLinkForm source="lichess" account={linkedLichess} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Personal report library</p>
          {latestRun ? (
            <>
              <p className="mt-3 text-2xl font-semibold text-white">
                {latestRun.white} vs {latestRun.black}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{latestRun.summary}</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Source</p>
                  <p className="mt-2 font-semibold text-white">{formatSourceLabel(latestRun.source)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Opening</p>
                  <p className="mt-2 font-semibold text-white">
                    {latestRun.opening.eco} / {latestRun.opening.name}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Accuracy</p>
                  <p className="mt-2 font-semibold text-white">
                    {Math.round((latestRun.accuracyWhite + latestRun.accuracyBlack) / 2)}%
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`${prefix}/analysis/${latestRun.id}`}
                  className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
                >
                  Open latest report
                </Link>
                <Link
                  href={`${prefix}/coach`}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Open coach
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-semibold text-white">No personal reports yet</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Sign in was the first step. Your next imported PGN or public game will now attach to this account and build a personal
                report trail.
              </p>
              <Link
                href={`${prefix}/analyze`}
                className="mt-6 inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Import your first game
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
