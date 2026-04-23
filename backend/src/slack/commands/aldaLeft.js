const aldaService = require('../../services/aldaService');

module.exports = (app) => {
  app.command('/alda_left', async ({ ack, respond, command }) => {
    console.log('[alda_left] 커맨드 수신:', command);
    // ack()를 가장 먼저 호출해 Slack 타임아웃 방지
    await ack();
    try {
      const weekStart = aldaService.getWeekStart();
      const sentCount = await aldaService.getSentCount(command.user_id, weekStart);
      const left = aldaService.WEEKLY_LIMIT - sentCount;
      const icon = left === 0 ? '😅' : left <= 3 ? '💛' : '🎉';

      await respond({
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${icon} 이번 주 알다 잔여 개수: *${left}개* 남았어요\n_(사용: ${sentCount}개 / 한도: ${aldaService.WEEKLY_LIMIT}개)_`,
            },
          },
        ],
      });
    } catch (err) {
      console.error('[alda] /alda_left 오류:', err.message);
      await respond({
        response_type: 'ephemeral',
        text: '❌ 조회 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
      }).catch(() => {});
    }
  });
};
