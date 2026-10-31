const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../db/pool');

const COOKIE = 'token';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  maxAge: 60 * 60 * 1000,
};

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, purpose: 'session' }, config.jwtSecret, { expiresIn: '1h' });
  res.cookie(COOKIE, token, cookieOptions);
}

function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.isProd });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE];
    if (!token) return res.status(401).json({ error: 'Потрібна автентифікація' });
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Сесія недійсна або закінчилась' });
    }
    if (payload.purpose !== 'session') return res.status(401).json({ error: 'Недійсний токен' });
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    const user = rows[0];
    if (!user || user.is_blocked) {
      clearSession(res);
      return res.status(401).json({ error: 'Обліковий запис недоступний' });
    }
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Недостатньо прав' });

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  isActivated: u.is_activated,
  isBlocked: u.is_blocked,
  totpEnabled: u.totp_enabled,
  hasPassword: !!u.password_hash,
  viaOidc: !!u.oidc_sub,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at,
});

module.exports = { issueSession, clearSession, requireAuth, requireRole, publicUser };
