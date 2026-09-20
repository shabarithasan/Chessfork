import { Client } from "pg";

async function testUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT count(*) FROM users');
    console.log("Users count:", res.rows[0]);
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await client.end();
  }
}

testUsers();
