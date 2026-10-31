# SecureAuth — безпечна система управління обліковими записами

Лабораторна робота 6 (проєкт). Стек: **React (Vite) + Express + PostgreSQL**.

Потрібні Node.js 18+ та Docker (для PostgreSQL і тестової пошти).

```bash
# 1. БД + SMTP-пастка Mailpit
docker compose up -d

# 2. Сервер (http://localhost:4000)
cd server
cp .env.example .env
npm install
npm run dev

# 3. Клієнт (http://localhost:5173) — у новому терміналі
cd client
npm install
npm run dev
```

Таблиці створюються автоматично при старті сервера. Перший адміністратор створюється з `ADMIN_EMAIL` / `ADMIN_PASSWORD` у `server/.env` (за замовчуванням `admin@example.com` / `Admin#12345`).
Листи (активація, відновлення пароля) дивіться в Mailpit: **http://localhost:8025**.

## Відповідність вимогам

| Завдання | Реалізація |
|---|---|
| 1. Реєстрація / вхід, політика пароля | `services/password.js` (≥8 символів, великі/малі літери, цифра, символ, перевірка поширених паролів). Індикатор сили пароля — `client/src/lib/password.js`. Хешування: **bcrypt** (cost 12, сіль усередині хешу); перевірка — `bcrypt.compare`. Вихід — `POST /api/auth/logout`. Сесія — JWT в `httpOnly` cookie |
| 2. CAPTCHA | `services/captcha.js` (svg-captcha): одноразова, діє 5 хв, нова картинка після кожної спроби |
| 3. Активація | Одноразовий токен (32 випадкові байти, у БД лише SHA-256), термін дії `ACTIVATION_TTL_MIN`. Статус показано в профілі |
| 4. Brute force + журнал | `MAX_FAILED_ATTEMPTS` невдалих спроб → блокування на `LOCK_MINUTES`. Таблиця `login_log` (IP, час, результат, причина). Адмін-панель: зведення «хто і скільки разів», журнал, блокування/розблокування |
| 5. 2FA | TOTP (Google Authenticator та ін.), вмикається/вимикається в профілі; вимкнення потребує пароля і коду |
| 6. OpenID Connect | Google, `openid-client` |
| 7. Відновлення пароля | Токен на пошту, дійсний `RESET_TTL_MIN` (30 хв), одноразовий; однакова відповідь незалежно від того, чи існує пошта |
| RBAC | Ролі `user` / `admin`. `requireRole('admin')` на всіх `/api/admin/*`. Користувач бачить лише власний профіль (`/api/me` бере id із сесії). Роль і статус блокування перевіряються в БД при кожному запиті — блокування діє миттєво |

## Структура

```
server/src/
  index.js            точка входу, ініціалізація БД, створення адміна
  config.js           налаштування з .env
  db/                 pool.js, schema.sql (users, email_tokens, login_log)
  middleware/auth.js  сесія (JWT cookie), RBAC
  routes/             auth.js, me.js, admin.js
  services/           password, tokens, captcha, mail, loginLog
client/src/
  pages/              Register, Login, Activate, Forgot, Reset, Profile, Admin
  components/         PasswordField (сила пароля), Captcha, Layout, ProtectedRoute
```

## Технічні труднощі

- Одноразовість токенів і гонки: токен «споживається» атомарним `UPDATE ... RETURNING`.
- Не розкривати існування акаунта (однакові відповіді в `/forgot`, вирівнювання часу при невідомому email).
- Cookie та OIDC-редіректи: клієнт і API працюють на одному origin через проксі Vite; `state`/`nonce`/PKCE зберігаються в підписаному cookie.
- За reverse proxy потрібен `trust proxy` і передача `X-Forwarded-For`, щоб у журналі був справжній IP.

## Додатково (поза завданням)

Показ/приховування пароля, зведення спроб за email, тимчасове блокування діє і для кроку 2FA, захист від самоблокування адміністратора, прив'язка OIDC до існуючого акаунта за підтвердженою поштою, темна тема.
