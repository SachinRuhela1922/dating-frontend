import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Alert, PasswordInput, Shell, useAction, useCooldown } from '../ui.jsx';

// Used for both email verification (purpose "signup") and password reset (purpose "reset").
export default function Verify() {
  const { state } = useLocation();
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useCooldown();
  const { busy, error, run } = useAction();
  useEffect(() => setCooldown(60), []); // a code was just sent

  if (!state?.email) return <Navigate to="/signup" replace />;
  const { email, purpose } = state;
  const reset = purpose === 'reset';

  const submit = e => {
    e.preventDefault();
    run(async () => {
      if (reset) {
        await api('/auth/reset-password', { method: 'POST', body: { email, code, password } });
        nav('/', { replace: true, state: { notice: 'Password updated. Sign in with your new password.' } });
      } else {
        const d = await api('/auth/verify-signup', { method: 'POST', body: { email, code } });
        setUser(d.user);
        nav('/dashboard.html', { replace: true });
      }
    });
  };

  const resend = () => run(async () => {
    setInfo('');
    try {
      const d = await api('/auth/resend', { method: 'POST', body: { email, purpose } });
      setCooldown(d.cooldown); setInfo('A new code is on its way.');
    } catch (e) { if (e.retryAfter) setCooldown(e.retryAfter); throw e; }
  });

  return (
    <Shell title={reset ? 'Set a new password' : 'Check your email'}
      subtitle={<>Enter the 6-digit code we sent to <strong>{email}</strong>. It expires in 10 minutes.</>}
      footer={<Link to={reset ? '/forgot' : '/signup'}>Use a different email</Link>}>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <Alert kind="info">{info}</Alert>
        <label className="field" htmlFor="code"><span>Verification code</span>
          <input id="code" className="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus />
        </label>
        {reset && <PasswordInput id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />}
        <button className="primary" disabled={busy || code.length !== 6}>
          {busy ? 'Checking…' : reset ? 'Update password' : 'Verify and continue'}
        </button>
      </form>
      <button type="button" className="link" onClick={resend} disabled={busy || cooldown > 0}>
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
    </Shell>
  );
}
