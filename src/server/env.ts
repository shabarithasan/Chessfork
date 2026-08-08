import { existsSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";

import { z } from "zod";

const defaultStockfishThreads = Math.max(1, Math.min(32, availableParallelism()));
const defaultOpeningBookPath = "vendor/books/Perfect2023.bin";

function loadLocalEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    process.env[key] ??= value;
  }
}

loadLocalEnvFile();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_DRIVER: z.enum(["memory", "database", "hybrid"]).default("hybrid"),
  DATABASE_URL: z.string().optional().default(""),
  MONGODB_URI: z.string().optional().default(""),
  MONGODB_DB: z.string().optional().default("chessfork"),
  REDIS_URL: z.string().optional().default(""),
  AUTH_SESSION_SECRET: z.string(),
  STOCKFISH_PATH: z.string().optional().default(""),
  STOCKFISH_THREADS: z.coerce.number().int().min(1).max(32).optional().default(defaultStockfishThreads),
  STOCKFISH_HASH_MB: z.coerce.number().int().min(1).max(16_384).optional().default(64),
  QUICK_DEPTH: z.coerce.number().int().min(1).max(60).optional().default(12),
  QUICK_MOVETIME: z.coerce.number().int().min(1).max(60_000).optional().default(2000),
  DEEP_DEPTH: z.coerce.number().int().min(1).max(60).optional().default(24),
  DEEP_MOVETIME: z.coerce.number().int().min(1).max(60_000).optional().default(3000),
  STOCKFISH_MIN_MOVE_TIME_MS: z.coerce.number().int().min(0).max(60_000).optional().default(1200),
  STOCKFISH_DEPTH: z.coerce.number().int().min(1).max(60).optional().default(22),
  STOCKFISH_ACTUAL_MOVE_DEPTH: z.coerce.number().int().min(1).max(60).optional().default(22),
  STOCKFISH_QUICK_REPORT_DEPTH: z.coerce.number().int().min(1).max(60).optional().default(12),
  STOCKFISH_QUICK_ACTUAL_MOVE_DEPTH: z.coerce.number().int().min(1).max(60).optional().default(10),
  STOCKFISH_QUICK_POSITION_DEPTH: z.coerce.number().int().min(1).max(60).optional().default(14),
  STOCKFISH_QUICK_MIN_MOVE_TIME_MS: z.coerce.number().int().min(0).max(60_000).optional().default(0),
  STOCKFISH_SYZYGY_PATH: z.string().optional().default(""),
  STOCKFISH_SYZYGY_PROBE_DEPTH: z.coerce.number().int().min(1).max(100).optional().default(1),
  STOCKFISH_SYZYGY_PROBE_LIMIT: z.coerce.number().int().min(0).max(7).optional().default(5),
  BOOK_PATH: z.string().optional().default(""),
  OPENING_BOOK_PATH: z.string().optional().default(""),
  STOCKFISH_OPENING_BOOK_PATH: z.string().optional().default(""),
  STOCKFISH_OPENING_BOOK_MAX_PLIES: z.coerce.number().int().min(0).max(120).optional().default(20),
  NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
});

const rawAuthSecret = process.env.AUTH_SESSION_SECRET;

if (!rawAuthSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "AUTH_SESSION_SECRET is required in production. Set it to a cryptographically random string (minimum 32 characters).",
  );
}

const parsedEnv = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  BACKEND_DRIVER: process.env.BACKEND_DRIVER,
  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
  REDIS_URL: process.env.REDIS_URL,
  AUTH_SESSION_SECRET: rawAuthSecret || "dev-secret-do-not-use-in-production",
  STOCKFISH_PATH: process.env.STOCKFISH_PATH,
  STOCKFISH_THREADS: process.env.STOCKFISH_THREADS,
  STOCKFISH_HASH_MB: process.env.STOCKFISH_HASH_MB,
  QUICK_DEPTH: process.env.QUICK_DEPTH,
  QUICK_MOVETIME: process.env.QUICK_MOVETIME,
  DEEP_DEPTH: process.env.DEEP_DEPTH,
  DEEP_MOVETIME: process.env.DEEP_MOVETIME,
  STOCKFISH_MIN_MOVE_TIME_MS: process.env.STOCKFISH_MIN_MOVE_TIME_MS,
  STOCKFISH_DEPTH: process.env.STOCKFISH_DEPTH,
  STOCKFISH_ACTUAL_MOVE_DEPTH: process.env.STOCKFISH_ACTUAL_MOVE_DEPTH,
  STOCKFISH_QUICK_REPORT_DEPTH: process.env.STOCKFISH_QUICK_REPORT_DEPTH,
  STOCKFISH_QUICK_ACTUAL_MOVE_DEPTH: process.env.STOCKFISH_QUICK_ACTUAL_MOVE_DEPTH,
  STOCKFISH_QUICK_POSITION_DEPTH: process.env.STOCKFISH_QUICK_POSITION_DEPTH,
  STOCKFISH_QUICK_MIN_MOVE_TIME_MS: process.env.STOCKFISH_QUICK_MIN_MOVE_TIME_MS,
  STOCKFISH_SYZYGY_PATH: process.env.STOCKFISH_SYZYGY_PATH,
  STOCKFISH_SYZYGY_PROBE_DEPTH: process.env.STOCKFISH_SYZYGY_PROBE_DEPTH,
  STOCKFISH_SYZYGY_PROBE_LIMIT: process.env.STOCKFISH_SYZYGY_PROBE_LIMIT,
  BOOK_PATH: process.env.BOOK_PATH,
  OPENING_BOOK_PATH: process.env.OPENING_BOOK_PATH,
  STOCKFISH_OPENING_BOOK_PATH: process.env.STOCKFISH_OPENING_BOOK_PATH,
  STOCKFISH_OPENING_BOOK_MAX_PLIES: process.env.STOCKFISH_OPENING_BOOK_MAX_PLIES,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
});
const openingBookPath =
  parsedEnv.BOOK_PATH || parsedEnv.OPENING_BOOK_PATH || parsedEnv.STOCKFISH_OPENING_BOOK_PATH || defaultOpeningBookPath;

export const env = {
  ...parsedEnv,
  OPENING_BOOK_PATH: openingBookPath,
  STOCKFISH_OPENING_BOOK_PATH: openingBookPath,
};

export function databaseEnabled() {
  return env.BACKEND_DRIVER !== "memory" && env.DATABASE_URL.length > 0;
}

export function mongoDatabaseEnabled() {
  return env.MONGODB_URI.length > 0;
}

export function redisEnabled() {
  return env.BACKEND_DRIVER !== "memory" && env.REDIS_URL.length > 0;
}
