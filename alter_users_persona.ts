import { sql } from "drizzle-orm";
import { getDb } from "./src/server/db/client";

async function main() {
  console.log("Adding coach_persona column to users table...");
  const db = getDb();
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS coach_persona VARCHAR(64) NOT NULL DEFAULT 'default';
  `);

  console.log("Migration complete!");
  process.exit(0);
}

main().catch(console.error);
