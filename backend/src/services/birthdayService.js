const { pool } = require('../config/database');
const { getSlackApp } = require('../config/slack');

// 변수 치환 함수
function applyTemplate(template, vars) {
  return template
    .replace(/{{이름}}/g, vars.name || '')
    .replace(/{{연차}}/g, vars.years || '')
    .replace(/{{부서}}/g, vars.department || '')
    .replace(/{{생일}}/g, vars.birthday || '')
    .replace(/{{입사일}}/g, vars.hire_date || '');
}

// 올해 기준 연차 계산
function calcYears(hireDate) {
  const today = new Date();
  const hire = new Date(hireDate);
  return today.getFullYear() - hire.getFullYear();
}

// 오늘 날짜 MM-DD 반환
function todayMMDD() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

// 오늘이 공휴일/주말인지 확인 → 직전 영업일의 날짜들 반환
async function getTargetDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=일, 1=월 ... 6=토

  const dates = [];

  // 오늘 날짜 추가
  dates.push(formatMMDD(today));

  // 금요일이면 토/일도 추가 (직전 영업일 = 금요일에 처리)
  if (dayOfWeek === 5) {
    const sat = new Date(today); sat.setDate(today.getDate() + 1);
    const sun = new Date(today); sun.setDate(today.getDate() + 2);
    dates.push(formatMMDD(sat));
    dates.push(formatMMDD(sun));
  }

  // 공휴일 처리: 오늘이 공휴일이면 직전 영업일에서 처리했으므로 스킵
  const todayFull = formatYYYYMMDD(today);
  const holidayCheck = await pool.query(
    'SELECT id FROM holidays WHERE date = $1',
    [todayFull]
  );
  if (holidayCheck.rows.length > 0) return []; // 공휴일엔 발송 안 함

  // 내일이 공휴일이면 오늘 미리 처리
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowFull = formatYYYYMMDD(tomorrow);
  const tomorrowHoliday = await pool.query(
    'SELECT id FROM holidays WHERE date = $1',
    [tomorrowFull]
  );
  if (tomorrowHoliday.rows.length > 0) {
    dates.push(formatMMDD(tomorrow));
  }

  return [...new Set(dates)];
}

