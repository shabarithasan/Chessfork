"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Flame,
  Home,
  LogOut,
  Medal,
  Menu,
  MoreHorizontal,
  Search,
  Sparkles,
  Target,
  Trophy,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { signOutAction } from "@/app/auth/actions";
import { ChessforkLogo } from "@/components/brand/chessfork-logo";
import { BadgeToast } from "@/components/gamification/badge-toast";
import { StreakRiskBanner } from "@/components/gamification/streak-risk-banner";
import { GuestUpgradePrompts } from "@/components/guest/guest-upgrade-prompts";
import { cn } from "@/lib/utils";
import { readGamificationStats, readUnlockedBadgeIds, type KnightowlStats } from "@/lib/badgeChecker";
import { resolveLocaleFromPathname, withLocalePrefix } from "@/lib/locales";
import { siteConfig } from "@/lib/site";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { useStablePathname } from "@/components/shell/use-stable-pathname";

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const primaryNav: NavItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/analyze", icon: Search, label: "Analyze" },
  { href: "/coach", icon: Sparkles, label: "Coach" },
  { href: "/games", icon: BookOpen, label: "Games" },
  { href: "/profile", icon: Medal, label: "Profile" },
  { href: "/puzzles", icon: Target, label: "Perfects" },
];

const secondaryNav: NavItem[] = [
  { href: "/more", icon: MoreHorizontal, label: "More" },
  { href: "/features", icon: Sparkles, label: "Features" },
  { href: "/daily", icon: Flame, label: "Daily" },
  { href: "/leaderboards/puzzles", icon: Trophy, label: "Leaderboards" },
  { href: "/blog", icon: User, label: "About" },
];

const bottomNav: NavItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/analyze", icon: Search, label: "Analyze" },
  { href: "/coach", icon: Sparkles, label: "Coach" },
  { href: "/games", icon: BookOpen, label: "Games" },
];

