export type BadgeRarity = "common" | "epic" | "legendary" | "rare";

export type Badge = {
  desc: string;
  icon: string;
  id: string;
  name: string;
  rarity: BadgeRarity;
};

export const badges = [
  { id: "first_analysis", name: "First Look", desc: "Analyzed your first game", icon: "🔍", rarity: "common" },
  { id: "accuracy_90", name: "Sharp Mind", desc: "Achieved 90%+ accuracy", icon: "🎯", rarity: "rare" },
  { id: "accuracy_95", name: "Engine Mode", desc: "Achieved 95%+ accuracy", icon: "🤖", rarity: "epic" },
  { id: "no_blunders", name: "Clean Game", desc: "Analyzed a game with 0 blunders", icon: "✨", rarity: "rare" },
  { id: "streak_7", name: "Week Warrior", desc: "7-day analysis streak", icon: "🔥", rarity: "rare" },
  { id: "streak_30", name: "Monthly Master", desc: "30-day streak", icon: "👑", rarity: "legendary" },
  { id: "games_10", name: "Getting Started", desc: "Analyzed 10 games", icon: "📚", rarity: "common" },
  { id: "games_100", name: "Dedicated", desc: "Analyzed 100 games", icon: "💪", rarity: "epic" },
  { id: "brilliant_move", name: "Brilliance", desc: "Made a brilliant move", icon: "⭐", rarity: "rare" },
  { id: "comeback", name: "Never Give Up", desc: "Won from a losing position", icon: "🦁", rarity: "epic" },
  { id: "speedrunner", name: "Speed Demon", desc: "Analyzed a game in under 3s", icon: "⚡", rarity: "common" },
  { id: "opening_expert", name: "Opening Expert", desc: "Played same opening 10 times", icon: "📖", rarity: "rare" },
  { id: "share", name: "Show Off", desc: "Shared a game report", icon: "🎉", rarity: "common" },
  { id: "coach", name: "Student", desc: "Used AI coaching", icon: "🧠", rarity: "common" },
  { id: "perfect_opening", name: "Book Move", desc: "100% accuracy in opening phase", icon: "📕", rarity: "epic" },
  { id: "streak_100", name: "Century Flame", desc: "100-day analysis streak", icon: "🏆", rarity: "legendary" },
  { id: "games_5", name: "Analyzer", desc: "Analyzed 5 games", icon: "♟️", rarity: "common" },
  { id: "no_mistakes", name: "Flawless Focus", desc: "Finished a game with 0 mistakes or blunders", icon: "💎", rarity: "epic" },
  { id: "daily_double", name: "Double Session", desc: "Analyzed 2 games in one day", icon: "☀️", rarity: "common" },
  { id: "endgame_master", name: "Endgame Closer", desc: "95%+ accuracy in the endgame phase", icon: "♚", rarity: "rare" },
] as const satisfies readonly Badge[];

export const badgeCount = badges.length;

export function getBadgeById(id: string): Badge | undefined {
  return badges.find((badge) => badge.id === id);
}

export function rarityLabel(rarity: BadgeRarity) {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}
