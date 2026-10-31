import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { api } from '../api.js';

const Captcha = forwardRef(function Captcha({ onChange }, ref) {
  const [captcha, setCaptcha] = useState(null);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    setText('');
    onChange({ id: '', text: '' });
    try {
      const c = await api('/auth/captcha');
      setCaptcha(c);
      onChange({ id: c.id, text: '' });
    } catch {
      setCaptcha(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);
  useImperativeHandle(ref, () => ({ reload: load }));

  return (
    <div className="field">
      <label>Введіть символи з картинки</label>
      <div className="captcha">
        <div className="captcha-img" dangerouslySetInnerHTML={{ __html: captcha?.svg || '' }} />
        <button type="button" className="ghost sm" onClick={load}>Інша картинка</button>
      </div>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); onChange({ id: captcha?.id || '', text: e.target.value }); }}
        autoComplete="off"
        required
      />
    </div>
  );
});

export default Captcha;
