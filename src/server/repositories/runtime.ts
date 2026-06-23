import { databaseEnabled } from "@/server/env";

export async function withDatabaseFallback<T>(operation: () => Promise<T>, fallback: () => Promise<T> | T) {
  if (!databaseEnabled()) {
    return fallback();
  }

  try {
    return await operation();
  } catch (error) {
    console.warn("Database backend unavailable, falling back to memory:", error);
    return fallback();
  }
}
