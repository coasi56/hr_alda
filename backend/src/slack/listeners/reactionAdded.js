const aldaService = require('../../services/aldaService');

// Slack API 5개를 병렬 호출해 이름·메시지·링크 반환
// 각 항목이 실패해도 null/ID fallback으로 서비스 중단 방지
async function fetchNames(client, fromSlackId, toSlackId, channelId, messageTs) {
  const [giverRes, receiverRes, channelRes, historyRes, permalinkRes] = await Promise.allSettled([
    client.users.info({ user: fromSlackId }),
    client.users.info({ user: toSlackId }),
    client.conversations.info({ channel: channelId }),
    client.conversations.history({ channel: channelId, latest: messageTs, limit: 1, inclusive: true }),
    client.chat.getPermalink({ channel: channelId, message_ts: messageTs }),
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

  function extractMessageText(result) {
    if (result.status !== 'fulfilled' || !result.value.ok) return null;
    const text = result.value.messages?.[0]?.text ?? '';
    if (!text) return null;
    return text.length > 50 ? text.slice(0, 50) + '...' : text;
  }

  function extractPermalink(result) {
    if (result.status !== 'fulfilled' || !result.value.ok) return null;
    return result.value.permalink ?? null;
  }

  return {
    giverName: extractUserName(giverRes, fromSlackId),
    receiverName: extractUserName(receiverRes, toSlackId),
    channelName: extractChannelName(channelRes, channelId),
    messageText: extractMessageText(historyRes),
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
