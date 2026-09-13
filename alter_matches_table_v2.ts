import { getDb } from "./src/server/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  console.log("Adding pgn and chat to matches table...");
  
  await db.execute(sql`
    ALTER TABLE "matches" 
    ADD COLUMN IF NOT EXISTS "pgn" text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "chat" jsonb DEFAULT '[]'::jsonb;
  `);
  
  console.log("Columns added successfully!");
  process.exit(0);
}

main().catch(console.error);
