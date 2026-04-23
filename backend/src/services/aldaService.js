const { pool } = require('../config/database');

const ALDA_EMOJIS = new Set(['알다-칭찬', '알다-신뢰', '알다-주도성', '알다-원팀']);
const WEEKLY_LIMIT = 10;

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function isAldaEmoji(emoji) {
  return ALDA_EMOJIS.has(emoji);
}

function mapRow(row) {
  return {
    id:           row.id,
    fromSlackId:  row.from_slack_id,
    giverName:    row.giver_name,
    toSlackId:    row.to_slack_id,
    receiverName: row.receiver_name,
    emoji:        row.emoji,
    channelId:    row.channel_id,
    channelName:  row.channel_name,
    messageTs:    row.message_ts,
    messageText:  row.message_text,
    permalinkUrl: row.permalink_url,
    weekStart:    String(row.week_start).slice(0, 10),
    createdAt:    row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

// period → { sql, params } — startIdx: 이 절에서 사용할 첫 번째 $N
function buildPeriodWhere(period, startIdx = 1) {
  if (period === 'today') {
    return { sql: `DATE(created_at) = CURRENT_DATE`, params: [] };
  }
  if (period === 'this_week') {
    return { sql: `week_start = $${startIdx}`, params: [getWeekStart()] };
  }
  if (period === 'this_month') {
    return { sql: `DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`, params: [] };
  }
  return { sql: null, params: [] }; // 'all'
}

// 주간 발송 횟수 조회
async function getSentCount(userId, weekStart) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM reactions WHERE from_slack_id = $1 AND week_start = $2`,
    [userId, weekStart]
  );
  return rows[0].cnt;
}

// 리액션 추가 처리. 반환값: { ok, reason?, reaction? }
async function addReaction({
  fromSlackId, toSlackId, emoji, channelId, messageTs,
  giverName, receiverName, channelName, messageText, permalinkUrl,
}) {
  if (!isAldaEmoji(emoji)) return { ok: false, reason: 'not_alda_emoji' };

  if (fromSlackId === toSlackId) {
    console.log(`[alda] ❌ 자기 리액션 방지 | giver=${giverName ?? fromSlackId} emoji=:${emoji}:`);
    return { ok: false, reason: 'self_reaction' };
  }

  const weekStart = getWeekStart();
  const sentCount = await getSentCount(fromSlackId, weekStart);

  if (sentCount >= WEEKLY_LIMIT) {
    console.log(`[alda] ❌ 주간 한도 초과 | giver=${giverName ?? fromSlackId} sent=${sentCount}/${WEEKLY_LIMIT} week=${weekStart}`);
    return { ok: false, reason: 'weekly_limit_exceeded', sentCount, limit: WEEKLY_LIMIT };
  }

  const { rows } = await pool.query(
    `INSERT INTO reactions
       (from_slack_id, to_slack_id, emoji, channel_id, channel_name,
        giver_name, receiver_name, message_ts, message_text, permalink_url, week_start)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      fromSlackId, toSlackId, emoji, channelId, channelName || channelId,
      giverName || fromSlackId, receiverName || toSlackId,
      messageTs, messageText || null, permalinkUrl || null, weekStart,
    ]
  );

  const reaction = mapRow(rows[0]);
  console.log(
    `[alda] ✅ 리액션 추가 | ${reaction.giverName} → ${reaction.receiverName} ` +
    `emoji=:${emoji}: #${reaction.channelName} sent=${sentCount + 1}/${WEEKLY_LIMIT} week=${weekStart}`
  );
  return { ok: true, reaction };
}

// 리액션 제거 처리. 반환값: { ok, reason?, removed? }
async function removeReaction({ fromSlackId, toSlackId, emoji, channelId, messageTs }) {
  if (!isAldaEmoji(emoji)) return { ok: false, reason: 'not_alda_emoji' };

  const { rows } = await pool.query(
    `DELETE FROM reactions
     WHERE id = (
       SELECT id FROM reactions
       WHERE from_slack_id = $1 AND to_slack_id = $2 AND emoji = $3 AND message_ts = $4
       ORDER BY created_at DESC LIMIT 1
     )
     RETURNING *`,
    [fromSlackId, toSlackId, emoji, messageTs]
  );

  if (rows.length === 0) {
    console.log(`[alda] ⚠️  제거할 리액션 없음 | giver=${fromSlackId} emoji=:${emoji}: ts=${messageTs}`);
    return { ok: false, reason: 'not_found' };
  }

  console.log(`[alda] ↩️  리액션 제거 | giver=${fromSlackId} → receiver=${toSlackId} emoji=:${emoji}: channel=${channelId}`);
  return { ok: true, removed: mapRow(rows[0]) };
}

