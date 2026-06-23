import type { Locale, NavLink } from "@/types/platform";

export const siteConfig = {
  name: "Chessfork",
  shortName: "Chessfork",
  description:
    "Analyze PGNs, import public games, and turn every problem move into a perfect-move drill.",
  url: "https://chessfork.app",
  locales: ["en", "es", "fr", "hi", "ru", "ar"] satisfies Locale[],
  defaultLocale: "en" as Locale,
};

export const primaryNav: NavLink[] = [
  { label: "Analyze", href: "/analyze" },
  { label: "Perfects", href: "/puzzles" },
  { label: "Daily", href: "/daily" },
  { label: "Leaderboards", href: "/leaderboards/puzzles" },
  { label: "Coach", href: "/coach" },
  { label: "More", href: "/more" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

export const footerNav: NavLink[] = [
  { label: "Board", href: "/board" },
  { label: "Editor", href: "/editor" },
  { label: "Best Move", href: "/next-move" },
  { label: "Games", href: "/games" },
  { label: "More", href: "/more" },
  { label: "Wrapped", href: "/wrapped/2025" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Terms", href: "/tos" },
];
