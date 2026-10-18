import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Alert, PasswordInput, Shell, useAction } from '../ui.jsx';

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, run } = useAction();

  const submit = e => {
    e.preventDefault();
    run(async () => {
      await api('/auth/signup', { method: 'POST', body: { email, password } });
      nav('/verify', { state: { email, purpose: 'signup' } });
    });
  };

  return (
    <Shell title="Create your account" subtitle="We’ll email a 6-digit code to confirm it’s you."
      footer={<>Already a member? <Link to="/">Sign in</Link></>}>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <label className="field" htmlFor="email"><span>Email</span>
          <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        <p className="hint">At least 8 characters.</p>
        <button className="primary" disabled={busy}>{busy ? 'Sending code…' : 'Send verification code'}</button>
      </form>
    </Shell>
  );
}
