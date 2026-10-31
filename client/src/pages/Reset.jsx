import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import PasswordField from '../components/PasswordField.jsx';

export default function Reset() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setDetails([]);
    try {
      const r = await api('/auth/reset', { method: 'POST', body: { token: params.get('token'), password } });
      setMsg(r.message);
    } catch (err) {
      setError(err.message);
      setDetails(err.details || []);
    }
  };

  return (
    <section className="card narrow">
      <h1>Новий пароль</h1>
      {msg ? (
        <>
          <div className="notice ok">{msg}</div>
          <Link to="/login">Увійти</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <PasswordField value={password} onChange={setPassword} label="Новий пароль" />
          {error && (
            <div className="notice err">
              {error}
              {details.length > 0 && <ul>{details.map((d) => <li key={d}>{d}</li>)}</ul>}
            </div>
          )}
          <button type="submit">Зберегти пароль</button>
        </form>
      )}
    </section>
  );
}
