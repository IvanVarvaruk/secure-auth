import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const fmt = (d) => (d ? new Date(d).toLocaleString('uk-UA') : '—');

const REASONS = {
  ok: 'Успішний вхід',
  ok_2fa: 'Успішний вхід (2FA)',
  ok_oidc: 'Успішний вхід (Google)',
  bad_password: 'Невірний пароль',
  bad_2fa: 'Невірний код 2FA',
  unknown_user: 'Невідомий користувач',
  locked: 'Тимчасове блокування',
  blocked: 'Заблоковано адміном',
  not_activated: 'Акаунт не активовано',
};

function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => api('/admin/users').then((r) => setUsers(r.users)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (u) => {
    setError('');
    try {
      await api(`/admin/users/${u.id}/${u.isBlocked ? 'unblock' : 'block'}`, { method: 'POST' });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <>
      {error && <div className="notice err">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Пошта</th><th>Роль</th><th>Статус</th><th>Невдалих спроб</th><th>2FA</th><th>Останній вхід</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role === 'admin' ? 'адмін' : 'користувач'}</td>
                <td>
                  {u.isBlocked ? <span className="badge bad">заблоковано</span>
                    : u.lockedUntil ? <span className="badge warn">тимч. блокування до {new Date(u.lockedUntil).toLocaleTimeString('uk-UA')}</span>
                    : !u.isActivated ? <span className="badge warn">не активовано</span>
                    : <span className="badge ok">активний</span>}
                </td>
                <td>{u.failedAttempts}</td>
                <td>{u.totpEnabled ? 'так' : 'ні'}</td>
                <td>{fmt(u.lastLoginAt)}</td>
                <td>
                  {u.id !== me.id && (
                    <button className={u.isBlocked ? 'secondary sm' : 'danger sm'} onClick={() => toggle(u)}>
                      {u.isBlocked ? 'Розблокувати' : 'Заблокувати'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Logs() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([
        api(`/admin/logs?email=${encodeURIComponent(filter)}`),
        api('/admin/logs/summary'),
      ]);
      setLogs(l.logs); setSummary(s.summary);
    } catch (e) { setError(e.message); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="stack">
      {error && <div className="notice err">{error}</div>}
      <h2>Кількість спроб за користувачем та IP</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Пошта</th><th>IP</th><th>Невдалих</th><th>Успішних</th><th>Остання спроба</th></tr></thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.email + s.ip}>
                <td>{s.email}</td><td>{s.ip}</td>
                <td><strong className={s.failed >= 3 ? 'text-bad' : ''}>{s.failed}</strong></td>
                <td>{s.succeeded}</td><td>{fmt(s.last_attempt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row between">
        <h2>Журнал входів</h2>
        <div className="row">
          <input placeholder="Фільтр за поштою" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <button className="secondary" onClick={load}>Оновити</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Час</th><th>Пошта</th><th>IP</th><th>Результат</th><th>Причина</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{fmt(l.created_at)}</td><td>{l.email}</td><td>{l.ip}</td>
                <td>{l.success ? <span className="badge ok">успіх</span> : <span className="badge bad">відмова</span>}</td>
                <td>{REASONS[l.reason] || l.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('users');
  return (
    <section className="card wide">
      <h1>Адміністрування</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Користувачі</button>
        <button role="tab" aria-selected={tab === 'logs'} className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>Журнал входів</button>
      </div>
      {tab === 'users' ? <Users /> : <Logs />}
    </section>
  );
}
