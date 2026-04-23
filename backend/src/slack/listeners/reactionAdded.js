const aldaService = require('../../services/aldaService');

// users.info / conversations.info를 병렬로 호출해 표시 이름 반환
// 실패 시 Slack ID/채널 ID를 그대로 반환 (서비스 중단 방지)
async function fetchNames(client, fromSlackId, toSlackId, channelId) {
  const [giverRes, receiverRes, channelRes] = await Promise.allSettled([
    client.users.info({ user: fromSlackId }),
    client.users.info({ user: toSlackId }),
    client.conversations.info({ channel: channelId }),
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

  return {
    giverName: extractUserName(giverRes, fromSlackId),
    receiverName: extractUserName(receiverRes, toSlackId),
    channelName: extractChannelName(channelRes, channelId),
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

    // 이름 조회 — 실패해도 ID fallback으로 진행
    let names = { giverName: fromSlackId, receiverName: toSlackId, channelName: item.channel };
    try {
      names = await fetchNames(client, fromSlackId, toSlackId, item.channel);
      console.log(`[alda] 이름 조회 완료 | ${names.giverName} → ${names.receiverName} (#${names.channelName})`);
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
