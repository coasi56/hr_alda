const aldaService = require('../../services/aldaService');

const PERIOD_LABELS = { today: '오늘', this_week: '이번 주', this_month: '이번 달' };
const EMOJI_LABELS = {
  '알다-칭찬': ':알다-칭찬: 칭찬',
  '알다-신뢰': ':알다-신뢰: 신뢰',
  '알다-주도성': ':알다-주도성: 주도성',
  '알다-원팀': ':알다-원팀: 원팀',
};

function formatKST(isoString) {
  const kst = new Date(new Date(isoString).getTime() + 9 * 3600 * 1000);
  return kst.toISOString().replace('T', ' ').slice(0, 16);
}

function buildSelectModal() {
  return {
    type: 'modal',
    callback_id: 'alda_check_submit',
    title: { type: 'plain_text', text: '내 알다 내역', emoji: true },
    submit: { type: 'plain_text', text: '조회', emoji: true },
    close: { type: 'plain_text', text: '닫기', emoji: true },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '조회할 기간을 선택하세요.' },
      },
      {
        type: 'input',
        block_id: 'period_block',
        label: { type: 'plain_text', text: '기간' },
        element: {
          type: 'static_select',
          action_id: 'period_select',
          placeholder: { type: 'plain_text', text: '기간 선택' },
          options: [
            { text: { type: 'plain_text', text: '오늘' }, value: 'today' },
            { text: { type: 'plain_text', text: '이번 주' }, value: 'this_week' },
            { text: { type: 'plain_text', text: '이번 달' }, value: 'this_month' },
          ],
        },
      },
    ],
  };
}

function buildResultView(period, received) {
  const label = PERIOD_LABELS[period];
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${label} — ${received.length}건`, emoji: true },
    },
  ];

  if (received.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `_${label}에 받은 알다 리액션이 없어요._ 😊` },
    });
  } else {
    const items = received.slice(0, 20); // 모달 블록 한도 고려
    for (const r of items) {
      blocks.push({ type: 'divider' });
      blocks.push({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*이모지*\n${EMOJI_LABELS[r.emoji] ?? `:${r.emoji}:`}` },
          { type: 'mrkdwn', text: `*보낸 사람*\n<@${r.fromSlackId}>` },
          { type: 'mrkdwn', text: `*채널*\n<#${r.channelId}>` },
          { type: 'mrkdwn', text: `*시간*\n${formatKST(r.createdAt)} KST` },
        ],
      });
    }
    if (received.length > 20) {
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `_외 ${received.length - 20}건 더 있어요._` }],
      });
    }
  }

  return {
    type: 'modal',
    title: { type: 'plain_text', text: '내 알다 내역', emoji: true },
    close: { type: 'plain_text', text: '닫기', emoji: true },
    blocks,
  };
}

function buildErrorView() {
  return {
    type: 'modal',
    title: { type: 'plain_text', text: '내 알다 내역', emoji: true },
    close: { type: 'plain_text', text: '닫기', emoji: true },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '❌ 조회 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' },
      },
    ],
  };
}

module.exports = (app) => {
  app.command('/alda_check', async ({ ack, body, client, command }) => {
    console.log('[alda_check] 커맨드 수신:', command);
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildSelectModal(),
      });
    } catch (err) {
      console.error('[alda] /alda_check 모달 열기 실패:', err.message);
    }
  });

  // app.view: ack()가 결과 뷰를 담고 있으므로 throw 시 ack 누락 → 반드시 try-catch 안에서 ack
  app.view('alda_check_submit', async ({ ack, view, body }) => {
    try {
      const period = view.state.values.period_block.period_select.selected_option.value;
      const userId = body.user.id;
      const received = aldaService.queryReceived(userId, period);

      console.log(`[alda] /alda_check | user=${userId} period=${period} count=${received.length}`);

      await ack({
        response_action: 'update',
        view: buildResultView(period, received),
      });
    } catch (err) {
      console.error('[alda] /alda_check view submit 오류:', err);
      await ack({
        response_action: 'update',
        view: buildErrorView(),
      });
    }
  });
};
