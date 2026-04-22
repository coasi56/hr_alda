const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD || 'alda4ever!';  // ← 수정

    console.log(`[auth] 로그인 시도: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    }

    if (email !== adminEmail || password !== adminPassword) {
      console.log(`[auth] 로그인 실패: 잘못된 자격증명`);
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log(`[auth] 로그인 성공: ${email}`);
    res.json({ token, email });
  } catch (error) {
    console.error(`[auth] 로그인 에러:`, error);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다.' });
  }
});

module.exports = router;