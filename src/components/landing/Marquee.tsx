const rowOneItems = [
  "STOCKFISH 18",
  "FREE FOREVER",
  "AI COACHING",
  "MOVE GRADES",
  "BLUNDER DETECTION",
  "OPENING ANALYSIS",
  "99.2% ACCURACY",
  "BRILLIANT MOVES",
  "ENGINE REVIEW",
];

const rowTwoItems = [
  "♔ CHESS.COM",
  "♖ LICHESS",
  "♗ PGN IMPORT",
  "NO SIGNUP",
  "UNLIMITED GAMES",
  "DAILY STREAK",
  "RUY LOPEZ",
  "SICILIAN DEFENSE",
  "KING'S GAMBIT",
];

function MarqueeTrack({
  items,
  direction,
}: {
  items: string[];
  direction: "forward" | "reverse";
}) {
  const loopItems = [...items, ...items, ...items];

  return (
    <div className="knightowl-marquee-row" aria-hidden="true">
      <div className={`knightowl-marquee-track ${direction === "forward" ? "knightowl-marquee-forward" : "knightowl-marquee-reverse"}`}>
        {loopItems.map((item, index) => (
          <span className="knightowl-marquee-item" key={`${item}-${index}`}>
            {item}
            <span className="knightowl-marquee-diamond">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Marquee() {
  return (
    <section className="knightowl-marquee-strip border-y border-[var(--border)] bg-[var(--bg-secondary)] py-4" aria-label="Knightowl capabilities">
      <MarqueeTrack items={rowOneItems} direction="forward" />
      <MarqueeTrack items={rowTwoItems} direction="reverse" />

      <style>{`
        .knightowl-marquee-strip {
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }

        .knightowl-marquee-row {
          display: flex;
          overflow: hidden;
          white-space: nowrap;
        }

        .knightowl-marquee-row + .knightowl-marquee-row {
          margin-top: 0.65rem;
        }

        .knightowl-marquee-track {
          display: flex;
          width: max-content;
          min-width: 200%;
          will-change: transform;
        }

        .knightowl-marquee-strip:hover .knightowl-marquee-track {
          animation-play-state: paused;
        }

        .knightowl-marquee-forward {
          animation: knightowl-marquee-forward 30s linear infinite;
        }

        .knightowl-marquee-reverse {
          animation: knightowl-marquee-reverse 30s linear infinite;
        }

        .knightowl-marquee-item {
          align-items: center;
          color: #8892a4;
          display: inline-flex;
          flex: 0 0 auto;
          font-family: var(--font-display), Syne, sans-serif;
          font-size: 13px;
          font-weight: 700;
          gap: 1.05rem;
          letter-spacing: 0.15em;
          line-height: 1;
          padding-inline: 1.05rem;
          text-transform: uppercase;
        }

        .knightowl-marquee-diamond {
          color: #00d4aa;
          font-size: 0.7rem;
          line-height: 1;
        }

        @keyframes knightowl-marquee-forward {
          from {
            transform: translateX(-33.333%);
          }

          to {
            transform: translateX(0);
          }
        }

        @keyframes knightowl-marquee-reverse {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-33.333%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .knightowl-marquee-track {
            animation: none;
          }
        }

        @media (max-width: 767px) {
          .knightowl-marquee-forward,
          .knightowl-marquee-reverse {
            animation-duration: 22s;
          }
        }
      `}</style>
    </section>
  );
}
