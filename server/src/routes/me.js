const express = require('express');
const QRCode = require('qrcode');
const { authenticator } = require('otplib');
const { query } = require('../db/pool');
const { comparePassword } = require('../services/password');
const { requireAuth, publicUser } = require('../middleware/auth');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
authenticator.options = { window: 1 };

router.use(requireAuth);

router.get('/', (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/2fa/setup', wrap(async (req, res) => {
  if (req.user.totp_enabled) return res.status(400).json({ error: '2FA уже ввімкнено' });
  const secret = authenticator.generateSecret();
  await query('UPDATE users SET totp_secret = $2 WHERE id = $1', [req.user.id, secret]);
  const otpauth = authenticator.keyuri(req.user.email, 'SecureAuth', secret);
  res.json({ secret, qr: await QRCode.toDataURL(otpauth) });
}));

router.post('/2fa/enable', wrap(async (req, res) => {
  const code = String(req.body.code || '').replace(/\s/g, '');
  if (!req.user.totp_secret || req.user.totp_enabled) return res.status(400).json({ error: 'Спочатку розпочніть налаштування 2FA' });
  if (!authenticator.check(code, req.user.totp_secret)) return res.status(400).json({ error: 'Невірний код' });
  await query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [req.user.id]);
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: publicUser(rows[0]) });
}));

router.post('/2fa/disable', wrap(async (req, res) => {
  const u = req.user;
  if (!u.totp_enabled) return res.status(400).json({ error: '2FA не ввімкнено' });
  if (u.password_hash && !(await comparePassword(String(req.body.password || ''), u.password_hash))) {
    return res.status(400).json({ error: 'Невірний пароль' });
  }
  if (!authenticator.check(String(req.body.code || '').replace(/\s/g, ''), u.totp_secret)) {
    return res.status(400).json({ error: 'Невірний код' });
  }
  await query('UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1', [u.id]);
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [u.id]);
  res.json({ user: publicUser(rows[0]) });
}));

module.exports = router;
