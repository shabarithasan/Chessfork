"use client";

import { motion } from "framer-motion";
import { GitFork, MessageCircle, Send, type LucideIcon } from "lucide-react";
import Link from "next/link";

type FooterColumn = {
  heading: string;
  links: Array<{ href: string; label: string }>;
};

type SocialLink = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const columns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { href: "/analyze", label: "Analyze" },
      { href: "/coach", label: "AI Coach" },
      { href: "/games", label: "Games" },
      { href: "/profile", label: "Profile" },
      { href: "/opening", label: "Openings" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { href: "/games/chesscom", label: "Chess.com" },
      { href: "/games/lichess", label: "Lichess" },
      { href: "/analyze", label: "PGN Import" },
      { href: "#features", label: "Stockfish 18" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/tos", label: "Terms of Service" },
    ],
  },
];

const socials: SocialLink[] = [
  { href: "https://x.com", icon: Send, label: "Twitter/X" },
  { href: "https://github.com", icon: GitFork, label: "GitHub" },
  { href: "https://discord.com", icon: MessageCircle, label: "Discord" },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Footer() {
  return (
    <motion.footer
      className="knightowl-footer border-t border-[var(--border)] px-5 py-20 md:px-8 lg:px-12"
      initial={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" data-cursor-hover>
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)] font-display text-xl font-extrabold text-[var(--bg-primary)]">
                K
              </span>
              <span className="font-display text-2xl font-bold tracking-normal text-[var(--text-primary)]">Knightowl</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm font-light leading-7 text-[var(--text-secondary)]">The sharpest chess analyzer on the internet.</p>

            <div className="mt-7 flex items-center gap-3">
              {socials.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    aria-label={social.label}
                    className="knightowl-social-link grid size-10 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)]"
                    data-cursor-hover
                    href={social.href}
                    key={social.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Icon className="size-[18px]" />
                  </a>
                );
              })}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">{column.heading}</h2>
              <nav className="mt-5 flex flex-col gap-3" aria-label={`${column.heading} links`}>
                {column.links.map((link) => (
                  <Link key={link.href} href={link.href} className="knightowl-footer-link" data-cursor-hover>
                    {link.label}
                  </Link>
                ))}
              </nav>

              {column.heading === "Legal" ? <p className="mt-7 text-sm leading-7 text-[var(--text-muted)]">Built with ♟ and Stockfish 18</p> : null}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-[var(--border)] pt-7 text-[13px] font-normal text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
          <p>© 2026 Knightowl. All rights reserved.</p>
          <p>Made with ♥ for chess players everywhere</p>
        </div>
      </div>

      <style>{`
        .knightowl-footer-link {
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 400;
          transition: color 0.2s ease;
        }

        .knightowl-footer-link:hover {
          color: var(--text-primary);
        }

        .knightowl-social-link {
          transition:
            border-color 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .knightowl-social-link:hover {
          border-color: rgba(0, 212, 170, 0.3);
          color: var(--accent);
          transform: translateY(-2px);
        }
      `}</style>
    </motion.footer>
  );
}
