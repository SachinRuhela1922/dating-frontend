import { useEffect, useState } from 'react';

export function Shell({ title, subtitle, children, footer }) {
  return (
    <main className="split">
      <aside className="brand">
        <span className="logo">Kindred</span>
        <p className="pitch">Meet someone worth a second date.</p>
      </aside>
      <section className="panel">
        <div className="card">
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
          {children}
          {footer && <p className="foot">{footer}</p>}
        </div>
      </section>
    </main>
  );
}

export function PasswordInput({ value, onChange, id = 'password', label = 'Password', autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="pw">
        <input id={id} type={show ? 'text' : 'password'} value={value} autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)} required minLength={8} maxLength={72} />
        <button type="button" className="ghost" aria-pressed={show} onClick={() => setShow(s => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}

export const Alert = ({ kind = 'error', children }) =>
  children ? <p role={kind === 'error' ? 'alert' : 'status'} className={`alert ${kind}`}>{children}</p> : null;

export function useCooldown() {
  const [s, setS] = useState(0);
  useEffect(() => { if (s <= 0) return; const t = setTimeout(() => setS(s - 1), 1000); return () => clearTimeout(t); }, [s]);
  return [s, setS];
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async fn => {
    setBusy(true); setError('');
    try { return await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return { busy, error, run, setError };
}
