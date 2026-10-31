import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import PasswordField from '../components/PasswordField.jsx';

const OIDC_ERRORS = {
  oidc_failed: 'Не вдалося увійти через зовнішній сервіс. Спробуйте ще раз',
  oidc_not_configured: 'Вхід через зовнішній сервіс не налаштовано (OIDC_CLIENT_ID)',
  oidc_email: 'Провайдер не надав підтверджену пошту',
  blocked: 'Обліковий запис заблоковано адміністратором',
};

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(OIDC_ERRORS[params.get('error')] || '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (!tempToken) {
        const r = await api('/auth/login', { method: 'POST', body: { email, password } });
        if (r.twoFactorRequired) { setTempToken(r.tempToken); return; }
        setUser(r.user);
      } else {
        const r = await api('/auth/login/2fa', { method: 'POST', body: { tempToken, code } });
        setUser(r.user);
      }
      navigate('/profile');
    } catch (err) {
      setError(err.message);
      if (err.status === 423 || (tempToken && err.status === 401 && /Час/.test(err.message))) { setTempToken(''); setCode(''); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card narrow">
      <h1>{tempToken ? 'Двофакторна автентифікація' : 'Вхід'}</h1>
      <form onSubmit={submit}>
        {!tempToken ? (
          <>
            <div className="field">
              <label>Електронна пошта</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </div>
            <PasswordField value={password} onChange={setPassword} showMeter={false} autoComplete="current-password" />
          </>
        ) : (
          <div className="field">
            <label>Код із застосунку-автентифікатора</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={7}
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>
        )}
        {error && <div className="notice err" role="alert">{error}</div>}
        <button type="submit" disabled={busy}>{tempToken ? 'Підтвердити' : 'Увійти'}</button>
      </form>

      {!tempToken && (
        <>
          <div className="divider"><span>або</span></div>
          <a className="btn secondary" href="/api/auth/oidc/login">Увійти через Google</a>
          <p className="muted"><Link to="/forgot">Забули пароль?</Link> · <Link to="/register">Створити акаунт</Link></p>
        </>
      )}
    </section>
  );
}
