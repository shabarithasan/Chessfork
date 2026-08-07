"use client";

import { motion } from "framer-motion";

type FakeTweet = {
  avatarGradient: string;
  name: string;
  handle: string;
  verified: boolean;
  time: string;
  date: string;
  text: string;
  replies: string;
  reposts: string;
  likes: string;
  views: string;
};

const tweets: FakeTweet[] = [
  {
    avatarGradient: "from-[#00d4aa] to-[#0f766e]",
    name: "Daniel Reyes",
    handle: "dannygrinds",
    verified: true,
    time: "9:41 AM",
    date: "Jul 28, 2026",
    text: "Analyzed my last 20 rapid games on ChessFork and found I blunder the same bishop trap every time in the London. The engine line with the fix is right there. This thing is free??",
    replies: "184",
    reposts: "1.2K",
    likes: "8.4K",
    views: "312K",
  },
  {
    avatarGradient: "from-[#f3c53d] to-[#b45309]",
    name: "IM Anna Vogel",
    handle: "annavogel",
    verified: true,
    time: "2:17 PM",
    date: "Jul 29, 2026",
    text: "Stockfish 18 analysis under 5 seconds with a clean verdict on every move. I've been showing my students the brute-force tag in their own games and the lightbulb moment is real.",
    replies: "96",
    reposts: "890",
    likes: "5.1K",
    views: "198K",
  },
  {
    avatarGradient: "from-[#77b82b] to-[#365314]",
    name: "Marcus Lee",
    handle: "marcuslee",
    verified: false,
    time: "6:02 PM",
    date: "Jul 30, 2026",
    text: "No signup, no paywall, just paste your PGN and get a full game report with centipawn graphs. ChessFork is the first analysis tool that actually respects my time.",
    replies: "41",
    reposts: "356",
    likes: "2.9K",
    views: "94K",
  },
];

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function FakeTweetCard({ tweet }: { tweet: FakeTweet }) {
  return (
    <div className="flex h-full min-h-[22rem] flex-col justify-between gap-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)] transition-all duration-300 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display text-lg font-bold text-black ${tweet.avatarGradient}`}
          >
            {tweet.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-medium text-[var(--text-primary)]">{tweet.name}</span>
              {tweet.verified && (
                <svg aria-label="Verified Account" viewBox="0 0 24 24" className="size-4 fill-[#00d4aa]">
                  <g>
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                  </g>
                </svg>
              )}
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              @{tweet.handle} · {tweet.time}
            </span>
          </div>
        </div>
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="size-5 shrink-0 text-[var(--text-muted)]" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path fill="none" d="M0 0h24v24H0z"></path>
            <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"></path>
          </g>
        </svg>
      </div>

      <p className="text-[15px] leading-relaxed tracking-normal text-[var(--text-secondary)]">{tweet.text}</p>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
          </svg>
          {tweet.replies}
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {tweet.reposts}
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          {tweet.likes}
        </span>
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          {tweet.views}
        </span>
      </div>

      <span className="text-xs text-[var(--text-muted)]">{tweet.date} · Twitter for ChessFork</span>
    </div>
  );
}

export function Testimonials() {
  return (
    <motion.section
      className="px-5 py-20 md:px-8 md:py-32 lg:px-12 lg:py-40"
      initial={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease }}
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

        <div className="knightowl-testimonial-track mt-14 flex snap-x gap-5 overflow-x-auto pb-5 md:grid md:grid-cols-3 md:items-stretch md:overflow-visible md:pb-0">
          {tweets.map((tweet, index) => (
            <motion.div
              className="knightowl-testimonial-card snap-center"
              initial={{ y: 60, opacity: 0 }}
              key={tweet.handle}
              transition={{ duration: 0.7, delay: index * 0.15, ease }}
              viewport={{ once: true, margin: "-100px" }}
              whileInView={{ y: 0, opacity: 1 }}
            >
              <FakeTweetCard tweet={tweet} />
            </motion.div>
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
