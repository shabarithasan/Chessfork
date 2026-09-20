import { Client } from "pg";

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log("Connection successful:", res.rows[0]);
  } catch (error) {
    console.error("Connection failed:", error);
  } finally {
    await client.end();
  }
}

testConnection();
