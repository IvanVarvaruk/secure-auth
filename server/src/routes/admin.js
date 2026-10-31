const express = require('express');
const { query } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(requireAuth, requireRole('admin'));

router.get('/users', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id, email, role, is_activated, is_blocked, failed_attempts, locked_until,
            totp_enabled, (oidc_sub IS NOT NULL) AS via_oidc, created_at, last_login_at
     FROM users ORDER BY id`
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id, email: u.email, role: u.role,
      isActivated: u.is_activated, isBlocked: u.is_blocked,
      failedAttempts: u.failed_attempts,
      lockedUntil: u.locked_until && new Date(u.locked_until) > new Date() ? u.locked_until : null,
      totpEnabled: u.totp_enabled, viaOidc: u.via_oidc,
      createdAt: u.created_at, lastLoginAt: u.last_login_at,
    })),
  });
}));

// Журнал входів (останні N записів, опціонально за поштою)
router.get('/logs', wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const email = String(req.query.email || '').trim().toLowerCase();
  const { rows } = await query(
    `SELECT id, email, ip, user_agent, success, reason, created_at
     FROM login_log WHERE ($1 = '' OR email ILIKE '%' || $1 || '%')
     ORDER BY created_at DESC, id DESC LIMIT $2`,
    [email, limit]
  );
  res.json({ logs: rows });
}));

// Зведення: хто і скільки разів намагався увійти
router.get('/logs/summary', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT email, ip,
            COUNT(*) FILTER (WHERE NOT success)::int AS failed,
            COUNT(*) FILTER (WHERE success)::int AS succeeded,
            MAX(created_at) AS last_attempt
     FROM login_log GROUP BY email, ip
     ORDER BY failed DESC, last_attempt DESC LIMIT 100`
  );
  res.json({ summary: rows });
}));

router.post('/users/:id/block', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return res.status(400).json({ error: 'Не можна заблокувати власний обліковий запис' });
  const r = await query('UPDATE users SET is_blocked = TRUE WHERE id = $1', [id]);
  if (!r.rowCount) return res.status(404).json({ error: 'Користувача не знайдено' });
  res.json({ ok: true });
}));

router.post('/users/:id/unblock', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const r = await query('UPDATE users SET is_blocked = FALSE, failed_attempts = 0, locked_until = NULL WHERE id = $1', [id]);
  if (!r.rowCount) return res.status(404).json({ error: 'Користувача не знайдено' });
  res.json({ ok: true });
}));

module.exports = router;
