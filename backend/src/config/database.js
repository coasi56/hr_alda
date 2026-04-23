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

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.log('[db] DATABASE_URL not set, skipping table init');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reactions (
      id           SERIAL PRIMARY KEY,
      from_slack_id VARCHAR(50)  NOT NULL,
      to_slack_id   VARCHAR(50)  NOT NULL,
      emoji         VARCHAR(100) NOT NULL,
      channel_id    VARCHAR(50)  NOT NULL,
      channel_name  VARCHAR(200),
      giver_name    VARCHAR(200),
      receiver_name VARCHAR(200),
      message_ts    VARCHAR(50),
      message_text  TEXT,
      permalink_url TEXT,
      week_start    DATE         NOT NULL,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  console.log('[db] reactions 테이블 준비 완료');
}

module.exports = { pool, testConnection, initDb };
