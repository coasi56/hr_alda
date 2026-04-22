const cron = require('node-cron');

function startSchedulers() {
  // 매주 월요일 00:00 KST (UTC 15:00 일요일) — 알다 주간 한도 리셋
  cron.schedule('0 15 * * 0', () => {
    console.log('[scheduler] alda weekly limit reset');
    // require('./aldaReset').run();
  });

  // 매일 00:00 KST (UTC 15:00) — 생일/기념일 체크
  cron.schedule('0 15 * * *', () => {
    console.log('[scheduler] birthday check');
    // require('./birthdayCheck').run();
  });

  // 매분 — 예약 공지 발송 체크
  cron.schedule('* * * * *', () => {
    // require('./noticeDispatch').run();
  });

  // 매분 — 온보딩 DM 발송 체크
  cron.schedule('* * * * *', () => {
    // require('./onboardingDispatch').run();
  });

  console.log('[schedulers] all schedulers started');
}

module.exports = { startSchedulers };
