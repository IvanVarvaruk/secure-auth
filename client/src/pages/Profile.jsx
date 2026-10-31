import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const fmt = (d) => (d ? new Date(d).toLocaleString('uk-UA') : '—');

function TwoFactor() {
  const { user, setUser } = useAuth();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const run = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
  };

  const start = () => run(async () => setSetup(await api('/me/2fa/setup', { method: 'POST' })));
  const enable = () => run(async () => {
    const r = await api('/me/2fa/enable', { method: 'POST', body: { code } });
    setUser(r.user); setSetup(null); setCode('');
  });
  const disable = () => run(async () => {
    const r = await api('/me/2fa/disable', { method: 'POST', body: { code, password } });
    setUser(r.user); setCode(''); setPassword('');
  });

  return (
    <div className="card">
      <h2>Двофакторна автентифікація (TOTP)</h2>
      <p className="muted">
        Статус: {user.totpEnabled ? <span className="badge ok">увімкнено</span> : <span className="badge">вимкнено</span>}
      </p>

      {!user.totpEnabled && !setup && <button onClick={start}>Увімкнути 2FA</button>}

      {!user.totpEnabled && setup && (
        <div className="twofa">
          <p>1. Скануйте QR-код у Google Authenticator, Authy або подібному застосунку.</p>
          <img src={setup.qr} alt="QR-код для 2FA" width="180" height="180" />
          <p className="muted">Не виходить сканувати? Введіть ключ вручну: <code>{setup.secret}</code></p>
          <p>2. Введіть 6-значний код, щоб підтвердити налаштування.</p>
          <div className="row">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={7} placeholder="123456" />
            <button onClick={enable}>Підтвердити</button>
            <button className="ghost" onClick={() => setSetup(null)}>Скасувати</button>
          </div>
        </div>
      )}

      {user.totpEnabled && (
        <div className="twofa">
          <p>Щоб вимкнути 2FA, підтвердіть дію{user.hasPassword ? ' паролем і' : ''} поточним кодом.</p>
          <div className="row">
            {user.hasPassword && (
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" autoComplete="current-password" />
            )}
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={7} placeholder="Код" />
            <button className="danger" onClick={disable}>Вимкнути 2FA</button>
          </div>
        </div>
      )}
      {error && <div className="notice err" role="alert">{error}</div>}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="stack">
      <section className="card">
        <h1>Мій профіль</h1>
        <dl className="props">
          <dt>Пошта</dt><dd>{user.email}</dd>
          <dt>Роль</dt><dd>{user.role === 'admin' ? 'Адміністратор' : 'Користувач'}</dd>
          <dt>Активація</dt>
          <dd>{user.isActivated ? <span className="badge ok">активовано</span> : <span className="badge warn">не активовано</span>}</dd>
          <dt>Спосіб входу</dt>
          <dd>{[user.hasPassword && 'пароль', user.viaOidc && 'Google (OIDC)'].filter(Boolean).join(', ')}</dd>
          <dt>Реєстрація</dt><dd>{fmt(user.createdAt)}</dd>
          <dt>Останній вхід</dt><dd>{fmt(user.lastLoginAt)}</dd>
        </dl>
      </section>
      <TwoFactor />
    </div>
  );
}
