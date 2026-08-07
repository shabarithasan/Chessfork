export const CHANGELOG_IMAGES_BASE = "https://ozvvyafyqcgjftdotcae.supabase.co/storage/v1/object/public/changelog-media";

export interface ChangelogEntry {
  title: string;
  description: string;
  date: string;
  month: string;
  reactions: { fire: number; party: number; heart: number };
  screenshots?: string[];
  extraScreenshotCount?: number;
  highlight?: boolean;
  link?: string;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    title: "Create your own opening + new courses \u{1F4D6}",
    description: "Create your own repertoire + new courses: English, Italian, King's Gambit, King's Indian Defense, Ruy Lopez, Scotch, Sicilian, Vienna",
    date: "Jun 27",
    month: "June 2026",
    reactions: { fire: 185, party: 88, heart: 96 },
    screenshots: ["e9632a7b-2774-43fe-9ac3-46d313d4a94a.webp"],
    highlight: true,
  },
  {
    title: "New game review",
    description: "Brand new UI/UX, better mobile version, new metrics panel.",
    date: "Jun 19",
    month: "June 2026",
    reactions: { fire: 152, party: 120, heart: 122 },
    screenshots: ["games-list.webp", "game-report.webp"],
    extraScreenshotCount: 2,
  },
  {
    title: "Opening Trainer",
    description: "New opening module: London System & Caro-Kann live",
    date: "Jun 18",
    month: "June 2026",
    reactions: { fire: 107, party: 91, heart: 87 },
    screenshots: ["opening-courses.webp"],
  },
  {
    title: "Shortcut from Chess.com and Lichess",
    description: "Type 6chess.com or 6lichess.org, land right on the analysis here.",
    date: "May 27",
    month: "May 2026",
    reactions: { fire: 64, party: 52, heart: 59 },
    screenshots: ["open-with-6.webp"],
  },
  {
    title: "Supercoach is here",
    description: "AI coach, Blunder Shield, Woodpecker drills, Chess DNA report, one plan.",
    date: "May 2",
    month: "May 2026",
    reactions: { fire: 203, party: 180, heart: 171 },
    screenshots: ["supercoach.webp"],
  },
  {
    title: "Analysis board & editor",
    description: "Drag pieces, paste a FEN or PGN, instant engine analysis.",
    date: "Apr 25",
    month: "April 2026",
    reactions: { fire: 27, party: 26, heart: 33 },
    screenshots: ["board-editor.webp", "analysis-eval.webp"],
  },
  {
    title: "Next best move",
    description: "Any position, the best move to play next, follow the line.",
    date: "Apr 23",
    month: "April 2026",
    reactions: { fire: 19, party: 17, heart: 16 },
    screenshots: ["next-move.webp"],
  },
  {
    title: "Elo calculator",
    description: "Expected score and rating change, FIDE, Chess.com, Lichess.",
    date: "Apr 20",
    month: "April 2026",
    reactions: { fire: 11, party: 7, heart: 8 },
    screenshots: ["elo-calculator.webp"],
  },
  {
    title: "Chess Globe",
    description: "Live globe, games lighting up across the world in real time.",
    date: "Mar 4",
    month: "March 2026",
    link: "https://globe.chessigma.com",
    reactions: { fire: 15, party: 20, heart: 14 },
    screenshots: ["chess-globe.webp"],
  },
  {
    title: "Daily puzzle and streaks",
    description: "A new puzzle every day, streak tracking, daily leaderboard.",
    date: "Feb 17",
    month: "February 2026",
    reactions: { fire: 11, party: 18, heart: 14 },
  },
  {
    title: "Chess Wrapped",
    description: "Your chess year, best moments, top openings, one shareable recap.",
    date: "Dec 19",
    month: "December 2025",
    link: "/wrapped",
    reactions: { fire: 55, party: 67, heart: 62 },
    screenshots: ["chess-wrapped.webp"],
  },
  {
    title: "Puzzle leaderboard",
    description: "Global puzzle rankings, see where your tactics stand.",
    date: "Dec 16",
    month: "December 2025",
    reactions: { fire: 8, party: 14, heart: 5 },
    screenshots: ["puzzle-leaderboard.webp"],
  },
  {
    title: "Puzzles",
    description: "Growing tactics library, your own puzzle rating, every level.",
    date: "Aug 10",
    month: "August 2025",
    reactions: { fire: 64, party: 60, heart: 55 },
    screenshots: ["puzzles.webp"],
  },
  {
    title: "Custom move classification names",
    description: "Rename the move grades, pick names that fit your style.",
    date: "Jun 13",
    month: "June 2025",
    reactions: { fire: 12, party: 9, heart: 8 },
    screenshots: ["classification-common.webp", "classification-tushi.webp"],
  },
  {
    title: "Engine lines, alternatives, higher depth",
    description: "Top engine lines, alternative moves, deeper search.",
    date: "May 13",
    month: "May 2025",
    reactions: { fire: 40, party: 35, heart: 29 },
    screenshots: ["engine-lines.webp"],
  },
  {
    title: "Brilliant moves leaderboard",
    description: "Brilliant moves from across the site, ranked.",
    date: "May 2",
    month: "May 2025",
    reactions: { fire: 8, party: 6, heart: 5 },
    screenshots: ["sigma-leaderboard.webp"],
  },
  {
    title: "Board and piece themes",
    description: "New board colors and piece sets, make it yours.",
    date: "Apr 21",
    month: "April 2025",
    reactions: { fire: 16, party: 12, heart: 22 },
    screenshots: ["board-themes.webp", "piece-themes.webp"],
  },
  {
    title: "Import from Lichess and PGN",
    description: "Lichess import, paste any PGN, more ways to load games.",
    date: "Apr 1",
    month: "April 2025",
    reactions: { fire: 28, party: 18, heart: 11 },
    screenshots: ["import-games.webp"],
  },
  {
    title: "Chessigma is launched",
    description: "Free, unlimited game review, Chess.com style, no limits.",
    date: "Mar 27",
    month: "March 2025",
    reactions: { fire: 139, party: 106, heart: 89 },
    screenshots: ["launch-review.webp"],
  },
];