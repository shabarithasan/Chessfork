import { Client } from "pg";

async function truncateMatches() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    await client.query('TRUNCATE TABLE matches CASCADE');
    console.log("Truncated matches table.");
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    await client.end();
  }
}

truncateMatches();
