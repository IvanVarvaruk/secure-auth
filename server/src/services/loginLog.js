const { query } = require('../db/pool');

function clientIp(req) {
  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

async function logAttempt({ userId = null, email, req, success, reason }) {
  await query(
    'INSERT INTO login_log (user_id, email, ip, user_agent, success, reason) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, email, clientIp(req), (req.headers['user-agent'] || '').slice(0, 300), success, reason]
  );
}

module.exports = { logAttempt, clientIp };
