require('dotenv').config();
const { createServer } = require('http');
const app = require('./app');
const { initSlack } = require('./config/slack');
const { testConnection } = require('./config/database');
const { startSchedulers } = require('./schedulers');

const PORT = process.env.PORT || 3000;

async function start() {
  if (process.env.NODE_ENV === 'production') {
    await testConnection();
  }

  const server = createServer(app);

  await initSlack(app, server);

  startSchedulers();

  server.listen(PORT, () => {
    console.log(`[server] running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
