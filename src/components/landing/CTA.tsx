"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CoolMode } from "@/registry/magicui/cool-mode";
import { MagicCard } from "@/registry/magicui/magic-card";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CTA() {
  return (
    <motion.section
      className="knightowl-cta-section px-5 py-20 md:px-8 md:py-32 lg:px-12 lg:py-40"
      initial={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <MagicCard
        gradientColor="#00d4aa"
        gradientFrom="#00d4aa40"
        gradientTo="#6366f140"
        gradientOpacity={1}
        className="knightowl-cta-card relative mx-auto max-w-[900px] rounded-[32px] px-6 py-16 text-center sm:px-10 lg:px-[60px] lg:py-20"
      >
        <svg className="knightowl-cta-knight" viewBox="0 0 320 320" aria-hidden="true">
          <text x="160" y="236" textAnchor="middle">
            ♞
          </text>
        </svg>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
          <motion.h2
            className="font-display text-[36px] font-extrabold leading-[1.04] tracking-normal text-[var(--text-primary)] md:text-[52px]"
            initial={{ opacity: 0, y: 36 }}
            transition={{ duration: 0.85, ease }}
            viewport={{ once: true, margin: "-120px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Ready to play your best chess?
          </motion.h2>

          <motion.p
            className="mt-6 max-w-[480px] text-[15px] font-normal leading-7 text-[var(--text-secondary)] md:text-[17px] md:leading-8"
            initial={{ opacity: 0, y: 24 }}
            transition={{ delay: 0.12, duration: 0.75, ease }}
            viewport={{ once: true, margin: "-120px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Join thousands of players who use Knightowl to analyze, learn, and improve every day. Always free. Always unlimited.
          </motion.p>

          <motion.div
            className="mt-10 will-change-transform"
            initial={{ opacity: 0, y: 26 }}
            transition={{ delay: 0.22, duration: 0.75, ease }}
            viewport={{ once: true, margin: "-120px" }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <CoolMode>
              <Link href="/analyze" className="knightowl-cta-button" data-cursor-hover>
                Analyze My First Game — It&apos;s Free
                <ArrowRight className="size-5" />
              </Link>
            </CoolMode>
          </motion.div>

          <p className="mt-5 text-[13px] font-normal text-[var(--text-muted)]">♟ No credit card · No account required · Start in 10 seconds</p>
        </div>
      </MagicCard>

      <style>{`
        .knightowl-cta-card {
          background: linear-gradient(135deg, #0d1f1a 0%, #0a0a0f 100%);
          border: 1px solid rgba(0, 212, 170, 0.145);
          box-shadow:
            0 0 100px rgba(0, 212, 170, 0.1),
            inset 0 1px 0 rgba(0, 212, 170, 0.12);
        }

        .knightowl-cta-card::before {
          background:
            radial-gradient(circle at 30% 10%, rgba(0, 212, 170, 0.16), transparent 32%),
            radial-gradient(circle at 76% 78%, rgba(0, 194, 255, 0.1), transparent 28%);
          content: "";
          inset: 0;
          opacity: 0.8;
          pointer-events: none;
          position: absolute;
        }

        .knightowl-cta-knight {
          color: rgba(0, 212, 170, 0.055);
          height: 300px;
          position: absolute;
          right: -56px;
          top: 50%;
          transform: translateY(-50%);
          width: 300px;
          z-index: 0;
          animation: knightowl-cta-rotate 20s linear infinite;
        }

        .knightowl-cta-knight text {
          fill: currentColor;
          font-family: Georgia, serif;
          font-size: 260px;
          font-weight: 700;
        }

        .knightowl-cta-button {
          align-items: center;
          background: var(--accent);
          border-radius: 999px;
          color: var(--bg-primary);
          display: inline-flex;
          font-family: var(--font-display);
          font-size: 1.125rem;
          font-weight: 700;
          gap: 0.75rem;
          justify-content: center;
          min-height: 4rem;
          padding: 1.25rem 3rem;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .knightowl-cta-button:hover {
          background: #00f0c0;
          box-shadow: 0 0 60px rgba(0, 212, 170, 0.32);
        }

        @keyframes knightowl-cta-rotate {
          from {
            transform: translateY(-50%) rotate(0deg);
          }

          to {
            transform: translateY(-50%) rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .knightowl-cta-card {
            border-radius: 24px;
            padding: 40px 24px;
          }

          .knightowl-cta-button {
            font-size: 1rem;
            min-height: 3.5rem;
            padding: 1rem 1.35rem;
            width: 100%;
          }

          .knightowl-cta-knight {
            height: 220px;
            right: -90px;
            width: 220px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .knightowl-cta-knight {
            animation: none;
          }
        }
      `}</style>
    </motion.section>
  );
}
