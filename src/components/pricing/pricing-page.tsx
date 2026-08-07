"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const pricingTiers = [
  {
    name: "Free",
    tagline: "Get started",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for casual players who want to review their games.",
    cta: "Start analyzing",
    ctaHref: "/analyze",
    popular: false,
    premium: false,
    features: [
      "Quick game analysis",
      "Public daily challenge",
      "Starter puzzle queue",
      "Basic opening explorer",
      "Community leaderboards",
    ],
  },
  {
    name: "Pro",
    tagline: "Most popular",
    monthlyPrice: 14,
    annualPrice: 9,
    description: "For serious players building a training system around their games.",
    cta: "Choose Pro",
    ctaHref: "/auth",
    popular: true,
    premium: false,
    features: [
      "Everything in Free",
      "Saved report library",
      "Deep analysis queue (depth 30+)",
      "Unlimited report-linked drills",
      "Weekly performance digest",
      "Opening repertoire builder",
      "Ad-free experience",
    ],
  },
  {
    name: "Coach",
    tagline: "Premium",
    monthlyPrice: 39,
    annualPrice: 29,
    description: "Full AI coaching suite with shareable reports and collaboration tools.",
    cta: "Unlock Coach",
    ctaHref: "/auth",
    popular: false,
    premium: true,
    features: [
      "Everything in Pro",
      "AI coach snapshots per game",
      "Shareable training reports",
      "Coach collaboration workflows",
      "Priority analysis queue",
      "Custom training plans",
      "Advanced endgame drills",
      "Private study groups",
    ],
  },
];

const pricingProofNotes = [
  {
    title: "No ads on analysis",
    copy: "Your study screens stay clean — no banner ads, no pop-ups, no distractions.",
    icon: (
      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Free stays useful",
    copy: "The free tier is genuinely capable. Upgrade only when you want more depth.",
    icon: (
      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Cancel anytime",
    copy: "No contracts, no lock-in. Your reports stay even if you downgrade.",
    icon: (
      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. You can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "What happens to my reports if I downgrade?",
    a: "Your saved reports remain accessible even if you downgrade to the free tier. You just won't be able to generate new deep-analysis reports.",
  },
  {
    q: "Do you offer team or club pricing?",
    a: "Not yet, but club and team pricing is on our roadmap. Reach out to us if you're interested — we'd love to chat.",
  },
  {
    q: "Is there a student discount?",
    a: "Yes! Students with a valid .edu email get 50% off Pro and Coach plans. Contact us with your student email to get set up.",
  },
];

export function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="relative mx-auto w-full overflow-hidden px-5 py-20 sm:px-8 lg:py-28">
      {/* ── Animated background orbs ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-amber-500/[0.07] blur-[120px]" />
        <div className="absolute -bottom-60 -right-40 h-[600px] w-[600px] rounded-full bg-amber-600/[0.05] blur-[140px]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-fuchsia-500/[0.04] blur-[100px]" />
      </div>

      {/* ── Header ── */}
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Pricing
        </p>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Elevate your chess game
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
          A genuinely useful free tier, paid depth where your reports start compounding, and zero ad clutter on the screens you study on.
        </p>

        {/* ── Monthly / Annual toggle ── */}
        <div className="mt-10 inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 backdrop-blur-sm">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300",
              !annual
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "text-neutral-400 hover:text-white"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300",
              annual
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "text-neutral-400 hover:text-white"
            )}
          >
            Annual
            <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Save 30%
            </span>
          </button>
        </div>
      </div>

      {/* ── Pricing cards ── */}
      <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-3">
        {pricingTiers.map((tier) => {
          const price = annual ? tier.annualPrice : tier.monthlyPrice;
          const isPopular = tier.popular;
          const isPremium = tier.premium;

          return (
            <div
              key={tier.name}
              className={cn(
                "group relative flex flex-col rounded-[2rem] border p-8 transition-all duration-500 hover:scale-[1.02]",
                isPopular
                  ? "border-amber-400/40 bg-gradient-to-b from-amber-400/[0.12] via-slate-900/90 to-slate-950/95 shadow-[0_0_80px_rgba(245,158,11,0.15)] backdrop-blur-xl"
                  : isPremium
                    ? "border-fuchsia-400/20 bg-gradient-to-b from-fuchsia-400/[0.06] via-slate-900/80 to-slate-950/90 backdrop-blur-xl"
                    : "border-white/10 bg-white/[0.04] backdrop-blur-xl",
              )}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-max">
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-950 shadow-lg shadow-amber-500/30">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Premium badge */}
              {isPremium && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-max">
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-500 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-fuchsia-500/30">
                    Premium
                  </div>
                </div>
              )}

              {/* Tier name */}
              <div className="mt-2">
                <p className={cn(
                  "text-sm font-semibold uppercase tracking-[0.2em]",
                  isPopular ? "text-amber-300" : isPremium ? "text-fuchsia-300" : "text-neutral-500"
                )}>
                  {tier.name}
                </p>
                <p className="mt-1 text-sm text-neutral-400">{tier.tagline}</p>
              </div>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-1">
                <span className={cn(
                  "text-5xl font-bold tracking-tight",
                  isPopular ? "text-amber-300" : isPremium ? "text-fuchsia-300" : "text-white"
                )}>
                  ${price}
                </span>
                {price > 0 && (
                  <span className="text-sm text-neutral-500">
                    / {annual ? "mo" : "month"}
                  </span>
                )}
                {price === 0 && (
                  <span className="ml-2 text-sm text-neutral-500">forever</span>
                )}
              </div>
              {annual && price > 0 && (
                <p className="mt-1 text-xs text-neutral-500">
                  Billed ${price * 12}/year
                </p>
              )}

              {/* Description */}
              <p className="mt-4 min-h-[3rem] text-sm leading-6 text-neutral-400">
                {tier.description}
              </p>

              {/* CTA */}
              <Link
                href={tier.ctaHref}
                className={cn(
                  "mt-6 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-300",
                  isPopular
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-400/25 hover:shadow-amber-400/40 hover:brightness-110 active:scale-[0.98]"
                    : isPremium
                      ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/35 hover:brightness-110 active:scale-[0.98]"
                      : "border border-white/15 bg-white/5 text-neutral-100 hover:bg-white/10 hover:border-white/25 active:scale-[0.98]",
                )}
              >
                {tier.cta}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Divider */}
              <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Features */}
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                What&apos;s included
              </p>
              <ul className="flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-neutral-300">
                    <svg
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isPopular ? "text-amber-400" : isPremium ? "text-fuchsia-400" : "text-emerald-400"
                      )}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Bottom proof notes ── */}
      <div className="mx-auto mt-20 max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-3">
          {pricingProofNotes.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <p className="text-sm font-semibold text-white">{item.title}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-400">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ section ── */}
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
          Frequently asked questions
        </h2>
        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all hover:border-white/15"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
                {faq.q}
                <svg
                  className="h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-300 group-open:rotate-45"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </summary>
              <div className="px-6 pb-5 text-sm leading-7 text-neutral-400">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
