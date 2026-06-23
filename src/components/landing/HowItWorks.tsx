"use client";

import { Cpu, Search, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    copy:
      "Paste a Chess.com name, load a Lichess game, or drop in a PGN. Knightowl keeps the start simple so you get to the analysis instead of setup screens.",
    icon: Search,
    number: "01",
    title: "Enter Your Username",
  },
  {
    copy:
      "Stockfish 18 evaluates the whole game, grades the moments that mattered, and surfaces the best continuations without burying you in engine noise.",
    icon: Cpu,
    number: "02",
    title: "Engine Scans Every Move",
  },
  {
    copy:
      "Your final report shows accuracy, critical weaknesses, opening notes, and the exact positions to practice next so tomorrow's games improve.",
    icon: Trophy,
    number: "03",
    title: "Get Your Full Report",
  },
];

export function HowItWorks() {
  return (
    <motion.section
      id="workflow"
      className="relative overflow-hidden bg-[var(--bg-primary)] px-5 py-20 md:px-8 md:py-32 lg:px-12 lg:py-40"
      initial={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="text-center">
          <h2 className="font-display text-[36px] font-extrabold leading-tight tracking-normal text-[var(--text-primary)] md:text-[52px]">
            Three steps to playing better chess
          </h2>
          <p className="mt-4 text-[15px] font-light text-[var(--text-secondary)] md:text-[17px]">No setup. No limits. No excuses.</p>
        </div>

        <div className="relative mt-16 grid gap-5 md:grid-cols-3">
          <div className="pointer-events-none absolute bottom-8 left-8 top-8 border-l-2 border-dashed border-[var(--border)] md:hidden" />
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-[4.6rem] hidden border-t-2 border-dashed border-[var(--border)] md:block" />

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article
                className="relative z-10 min-h-[22rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-8 py-10 transition-all duration-300 will-change-transform hover:-translate-y-1 hover:border-[rgba(0,212,170,0.3)] hover:bg-[#131320]"
                initial={{ y: 60, opacity: 0 }}
                key={step.title}
                transition={{ duration: 0.7, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, margin: "-100px" }}
                whileInView={{ y: 0, opacity: 1 }}
              >
                <span className="pointer-events-none absolute right-6 top-4 font-mono text-[64px] leading-none text-[#00d4aa10]">{step.number}</span>
                <span className="inline-grid size-16 place-items-center rounded-xl bg-[#00d4aa15] text-[var(--accent)]">
                  <Icon className="size-10" />
                </span>
                <h3 className="mt-9 font-display text-[22px] font-bold tracking-normal text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-4 text-[15px] font-normal leading-7 text-[var(--text-secondary)] md:text-[17px]">{step.copy}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
