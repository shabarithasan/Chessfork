import { getDb } from "./src/server/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  
  console.log("Adding short_code to matches table...");
  
  await db.execute(sql`
    ALTER TABLE "matches" 
    ADD COLUMN IF NOT EXISTS "short_code" varchar(6) UNIQUE;
  `);
  
  console.log("Column short_code added successfully!");
  process.exit(0);
}

main().catch(console.error);
