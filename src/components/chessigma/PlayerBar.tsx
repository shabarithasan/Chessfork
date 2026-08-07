"use client";

import styles from "./styles.module.css";

interface PlayerInfo {
  name: string;
  rating: number;
  clock: string;
}

interface PlayerBarProps {
  white: PlayerInfo;
  black: PlayerInfo;
}

function PlayerBlock({ player, side }: { player: PlayerInfo; side: "left" | "right" }) {
  return (
    <div className={styles.playerInfo} style={{ flexDirection: side === "right" ? "row-reverse" : undefined }}>
      <div className={styles.playerAvatar}>
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ textAlign: side === "right" ? "right" : "left" }}>
        <div className={styles.playerName}>{player.name}</div>
        <div className={styles.playerRating}>Rating: {player.rating}</div>
      </div>
      <div className={styles.playerClock}>{player.clock}</div>
    </div>
  );
}

export function PlayerBar({ white, black }: PlayerBarProps) {
  return (
    <div className={styles.playerBar}>
      <PlayerBlock player={white} side="left" />
      <div className={styles.vsBadge}>vs</div>
      <PlayerBlock player={black} side="right" />
    </div>
  );
}
