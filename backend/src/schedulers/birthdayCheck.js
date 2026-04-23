const { runBirthdayCheck } = require('../services/birthdayService');

async function run() {
  try {
    await runBirthdayCheck();
  } catch (err) {
    console.error('[scheduler/birthdayCheck] 오류:', err);
  }
}

module.exports = { run };