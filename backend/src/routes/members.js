const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { getSheetsClient } = require('../config/google');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/members — 구성원 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY name ASC');
    const settings = await pool.query('SELECT updated_at FROM birthday_settings WHERE id = 1');
    res.json({
      members: result.rows,
      lastSync: settings.rows[0]?.updated_at || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/sync — Google Sheets에서 불러오기
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:F1000',
    });

    const rows = (response.data.values || []).filter(r => r[0]);
    let added = 0, updated = 0, deleted = 0;

    // 스프레드시트에 없는 DB 멤버 삭제
    const sheetEmails = rows.map(r => r[2]).filter(Boolean);
    const dbMembers = await pool.query('SELECT id, email FROM members');
    for (const dbMember of dbMembers.rows) {
      if (dbMember.email && !sheetEmails.includes(dbMember.email)) {
        await pool.query('DELETE FROM members WHERE id = $1', [dbMember.id]);
        deleted++;
      }
    }

    // 추가 / 수정
    for (const row of rows) {
      const [name, slack_id, email, birthday, hire_date, department] = row;
      const existing = await pool.query('SELECT id FROM members WHERE email = $1', [email || null]);

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE members SET name=$1, slack_id=$2, birthday=$3,
           hire_date=$4, department=$5, updated_at=NOW() WHERE id=$6`,
          [name, slack_id || null, birthday || null, hire_date || null, department || null, existing.rows[0].id]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO members (name, slack_id, email, birthday, hire_date, department)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [name, slack_id || null, email || null, birthday || null, hire_date || null, department || null]
        );
        added++;
      }
    }

    await pool.query('UPDATE birthday_settings SET updated_at = NOW() WHERE id = 1');

    res.json({
      success: true,
      total: rows.length,
      added,
      updated,
      deleted,
      message: `${rows.length}명 확인, ${added}명 추가, ${updated}명 수정, ${deleted}명 삭제`,
    });
  } catch (err) {
    console.error('[members/sync]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/members/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;