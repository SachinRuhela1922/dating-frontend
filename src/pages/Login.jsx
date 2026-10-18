import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Alert, PasswordInput, Shell, useAction } from '../ui.jsx';

export default function Login() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, run } = useAction();

  const submit = e => {
    e.preventDefault();
    run(async () => {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } });
      setUser(d.user);
      nav('/dashboard.html', { replace: true });
    });
  };

  return (
    <Shell title="Welcome back" subtitle="Sign in to see who’s been thinking about you."
      footer={<>New here? <Link to="/signup">Create an account</Link></>}>
      <form onSubmit={submit} noValidate={false}>
        <Alert kind="info">{state?.notice}</Alert>
        <Alert>{error}</Alert>
        <label className="field" htmlFor="email"><span>Email</span>
          <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="row-end"><Link to="/forgot">Forgot password?</Link></div>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </Shell>
  );
}
