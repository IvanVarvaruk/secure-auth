import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const r = await api('/auth/forgot', { method: 'POST', body: { email } });
      setMsg(r.message);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card narrow">
      <h1>Відновлення пароля</h1>
      {msg ? <div className="notice ok">{msg}</div> : (
        <form onSubmit={submit}>
          <div className="field">
            <label>Електронна пошта</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <div className="notice err">{error}</div>}
          <button type="submit">Надіслати посилання</button>
        </form>
      )}
      <p className="muted"><Link to="/login">Назад до входу</Link></p>
    </section>
  );
}
