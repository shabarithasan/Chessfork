"use client";

import { motion } from "framer-motion";

type Stat = {
  compact?: boolean;
  label: string;
  value: string;
};

const stats: Stat[] = [
  {
    label: "Games Analyzed",
    value: "2.4M+",
  },
  {
    compact: true,
    label: "The Latest Engine",
    value: "Stockfish 18",
  },
  {
    label: "Average Analysis Time",
    value: "< 5s",
  },
  {
    label: "Free. Forever.",
    value: "100%",
  },
];

export function Stats() {
  return (
    <motion.section
      id="proof"
      className="border-y border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-20 md:px-8 md:py-32 lg:px-12 lg:py-40"
      initial={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4 lg:rounded-none lg:border-0 lg:bg-transparent">
          {stats.map((stat, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex min-h-40 min-w-0 flex-col items-center justify-center bg-[var(--bg-secondary)] px-3 text-center lg:border-l lg:border-[var(--border)] lg:bg-transparent lg:px-5 first:lg:border-l-0"
              initial={{ opacity: 0, y: 24 }}
              key={stat.label}
              transition={{ delay: index * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <p
                className={
                  stat.compact
                    ? "whitespace-nowrap font-display text-[clamp(2rem,2.4vw,2.25rem)] font-extrabold leading-[1.05] tracking-normal text-[var(--text-primary)]"
                    : "whitespace-nowrap font-display text-[clamp(2.35rem,3.3vw,3rem)] font-extrabold leading-[1.05] tracking-normal text-[var(--text-primary)]"
                }
              >
                {stat.value}
              </p>
              <p className="mt-5 text-sm font-normal uppercase tracking-[0.1em] text-[var(--text-secondary)]">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center text-sm text-[var(--text-muted)]">
          <span>Played on →</span>
          <span className="font-display font-bold text-[var(--text-secondary)]">Chess.com</span>
          <span className="font-display font-bold text-[var(--text-secondary)]">Lichess</span>
          <span className="font-display font-bold text-[var(--text-secondary)]">PGN files</span>
        </div>
      </div>
    </motion.section>
  );
}
