CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255),                       -- NULL для користувачів, що увійшли лише через OIDC
  role            VARCHAR(20)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_activated    BOOLEAN      NOT NULL DEFAULT FALSE,
  is_blocked      BOOLEAN      NOT NULL DEFAULT FALSE,
  failed_attempts INT          NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  totp_secret     VARCHAR(255),
  totp_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
  oidc_sub        VARCHAR(255) UNIQUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(20) NOT NULL CHECK (type IN ('activation', 'reset')),
  token_hash CHAR(64)    NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_log (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  email      VARCHAR(255) NOT NULL,
  ip         VARCHAR(64),
  user_agent TEXT,
  success    BOOLEAN     NOT NULL,
  reason     VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_log_created ON login_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_log_email ON login_log (email);
