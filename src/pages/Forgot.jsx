import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Alert, Shell, useAction } from '../ui.jsx';

export default function Forgot() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const { busy, error, run } = useAction();

  const submit = e => {
    e.preventDefault();
    run(async () => {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      nav('/verify', { state: { email, purpose: 'reset' } });
    });
  };

  return (
    <Shell title="Reset your password" subtitle="Enter your email and we’ll send a code if an account exists."
      footer={<Link to="/">Back to sign in</Link>}>
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <label className="field" htmlFor="email"><span>Email</span>
          <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset code'}</button>
      </form>
    </Shell>
  );
}
