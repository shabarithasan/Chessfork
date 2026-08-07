"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ChevronsLeft,
  CreditCard,
  Download,
  Flame,
  FlaskConical,
  Gauge,
  Gamepad2,
  Globe,
  Home,
  Info,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Newspaper,
  PenSquare,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Swords,
  Target,
  Trophy,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState, type ComponentType } from "react";

import { signOutAction } from "@/app/auth/actions";
import { ChessforkLogo } from "@/components/brand/chessfork-logo";
import { BadgeToast } from "@/components/gamification/badge-toast";
import { StreakRiskBanner } from "@/components/gamification/streak-risk-banner";
import { GuestUpgradePrompts } from "@/components/guest/guest-upgrade-prompts";
import { AIProvider } from "@/contexts/AIProvider";
import WhatsNewDialog from "@/components/changelog/WhatsNewDialog";
import { cn } from "@/lib/utils";
import { readGamificationStats, type KnightowlStats } from "@/lib/badgeChecker";
import { resolveLocaleFromPathname, withLocalePrefix } from "@/lib/locales";
import { siteConfig } from "@/lib/site";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { useStablePathname } from "@/components/shell/use-stable-pathname";

type FlyoutItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  href?: string;
  flyout?: FlyoutItem[];
  badge?: string;
  badgeLabel?: string;
  chevron?: boolean;
  active?: boolean;
};

function CrossedWrenchIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-grid size-[18px] shrink-0 place-items-center", className)}>
      <Wrench className="absolute size-[16px] rotate-45" />
      <Wrench className="absolute size-[16px] -rotate-45" />
    </span>
  );
}

const navGroups: NavGroup[] = [
  { label: "Home", icon: Home, href: "/" },
  {
    label: "Train",
    icon: Zap,
    badgeLabel: "NEW",
    chevron: true,
    flyout: [
      { href: "/analyze", icon: Search, label: "Game Review", description: "Import a game and walk it move by move with the engine." },
      { href: "/board", icon: LayoutGrid, label: "Analysis Board", description: "Free analysis board with engine evaluation." },
      { href: "/editor", icon: PenSquare, label: "Board Editor", description: "Drag-and-drop position editor. Export FEN/PGN." },
      { href: "/next-move", icon: RefreshCw, label: "Next Move", description: "Engine-best continuation from any FEN." },
    ],
  },
  {
    label: "Supercoach",
    icon: Sparkles,
    badge: "new",
    chevron: true,
    flyout: [
      { href: "/coach", icon: Sparkles, label: "AI Coach", description: "Get AI-powered coaching on your games." },
      { href: "/coach/globe", icon: Globe, label: "Chess Globe", description: "Watch live chess games stream around the world." },
    ],
  },
  {
    label: "Play",
    icon: Gamepad2,
    chevron: true,
    flyout: [
      { href: "/play/local", icon: Swords, label: "Player vs Player", description: "Play a shared local game, then review it with Chessfork." },
      { href: "#", icon: Gamepad2, label: "Play vs AI", description: "Challenge the engine.", badge: "Soon", disabled: true },
      { href: "#", icon: User, label: "Online Multiplayer", description: "Play a friend online.", badge: "Soon", disabled: true },
      { href: "#", icon: PenSquare, label: "Custom Position", description: "Start from any position.", badge: "Future", disabled: true },
      { href: "/games", icon: BookOpen, label: "Saved Games", description: "Browse your saved analysis reports." },
    ],
  },
  {
    label: "Tools",
    icon: CrossedWrenchIcon,
    chevron: true,
    flyout: [
      { href: "/games", icon: BookOpen, label: "Games", description: "Browse your imported games and analysis." },
      { href: "/more", icon: MoreHorizontal, label: "More Tools", description: "Extra share tools: roast, challenge, opening boss." },
      { href: "/puzzles", icon: Target, label: "Perfects", description: "Curated puzzles, unlimited. Elo-tracked." },
      { href: "/daily", icon: Flame, label: "Daily", description: "Daily puzzle challenge." },
      { href: "/leaderboards/puzzles", icon: Trophy, label: "Leaderboards", description: "Compete on the global puzzle leaderboard." },
    ],
  },
  {
    label: "About",
    icon: Info,
    chevron: true,
    flyout: [
      { href: "/pricing", icon: CreditCard, label: "Pricing", description: "Plans and membership details." },
      { href: "/blog", icon: Newspaper, label: "Blog", description: "Guides, updates, and product news." },
      { href: "/benchmark", icon: Gauge, label: "Benchmark", description: "Engine speed and accuracy tests." },
      { href: "/contact", icon: Mail, label: "Contact", description: "Get in touch with the team." },
      { href: "/shop", icon: ShoppingBag, label: "Shop", description: "Merch, gear, and goodies." },
      { href: "/about", icon: Info, label: "About", description: "What Chessfork is all about." },
    ],
  },
];

