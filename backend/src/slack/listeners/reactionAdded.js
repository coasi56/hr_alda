const aldaService = require('../../services/aldaService');

function sanitize(text) {
  return text.replace(/:[a-z0-9_+\-]+:/gi, '').replace(/\s+/g, ' ').trim();
}

function truncate(text, maxLen) {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

// 메시지 텍스트 조회 — top-level → 스레드 순서로 순차 시도
async function fetchMessageText(client, channelId, messageTs) {
  // 1단계: conversations.history (일반 채널 메시지)
  try {
    const res = await client.conversations.history({
      channel: channelId,
      latest: messageTs,
      limit: 1,
      inclusive: true,
    });
    // ts를 직접 비교해서 정확한 메시지만 사용
    const msg = res.messages?.find((m) => m.ts === messageTs);
    if (msg?.text) {
      console.log('[alda] 메시지 조회 성공 (history)');
      return truncate(sanitize(msg.text), 50);
    }
  } catch (err) {
    console.warn('[alda] conversations.history 실패:', err.message);
  }

  // 2단계: conversations.replies (스레드 메시지 fallback)
  // messageTs를 thread_ts로 사용 — 스레드 부모 or DM 스레드에 리액션 달린 경우 커버
  try {
    const res = await client.conversations.replies({
      channel: channelId,
      ts: messageTs,
      latest: messageTs,
      limit: 1,
      inclusive: true,
    });
    const msg = res.messages?.find((m) => m.ts === messageTs);
    if (msg?.text) {
      console.log('[alda] 메시지 조회 성공 (replies)');
      return truncate(sanitize(msg.text), 50);
    }
  } catch (err) {
    console.warn('[alda] conversations.replies 실패:', err.message);
  }

  return null;
}

// 이름·채널·링크는 병렬, 메시지 텍스트는 순차 fallback — 모두 동시에 시작
async function fetchNames(client, fromSlackId, toSlackId, channelId, messageTs) {
  const [[giverRes, receiverRes, channelRes, permalinkRes], messageText] = await Promise.all([
    Promise.allSettled([
      client.users.info({ user: fromSlackId }),
      client.users.info({ user: toSlackId }),
      client.conversations.info({ channel: channelId }),
      client.chat.getPermalink({ channel: channelId, message_ts: messageTs }),
    ]),
    fetchMessageText(client, channelId, messageTs),
  ]);

  function extractUserName(result, fallback) {
    if (result.status !== 'fulfilled' || !result.value.ok) return fallback;
    const p = result.value.user.profile;
    return p.display_name || p.real_name || fallback;
  }

  function extractChannelName(result, fallback) {
    if (result.status !== 'fulfilled' || !result.value.ok) return fallback;
    return result.value.channel.name || fallback;
  }

  function extractPermalink(result) {
    if (result.status !== 'fulfilled' || !result.value.ok) return null;
    return result.value.permalink ?? null;
  }

  return {
    giverName: extractUserName(giverRes, fromSlackId),
    receiverName: extractUserName(receiverRes, toSlackId),
    channelName: extractChannelName(channelRes, channelId),
    messageText,
    permalinkUrl: extractPermalink(permalinkRes),
  };
}

module.exports = (app) => {
  app.event('reaction_added', async ({ event, client }) => {
    const { user: fromSlackId, reaction: emoji, item, item_user: toSlackId } = event;

    if (!aldaService.isAldaEmoji(emoji)) return;

    if (item.type !== 'message') {
      console.log(`[alda] ⚠️  메시지 외 아이템 리액션 무시 | type=${item.type} emoji=:${emoji}:`);
      return;
    }

    if (!toSlackId) {
      console.log(`[alda] ⚠️  수신자 없음 (봇 메시지?) | emoji=:${emoji}: channel=${item.channel}`);
      return;
    }

    // 이름·메시지·링크 조회 — 실패해도 ID fallback으로 진행
    let names = { giverName: fromSlackId, receiverName: toSlackId, channelName: item.channel, messageText: null, permalinkUrl: null };
    try {
      names = await fetchNames(client, fromSlackId, toSlackId, item.channel, item.ts);
      console.log(`[alda] 조회 완료 | ${names.giverName} → ${names.receiverName} (#${names.channelName}) msg="${names.messageText ?? ''}"`);
    } catch (err) {
      console.error('[alda] 이름 조회 실패 (ID로 대체):', err.message);
    }

    const result = aldaService.addReaction({
      fromSlackId,
      toSlackId,
      emoji,
      channelId: item.channel,
      messageTs: item.ts,
      ...names,
    });

    if (!result.ok) {
      if (result.reason === 'self_reaction') {
        try {
          await client.chat.postMessage({
            channel: fromSlackId,
            text: `자신의 메시지에는 :${emoji}: 리액션을 달 수 없어요. 동료를 응원해 주세요! 🙌`,
          });
        } catch (err) {
          console.error('[alda] DM 발송 실패 (자기 리액션 안내):', err.message);
        }
      } else if (result.reason === 'weekly_limit_exceeded') {
        try {
          await client.chat.postMessage({
            channel: fromSlackId,
            text: `이번 주 알다 리액션 한도(${aldaService.WEEKLY_LIMIT}개)를 모두 사용했어요. 다음 주 월요일에 다시 채워집니다! 💪`,
          });
        } catch (err) {
          console.error('[alda] DM 발송 실패 (한도 초과 안내):', err.message);
        }
      }
    }
  });
};
