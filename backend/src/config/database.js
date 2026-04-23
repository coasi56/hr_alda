const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('[db] connected to PostgreSQL');
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reactions (
      id            SERIAL PRIMARY KEY,
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      slack_id    VARCHAR(50),
      email       VARCHAR(200),
      birthday    VARCHAR(5),
      hire_date   DATE,
      department  VARCHAR(100),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS holidays (
      id    SERIAL PRIMARY KEY,
      date  DATE NOT NULL,
      name  VARCHAR(100) NOT NULL,
      year  INT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS birthday_templates (
      id          SERIAL PRIMARY KEY,
      type        VARCHAR(50) NOT NULL,
      channel     VARCHAR(50) NOT NULL DEFAULT 'public',
      content     TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS send_logs (
      id          SERIAL PRIMARY KEY,
      event_type  VARCHAR(50) NOT NULL,
      target_slack_id VARCHAR(50),
      target_name VARCHAR(100),
      channel     VARCHAR(100),
      status      VARCHAR(20) NOT NULL DEFAULT 'success',
      error_msg   TEXT,
      sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS birthday_settings (
      id              SERIAL PRIMARY KEY,
      send_channel    VARCHAR(50) NOT NULL DEFAULT 'general',
      birthday_time   VARCHAR(5)  NOT NULL DEFAULT '10:00',
      anniversary_time VARCHAR(5) NOT NULL DEFAULT '10:00',
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 기본 설정값 없으면 삽입
  await pool.query(`
    INSERT INTO birthday_settings (id, send_channel, birthday_time, anniversary_time)
    VALUES (1, 'general', '10:00', '10:00')
    ON CONFLICT (id) DO NOTHING
  `);

  // 기본 템플릿 없으면 삽입
  await pool.query(`
    INSERT INTO birthday_templates (type, channel, content) VALUES
      ('birthday', 'public', ':birthday: 오늘은 {{이름}}님의 생일이에요!\n@here 모두 함께 축하해주세요 :tada:'),
      ('birthday', 'dm', '{{이름}}님, 생일 축하드려요 :birthday:\n생일 복리후생 안내드려요 :point_down:'),
      ('anniversary', 'public', ':tada: 오늘은 {{이름}}님의 입사 {{연차}}주년이에요!\n@here 함께해줘서 고마워요 :blue_heart:'),
      ('anniversary', 'dm', '{{이름}}님, 입사 {{연차}}주년을 축하해요 :tada:\n복리후생 안내드려요 :point_down:')
    ON CONFLICT DO NOTHING
  `);

  console.log('[db] 모든 테이블 준비 완료');
}

module.exports = { pool, testConnection, initDb };