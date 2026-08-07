"use client";

import { useRef, useEffect } from "react";
import styles from "./styles.module.css";

interface MoveRecord {
  san: string;
}

interface FooterProps {
  moves: MoveRecord[];
  currentPly: number;
  result: string;
  onMoveClick: (ply: number) => void;
}

export function Footer({ moves, currentPly, result, onMoveClick }: FooterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const active = containerRef.current.querySelector("[data-active=true]");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentPly]);

  return (
    <div className={styles.footer} ref={containerRef}>
      <div className={styles.footerMoves}>
        {moves.map((move, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.footerMove} ${i === currentPly ? styles.footerMoveActive : ""}`}
            data-active={i === currentPly}
            onClick={() => onMoveClick(i)}
          >
            {Math.floor(i / 2) + 1}
            {i % 2 === 0 ? "." : "..."}
            {move.san}
          </button>
        ))}
        {moves.length === 0 && (
          <span className={styles.footerMove}>Make a move to start</span>
        )}
      </div>
      <div className={styles.footerScore}>{result || "*"}</div>
    </div>
  );
}
