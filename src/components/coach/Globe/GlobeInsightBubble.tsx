"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { GlobeGame } from "./globe-game-types";
import { countryName } from "./globe-geo";

interface Insight {
  text: string;
  icon: string;
}

function buildInsights(game: GlobeGame): Insight[] {
  const out: Insight[] = [];
  if (game.opening)
    out.push({ text: game.opening.split(":")[0].trim(), icon: "\u265f\ufe0f" });
  const top = Math.max(game.white_rating, game.black_rating);
  if (top >= 2200) out.push({ text: `${top} Elo`, icon: "\u2b50" });
  if (top >= 2500) out.push({ text: "Master-level game", icon: "\ud83d\udc51" });
  if (game.white_country !== game.black_country)
    out.push({
      text: `${countryName(game.white_country)} vs ${countryName(game.black_country)}`,
      icon: "\ud83c\udf0d",
    });
  if (game.time_class === "bullet")
    out.push({ text: "Bullet speed", icon: "\u26a1" });
  if (game.time_class === "classical")
    out.push({ text: "Classical chess", icon: "\ud83c\udfdb\ufe0f" });
  if (game.white_result === "checkmated" || game.black_result === "checkmated")
    out.push({ text: "Checkmate!", icon: "\u265a" });
  if (game.white_result === "timeout" || game.black_result === "timeout")
    out.push({ text: "Flag fall!", icon: "\u23f1\ufe0f" });
  if (out.length === 0) out.push({ text: "New game", icon: "\u265f\ufe0f" });
  return out;
}

export function GlobeInsightBubble({
  games,
  getScreenPos,
  onInsightClick,
}: {
  games: GlobeGame[];
  getScreenPos: (game: GlobeGame) => { x: number; y: number } | null;
  onInsightClick: (game: GlobeGame) => void;
}) {
  const gamesRef = useRef(games);
  gamesRef.current = games;
  const posFnRef = useRef(getScreenPos);
  posFnRef.current = getScreenPos;

  const [text, setText] = useState("");
  const [icon, setIcon] = useState("");
  const [visible, setVisible] = useState(false);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const current = useRef<GlobeGame | null>(null);

  useEffect(() => {
    function run() {
      const list = gamesRef.current;
      if (list.length === 0) return;
      setVisible(false);
      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          const game = list[Math.floor(Math.random() * list.length)];
          const p = posFnRef.current(game);
          if (!p) continue;
          const insights = buildInsights(game);
          const pick = insights[Math.floor(Math.random() * insights.length)];
          current.current = game;
          setPoint(p);
          setText(pick.text);
          setIcon(pick.icon);
          setVisible(true);
          return;
        }
      }, 350);
      setTimeout(() => setVisible(false), 4850);
    }

    const first = setTimeout(run, 3000);
    const loop = setInterval(run, 7000);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, []);

  return (
    <div
      className="fixed z-30 pointer-events-none"
      style={{ left: point.x, top: point.y }}
    >
      <div
        className={`-translate-x-1/2 transition-all duration-300 ${
          visible
            ? "opacity-100 -translate-y-[calc(100%+16px)]"
            : "opacity-0 -translate-y-[calc(100%+8px)]"
        }`}
      >
        <button
          onClick={() => {
            if (current.current) {
              setVisible(false);
              onInsightClick(current.current);
            }
          }}
          className="pointer-events-auto group bg-zinc-900/85 backdrop-blur-sm border border-amber-500/20 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg shadow-amber-900/20 hover:border-amber-500/40 hover:bg-zinc-800/90 transition-all cursor-pointer"
        >
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-[11px] font-medium text-zinc-300 whitespace-nowrap">
            {text}
          </span>
          <ChevronRight
            size={10}
            className="text-zinc-500 group-hover:text-amber-400 transition-colors ml-0.5"
          />
        </button>
      </div>
    </div>
  );
}
