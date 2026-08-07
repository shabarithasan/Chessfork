"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChessforkLogo } from "@/components/brand/chessfork-logo";
import { useStablePathname } from "@/components/shell/use-stable-pathname";
import { localeNames, resolveLocaleFromPathname, withLocalePrefix } from "@/lib/locales";
import { footerNav, siteConfig } from "@/lib/site";

const platformLinks = [
  { label: "Analyze", href: "/analyze" },
  { label: "Perfects", href: "/puzzles" },
  { label: "Coach", href: "/coach" },
  { label: "Shop", href: "/shop" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

export function SiteFooter() {
  const pathname = useStablePathname();
  const activeLocale = resolveLocaleFromPathname(pathname);
  const locale = activeLocale ?? siteConfig.defaultLocale;
  const analyzePath = withLocalePrefix("/analyze", activeLocale);

  return (
    <footer className="premium-footer border-t border-white/10">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
        <div className="premium-footer-panel grid gap-10 rounded-lg border p-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] lg:p-8">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-3">
                <ChessforkLogo alt="Chessfork logo" className="size-11" />
                <p className="text-lg font-semibold text-white">{siteConfig.name}</p>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">{siteConfig.description}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
              <span className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">Saved reports</span>
              <span className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">Problem to Perfect</span>
              <span className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">Coach plans</span>
            </div>
            <div className="rounded-lg border border-amber-200/20 bg-amber-200/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">Start with one game</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Paste a PGN, review the turning points, and turn one miss into a perfect-move card.
              </p>
              <Link
                href={analyzePath}
                className="mt-4 inline-flex items-center gap-2 text-sm font-black text-amber-100 transition hover:text-white"
              >
                Open analyze
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-slate-100">Platform</p>
            <ul className="space-y-3 text-sm text-slate-400">
              {platformLinks.map((item) => (
                <li key={item.href}>
                  <Link className="transition hover:text-emerald-200" href={withLocalePrefix(item.href, activeLocale)}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-slate-100">More routes</p>
            <ul className="space-y-3 text-sm text-slate-400">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link className="transition hover:text-emerald-200" href={withLocalePrefix(item.href, activeLocale)}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-slate-100">Session</p>
            <div className="space-y-3 text-sm text-slate-400">
              <p>Locale: {localeNames[locale]}</p>
              <p>Mode: quick review, deep queue, repeatable Perfects.</p>
              <p>Surface: reports first, coach second, clutter never.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500">
          <p>
            2026 {siteConfig.name}. Built for players who want evidence, not just evaluation bars.
          </p>
          <p>Public imports from PGN, Chess.com, and Lichess.</p>
        </div>
      </div>
    </footer>
  );
}
