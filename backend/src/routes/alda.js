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
router.get('/reactions', (req, res) => {
  const period = parsePeriod(req.query.period);
  const reactions = aldaService.queryAll(period);
  res.json(reactions);
});

// GET /api/alda/top?period=this_week&limit=5
router.get('/top', (req, res) => {
  const period = parsePeriod(req.query.period);
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  const top = aldaService.queryTopReceivers(period, limit);
  res.json(top);
});

// GET /api/alda/stats?period=this_week
router.get('/stats', (req, res) => {
  const period = parsePeriod(req.query.period);
  const stats = aldaService.queryStats(period);
  res.json(stats);
});

module.exports = router;
