export const RULES = [
  { id: 'len', label: 'Щонайменше 8 символів', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Велика літера', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'lower', label: 'Мала літера', test: (p) => /\p{Ll}/u.test(p) },
  { id: 'digit', label: 'Цифра', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'Символ (не літера і не цифра)', test: (p) => /[^\p{L}\d]/u.test(p) },
];

const COMMON = ['password', 'qwerty', '12345678', 'admin123', 'welcome', 'letmein', 'p@ssw0rd', 'iloveyou', 'abc123', 'пароль'];
const strip = (x) => x.toLowerCase().replace(/[^\p{L}\d]/gu, '');
export const isCommon = (p) => !!p && COMMON.some((c) => strip(p).includes(strip(c)));

export function strength(p) {
  if (!p) return { score: 0, label: '' };
  let score = RULES.filter((r) => r.test(p)).length;
  if (p.length >= 12) score += 1;
  if (p.length >= 16) score += 1;
  if (isCommon(p)) score = Math.min(score, 2);
  const labels = ['', 'Дуже слабкий', 'Слабкий', 'Слабкий', 'Середній', 'Хороший', 'Сильний', 'Дуже сильний'];
  return { score: Math.min(score, 7), label: labels[Math.min(score, 7)] };
}

export const passwordErrors = (p) => {
  const errs = RULES.filter((r) => !r.test(p)).map((r) => r.label);
  if (isCommon(p)) errs.push('Пароль занадто поширений');
  return errs;
};
