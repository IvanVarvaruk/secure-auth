import { useState } from 'react';
import { RULES, strength, isCommon } from '../lib/password.js';

export default function PasswordField({ value, onChange, label = 'Пароль', showMeter = true, autoComplete = 'new-password' }) {
  const [visible, setVisible] = useState(false);
  const s = strength(value);
  const pct = (s.score / 7) * 100;
  const tone = s.score <= 3 ? 'weak' : s.score <= 4 ? 'mid' : 'strong';

  return (
    <div className="field">
      <label>{label}</label>
      <div className="pw">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
        />
        <button type="button" className="ghost sm" onClick={() => setVisible(!visible)}>
          {visible ? 'Сховати' : 'Показати'}
        </button>
      </div>
      {showMeter && value && (
        <>
          <div className="meter" aria-hidden="true"><span className={tone} style={{ width: `${pct}%` }} /></div>
          <div className="meter-label">Надійність: {s.label}</div>
          <ul className="rules">
            {RULES.map((r) => (
              <li key={r.id} className={r.test(value) ? 'ok' : ''}>{r.label}</li>
            ))}
            {isCommon(value) && <li className="bad">Пароль занадто поширений</li>}
          </ul>
        </>
      )}
    </div>
  );
}
