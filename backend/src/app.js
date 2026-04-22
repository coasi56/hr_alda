const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const aldaRoutes = require('./routes/alda');
const membersRoutes = require('./routes/members');
const birthdayRoutes = require('./routes/birthday');
const noticeRoutes = require('./routes/notice');
const onboardingRoutes = require('./routes/onboarding');
const calendarRoutes = require('./routes/calendar');
const settingsRoutes = require('./routes/settings');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// express.json() 이전에 등록 — url_verification에 즉시 응답하고,
// 다른 Slack 이벤트는 raw Buffer를 그대로 넘겨 Bolt가 서명 검증에 사용할 수 있게 함
app.post('/slack/events', express.raw({ type: 'application/json' }), (req, res, next) => {
  try {
    const body = JSON.parse(req.body.toString('utf8'));
    if (body.type === 'url_verification') {
      return res.json({ challenge: body.challenge });
    }
  } catch (_) {}
  next();
});

app.use(express.json());

app.get('/', (_req, res) => res.json({ message: 'HR알다 백엔드 API' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/alda', aldaRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/birthday', birthdayRoutes);
app.use('/api/notice', noticeRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/settings', settingsRoutes);

app.use(errorHandler);

module.exports = app;
