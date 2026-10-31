const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { query, initDb } = require('./db/pool');
const { hashPassword } = require('./services/password');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser(config.jwtSecret));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/me', require('./routes/me'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Не знайдено' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

async function ensureAdmin() {
  const { email, password } = config.admin;
  if (!email || !password) return;
  const exists = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (exists.rowCount) return;
  await query(
    "INSERT INTO users (email, password_hash, role, is_activated) VALUES ($1, $2, 'admin', TRUE)",
    [email, await hashPassword(password)]
  );
  console.log(`Створено адміністратора: ${email}`);
}

(async () => {
  await initDb();
  await ensureAdmin();
  app.listen(config.port, () => console.log(`Сервер: http://localhost:${config.port}`));
})().catch((e) => {
  console.error('Не вдалося запустити сервер:', e.message);
  process.exit(1);
});