const bottomNav: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/analyze", icon: Search, label: "Analyze" },
  { href: "/coach", icon: Sparkles, label: "Coach" },
  { href: "/play/local", icon: Gamepad2, label: "Play" },
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

  if (matchBase === "/") {
    return currentPath === "/";
  }

  return currentPath === target || currentPath.startsWith(`${matchBase}/`);
}

function NavButton({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
  badge,
  badgeLabel,
  chevron,
}: {
  icon: NavGroup["icon"];
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
  badge?: string;
  badgeLabel?: string;
  chevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        collapsed
          ? "group flex items-center justify-center rounded-[8px] transition-all duration-200 ease-out h-10 w-10 border"
          : "group flex w-full items-center gap-3 rounded-[6px] px-4 text-sm transition-all duration-200 ease-out h-10 border",
        active
          ? "border-[#D4AF37] bg-[rgba(212,175,55,0.15)] font-bold text-[#D4AF37]"
          : "border-transparent font-medium text-white hover:bg-white/[0.06]",
      )}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn(
          collapsed ? "size-[19px]" : "size-[18px]",
          "shrink-0 transition-colors duration-200",
          active ? "text-[#D4AF37]" : "text-white",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badgeLabel && (
            <span className="rounded-full bg-[#F5C542] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
              {badgeLabel}
            </span>
          )}
          {badge && (
            <span className="size-2 rounded-full bg-[#F5C542] shadow-[0_0_6px_rgba(245,197,66,0.6)] knightowl-dot-pulse" />
          )}
          {chevron && (
            <ChevronRight className={cn("size-3.5", active ? "text-[#D4AF37]" : "text-neutral-500 group-hover:text-[#ffd04a]")} />
          )}
        </>
      )}
    </button>
  );
}

