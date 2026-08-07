"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler";
import { CoolMode } from "@/registry/magicui/cool-mode";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "How it works" },
  { href: "#proof", label: "Pricing" },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 80);
  });

  return (
    <>
      <motion.header
        animate={{ opacity: 1, y: 0 }}
        className={`knightowl-navbar ${isScrolled ? "knightowl-navbar-scrolled" : ""}`}
        initial={{ opacity: 0, y: -24 }}
        transition={{ delay: 0.2, duration: 0.35, ease }}
      >
        <nav className="mx-auto flex h-20 w-full max-w-[1500px] items-center justify-between px-5 md:px-8 lg:px-12" aria-label="Landing navigation">
          <Link href="/" className="knightowl-brand flex items-center gap-3" data-cursor-hover onClick={() => setMenuOpen(false)}>
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] font-display text-xl font-extrabold text-[var(--bg-primary)]">
              K
            </span>
            <span className="font-display text-xl font-bold tracking-normal text-[var(--text-primary)]">Knightowl</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="knightowl-nav-link" data-cursor-hover>
                {item.label}
              </Link>
            ))}
            <AnimatedThemeToggler data-cursor-hover />
            <CoolMode>
              <Link href="/analyze" className="knightowl-nav-cta" data-cursor-hover>
                Analyze Free →
              </Link>
            </CoolMode>
          </div>

          <button
            className="knightowl-menu-button grid size-11 place-items-center rounded-full border border-[var(--border)] text-[var(--text-primary)] md:hidden"
            type="button"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            data-cursor-hover
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm md:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.aside
              animate={{ x: 0 }}
              className="knightowl-mobile-menu absolute right-0 top-0 flex h-full w-[min(86vw,360px)] flex-col border-l border-[var(--border)] bg-[var(--bg-primary)] p-6"
              exit={{ x: "100%" }}
              initial={{ x: "100%" }}
              transition={{ duration: 0.45, ease }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3" data-cursor-hover onClick={() => setMenuOpen(false)}>
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] font-display text-xl font-extrabold text-[var(--bg-primary)]">
                    K
                  </span>
                  <span className="font-display text-xl font-bold text-[var(--text-primary)]">Knightowl</span>
                </Link>
                <div className="flex items-center gap-3">
                  <AnimatedThemeToggler data-cursor-hover />
                  <button
                    aria-label="Close menu"
                    className="grid size-11 place-items-center rounded-full border border-[var(--border)] text-[var(--text-primary)]"
                    type="button"
                    data-cursor-hover
                    onClick={() => setMenuOpen(false)}
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="mt-12 flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="knightowl-mobile-link" data-cursor-hover onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-auto">
                <CoolMode>
                  <Link href="/analyze" className="knightowl-mobile-cta" data-cursor-hover onClick={() => setMenuOpen(false)}>
                    Analyze Free →
                  </Link>
                </CoolMode>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <style>{`
        .knightowl-navbar {
          background: transparent;
          border-bottom: 1px solid transparent;
          left: 0;
          position: fixed;
          right: 0;
          top: 0;
          transition:
            background 0.3s ease,
            border-color 0.3s ease,
            backdrop-filter 0.3s ease;
          will-change: transform;
          z-index: 60;
        }

        .knightowl-navbar-scrolled {
          background: rgba(5, 5, 8, 0.85);
          backdrop-filter: blur(20px);
          border-bottom-color: var(--border);
        }

        .knightowl-nav-link {
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .knightowl-nav-link:hover {
          color: var(--text-primary);
        }

        .knightowl-nav-cta,
        .knightowl-mobile-cta {
          align-items: center;
          border: 1px solid rgba(0, 212, 170, 0.32);
          border-radius: 999px;
          color: var(--accent);
          display: inline-flex;
          font-size: 0.92rem;
          font-weight: 700;
          justify-content: center;
          min-height: 2.75rem;
          padding: 0 1.15rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }

        .knightowl-nav-cta:hover,
        .knightowl-mobile-cta:hover {
          background: rgba(0, 212, 170, 0.1);
          box-shadow: 0 0 34px rgba(0, 212, 170, 0.14);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .knightowl-menu-button {
          background: rgba(255, 255, 255, 0.035);
          transition: all 0.25s ease;
        }

        .knightowl-menu-button:hover {
          border-color: rgba(0, 212, 170, 0.32);
          color: var(--accent);
        }

        .knightowl-mobile-menu {
          box-shadow: -40px 0 120px rgba(0, 0, 0, 0.55);
          will-change: transform;
        }

        .knightowl-mobile-link {
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          line-height: 1;
          padding: 0 0 1.25rem;
          transition: color 0.2s ease;
        }

        .knightowl-mobile-link:hover {
          color: var(--accent);
        }
      `}</style>
    </>
  );
}
