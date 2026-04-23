const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/birthday/templates — 템플릿 조회
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM birthday_templates ORDER BY type, channel'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/birthday/templates/:id — 템플릿 수정
router.put('/templates/:id', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    await pool.query(
      'UPDATE birthday_templates SET content=$1, updated_at=NOW() WHERE id=$2',
      [content, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/birthday/settings — 발송 설정 조회
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM birthday_settings WHERE id = 1'
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/birthday/settings — 발송 설정 수정
router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const { send_channel, birthday_time, anniversary_time } = req.body;
    await pool.query(
      `UPDATE birthday_settings SET send_channel=$1, birthday_time=$2,
       anniversary_time=$3, updated_at=NOW() WHERE id=1`,
      [send_channel, birthday_time, anniversary_time]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/birthday/logs — 발송 이력
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM send_logs ORDER BY sent_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/birthday/test-run — 스케줄러 즉시 테스트 실행
router.post('/test-run', authMiddleware, async (req, res) => {
  try {
    const { runBirthdayCheck } = require('../services/birthdayService');
    await runBirthdayCheck();
    res.json({ success: true, message: '발송 체크 완료 — 서버 로그 확인' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/birthday/holidays — 공휴일 목록
router.get('/holidays', authMiddleware, async (req, res) => {
  try {
    const { year } = req.query;
    const result = await pool.query(
      'SELECT * FROM holidays WHERE year = $1 ORDER BY date ASC',
      [year || new Date().getFullYear()]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/birthday/holidays — 공휴일 추가
router.post('/holidays', authMiddleware, async (req, res) => {
  try {
    const { date, name } = req.body;
    const year = new Date(date).getFullYear();
    await pool.query(
      'INSERT INTO holidays (date, name, year) VALUES ($1, $2, $3)',
      [date, name, year]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/birthday/holidays/:id — 공휴일 삭제
router.delete('/holidays/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM holidays WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;