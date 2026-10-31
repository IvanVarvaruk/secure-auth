const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const { Issuer, generators } = require('openid-client');
const config = require('../config');
const { query } = require('../db/pool');
const { validatePassword, hashPassword, comparePassword, DUMMY_HASH } = require('../services/password');
const { createToken, consumeToken } = require('../services/tokens');
const { sendActivationEmail, sendResetEmail } = require('../services/mail');
const { createCaptcha, verifyCaptcha } = require('../services/captcha');
const { logAttempt } = require('../services/loginLog');
const { issueSession, clearSession, publicUser } = require('../middleware/auth');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail = (e) => String(e || '').trim().toLowerCase();

authenticator.options = { window: 1 };

/* ---------- CAPTCHA ---------- */
router.get('/captcha', (req, res) => {
  const { id, svg } = createCaptcha();
  res.set('Cache-Control', 'no-store').json({ id, svg });
});

/* ---------- Реєстрація ---------- */
router.post('/register', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const { password, captchaId, captchaText } = req.body;

  if (!EMAIL_RE.test(email) || email.length > 255) return res.status(400).json({ error: 'Вкажіть коректну електронну пошту' });
  const errors = validatePassword(password);
  if (errors.length) return res.status(400).json({ error: 'Пароль не відповідає політиці безпеки', details: errors });
  if (!verifyCaptcha(captchaId, captchaText)) return res.status(400).json({ error: 'Неправильна CAPTCHA. Спробуйте ще раз' });

  const exists = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (exists.rowCount) return res.status(409).json({ error: 'Користувач з такою поштою вже існує' });

  const hash = await hashPassword(password);
  const { rows } = await query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email, hash]);
  const token = await createToken(rows[0].id, 'activation', config.activationTtlMin);
  await sendActivationEmail(email, token);
  res.status(201).json({ message: 'Реєстрація успішна. Перевірте пошту та активуйте обліковий запис' });
}));

/* ---------- Активація ---------- */
router.post('/activate', wrap(async (req, res) => {
  const userId = await consumeToken(req.body.token, 'activation');
  if (!userId) return res.status(400).json({ error: 'Посилання недійсне, уже використане або термін його дії минув' });
  await query('UPDATE users SET is_activated = TRUE WHERE id = $1', [userId]);
  res.json({ message: 'Обліковий запис активовано. Тепер можна увійти' });
}));

/* ---------- Вхід + захист від brute force ---------- */
async function registerFailure(user, reason, req) {
  const attempts = user.failed_attempts + 1;
  let locked = false;
  if (attempts >= config.maxFailedAttempts) {
    await query(
      `UPDATE users SET failed_attempts = 0, locked_until = NOW() + make_interval(mins => $2) WHERE id = $1`,
      [user.id, config.lockMinutes]
    );
    locked = true;
  } else {
    await query('UPDATE users SET failed_attempts = $2 WHERE id = $1', [user.id, attempts]);
  }
  await logAttempt({ userId: user.id, email: user.email, req, success: false, reason });
  return { locked, left: config.maxFailedAttempts - attempts };
}

const lockedResponse = (res) =>
  res.status(423).json({ error: `Забагато невдалих спроб. Вхід тимчасово заблоковано на ${config.lockMinutes} хв.` });

async function finishLogin(req, res, user, reason = 'ok') {
  await query('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [user.id]);
  await logAttempt({ userId: user.id, email: user.email, req, success: true, reason });
  issueSession(res, user);
  res.json({ user: publicUser({ ...user, last_login_at: new Date() }) });
}

router.post('/login', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user) {
    await comparePassword(password, DUMMY_HASH); // вирівнюємо час відповіді
    await logAttempt({ email, req, success: false, reason: 'unknown_user' });
    return res.status(401).json({ error: 'Невірна пошта або пароль' });
  }
  if (user.is_blocked) {
    await logAttempt({ userId: user.id, email, req, success: false, reason: 'blocked' });
    return res.status(403).json({ error: 'Обліковий запис заблоковано адміністратором' });
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await logAttempt({ userId: user.id, email, req, success: false, reason: 'locked' });
    const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return res.status(423).json({ error: `Забагато невдалих спроб. Спробуйте через ${mins} хв.` });
  }

  const ok = user.password_hash ? await comparePassword(password, user.password_hash) : false;
  if (!ok) {
    const { locked, left } = await registerFailure(user, 'bad_password', req);
    if (locked) return lockedResponse(res);
    return res.status(401).json({ error: `Невірна пошта або пароль. Залишилось спроб: ${left}` });
  }
  if (!user.is_activated) {
    await logAttempt({ userId: user.id, email, req, success: false, reason: 'not_activated' });
    return res.status(403).json({ error: 'Обліковий запис не активовано. Перевірте пошту' });
  }

  if (user.totp_enabled) {
    const tempToken = jwt.sign({ sub: user.id, purpose: '2fa' }, config.jwtSecret, { expiresIn: '5m' });
    return res.json({ twoFactorRequired: true, tempToken });
  }
  return finishLogin(req, res, user);
}));

