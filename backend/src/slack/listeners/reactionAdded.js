const aldaService = require('../../services/aldaService');

module.exports = (app) => {
  app.event('reaction_added', async ({ event, client }) => {
    const { user: fromSlackId, reaction: emoji, item, item_user: toSlackId } = event;

    // 알다 이모지가 아니면 무시
    if (!aldaService.isAldaEmoji(emoji)) return;

    // 메시지 리액션만 처리 (파일/기타 아이템 제외)
    if (item.type !== 'message') {
      console.log(`[alda] ⚠️  메시지 외 아이템 리액션 무시 | type=${item.type} emoji=:${emoji}:`);
      return;
    }

    // item_user가 없는 경우 (봇 메시지 등)
    if (!toSlackId) {
      console.log(`[alda] ⚠️  수신자 없음 (봇 메시지?) | emoji=:${emoji}: channel=${item.channel}`);
      return;
    }

    const result = aldaService.addReaction({
      fromSlackId,
      toSlackId,
      emoji,
      channelId: item.channel,
      messageTs: item.ts,
    });

    if (!result.ok) {
      if (result.reason === 'self_reaction') {
        // 자기 자신에게 리액션 시 DM으로 안내
        try {
          await client.chat.postMessage({
            channel: fromSlackId,
            text: `자신의 메시지에는 :${emoji}: 리액션을 달 수 없어요. 동료를 응원해 주세요! 🙌`,
          });
        } catch (err) {
          console.error('[alda] DM 발송 실패 (자기 리액션 안내):', err.message);
        }
      } else if (result.reason === 'weekly_limit_exceeded') {
        // 주간 한도 초과 시 DM 안내
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
