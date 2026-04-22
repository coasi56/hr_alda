const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.log('[db] DATABASE_URL not set, skipping connection check');
    return;
  }
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('[db] connected to PostgreSQL');
}

module.exports = { pool, testConnection };
