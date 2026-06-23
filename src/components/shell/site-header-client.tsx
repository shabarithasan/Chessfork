"use client";

import Link from "next/link";
import { ArrowRight, Menu, Sparkles } from "lucide-react";

import { signOutAction } from "@/app/auth/actions";
import { ChessforkLogo } from "@/components/brand/chessfork-logo";
import { useStablePathname } from "@/components/shell/use-stable-pathname";
import { localeNames, resolveLocaleFromPathname, withLocalePrefix } from "@/lib/locales";
import { primaryNav, siteConfig } from "@/lib/site";

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizePath(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function navMatchPath(href: string) {
  if (href.startsWith("/leaderboards")) {
    return "/leaderboards";
  }

  return href;
}

function isActivePath(pathname: string | null, href: string) {
  const currentPath = normalizePath(pathname);
  const target = normalizePath(href);
  const matchBase = normalizePath(navMatchPath(target));

  return currentPath === target || currentPath.startsWith(`${matchBase}/`);
}

export function SiteHeaderClient({
  viewer,
}: {
  viewer: { displayName: string } | null;
}) {
  const pathname = useStablePathname();
  const activeLocale = resolveLocaleFromPathname(pathname);
  const locale = activeLocale ?? siteConfig.defaultLocale;
  const localeLabel = localeNames[locale];
  const homePath = withLocalePrefix("/", activeLocale);
  const accountPath = withLocalePrefix("/account", activeLocale);
  const authPath = withLocalePrefix("/auth", activeLocale);
  const analyzePath = withLocalePrefix("/analyze", activeLocale);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(4,9,18,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href={homePath} className="flex min-w-0 items-center gap-3">
          <ChessforkLogo alt="Chessfork logo" className="size-11 rounded-2xl" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{siteConfig.name}</p>
            <p className="truncate text-xs text-slate-400">{localeLabel} edition</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {primaryNav.map((item) => {
            const href = withLocalePrefix(item.href, activeLocale);
            const active = isActivePath(pathname, href);

            return (
              <Link
                key={item.href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-2 text-xs text-emerald-100">
            <Sparkles className="size-3.5" />
            Problem to Perfect, saved reports
          </div>
          {viewer ? (
            <>
              <Link
                href={accountPath}
                className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                <span className="grid size-8 place-items-center rounded-full bg-amber-300/15 text-xs font-semibold text-amber-200">
                  {initialsForName(viewer.displayName) || "C"}
                </span>
                <span>{viewer.displayName}</span>
              </Link>
              <form action={signOutAction}>
                <input type="hidden" name="nextPath" value={homePath} />
                <button
                  type="submit"
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href={authPath}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Sign in
            </Link>
          )}
          <Link
            href={analyzePath}
            className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            Launch
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <details className="group relative lg:hidden">
          <summary className="flex list-none items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 [&::-webkit-details-marker]:hidden">
            <Menu className="size-4" />
            Menu
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.9rem)] w-[min(23rem,calc(100vw-2.5rem))] rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-[0_24px_90px_rgba(2,6,23,0.55)] backdrop-blur-xl">
            <div className="rounded-[1.4rem] border border-emerald-300/15 bg-emerald-300/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">Ready to review</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Import a PGN or public game, save the report, then turn the miss into a perfect-move drill.
              </p>
            </div>

            <nav className="mt-4 grid gap-2">
              {primaryNav.map((item) => {
                const href = withLocalePrefix(item.href, activeLocale);
                const active = isActivePath(pathname, href);

                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={`rounded-[1.2rem] px-4 py-3 text-sm font-medium transition ${
                      active ? "bg-white/10 text-white" : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 flex flex-col gap-2">
              {viewer ? (
                <>
                  <Link
                    href={accountPath}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    Account: {viewer.displayName}
                  </Link>
                  <form action={signOutAction}>
                    <input type="hidden" name="nextPath" value={homePath} />
                    <button
                      type="submit"
                      className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href={authPath}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              )}
              <Link
                href={analyzePath}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
              >
                Launch analyze
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