function formatMMDD(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function formatYYYYMMDD(date) {
  return date.toISOString().split('T')[0];
}

// 이미 오늘 발송했는지 확인
async function alreadySent(slackId, eventType) {
  const today = formatYYYYMMDD(new Date());
  const result = await pool.query(
    `SELECT id FROM send_logs
     WHERE target_slack_id = $1
       AND event_type = $2
       AND DATE(sent_at) = $3
       AND status = 'success'`,
    [slackId, eventType, today]
  );
  return result.rows.length > 0;
}

// 발송 이력 저장
async function saveLog(data) {
  await pool.query(
    `INSERT INTO send_logs (event_type, target_slack_id, target_name, channel, status, error_msg)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [data.eventType, data.slackId, data.name, data.channel, data.status, data.errorMsg || null]
  );
}

// 메인 실행 함수
async function runBirthdayCheck() {
  console.log('[birthdayCheck] 시작');

  const targetDates = await getTargetDates();
  if (targetDates.length === 0) {
    console.log('[birthdayCheck] 오늘은 공휴일 — 발송 스킵');
    return;
  }

  // 설정 불러오기
  const settingsResult = await pool.query('SELECT * FROM birthday_settings WHERE id = 1');
  const settings = settingsResult.rows[0];
  const sendChannel = settings?.send_channel || 'general';

  // 템플릿 불러오기
  const templatesResult = await pool.query('SELECT * FROM birthday_templates');
  const templates = {};
  for (const t of templatesResult.rows) {
    templates[`${t.type}_${t.channel}`] = t.content;
  }

  const slack = getSlackApp();

  // 생일 체크
  for (const mmdd of targetDates) {
    const birthdayMembers = await pool.query(
      'SELECT * FROM members WHERE birthday = $1 AND slack_id IS NOT NULL',
      [mmdd]
    );

    for (const member of birthdayMembers.rows) {
      if (await alreadySent(member.slack_id, 'birthday')) {
        console.log(`[birthdayCheck] ${member.name} 생일 이미 발송됨 — 스킵`);
        continue;
      }

      const vars = { name: member.name, department: member.department, birthday: member.birthday };

      // 공개 채널 발송
      try {
        const publicMsg = applyTemplate(templates['birthday_public'] || '🎂 {{이름}}님 생일을 축하해요!', vars);
        await slack.client.chat.postMessage({
          channel: sendChannel,
          text: publicMsg,
        });
        await saveLog({ eventType: 'birthday', slackId: member.slack_id, name: member.name, channel: sendChannel, status: 'success' });
        console.log(`[birthdayCheck] ${member.name} 생일 공개채널 발송 완료`);
      } catch (err) {
        await saveLog({ eventType: 'birthday', slackId: member.slack_id, name: member.name, channel: sendChannel, status: 'fail', errorMsg: err.message });
        console.error(`[birthdayCheck] ${member.name} 공개채널 발송 실패:`, err.message);
      }

      // DM 발송
      try {
        const dmMsg = applyTemplate(templates['birthday_dm'] || '🎂 {{이름}}님 생일 축하드려요!', vars);
        await slack.client.chat.postMessage({
          channel: member.slack_id,
          text: dmMsg,
        });
        await saveLog({ eventType: 'birthday_dm', slackId: member.slack_id, name: member.name, channel: 'DM', status: 'success' });
        console.log(`[birthdayCheck] ${member.name} 생일 DM 발송 완료`);
      } catch (err) {
        await saveLog({ eventType: 'birthday_dm', slackId: member.slack_id, name: member.name, channel: 'DM', status: 'fail', errorMsg: err.message });
        console.error(`[birthdayCheck] ${member.name} DM 발송 실패:`, err.message);
      }
    }
  }

  // 입사기념일 체크
  for (const mmdd of targetDates) {
    const anniversaryMembers = await pool.query(
      `SELECT * FROM members
       WHERE TO_CHAR(hire_date, 'MM-DD') = $1
         AND slack_id IS NOT NULL`,
      [mmdd]
    );

    for (const member of anniversaryMembers.rows) {
      if (await alreadySent(member.slack_id, 'anniversary')) {
        console.log(`[birthdayCheck] ${member.name} 기념일 이미 발송됨 — 스킵`);
        continue;
      }

      const years = calcYears(member.hire_date);
      const vars = { name: member.name, department: member.department, years, hire_date: member.hire_date };

      // 공개 채널 발송
      try {
        const publicMsg = applyTemplate(templates['anniversary_public'] || '🎊 {{이름}}님 입사 {{연차}}주년!', vars);
        await slack.client.chat.postMessage({
          channel: sendChannel,
          text: publicMsg,
        });
        await saveLog({ eventType: 'anniversary', slackId: member.slack_id, name: member.name, channel: sendChannel, status: 'success' });
        console.log(`[birthdayCheck] ${member.name} 기념일 공개채널 발송 완료`);
      } catch (err) {
        await saveLog({ eventType: 'anniversary', slackId: member.slack_id, name: member.name, channel: sendChannel, status: 'fail', errorMsg: err.message });
        console.error(`[birthdayCheck] ${member.name} 공개채널 발송 실패:`, err.message);
      }

      // DM 발송
      try {
        const dmMsg = applyTemplate(templates['anniversary_dm'] || '🎊 {{이름}}님 입사 {{연차}}주년 축하드려요!', vars);
        await slack.client.chat.postMessage({
          channel: member.slack_id,
          text: dmMsg,
        });
        await saveLog({ eventType: 'anniversary_dm', slackId: member.slack_id, name: member.name, channel: 'DM', status: 'success' });
        console.log(`[birthdayCheck] ${member.name} 기념일 DM 발송 완료`);
      } catch (err) {
        await saveLog({ eventType: 'anniversary_dm', slackId: member.slack_id, name: member.name, channel: 'DM', status: 'fail', errorMsg: err.message });
        console.error(`[birthdayCheck] ${member.name} 기념일 DM 발송 실패:`, err.message);
      }
    }
  }

  console.log('[birthdayCheck] 완료');
}

module.exports = { runBirthdayCheck };