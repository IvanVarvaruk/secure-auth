const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');

const store = new Map();
const TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, v] of store) if (v.expires < now) store.delete(id);
}, 60 * 1000).unref();

function createCaptcha() {
  const c = svgCaptcha.create({ size: 5, noise: 3, color: true, background: '#f3f4f6', ignoreChars: '0oO1iIlL' });
  const id = crypto.randomUUID();
  store.set(id, { text: c.text.toLowerCase(), expires: Date.now() + TTL_MS });
  return { id, svg: c.data };
}

function verifyCaptcha(id, answer) {
  const entry = store.get(id);
  store.delete(id);
  if (!entry || entry.expires < Date.now()) return false;
  return typeof answer === 'string' && answer.trim().toLowerCase() === entry.text;
}

module.exports = { createCaptcha, verifyCaptcha };
