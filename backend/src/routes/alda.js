const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const aldaService = require('../services/aldaService');

const router = express.Router();
router.use(authMiddleware);

const VALID_PERIODS = new Set(['today', 'this_week', 'this_month', 'all']);

function parsePeriod(query) {
  return VALID_PERIODS.has(query) ? query : 'this_week';
}

// GET /api/alda/reactions?period=this_week
router.get('/reactions', async (req, res) => {
  try {
    const period = parsePeriod(req.query.period);
    const reactions = await aldaService.queryAll(period);
    res.json(reactions);
  } catch (err) {
    console.error('[alda] GET /reactions 오류:', err.message);
    res.status(500).json({ message: '조회 중 오류가 발생했어요.' });
  }
});

// GET /api/alda/top?period=this_week&limit=5
router.get('/top', async (req, res) => {
  try {
    const period = parsePeriod(req.query.period);
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const top = await aldaService.queryTopReceivers(period, limit);
    res.json(top);
  } catch (err) {
    console.error('[alda] GET /top 오류:', err.message);
    res.status(500).json({ message: '조회 중 오류가 발생했어요.' });
  }
});

// GET /api/alda/stats?period=this_week
router.get('/stats', async (req, res) => {
  try {
    const period = parsePeriod(req.query.period);
    const stats = await aldaService.queryStats(period);
    res.json(stats);
  } catch (err) {
    console.error('[alda] GET /stats 오류:', err.message);
    res.status(500).json({ message: '조회 중 오류가 발생했어요.' });
  }
});

module.exports = router;
