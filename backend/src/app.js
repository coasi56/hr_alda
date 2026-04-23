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

// CORS 설정
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hr-alda.vercel.app',
    'https://hralda-bd82w7hce-hahapapa.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// /slack/events는 Bolt가 전담 처리 — 여기서 건드리지 않음
// url_verification은 Bolt 내부에서 자동 처리됨

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