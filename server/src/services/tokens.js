const crypto = require('crypto');
const { query } = require('../db/pool');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function createToken(userId, type, ttlMinutes) {
  await query('UPDATE email_tokens SET used_at = NOW() WHERE user_id = $1 AND type = $2 AND used_at IS NULL', [userId, type]);
  const raw = crypto.randomBytes(32).toString('hex');
  await query(
    `INSERT INTO email_tokens (user_id, type, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
    [userId, type, sha256(raw), ttlMinutes]
  );
  return raw;
}

async function consumeToken(raw, type) {
  if (typeof raw !== 'string' || raw.length < 20) return null;
  const { rows } = await query(
    `UPDATE email_tokens SET used_at = NOW()
     WHERE token_hash = $1 AND type = $2 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [sha256(raw), type]
  );
  return rows[0] ? rows[0].user_id : null;
}

module.exports = { createToken, consumeToken };
