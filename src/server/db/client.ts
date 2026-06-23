import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { databaseEnabled, env } from "@/server/env";

const globalForDb = globalThis as typeof globalThis & {
  __knightowlPool?: Pool;
  __knightowlDb?: ReturnType<typeof drizzle>;
};

function createPool() {
  if (!databaseEnabled()) {
    throw new Error("DATABASE_URL is not configured. Set BACKEND_DRIVER and DATABASE_URL to enable the database backend.");
  }

  return new Pool({
    connectionString: env.DATABASE_URL,
  });
}

export function getPool() {
  if (!globalForDb.__knightowlPool) {
    globalForDb.__knightowlPool = createPool();
  }

  return globalForDb.__knightowlPool;
}

export function getDb() {
  if (!globalForDb.__knightowlDb) {
    globalForDb.__knightowlDb = drizzle(getPool());
  }

  return globalForDb.__knightowlDb;
}

export async function checkDatabaseHealth() {
  if (!databaseEnabled()) {
    return false;
  }

  try {
    await getPool().query("select 1");
    return true;
  } catch {
    return false;
  }
}
