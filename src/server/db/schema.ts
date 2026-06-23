import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const sourceTypeEnum = pgEnum("source_type", ["pgn", "chesscom", "lichess"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "pro", "coach"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  locale: varchar("locale", { length: 8 }).default("en").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  usersEmailUnique: uniqueIndex("users_email_idx").on(table.email),
}));

export const identities = pgTable("identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
},
(table) => ({
  identitiesProviderUnique: uniqueIndex("identities_provider_user_idx").on(table.provider, table.providerUserId),
}));

export const userCredentials = pgTable("user_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  userCredentialsUserUnique: uniqueIndex("user_credentials_user_idx").on(table.userId),
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  tier: subscriptionTierEnum("tier").default("free").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  status: varchar("status", { length: 32 }).default("inactive").notNull(),
},
(table) => ({
  subscriptionsUserUnique: uniqueIndex("subscriptions_user_idx").on(table.userId),
}));

export const chessAccounts = pgTable("chess_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  source: sourceTypeEnum("source").notNull(),
  username: varchar("username", { length: 120 }).notNull(),
},
(table) => ({
  chessAccountsUserSourceUnique: uniqueIndex("chess_accounts_user_source_idx").on(table.userId, table.source),
}));

export const importedPgns = pgTable("imported_pgns", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: varchar("public_id", { length: 120 }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  source: sourceTypeEnum("source").notNull(),
  externalGameId: varchar("external_game_id", { length: 255 }),
  pgn: text("pgn").notNull(),
  pgnHash: varchar("pgn_hash", { length: 64 }).notNull(),
  jobStatus: varchar("job_status", { length: 32 }).default("queued").notNull(),
  auditTrail: jsonb("audit_trail").default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  importedPublicIdUnique: uniqueIndex("imported_pgns_public_id_idx").on(table.publicId),
  importedPgnHashUnique: uniqueIndex("imported_pgns_pgn_hash_idx").on(table.pgnHash),
}));

export const analysisRuns = pgTable("analysis_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: varchar("public_id", { length: 120 }).notNull(),
  importedPgnId: uuid("imported_pgn_id").references(() => importedPgns.id),
  cacheKey: varchar("cache_key", { length: 255 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull(),
  depth: varchar("depth", { length: 16 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 32 }).default("queued").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  analysisPublicIdUnique: uniqueIndex("analysis_runs_public_id_idx").on(table.publicId),
  importedPgnIndex: index("analysis_runs_imported_pgn_id_idx").on(table.importedPgnId),
}));

export const moveEvaluations = pgTable("move_evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  analysisRunId: uuid("analysis_run_id").references(() => analysisRuns.id).notNull(),
  ply: integer("ply").notNull(),
  score: integer("score").notNull(),
  cpLoss: integer("cp_loss").notNull(),
  grade: varchar("grade", { length: 16 }).notNull(),
  payload: jsonb("payload").notNull(),
});

export const puzzles = pgTable("puzzles", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: varchar("public_id", { length: 120 }).notNull(),
  fen: varchar("fen", { length: 255 }).notNull(),
  prompt: text("prompt").notNull(),
  rating: integer("rating").notNull(),
  themes: jsonb("themes").default([]).notNull(),
  solution: jsonb("solution").notNull(),
  sourceGamePublicId: varchar("source_game_public_id", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  puzzlePublicIdUnique: uniqueIndex("puzzles_public_id_idx").on(table.publicId),
}));

export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  puzzleId: uuid("puzzle_id").references(() => puzzles.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  correct: boolean("correct").notNull(),
  elapsedMs: integer("elapsed_ms").notNull(),
  ratingAfter: integer("rating_after").notNull(),
});

export const coachSnapshots = pgTable("coach_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: varchar("public_id", { length: 120 }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  summary: text("summary").notNull(),
  payload: jsonb("payload").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
},
(table) => ({
  coachPublicIdUnique: uniqueIndex("coach_snapshots_public_id_idx").on(table.publicId),
}));

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardType: varchar("board_type", { length: 32 }).notNull(),
    rank: integer("rank").notNull(),
    player: varchar("player", { length: 255 }).notNull(),
    score: integer("score").notNull(),
    change: integer("change").notNull(),
    detail: text("detail").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    leaderboardUnique: uniqueIndex("leaderboard_entries_type_player_idx").on(table.boardType, table.player),
  }),
);
