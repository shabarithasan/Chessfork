import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm, SignUpForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/server/auth/session";
import type { Locale } from "@/types/platform";

function resolveNextPath(nextPath: string | string[] | undefined, fallback: string) {
  if (typeof nextPath !== "string") {
    return fallback;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }

  return nextPath;
}

function routePrefix(locale?: Locale, localized?: boolean) {
  return localized && locale ? `/${locale}` : "";
}

export async function AuthPage({
  nextPath,
  locale,
  localized = false,
}: {
  nextPath?: string | string[];
  locale?: Locale;
  localized?: boolean;
}) {
  const prefix = routePrefix(locale, localized);
  const safeNextPath = resolveNextPath(nextPath, `${prefix}/account`);
  const viewer = await getCurrentUser();

  if (viewer) {
    redirect(safeNextPath);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/80">Account</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
            Save your reports, remember your chess usernames, and make the training loop yours.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            The account layer gives Chessfork a real memory: linked Chess.com and Lichess usernames, a personal report library,
            and coach context that no longer depends on sample data.
          </p>

          <div className="mt-8 grid gap-4">
            {[
              "Keep public-import usernames ready so the analyze flow starts one step faster.",
              "Save your own report library instead of sharing a single anonymous store.",
              "Generate coach snapshots from your account history, not the demo player.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-slate-300">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`${prefix}/analyze`}
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Explore analyze
            </Link>
            <Link
              href={`${prefix}/pricing`}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              View plans
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-amber-300/20 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_rgba(15,23,42,0.98)_72%)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Sign in</p>
            <p className="mt-3 text-2xl font-semibold text-white">Reopen your account instantly.</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Use the account you already created to get back to your saved usernames and personal report flow.
            </p>
            <div className="mt-6">
              <SignInForm nextPath={safeNextPath} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Create account</p>
            <p className="mt-3 text-2xl font-semibold text-white">Start a personal training workspace.</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              New accounts start on the free tier and can immediately store profile settings plus linked public usernames.
            </p>
            <div className="mt-6">
              <SignUpForm nextPath={safeNextPath} locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
