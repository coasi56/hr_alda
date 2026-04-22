const { App, ExpressReceiver } = require('@slack/bolt');
const reactionAdded = require('../slack/listeners/reactionAdded');
const reactionRemoved = require('../slack/listeners/reactionRemoved');
const aldaCheck = require('../slack/commands/aldaCheck');
const aldaBoard = require('../slack/commands/aldaBoard');
const aldaLeft = require('../slack/commands/aldaLeft');
const notice = require('../slack/commands/notice');

let slackApp;

async function initSlack(expressApp, httpServer) {
  const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    app: expressApp,
    // Slack 이벤트는 POST /slack/events 로 수신
    endpoints: '/slack/events',
  });

  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
  });

  // 이벤트 리스너 등록
  reactionAdded(slackApp);
  reactionRemoved(slackApp);

  // 슬래시 커맨드 등록
  aldaCheck(slackApp);
  aldaBoard(slackApp);
  aldaLeft(slackApp);
  notice(slackApp);

  console.log('[slack] bolt app initialized');
}

function getSlackApp() {
  if (!slackApp) throw new Error('Slack app not initialized');
  return slackApp;
}

module.exports = { initSlack, getSlackApp };
