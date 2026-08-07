import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm, SignUpForm } from "@/components/auth/auth-forms";
import { ChessforkLogo } from "@/components/brand/chessfork-logo";
import { LiquidChessAtmosphere } from "@/components/auth/liquid-chess-atmosphere";
import { getCurrentUser } from "@/server/auth/session";
import { oauthProviderConfigured } from "@/server/auth/oauth";
import type { Locale } from "@/types/platform";

const oauthErrorMessage: Record<string, string> = {
  oauth_not_configured: "Social sign-in isn't configured yet. Sign in with email and password instead.",
  oauth_expired: "That sign-in link expired. Please try again.",
  oauth_failed: "We couldn't complete the sign-in with that provider. Please try again.",
};

function resolveOAuthError(error: string | string[] | undefined) {
  const key = typeof error === "string" ? error : Array.isArray(error) ? error[0] : undefined;
  return key ? oauthErrorMessage[key] ?? oauthErrorMessage.oauth_failed : null;
}

function resolveNextPath(nextPath: string | string[] | undefined, fallback: string) {
  return typeof nextPath === "string" && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : fallback;
}

function routePrefix(locale?: Locale, localized?: boolean) {
  return localized && locale ? `/${locale}` : "";
}

function authHref(prefix: string, mode: "signin" | "signup", nextPath: string) {
  const params = new URLSearchParams({ mode });
  if (nextPath !== `${prefix}/account`) params.set("next", nextPath);
  return `${prefix}/auth?${params.toString()}`;
}

export async function AuthPage({
  nextPath,
  locale,
  localized = false,
  mode,
  error,
}: {
  nextPath?: string | string[];
  locale?: Locale;
  localized?: boolean;
  mode?: string | string[];
  error?: string | string[];
}) {
  const prefix = routePrefix(locale, localized);
  const safeNextPath = resolveNextPath(nextPath, `${prefix}/account`);
  const viewer = await getCurrentUser();
  const showSignUp = (Array.isArray(mode) ? mode[0] : mode) === "signup";
  const oauthError = resolveOAuthError(error);
  const oauthProviders = {
    google: oauthProviderConfigured("google"),
    github: oauthProviderConfigured("github"),
  };
  if (viewer) redirect(safeNextPath);

  return (
    <main className="fixed inset-0 z-[70] grid min-h-screen place-items-center overflow-y-auto px-4 py-7 text-white sm:px-6">
      {/* ── Cinematic background ── */}
      <LiquidChessAtmosphere />

      {/* ── Glassmorphism card ── */}
      <div className="relative z-10 w-full max-w-[26rem]">
        <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(12,12,18,0.72)] shadow-[0_36px_100px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-2xl">
          <div className="p-7 sm:p-8">

            {/* ── Logo + brand ── */}
            <div className="flex flex-col items-center gap-2">
              <ChessforkLogo
                alt="Chessfork"
                className="size-12 rounded-xl border-amber-400/30 bg-amber-400/10 shadow-[0_8px_24px_rgba(251,191,36,.15)]"
                imageClassName="p-1"
              />
              <div className="text-center">
                <h2 className="text-xl font-bold tracking-tight text-amber-400">Chessfork</h2>
                <p className="text-xs tracking-wider text-amber-400/60">AI-Powered Chess Analysis</p>
              </div>
            </div>

            {/* ── Heading ── */}
            <div className="mt-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {showSignUp ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                {showSignUp ? "Start your chess journey" : "Continue your chess journey"}
              </p>
            </div>

            {/* ── OAuth error banner ── */}
            {oauthError ? (
              <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {oauthError}
              </div>
            ) : null}

            {/* ── Form ── */}
            <div className="mt-7">
              {showSignUp ? (
                <SignUpForm nextPath={safeNextPath} locale={locale} oauthProviders={oauthProviders} />
              ) : (
                <SignInForm nextPath={safeNextPath} oauthProviders={oauthProviders} />
              )}
            </div>

            {/* ── Toggle sign-in / sign-up ── */}
            <p className="mt-6 text-center text-sm text-slate-500">
              {showSignUp ? "Already have an account? " : "Don't have an account? "}
              <Link
                href={authHref(prefix, showSignUp ? "signin" : "signup", safeNextPath)}
                className="font-semibold text-amber-400 transition hover:text-amber-300"
              >
                {showSignUp ? "Sign In" : "Sign Up"}
              </Link>
            </p>

          </div>
        </div>
      </div>
    </main>
  );
}
