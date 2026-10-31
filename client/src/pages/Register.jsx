import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import PasswordField from '../components/PasswordField.jsx';
import Captcha from '../components/Captcha.jsx';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState({ id: '', text: '' });
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const captchaRef = useRef();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setDetails([]); setBusy(true);
    try {
      const r = await api('/auth/register', {
        method: 'POST',
        body: { email, password, captchaId: captcha.id, captchaText: captcha.text },
      });
      setDone(r.message);
    } catch (err) {
      setError(err.message);
      setDetails(err.details || []);
      captchaRef.current?.reload(); // кожна CAPTCHA одноразова
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="card narrow">
        <h1>Перевірте пошту</h1>
        <p className="notice ok">{done}</p>
        <p className="muted">Лист зі посиланням для активації можна переглянути в Mailpit: <a href="http://localhost:8025" target="_blank" rel="noreferrer">localhost:8025</a>.</p>
        <Link to="/login">Перейти до входу</Link>
      </section>
    );
  }

  return (
    <section className="card narrow">
      <h1>Створити обліковий запис</h1>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label>Електронна пошта</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <PasswordField value={password} onChange={setPassword} />
        <Captcha ref={captchaRef} onChange={setCaptcha} />
        {error && (
          <div className="notice err" role="alert">
            {error}
            {details.length > 0 && <ul>{details.map((d) => <li key={d}>{d}</li>)}</ul>}
          </div>
        )}
        <button type="submit" disabled={busy}>{busy ? 'Реєстрація…' : 'Зареєструватися'}</button>
      </form>
      <p className="muted">Уже є акаунт? <Link to="/login">Увійти</Link></p>
    </section>
  );
}
