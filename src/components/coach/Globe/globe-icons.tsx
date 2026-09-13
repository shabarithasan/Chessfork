import type { TimeClass } from "./globe-game-types";

const PIECE_PATHS: Record<TimeClass, string> = {
  bullet:
    "M11.167 19.3 2.9 29.133l9.7-8.366zM4.3 21.6l5.4-4-.9-2zm10.467-7.5c-.4-.333-1.067-1.3-1.1-1.8 4.5-4.233 7.4-4.6 9.8-4.6-2.767 1.2-5.234 2.8-8.7 6.4m11.066-7.933s-1.1-.234-2.733-.234c-2.667 0-6.767.7-10.3 4.2l-2.2 2.134c-1.367 1.366 1.033 4.666 2.767 6.366.4.4.9.834 1.333 1.234l5.233-4.034L10.133 28l7.467-6.3c.8.333 1.467.4 2.133-.267l2.167-2.166c3.5-3.5 4.167-7.667 4.167-10.334 0-1.666-.234-2.766-.234-2.766",
  blitz:
    "M9.833 19H15.4l3.2-11.567C18.9 6.4 18.6 6 17.5 6h-5.667c-1.1 0-1.566.4-1.733 1.467L8.567 17.533C8.4 18.6 8.733 19 9.833 19m12.934-6h-8.1L12.4 27.3c-.233 1.633.2 1.833 1.167.467L23.4 14.2c.633-.867.467-1.2-.633-1.2",
  rapid:
    "M15.967 18.633c.933 0 1.933-.733 1.566-2.266L16.5 12h-1l-1.033 4.4c-.367 1.5.6 2.233 1.5 2.233M16 26.5c5.233 0 9.5-4.267 9.5-9.5S21.233 7.5 16 7.5 6.5 11.767 6.5 17s4.267 9.5 9.5 9.5m0-3c-4 0-6.5-2.5-6.5-6.5s2.5-6.5 6.5-6.5 6.5 2.5 6.5 6.5-2.5 6.5-6.5 6.5M14.5 9.233h3V5h-3zM12.5 6h7c0-1.7-.433-2-3.5-2s-3.5.3-3.5 2",
  classical:
    "M15.967 18.633c.933 0 1.933-.733 1.566-2.266L16.5 12h-1l-1.033 4.4c-.367 1.5.6 2.233 1.5 2.233M16 26.5c5.233 0 9.5-4.267 9.5-9.5S21.233 7.5 16 7.5 6.5 11.767 6.5 17s4.267 9.5 9.5 9.5m0-3c-4 0-6.5-2.5-6.5-6.5s2.5-6.5 6.5-6.5 6.5 2.5 6.5 6.5-2.5 6.5-6.5 6.5M14.5 9.233h3V5h-3zM12.5 6h7c0-1.7-.433-2-3.5-2s-3.5.3-3.5 2",
  daily:
    "m6.367 14.9-3.2 1.1 3.2 1.1c1.866.667 2.333 2.067 1.2 3.7l-1.934 2.767 3.3-1.034c1.9-.566 3.067.3 3.067 2.267v3.367l2.067-2.7c1.2-1.567 2.666-1.567 3.866 0l2.067 2.7V24.8c0-1.967 1.167-2.833 3.067-2.267l3.3 1.034-1.934-2.767c-1.133-1.633-.666-3.033 1.2-3.7l3.2-1.1-3.2-1.1c-1.866-.667-2.333-2.067-1.2-3.7l1.934-2.767-3.3 1.034c-1.9.566-3.067-.3-3.067-2.267V3.833l-2.067 2.7c-1.2 1.567-2.666 1.567-3.866 0L12 3.833V7.2c0 1.967-1.167 2.833-3.067 2.267l-3.3-1.034L7.567 11.2c1.133 1.633.666 3.033-1.2 3.7zM10 16c0-3.28 2.719-6 6-6 3.319 0 6 2.723 6 6a6 6 0 0 1-6 6c-3.277 0-6-2.681-6-6zm2 0c0 2.215 1.81 4 4 4 2.213 0 4-1.795 4-4 0-2.219-1.801-4-4-4-2.208 0-4 1.786-4 4z",
};

export const TIME_CLASS_LABEL: Record<TimeClass, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  classical: "Classical",
  daily: "Daily",
};

export const TIME_CLASS_TEXT: Record<TimeClass, string> = {
  bullet: "text-orange-500",
  blitz: "text-yellow-500",
  rapid: "text-green-500",
  classical: "text-blue-500",
  daily: "text-purple-500",
};

export const TIME_CLASS_BADGE: Record<TimeClass, string> = {
  bullet: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  blitz: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  rapid: "bg-green-500/10 border-green-500/20 text-green-400",
  classical: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  daily: "bg-purple-500/10 border-purple-500/20 text-purple-400",
};

export function ChessPieceIcon({
  timeClass,
  size = 18,
  className,
}: {
  timeClass: TimeClass;
  size?: number;
  className?: string;
}) {
  const path = PIECE_PATHS[timeClass] ?? PIECE_PATHS.rapid;
  const cls = className ?? TIME_CLASS_TEXT[timeClass];
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-label={TIME_CLASS_LABEL[timeClass]}
      className={`${cls} fill-current shrink-0`}
    >
      <path d={path} />
    </svg>
  );
}
