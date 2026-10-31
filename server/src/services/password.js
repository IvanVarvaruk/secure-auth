const bcrypt = require('bcryptjs');

const BCRYPT_COST = 12;

const COMMON = ['password', 'qwerty', '12345678', 'admin123', 'welcome', 'letmein', 'p@ssw0rd', 'iloveyou', 'abc123', 'пароль'];

function validatePassword(p) {
  const errors = [];
  const s = typeof p === 'string' ? p : '';
  if (s.length < 8) errors.push('Довжина пароля — щонайменше 8 символів');
  if (!/\p{Lu}/u.test(s)) errors.push('Потрібна хоча б одна велика літера');
  if (!/\p{Ll}/u.test(s)) errors.push('Потрібна хоча б одна мала літера');
  if (!/\d/.test(s)) errors.push('Потрібна хоча б одна цифра');
  if (!/[^\p{L}\d]/u.test(s)) errors.push('Потрібен хоча б один символ (не літера і не цифра)');
  const strip = (x) => x.toLowerCase().replace(/[^\p{L}\d]/gu, '');
  if (s && COMMON.some((c) => strip(s).includes(strip(c)))) {
    errors.push('Пароль занадто поширений або слабкий');
  }
  return errors;
}

const hashPassword = (p) => bcrypt.hash(p, BCRYPT_COST);
const comparePassword = (p, hash) => bcrypt.compare(p, hash);

const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

module.exports = { validatePassword, hashPassword, comparePassword, DUMMY_HASH };
