"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    avatarGradient: "linear-gradient(135deg, #00d4aa, #00c2ff)",
    initial: "A",
    name: "Alex M.",
    quote: "Stockfish 18 analysis is genuinely better than what I was paying $15/month for. Switched and never looked back.",
    tag: "@mr-demon-only · Chess.com 1200 rated",
  },
  {
    avatarGradient: "linear-gradient(135deg, #00d4aa, #6366f1)",
    initial: "P",
    name: "Priya K.",
    quote: "The move-by-move breakdown helped me understand my opening mistakes. Went from 900 to 1100 in 3 weeks.",
    tag: "@priya-plays · Lichess 1100 rated",
  },
  {
    avatarGradient: "linear-gradient(135deg, #00c2ff, #00d4aa)",
    initial: "J",
    name: "James T.",
    quote: "Shareable report cards are genius. Posted my 99% accuracy game and got 400 upvotes on r/chess.",
    tag: "@jamestactics · Chess.com 1600 rated",
  },
];

export function Testimonials() {
  return (
    <motion.section
      className="bg-[var(--bg-primary)] px-5 py-20 md:px-8 md:py-32 lg:px-12 lg:py-40"
      initial={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Player notes</p>
          <h2 className="mt-4 font-display text-[36px] font-extrabold leading-tight tracking-normal text-[var(--text-primary)] md:text-[52px]">
            Trusted by daily chess grinders
          </h2>
        </div>

        <div className="knightowl-testimonial-track mt-14 flex snap-x gap-5 overflow-x-auto pb-5 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {testimonials.map((testimonial, index) => (
            <motion.article
              className="knightowl-testimonial-card group relative min-h-[22rem] snap-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 transition-all duration-300 ease-out will-change-transform hover:-translate-y-1 hover:border-[var(--border-glow)] hover:bg-[#131320]"
              initial={{ y: 60, opacity: 0 }}
              key={testimonial.name}
              transition={{ duration: 0.7, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-100px" }}
              whileInView={{ y: 0, opacity: 1 }}
            >
              <span className="pointer-events-none absolute -right-5 -top-14 font-display text-[200px] font-extrabold leading-none text-[#00d4aa08]">&quot;</span>
              <div className="relative z-10">
                <div className="mb-4 text-lg tracking-[0.12em] text-[var(--accent)]">★★★★★</div>
                <p className="text-[15px] font-normal italic leading-[1.7] text-[#c8d0dc] md:text-[17px]">&quot;{testimonial.quote}&quot;</p>

                <div className="mt-9 flex items-center gap-3 border-t border-[var(--border)] pt-6">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-[var(--bg-primary)]"
                    style={{ background: testimonial.avatarGradient }}
                  >
                    {testimonial.initial}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">{testimonial.name}</p>
                    <p className="mt-1 truncate text-[13px] font-normal text-[var(--text-secondary)]">{testimonial.tag}</p>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      <style>{`
        .knightowl-testimonial-track {
          scrollbar-width: none;
        }

        .knightowl-testimonial-track::-webkit-scrollbar {
          display: none;
        }

        .knightowl-testimonial-card {
          flex: 0 0 86%;
        }

        @media (min-width: 768px) {
          .knightowl-testimonial-card {
            flex-basis: auto;
          }
        }
      `}</style>
    </motion.section>
  );
}
