// In-memory store for Phase 1 (DB 없이 테스트용)
const ALDA_EMOJIS = new Set(['알다-칭찬', '알다-신뢰', '알다-주도성', '알다-원팀']);
const WEEKLY_LIMIT = 10;

// reactions: [{ id, fromSlackId, toSlackId, emoji, channelId, messageTs, weekStart, createdAt }]
const reactions = [];
// weeklyLimits: Map<"userId:weekStart", sentCount>
const weeklyLimits = new Map();

let nextId = 1;

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getSentCount(userId, weekStart) {
  return weeklyLimits.get(`${userId}:${weekStart}`) ?? 0;
}

function incrementSentCount(userId, weekStart) {
  const key = `${userId}:${weekStart}`;
  weeklyLimits.set(key, (weeklyLimits.get(key) ?? 0) + 1);
}

function decrementSentCount(userId, weekStart) {
  const key = `${userId}:${weekStart}`;
  const current = weeklyLimits.get(key) ?? 0;
  if (current > 0) weeklyLimits.set(key, current - 1);
}

function isAldaEmoji(emoji) {
  return ALDA_EMOJIS.has(emoji);
}

// 리액션 추가 처리. 반환값: { ok, reason, reaction? }
function addReaction({ fromSlackId, toSlackId, emoji, channelId, messageTs, giverName, receiverName, channelName }) {
  if (!isAldaEmoji(emoji)) return { ok: false, reason: 'not_alda_emoji' };

  if (fromSlackId === toSlackId) {
    console.log(`[alda] ❌ 자기 리액션 방지 | giver=${giverName ?? fromSlackId} emoji=:${emoji}:`);
    return { ok: false, reason: 'self_reaction' };
  }

  const weekStart = getWeekStart();
  const sentCount = getSentCount(fromSlackId, weekStart);

  if (sentCount >= WEEKLY_LIMIT) {
    console.log(`[alda] ❌ 주간 한도 초과 | giver=${giverName ?? fromSlackId} sent=${sentCount}/${WEEKLY_LIMIT} week=${weekStart}`);
    return { ok: false, reason: 'weekly_limit_exceeded', sentCount, limit: WEEKLY_LIMIT };
  }

  const reaction = {
    id: nextId++,
    fromSlackId,
    giverName: giverName || fromSlackId,
    toSlackId,
    receiverName: receiverName || toSlackId,
    emoji,
    channelId,
    channelName: channelName || channelId,
    messageTs,
    weekStart,
    createdAt: new Date().toISOString(),
  };

  reactions.push(reaction);
  incrementSentCount(fromSlackId, weekStart);

  console.log(
    `[alda] ✅ 리액션 추가 | ${reaction.giverName} → ${reaction.receiverName} ` +
    `emoji=:${emoji}: #${reaction.channelName} sent=${sentCount + 1}/${WEEKLY_LIMIT} week=${weekStart}`
  );

  return { ok: true, reaction };
}

// 리액션 제거 처리. 반환값: { ok, removed }
function removeReaction({ fromSlackId, toSlackId, emoji, channelId, messageTs }) {
  if (!isAldaEmoji(emoji)) return { ok: false, reason: 'not_alda_emoji' };

  const idx = reactions.findLastIndex(
    (r) =>
      r.fromSlackId === fromSlackId &&
      r.toSlackId === toSlackId &&
      r.emoji === emoji &&
      r.messageTs === messageTs
  );

  if (idx === -1) {
    console.log(`[alda] ⚠️  제거할 리액션 없음 | giver=${fromSlackId} emoji=:${emoji}: ts=${messageTs}`);
    return { ok: false, reason: 'not_found' };
  }

  const [removed] = reactions.splice(idx, 1);
  decrementSentCount(fromSlackId, removed.weekStart);

  console.log(
    `[alda] ↩️  리액션 제거 | giver=${fromSlackId} → receiver=${toSlackId} ` +
    `emoji=:${emoji}: channel=${channelId}`
  );

  return { ok: true, removed };
}

function getReactions() {
  return [...reactions];
}

function getWeeklyStats(weekStart = getWeekStart()) {
  return reactions.filter((r) => r.weekStart === weekStart);
}

// period: 'today' | 'this_week' | 'this_month' | 'all'
function makePeriodFilter(period) {
  const now = new Date();
  if (period === 'today') {
    const today = now.toISOString().slice(0, 10);
    return (r) => r.createdAt.slice(0, 10) === today;
  }
  if (period === 'this_week') {
    const wk = getWeekStart();
    return (r) => r.weekStart === wk;
  }
  if (period === 'this_month') {
    const month = now.toISOString().slice(0, 7);
    return (r) => r.createdAt.slice(0, 7) === month;
  }
  return () => true; // 'all'
}

// 관리자용: 전체 리액션 조회
function queryAll(period) {
  const filter = makePeriodFilter(period);
  return reactions.filter(filter);
}

// 관리자용: 요약 통계
function queryStats(period) {
  const filtered = queryAll(period);
  const byEmoji = {};
  for (const r of filtered) {
    byEmoji[r.emoji] = (byEmoji[r.emoji] ?? 0) + 1;
  }
  const uniqueGivers = new Set(filtered.map((r) => r.fromSlackId)).size;
  const uniqueReceivers = new Set(filtered.map((r) => r.toSlackId)).size;
  return { total: filtered.length, byEmoji, uniqueGivers, uniqueReceivers };
}

// 내가 받은 리액션 조회
function queryReceived(userId, period) {
  const filter = makePeriodFilter(period);
  return reactions.filter((r) => r.toSlackId === userId && filter(r));
}

// Top N 수신자 집계 [{ slackId, receiverName, count, byEmoji: { emoji: count } }]
function queryTopReceivers(period, limit = 5) {
  const filter = makePeriodFilter(period);
  const counts = {};
  for (const r of reactions) {
    if (!filter(r)) continue;
    if (!counts[r.toSlackId]) {
      counts[r.toSlackId] = { total: 0, byEmoji: {}, receiverName: r.receiverName || r.toSlackId };
    }
    counts[r.toSlackId].total += 1;
    counts[r.toSlackId].byEmoji[r.emoji] = (counts[r.toSlackId].byEmoji[r.emoji] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, limit)
    .map(([slackId, { total, byEmoji, receiverName }]) => ({ slackId, receiverName, count: total, byEmoji }));
}

module.exports = {
  isAldaEmoji,
  addReaction,
  removeReaction,
  getReactions,
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