router.post('/login/2fa', wrap(async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(String(req.body.tempToken || ''), config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Час підтвердження минув. Увійдіть знову' });
  }
  if (payload.purpose !== '2fa') return res.status(401).json({ error: 'Недійсний токен' });

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  const user = rows[0];
  if (!user || user.is_blocked || !user.totp_enabled) return res.status(401).json({ error: 'Вхід неможливий' });
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await logAttempt({ userId: user.id, email: user.email, req, success: false, reason: 'locked' });
    return lockedResponse(res);
  }

  const code = String(req.body.code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code) || !authenticator.check(code, user.totp_secret)) {
    const { locked, left } = await registerFailure(user, 'bad_2fa', req);
    if (locked) return lockedResponse(res);
    return res.status(401).json({ error: `Невірний код. Залишилось спроб: ${left}` });
  }
  return finishLogin(req, res, user, 'ok_2fa');
}));

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

/* ---------- Відновлення пароля ---------- */
router.post('/forgot', wrap(async (req, res) => {
  const email = normEmail(req.body.email);
  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows[0]) {
    const token = await createToken(rows[0].id, 'reset', config.resetTtlMin);
    await sendResetEmail(email, token);
  }
  res.json({ message: 'Якщо така пошта зареєстрована, ми надіслали лист із посиланням для відновлення' });
}));

router.post('/reset', wrap(async (req, res) => {
  const errors = validatePassword(req.body.password);
  if (errors.length) return res.status(400).json({ error: 'Пароль не відповідає політиці безпеки', details: errors });
  const userId = await consumeToken(req.body.token, 'reset');
  if (!userId) return res.status(400).json({ error: 'Посилання недійсне, уже використане або термін його дії минув' });

  const hash = await hashPassword(req.body.password);
  await query(
    'UPDATE users SET password_hash = $2, is_activated = TRUE, failed_attempts = 0, locked_until = NULL WHERE id = $1',
    [userId, hash]
  );
  res.json({ message: 'Пароль змінено. Тепер можна увійти з новим паролем' });
}));

/* ---------- OpenID Connect (Google) ---------- */
let oidcClientPromise;
function getOidcClient() {
  if (!oidcClientPromise) {
    oidcClientPromise = Issuer.discover(config.oidc.issuer)
      .then((issuer) => new issuer.Client({
        client_id: config.oidc.clientId,
        client_secret: config.oidc.clientSecret,
        redirect_uris: [config.oidc.redirectUri],
        response_types: ['code'],
      }))
      .catch((e) => { oidcClientPromise = null; throw e; });
  }
  return oidcClientPromise;
}

const OIDC_COOKIE = 'oidc_state';
const oidcFail = (res, code) => res.redirect(`${config.clientUrl}/login?error=${code}`);

router.get('/oidc/login', wrap(async (req, res) => {
  if (!config.oidc.clientId) return oidcFail(res, 'oidc_not_configured');
  const client = await getOidcClient();
  const state = generators.state();
  const nonce = generators.nonce();
  const codeVerifier = generators.codeVerifier();
  res.cookie(OIDC_COOKIE, JSON.stringify({ state, nonce, codeVerifier }), {
    httpOnly: true, sameSite: 'lax', secure: config.isProd, signed: true, maxAge: 10 * 60 * 1000,
  });
  res.redirect(client.authorizationUrl({
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: generators.codeChallenge(codeVerifier),
    code_challenge_method: 'S256',
  }));
}));

router.get('/oidc/callback', wrap(async (req, res) => {
  try {
    const raw = req.signedCookies[OIDC_COOKIE];
    res.clearCookie(OIDC_COOKIE);
    if (!raw) return oidcFail(res, 'oidc_failed');
    const { state, nonce, codeVerifier } = JSON.parse(raw);

    const client = await getOidcClient();
    const tokenSet = await client.callback(config.oidc.redirectUri, client.callbackParams(req), {
      state, nonce, code_verifier: codeVerifier,
    });
    const claims = tokenSet.claims();
    if (!claims.email || claims.email_verified === false) return oidcFail(res, 'oidc_email');
    const email = normEmail(claims.email);

    let { rows } = await query('SELECT * FROM users WHERE oidc_sub = $1', [claims.sub]);
    let user = rows[0];
    if (!user) {
      ({ rows } = await query('SELECT * FROM users WHERE email = $1', [email]));
      user = rows[0];
      if (user) {
        // Пошту підтверджено провайдером → прив'язуємо OIDC до існуючого акаунта й активуємо його
        ({ rows } = await query('UPDATE users SET oidc_sub = $2, is_activated = TRUE WHERE id = $1 RETURNING *', [user.id, claims.sub]));
      } else {
        ({ rows } = await query(
          'INSERT INTO users (email, oidc_sub, is_activated) VALUES ($1, $2, TRUE) RETURNING *', [email, claims.sub]
        ));
      }
      user = rows[0];
    }
    if (user.is_blocked) {
      await logAttempt({ userId: user.id, email, req, success: false, reason: 'blocked' });
      return oidcFail(res, 'blocked');
    }
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    await logAttempt({ userId: user.id, email, req, success: true, reason: 'ok_oidc' });
    issueSession(res, user);
    res.redirect(`${config.clientUrl}/profile`);
  } catch (e) {
    console.error('OIDC помилка:', e.message);
    oidcFail(res, 'oidc_failed');
  }
}));

module.exports = router;
