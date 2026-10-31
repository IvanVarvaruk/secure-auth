import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function Activate() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'loading', message: '' });
  const started = useRef(false); // токен одноразовий — не викликаємо двічі (StrictMode)

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api('/auth/activate', { method: 'POST', body: { token: params.get('token') } })
      .then((r) => setState({ status: 'ok', message: r.message }))
      .catch((e) => setState({ status: 'err', message: e.message }));
  }, [params]);

  return (
    <section className="card narrow">
      <h1>Активація облікового запису</h1>
      {state.status === 'loading' && <p className="muted">Перевіряємо посилання…</p>}
      {state.status !== 'loading' && <div className={`notice ${state.status}`}>{state.message}</div>}
      <Link to="/login">Перейти до входу</Link>
    </section>
  );
}
