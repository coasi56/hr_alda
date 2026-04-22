const aldaService = require('../../services/aldaService');

const PERIOD_LABELS = { this_week: '이번 주', this_month: '이번 달', all: '전체' };
const RANK_ICONS = ['🥇', '🥈', '🥉'];
const EMOJI_SHORT = {
  '알다-칭찬': '칭찬',
  '알다-신뢰': '신뢰',
  '알다-주도성': '주도성',
  '알다-원팀': '원팀',
};

function buildSelectModal() {
  return {
    type: 'modal',
    callback_id: 'alda_board_submit',
    title: { type: 'plain_text', text: '알다 랭킹 보드', emoji: true },
    submit: { type: 'plain_text', text: '조회', emoji: true },
    close: { type: 'plain_text', text: '닫기', emoji: true },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '기간별 알다 Top 5를 조회합니다.' },
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
            { text: { type: 'plain_text', text: '이번 주' }, value: 'this_week' },
            { text: { type: 'plain_text', text: '이번 달' }, value: 'this_month' },
            { text: { type: 'plain_text', text: '전체' }, value: 'all' },
          ],
        },
      },
    ],
  };
}

function buildEmojiBreakdown(byEmoji) {
  return Object.entries(byEmoji)
    .map(([emoji, cnt]) => `${EMOJI_SHORT[emoji] ?? emoji} ${cnt}개`)
    .join(' · ');
}

function buildResultView(period, topList) {
  const label = PERIOD_LABELS[period];
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${label} 알다 Top 5`, emoji: true },
    },
  ];

  if (topList.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `_${label}에 집계된 알다 리액션이 없어요._ 😊` },
    });
  } else {
    blocks.push({ type: 'divider' });
    topList.forEach(({ slackId, count, byEmoji }, idx) => {
      const rankIcon = RANK_ICONS[idx] ?? `${idx + 1}위`;
      const breakdown = buildEmojiBreakdown(byEmoji);
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${rankIcon}  <@${slackId}>  *${count}개*\n_${breakdown}_`,
        },
      });
    });
  }

  return {
    type: 'modal',
    title: { type: 'plain_text', text: '알다 랭킹 보드', emoji: true },
    close: { type: 'plain_text', text: '닫기', emoji: true },
    blocks,
  };
}

function buildErrorView() {
  return {
    type: 'modal',
    title: { type: 'plain_text', text: '알다 랭킹 보드', emoji: true },
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
  app.command('/alda_board', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildSelectModal(),
      });
    } catch (err) {
      console.error('[alda] /alda_board 모달 열기 실패:', err.message);
    }
  });

  app.view('alda_board_submit', async ({ ack, view }) => {
    try {
      const period = view.state.values.period_block.period_select.selected_option.value;
      const topList = aldaService.queryTopReceivers(period, 5);

      console.log(`[alda] /alda_board | period=${period} top=${topList.length}명`);

      await ack({
        response_action: 'update',
        view: buildResultView(period, topList),
      });
    } catch (err) {
      console.error('[alda] /alda_board view submit 오류:', err);
      await ack({
        response_action: 'update',
        view: buildErrorView(),
      });
    }
  });
};