function FlyoutItemRow({
  href,
  icon: Icon,
  label,
  description,
  badge,
  disabled,
  activeLocale,
  pathname,
}: FlyoutItem & {
  activeLocale: ReturnType<typeof resolveLocaleFromPathname>;
  pathname: string | null;
}) {
  const targetHref = withLocalePrefix(href, activeLocale);
  const isActive = isActivePath(pathname, targetHref);

  if (disabled) {
    return (
      <div className="group/row flex items-center gap-3 rounded-[10px] px-3 py-2.5 opacity-55 cursor-not-allowed select-none">
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-dashed border-neutral-600/70 bg-neutral-600/30 text-neutral-500">
          <Icon className="size-[18px]" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-neutral-400 leading-snug mb-0.5">
            {label}
            {badge && (
              <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-300 border border-neutral-600">
                {badge}
              </span>
            )}
          </span>
          {description && <span className="block text-[13px] text-neutral-500 leading-[1.4]">{description}</span>}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={targetHref}
      className={cn(
        "group/row flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-200",
        isActive ? "bg-[#222222]" : "hover:bg-[#1f1f1f]",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[10px] border transition-colors duration-200",
          isActive
            ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
            : "border-neutral-600/70 bg-neutral-700/40 text-neutral-300 group-hover/row:border-amber-400/40 group-hover/row:bg-amber-400/10 group-hover/row:text-amber-400",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-white leading-snug mb-0.5">
          {label}
          {badge && (
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-900">
              {badge}
            </span>
          )}
        </span>
        {description && <span className="block text-[13px] text-neutral-500 leading-[1.4]">{description}</span>}
      </span>
    </Link>
  );
}

function FlyoutPanel({
  group,
  activeLocale,
  pathname,
}: {
  group: NavGroup;
  activeLocale: ReturnType<typeof resolveLocaleFromPathname>;
  pathname: string | null;
}) {
  const Icon = group.icon;

  return (
    <>
      <span aria-hidden="true" className="absolute left-full top-0 z-50 h-full w-3" />
      <div className="absolute left-full top-0 z-50 ml-3 w-[320px] invisible opacity-0 pointer-events-none translate-x-[-8px] transition-all duration-200 ease-out group-hover/flyout:visible group-hover/flyout:opacity-100 group-hover/flyout:pointer-events-auto group-hover/flyout:translate-x-0">
        <div className="bg-[#2c2c2c] border border-neutral-600 rounded-[14px] shadow-2xl p-3.5 relative">
          <span className="absolute -left-[7px] top-[16px] size-3.5 bg-[#2c2c2c] border-l border-b border-neutral-600 rotate-45" />
          <span className="absolute inset-0 rounded-[14px] pointer-events-none bg-[radial-gradient(360px_200px_at_0%_0%,rgba(251,191,36,0.05),transparent_60%)]" />
          <div className="flex items-center gap-2 pb-3 mb-2.5 border-b border-neutral-600/70">
            <Icon className="size-3.5 text-amber-400" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.28em] text-white/55">{group.label}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {group.flyout?.map((item) => (
              <FlyoutItemRow key={`${item.href}:${item.label}`} {...item} activeLocale={activeLocale} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function FlyoutMenu({
  group,
  activeLocale,
  pathname,
}: {
  group: NavGroup;
  activeLocale: ReturnType<typeof resolveLocaleFromPathname>;
  pathname: string | null;
}) {
  const Icon = group.icon;
  const active = group.flyout?.some((item) =>
    isActivePath(pathname, withLocalePrefix(item.href, activeLocale)),
  );

  return (
    <div className="relative group/flyout">
      <NavButton icon={Icon} label={group.label} chevron badge={group.badge} active={active} />
      <FlyoutPanel group={group} activeLocale={activeLocale} pathname={pathname} />
    </div>
  );
}

function SidebarNav({
  activeLocale,
  pathname,
  collapsed,
}: {
  activeLocale: ReturnType<typeof resolveLocaleFromPathname>;
  pathname: string | null;
  collapsed: boolean;
}) {
  return (
    <nav className={cn("flex flex-col", collapsed ? "gap-[4px] items-center" : "gap-2")}>
      {navGroups.map((group, idx) => {
        const groupHref = group.href;
        const prevIsLink = idx > 0 && typeof navGroups[idx - 1].href === "string";
        const curIsLink = typeof groupHref === "string";
        const needsDivider = collapsed && idx > 0 && prevIsLink !== curIsLink;
        const divider = needsDivider ? (
          <div className="h-px w-8 bg-white/[0.08] my-[6px]" />
        ) : null;

        if (groupHref) {
          const href = withLocalePrefix(groupHref, activeLocale);
          const active = isActivePath(pathname, href);
          if (collapsed) {
            return (
              <Fragment key={groupHref}>
                {divider}
                <Link href={href} className={cn(
                  "group flex items-center justify-center rounded-[8px] text-sm transition-all duration-200 ease-out h-10 w-10 border",
                  active
                    ? "text-[#D4AF37] border-[#D4AF37] bg-[rgba(212,175,55,0.15)] font-bold"
                    : "text-white border-transparent font-medium hover:bg-white/[0.06]",
                )} title={group.label}>
                  <group.icon className={cn(
                    "size-[19px] shrink-0 transition-colors duration-200",
                    active ? "text-[#D4AF37]" : "text-white",
                  )} />
                </Link>
              </Fragment>
            );
          }
          return (
            <Link key={groupHref} href={href} className={cn(
              "group flex items-center gap-3 rounded-[6px] px-4 text-sm transition-all duration-200 ease-out h-10 border",
              active
                ? "border-[#D4AF37] bg-[rgba(212,175,55,0.15)] font-bold text-[#D4AF37]"
                : "border-transparent font-medium text-white hover:bg-white/[0.06]",
            )}>
              <group.icon className={cn(
                "size-[18px] shrink-0 transition-colors duration-200",
                active ? "text-[#D4AF37]" : "text-white",
              )} />
              <span className="flex-1 truncate">{group.label}</span>
              {group.chevron && (
                <ChevronRight className={cn("size-3.5", active ? "text-[#D4AF37]" : "text-neutral-500 group-hover:text-[#ffd04a]")} />
              )}
            </Link>
          );
        }
        if (collapsed) {
          return (
            <Fragment key={group.label}>
              {divider}
              <div className="relative group/flyout">
                <NavButton icon={group.icon} label={group.label} collapsed />
                <FlyoutPanel group={group} activeLocale={activeLocale} pathname={pathname} />
              </div>
            </Fragment>
          );
        }
        return <FlyoutMenu key={group.label} group={group} activeLocale={activeLocale} pathname={pathname} />;
      })}
    </nav>
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

/**
 * The premium desktop navigation sidebar. Shared by the main site shell and
 * the /analysis/[id] workspace so navigation stays identical everywhere.
 */
export function PremiumSidebar({
  pathname,
  onShowWhatsNew,
  collapsed,
  onToggleCollapsed,
}: {
  pathname: string | null;
  onShowWhatsNew: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const activeLocale = resolveLocaleFromPathname(pathname);
  const homePath = withLocalePrefix("/", activeLocale);
  const authPath = withLocalePrefix("/auth", activeLocale);
  const shopPath = withLocalePrefix("/shop", activeLocale);
  const downloadPath = withLocalePrefix("/download", activeLocale);
  const [gamificationReady, setGamificationReady] = useState(false);
  const [shellStats, setShellStats] = useState(defaultShellStats);

  useEffect(() => {
    function refreshGamification() {
      const stats = readGamificationStats();
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
    <aside
      data-nav-sidebar="true"
      aria-label="Primary navigation"
      className={cn(
        "premium-sidebar hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:flex lg:h-screen lg:flex-col",
        collapsed ? "lg:w-[60px] lg:px-0" : "lg:w-[256px] lg:px-[18px]",
      )}
      style={{
        background: "#1A1A1A",
        borderRight: "1px solid #3c3c37",
        paddingTop: "16px",
        paddingBottom: "10px",
        overflow: "visible",
      }}
    >
      <style>{`
        @keyframes knightowl-dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .knightowl-dot-pulse { animation: knightowl-dot-pulse 2.4s ease-in-out infinite; }
      `}</style>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage: "linear-gradient(180deg, black 0%, black 60%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(180deg, black 0%, black 60%, transparent 95%)",
          opacity: 0.85,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-44 bg-[radial-gradient(420px_180px_at_50%_0%,rgba(245,197,66,0.07),transparent_70%)]"
      />

      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b border-white/[0.06] px-2 pb-2.5 mb-3",
            collapsed && "flex-col gap-3 border-b-0 pb-2 mb-2",
          )}
        >
          <Link
            href={homePath}
            aria-label={siteConfig.name}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <ChessforkLogo alt="" imageClassName="p-0.5" className={cn("shrink-0", collapsed ? "size-[26px]" : "size-[28px]")} />
            {!collapsed && (
              <strong className="truncate text-sm font-bold text-white">{siteConfig.name}</strong>
            )}
          </Link>
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="grid size-7 shrink-0 place-items-center rounded-[8px] text-neutral-500 transition-colors duration-200 hover:bg-white/[0.06] hover:text-neutral-300"
              title="Expand navigation"
              aria-label="Expand navigation"
            >
              <ChevronRight className="size-[16px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="grid size-7 shrink-0 place-items-center rounded-[8px] text-neutral-500 transition-colors duration-200 hover:bg-white/[0.06] hover:text-neutral-300"
              title="Collapse navigation"
              aria-label="Collapse navigation"
            >
              <ChevronsLeft className="size-4" />
            </button>
          )}
        </div>

        <div className="flex-1 no-scrollbar overflow-visible">
          <SidebarNav
            activeLocale={activeLocale}
            pathname={pathname}
            collapsed={collapsed}
          />
        </div>

        {!collapsed && (
          <>
            <div className="h-px bg-white/[0.06] my-2" />

            <div className="flex flex-col gap-2">
              <button
                onClick={onShowWhatsNew}
                className="group flex w-full items-center gap-3 rounded-[6px] px-4 py-2 text-left text-[13px] font-medium text-neutral-400 transition-all duration-200 ease-out hover:bg-white/[0.05] hover:text-white"
              >
                <span className="grid size-[18px] shrink-0 place-items-center text-neutral-500 transition-colors duration-200 group-hover:text-neutral-300">
                  <FlaskConical className="size-[15px]" />
                </span>
                <span className="flex-1">What&apos;s new</span>
                <span className="size-2 rounded-full bg-[#F5C542] shadow-[0_0_6px_rgba(245,197,66,0.6)] knightowl-dot-pulse" />
              </button>
              <Link
                href={shopPath}
                className="group flex w-full items-center gap-3 rounded-[6px] px-4 py-2 text-[13px] font-medium text-neutral-400 transition-all duration-200 ease-out hover:bg-white/[0.05] hover:text-white"
              >
                <span className="grid size-[18px] shrink-0 place-items-center text-neutral-500 transition-colors duration-200 group-hover:text-neutral-300">
                  <ShoppingBag className="size-[15px]" />
                </span>
                <span className="flex-1">Shop</span>
              </Link>
              <Link
                href={downloadPath}
                className="group flex w-full items-center gap-3 rounded-[6px] px-4 py-2 text-[13px] font-medium text-neutral-400 transition-all duration-200 ease-out hover:bg-white/[0.05] hover:text-white"
              >
                <span className="grid size-[18px] shrink-0 place-items-center text-neutral-500 transition-colors duration-200 group-hover:text-neutral-300">
                  <Download className="size-[15px]" />
                </span>
                <span className="flex-1">Download</span>
              </Link>
            </div>

            <div className="h-px bg-white/[0.06] my-2" />
          </>
        )}

        {!collapsed && (
          <div className="mt-auto space-y-2">

            <div className="relative overflow-hidden rounded-[14px] bg-black/25 border border-white/[0.07] p-2.5">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(150px_90px_at_85%_-20%,rgba(245,197,66,0.14),transparent_70%)]"
              />
              <div className="relative">
                <div className="flex items-end justify-between gap-2 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Flame className="size-[16px] text-amber-400 drop-shadow-[0_0_6px_rgba(245,197,66,0.45)]" />
                    <span className="text-xl font-bold text-amber-400 leading-none">{shellStats.currentStreak}</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Day streak</span>
                </div>
                <div className="grid grid-cols-7 gap-0">
                  {streakDays.map((day, index) => (
                    <div key={`${day}-${index}`} className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "size-[9px] rounded-full",
                          gamificationReady && shellStats.gamesByDate[dateKeyForWeekIndex(index)]
                            ? "bg-amber-400 shadow-[0_0_6px_rgba(245,197,66,0.4)]"
                            : "border border-neutral-600 bg-transparent",
                        )}
                      />
                      <span className="text-[8px] font-bold text-neutral-400 tracking-wide">{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href={authPath}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-b from-[#FFB800] to-[#F59E0B] text-sm font-bold text-black shadow-md transition-all duration-150 hover:brightness-110"
            >
              <User className="shrink-0 size-[16px]" />
              <span>Sign in</span>
            </Link>

          </div>
        )}
      </div>
    </aside>
  );
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
  const isAnalysisWorkspace = pathname ? normalizePath(unlocalizedPathname).startsWith("/analysis/") : false;
  const showShellGuestPrompts = pathname ? !normalizePath(unlocalizedPathname).startsWith("/analysis/") : false;
  const [collapsed, setCollapsed] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const openWhatsNew = useCallback(() => {
    setShowWhatsNew(true);
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  if (isAnalysisWorkspace) {
    return (
      <AIProvider>
        <div className="min-h-screen bg-[#171613] text-slate-100">
          <OfflineBanner />
          <InstallPrompt />
          <BadgeToast />
          <StreakRiskBanner />
          {children}
        </div>
      </AIProvider>
    );
  }

  return (
    <AIProvider>
    <div className="editorial-root premium-app-shell min-h-screen overflow-x-hidden text-slate-100">
      <OfflineBanner />
      <InstallPrompt />
      <BadgeToast />
      <StreakRiskBanner />
      {showShellGuestPrompts ? <GuestUpgradePrompts isSignedIn={Boolean(viewer)} pathname={pathname} /> : null}
      <div className="relative z-10 w-full min-w-0">        <PremiumSidebar
          pathname={pathname}
          onShowWhatsNew={openWhatsNew}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />

        <div className={cn("min-w-0 overflow-x-hidden transition-all duration-150", collapsed ? "lg:ml-[60px]" : "lg:ml-[256px]")}>
          <header className="ed-mobile-header sticky top-0 z-40 px-3 py-3.5 sm:px-5 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href={homePath} className="flex min-w-0 items-center gap-3">
                <span className="ed-brand-mark" style={{ width: 36, height: 36 }}>
                  <ChessforkLogo alt="" className="size-5 shrink-0" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{siteConfig.name}</p>
                  <p className="truncate text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-500">Chess analysis</p>
                </div>
              </Link>

              <details className="group relative">
                <summary className="ed-mobile-menu-trigger flex list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <Menu className="size-4" />
                  Menu
                </summary>
                <div className="ed-mobile-panel absolute right-0 top-[calc(100%+0.5rem)] w-[min(23rem,calc(100vw-2rem))]">
                  <SidebarNav activeLocale={activeLocale} pathname={pathname} collapsed={false} />
                  <div className="mt-4 space-y-2 border-t-2 border-white/10 pt-4">
                {viewer ? (
                      <>
                        <Link
                          href={accountPath}
                          className="ed-nav"
                        >
                          <User className="ed-nav-icon shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{viewer.displayName}</span>
                        </Link>
                        <form action={signOutAction}>
                          <input type="hidden" name="nextPath" value={homePath} />
                          <button
                            type="submit"
                            className="ed-nav w-full text-left"
                          >
                            <LogOut className="ed-nav-icon shrink-0" />
                            Sign out
                          </button>
                        </form>
                      </>
                    ) : (
                      <Link
                        href={authPath}
                        className="ed-nav"
                      >
                        <User className="ed-nav-icon shrink-0" />
                        <span className="flex-1">Sign in</span>
                      </Link>
                    )}
                    <Link href={analyzePath} className="ed-btn ed-btn-primary w-full">
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

      <nav className="premium-bottom-nav fixed inset-x-0 bottom-0 z-50 h-[calc(56px+env(safe-area-inset-bottom))] overflow-hidden border-t border-neutral-800 px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Primary mobile navigation">
        <div className="grid h-[56px] w-full min-w-0 grid-cols-4">
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
                  "flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition active:scale-[0.95]",
                  active ? "text-amber-400" : "text-neutral-500 hover:text-neutral-200",
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

    {showWhatsNew && <WhatsNewDialog onClose={() => setShowWhatsNew(false)} />}
    </AIProvider>
  );
}
