import { sql } from "drizzle-orm";
import { getDb } from "./src/server/db/client";

async function main() {
  console.log("Adding progression columns to users table...");
  const db = getDb();
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT 'Novice',
    ADD COLUMN IF NOT EXISTS games_analyzed INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS puzzles_solved INTEGER NOT NULL DEFAULT 0;
  `);

  console.log("Migration complete!");
  process.exit(0);
}

main().catch(console.error);