const streakDays = ["M", "T", "W", "T", "F", "S", "S"];

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

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SidebarNav({
  activeLocale,
  badgeCount,
  pathname,
}: {
  activeLocale: ReturnType<typeof resolveLocaleFromPathname>;
  badgeCount: number;
  pathname: string | null;
}) {
  return (
    <>
      <nav className="space-y-2">
        {primaryNav.map((item) => {
          const href = withLocalePrefix(item.href, activeLocale);
          const active = isActivePath(pathname, href);
          const Icon = item.icon;

          return (
            <div key={item.href} className="space-y-2">
              <Link
                href={href}
                className={cn(
                  "premium-nav-link flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "premium-nav-link-active border-amber-200/40 text-amber-50"
                    : "premium-nav-link-idle border-transparent text-slate-300 hover:text-white",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {item.label}
                  {item.href === "/profile" ? (
                    <span className="rounded-md border border-amber-200/30 bg-amber-200/10 px-2 py-0.5 text-[11px] font-black text-amber-100">
                      {badgeCount}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className={cn("size-4 transition", active ? "text-amber-200" : "text-slate-600")} />
              </Link>
              {item.href === "/coach" ? (
                <Link
                  href={href}
                  className="premium-side-cta ml-6 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black text-amber-50 transition"
                >
                  Get AI Coaching
                  <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="pt-2">
        <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">More</p>
        <nav className="mt-3 space-y-2">
          {secondaryNav.map((item) => {
            const href = withLocalePrefix(item.href, activeLocale);
            const active = isActivePath(pathname, href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "premium-nav-link flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold transition",
                active
                    ? "premium-nav-link-active border-amber-200/40 text-amber-50"
                    : "premium-nav-link-idle border-transparent text-slate-300 hover:text-white",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <ChevronRight className={cn("size-4 transition", active ? "text-amber-200" : "text-slate-600")} />
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

const defaultShellStats: Pick<KnightowlStats, "currentStreak" | "gamesByDate"> = {
  currentStreak: 0,
  gamesByDate: {},
};

function dateKeyForWeekIndex(index: number) {
  const today = new Date();
  const monday = new Date(today);
  const dayOffset = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dayOffset + index);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SiteShellClient({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: { displayName: string } | null;
}) {
  const pathname = useStablePathname();
  const activeLocale = resolveLocaleFromPathname(pathname);
  const homePath = withLocalePrefix("/", activeLocale);
  const analyzePath = withLocalePrefix("/analyze", activeLocale);
  const accountPath = withLocalePrefix("/account", activeLocale);
  const authPath = withLocalePrefix("/auth", activeLocale);
  const unlocalizedPathname =
    activeLocale && pathname?.startsWith(`/${activeLocale}/`) ? pathname.slice(activeLocale.length + 1) : pathname;
  const showShellGuestPrompts = pathname ? !normalizePath(unlocalizedPathname).startsWith("/analysis/") : false;
  const [badgeCount, setBadgeCount] = useState(0);
  const [gamificationReady, setGamificationReady] = useState(false);
  const [shellStats, setShellStats] = useState(defaultShellStats);

  useEffect(() => {
    function refreshGamification() {
      const stats = readGamificationStats();
      setBadgeCount(readUnlockedBadgeIds().length);
      setShellStats({
        currentStreak: stats.currentStreak,
        gamesByDate: stats.gamesByDate,
      });
      setGamificationReady(true);
    }

    window.queueMicrotask(refreshGamification);
    window.addEventListener("knightowl:stats-updated", refreshGamification);
    window.addEventListener("knightowl:badges-unlocked", refreshGamification);
    window.addEventListener("storage", refreshGamification);

    return () => {
      window.removeEventListener("knightowl:stats-updated", refreshGamification);
      window.removeEventListener("knightowl:badges-unlocked", refreshGamification);
      window.removeEventListener("storage", refreshGamification);
    };
  }, []);

  return (
    <div className="premium-app-shell min-h-screen overflow-x-hidden text-slate-100">
      <OfflineBanner />
      <InstallPrompt />
      <BadgeToast />
      <StreakRiskBanner />
      {showShellGuestPrompts ? <GuestUpgradePrompts isSignedIn={Boolean(viewer)} pathname={pathname} /> : null}
      <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-[1660px] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="premium-sidebar hidden border-r border-white/[0.06] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
          <Link
            href={homePath}
            className="premium-brand-card rounded-xl border px-5 py-5"
          >
            <div className="flex items-center gap-3.5">
              <ChessforkLogo alt="Chessfork logo" className="size-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight text-white">{siteConfig.name}</p>
                <p className="truncate text-xs text-slate-400">Chess analysis workspace</p>
              </div>
            </div>
          </Link>

          <div className="mt-6 flex-1 space-y-4 overflow-y-auto pb-4">
            <SidebarNav activeLocale={activeLocale} badgeCount={badgeCount} pathname={pathname} />
          </div>

          <div className="space-y-3">
            <div className="premium-side-card rounded-xl border p-5">
              <div className="flex items-center gap-2.5 text-amber-100">
                <Flame className="size-4 shrink-0" />
                <span className="text-3xl font-black leading-none text-amber-200">{shellStats.currentStreak}</span>
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Day streak</p>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {streakDays.map((day, index) => (
                  <div key={`${day}-${index}`} className="text-center">
                    <div
                      className={cn(
                        "mx-auto size-3 rounded-full border",
                        gamificationReady && shellStats.gamesByDate[dateKeyForWeekIndex(index)] ? "border-amber-200 bg-amber-200" : "border-white/10 bg-transparent",
                      )}
                    />
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">{day}</p>
                  </div>
                ))}
              </div>
            </div>

            {viewer ? (
              <div className="premium-side-card rounded-lg border p-3">
                <Link
                  href={accountPath}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-100 transition hover:bg-white/[0.06]"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-amber-200/15 text-xs font-semibold text-amber-100">
                    {initialsForName(viewer.displayName) || "C"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{viewer.displayName}</span>
                </Link>
                <form action={signOutAction} className="mt-2">
                  <input type="hidden" name="nextPath" value={homePath} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.09]"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href={authPath}
                className="premium-primary-action flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-slate-950 transition"
              >
                <User className="size-4" />
                Sign in
              </Link>
            )}
          </div>
        </aside>

        <div className="min-w-0 overflow-x-hidden">
          <header className="premium-mobile-header sticky top-0 z-40 border-b border-white/10 px-3 py-4 backdrop-blur-xl sm:px-5 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href={homePath} className="flex min-w-0 items-center gap-3">
                <ChessforkLogo alt="Chessfork logo" className="size-10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{siteConfig.name}</p>
                  <p className="truncate text-xs text-slate-400">Chess analysis workspace</p>
                </div>
              </Link>

              <details className="group relative">
                <summary className="premium-menu-button flex list-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-slate-100 [&::-webkit-details-marker]:hidden">
                  <Menu className="size-4" />
                  Menu
                </summary>
                <div className="premium-mobile-menu absolute right-0 top-[calc(100%+0.9rem)] w-[min(23rem,calc(100vw-2rem))] rounded-lg border p-4">
                  <SidebarNav activeLocale={activeLocale} badgeCount={badgeCount} pathname={pathname} />
                  <div className="mt-4 grid gap-2">
                    {viewer ? (
                      <>
                        <Link
                          href={accountPath}
                          className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100"
                        >
                          <User className="size-4" />
                          {viewer.displayName}
                        </Link>
                        <form action={signOutAction}>
                          <input type="hidden" name="nextPath" value={homePath} />
                          <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100"
                          >
                            <LogOut className="size-4" />
                            Sign out
                          </button>
                        </form>
                      </>
                    ) : (
                      <Link
                        href={authPath}
                        className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100"
                      >
                        <User className="size-4" />
                        Sign in
                      </Link>
                    )}
                    <Link
                      href={analyzePath}
                      className="premium-primary-action inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-slate-950"
                    >
                      Open analyze
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </details>
            </div>
          </header>

          <main className="premium-page-stage min-h-screen min-w-0 overflow-x-hidden px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:px-8 md:pb-8 lg:px-10">{children}</main>
        </div>
      </div>

      <nav className="premium-bottom-nav fixed inset-x-0 bottom-0 z-50 h-[calc(60px+env(safe-area-inset-bottom))] overflow-hidden border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Primary mobile navigation">
        <div className="grid h-[60px] w-full min-w-0 grid-cols-4">
          {bottomNav.map((item) => {
            const href = withLocalePrefix(item.href, activeLocale);
            const active = isActivePath(pathname, href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold transition",
                  active ? "text-amber-200" : "text-slate-400 hover:text-slate-100",
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