// 관리자용: 전체 리액션 조회
async function queryAll(period) {
  const { sql, params } = buildPeriodWhere(period);
  const where = sql ? `WHERE ${sql}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM reactions ${where} ORDER BY created_at DESC`,
    params
  );
  return rows.map(mapRow);
}

// 관리자용: 요약 통계
async function queryStats(period) {
  const { sql, params } = buildPeriodWhere(period);
  const where = sql ? `WHERE ${sql}` : '';

  const [totalsRes, emojiRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(DISTINCT from_slack_id)::int AS unique_givers,
              COUNT(DISTINCT to_slack_id)::int AS unique_receivers
       FROM reactions ${where}`,
      params
    ),
    pool.query(
      `SELECT emoji, COUNT(*)::int AS cnt FROM reactions ${where} GROUP BY emoji`,
      params
    ),
  ]);

  const { total, unique_givers, unique_receivers } = totalsRes.rows[0];
  const byEmoji = {};
  for (const r of emojiRes.rows) byEmoji[r.emoji] = r.cnt;
  return { total, byEmoji, uniqueGivers: unique_givers, uniqueReceivers: unique_receivers };
}

// 내가 받은 리액션 조회
async function queryReceived(userId, period) {
  const { sql, params } = buildPeriodWhere(period, 2);
  const where = sql ? `AND ${sql}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM reactions WHERE to_slack_id = $1 ${where} ORDER BY created_at DESC`,
    [userId, ...params]
  );
  return rows.map(mapRow);
}

// Top N 수신자 집계 [{ slackId, receiverName, count, byEmoji }]
async function queryTopReceivers(period, limit = 5) {
  const { sql, params } = buildPeriodWhere(period);
  const where = sql ? `WHERE ${sql}` : '';

  const { rows: topRows } = await pool.query(
    `SELECT to_slack_id, MAX(receiver_name) AS receiver_name, COUNT(*)::int AS total
     FROM reactions ${where}
     GROUP BY to_slack_id
     ORDER BY total DESC
     LIMIT $${params.length + 1}`,
    [...params, limit]
  );

  if (topRows.length === 0) return [];

  const ids = topRows.map((r) => r.to_slack_id);
  const { sql: eSql, params: eParams } = buildPeriodWhere(period, 2);
  const eWhere = eSql ? `AND ${eSql}` : '';

  const { rows: emojiRows } = await pool.query(
    `SELECT to_slack_id, emoji, COUNT(*)::int AS cnt
     FROM reactions
     WHERE to_slack_id = ANY($1) ${eWhere}
     GROUP BY to_slack_id, emoji`,
    [ids, ...eParams]
  );

  const emojiMap = {};
  for (const r of emojiRows) {
    if (!emojiMap[r.to_slack_id]) emojiMap[r.to_slack_id] = {};
    emojiMap[r.to_slack_id][r.emoji] = r.cnt;
  }

  return topRows.map((r) => ({
    slackId:      r.to_slack_id,
    receiverName: r.receiver_name,
    count:        r.total,
    byEmoji:      emojiMap[r.to_slack_id] ?? {},
  }));
}

async function getWeeklyStats(weekStart = getWeekStart()) {
  const { rows } = await pool.query(
    `SELECT * FROM reactions WHERE week_start = $1 ORDER BY created_at DESC`,
    [weekStart]
  );
  return rows.map(mapRow);
}

module.exports = {
  isAldaEmoji,
  addReaction,
  removeReaction,
  getWeeklyStats,
  getWeekStart,
  getSentCount,
  queryAll,
  queryStats,
  queryReceived,
  queryTopReceivers,
  WEEKLY_LIMIT,
  ALDA_EMOJIS,
};
