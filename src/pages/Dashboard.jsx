import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket.js';
import BottomNav from '../components/Bottomnav.jsx';
import { readCache, writeCache } from '../cache.js';
import './dashboard.css';

/* ---------- Icons (inline SVG) ---------- */
const Ico = ({ children, fill = 'none', sw = 2.4 }) => (
  <svg className="ico" viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" draggable="false">
    {children}
  </svg>
);
const IconHeart = () => (
  <Ico fill="currentColor" sw="0"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.7 5 6.1 5c2.1 0 3.4 1.1 4.2 2.4h3.4C14.5 6.1 15.8 5 17.9 5c3.4 0 5.2 3.5 3.7 6.8C19.5 16.4 12 21 12 21Z" /></Ico>
);
const IconCheck = () => (<Ico sw="3.2"><path d="M5 12.5l4.5 4.5L19 7.5" /></Ico>);
const IconAlert = () => (<Ico sw="3"><path d="M12 7v6M12 17.2v.1" /></Ico>);
const IconRequests = () => (
  <Ico><circle cx="10" cy="8" r="3.4" /><path d="M3.5 19.5c0-3.3 2.9-5.5 6.5-5.5" /><path d="M18 13v6M15 16h6" /></Ico>
);
const IconChat = () => (
  <Ico><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.3A7.5 7.5 0 1 1 20 12Z" /></Ico>
);
const IconShield = () => (
  <Ico><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.1-7.5 9.5-4.4-1.4-7.5-4.9-7.5-9.5V6L12 3Z" /><path d="M8.8 12l2.3 2.3 4.2-4.6" /></Ico>
);

export default function Dashboard() {
  const { user, setUser, logout } = useAuth();
  const [data, setData] = useState(() => readCache('dash:summary'));
  const [error, setError] = useState('');
  const [hasProfile, setHasProfile] = useState(() => readCache('dash:hasProfile') ?? undefined); // undefined = still checking
  const [pending, setPending] = useState(() => readCache('count:pending') ?? 0);
  const [unread, setUnread] = useState(() => readCache('count:unread') ?? 0);
  const navigate = useNavigate();

  useEffect(() => {
    // Data comes from a server-protected endpoint; a 401 means the session is gone.
    api('/dashboard/summary').then(d => { setData(d); writeCache('dash:summary', d); }).catch(e => (e.status === 401 ? setUser(null) : setError(e.message)));
  }, [setUser]);

  useEffect(() => {
    fetch('/api/profile/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setHasProfile(Boolean(d.profile)); writeCache('dash:hasProfile', Boolean(d.profile)); writeCache('profile', { profile: d.profile ?? null }); })
      .catch(() => {}); // offline: cached value rehne do
  }, []);

  // Activity tiles: pending requests + unread messages (live via the socket)
  useEffect(() => {
    const syncCounts = () => {
      fetch('/api/connect/requests', { credentials: 'include' })
        .then(r => r.json()).then(d => { const n = d.requests?.length || 0; setPending(n); writeCache('count:pending', n); }).catch(() => {});
      fetch('/api/connect/unread', { credentials: 'include' })
        .then(r => r.json()).then(d => { const n = d.count || 0; setUnread(n); writeCache('count:unread', n); }).catch(() => {});
    };
    syncCounts();
    const onMessage = () => setUnread(n => n + 1);
    const onRequest = () => setPending(n => n + 1);
    const onRemoved = () => setPending(n => Math.max(0, n - 1));
    socket.on('message', onMessage);
    socket.on('request', onRequest);
    socket.on('request:removed', onRemoved);
    socket.on('connect', syncCounts); // (re)connected: catch up on anything missed
    return () => {
      socket.off('message', onMessage); socket.off('request', onRequest);
      socket.off('request:removed', onRemoved); socket.off('connect', syncCounts);
    };
  }, []);

  const fmt = d => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const fmtDate = d => (d ? new Date(d).toLocaleDateString([], { dateStyle: 'medium' }) : '—');

  const name = user.email.split('@')[0];
  const verified = Boolean(user.emailVerified);
  const block = e => e.preventDefault(); // no long-press menu, no image drag

  return (
    <div className="dash" onContextMenu={block} onDragStart={block}>
      <header className="dash__header">
        <span className="dash__brand"><span className="dash__mark"><IconHeart /></span>Kindred</span>
        <button className="dash__logout" onClick={() => { socket.disconnect(); logout(); }}>
          Log out
        </button>
      </header>

      <main className="dash__main">
        {/* Hero */}
        <section className="hero">
          <div className="hero__top">
            <span className="hero__avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
            <span className={`pill ${verified ? 'pill--ok' : 'pill--bad'}`}>
              {verified ? <IconCheck /> : <IconAlert />}
              {verified ? 'Verified member' : 'Email unverified'}
            </span>
          </div>
          <h1 className="hero__name">Hi, {name}</h1>
          <p className="hero__text">
            {verified
              ? 'Aapka account verified hai. Ab aap bharose ke saath nayi logon se mil sakte ho aur baat shuru kar sakte ho.'
              : 'Apna email verify karo taaki aapka account safe rahe.'}
          </p>
        </section>

        {error && <p role="alert" className="dash__alert">{error}</p>}

        {/* Activity (profile hone par) */}
        {hasProfile === true && (
          <section className="tiles" aria-label="Aaj ki activity">
            <button type="button" className={`tile${pending > 0 ? ' tile--hot' : ''}`} onClick={() => navigate('/requests')}>
              <span className="tile__icon"><IconRequests /></span>
              <span className="tile__num">{pending}</span>
              <span className="tile__label">{pending === 1 ? 'Nayi request' : 'Nayi requests'}</span>
            </button>
            <button type="button" className={`tile${unread > 0 ? ' tile--hot' : ''}`} onClick={() => navigate('/messages')}>
              <span className="tile__icon"><IconChat /></span>
              <span className="tile__num">{unread}</span>
              <span className="tile__label">Unread messages</span>
            </button>
          </section>
        )}

        {/* Profile nahi bani */}
        {hasProfile === false && (
          <section className="start">
            <h2 className="start__title">Pehle apni profile banao</h2>
            <p className="start__text">
              Photos, ek chhoti si bio aur apni interests daalo. Profile banne ke baad aap logon ko dekh paoge,
              request bhej paoge aur chat kar paoge.
            </p>
          </section>
        )}

        {/* Account checklist */}
        <section className="block">
          <h2 className="block__title">Aapka account</h2>
          <ul className="checks">
            <li className="check">
              <span className={`check__icon ${verified ? 'is-done' : 'is-todo'}`}>{verified ? <IconCheck /> : <IconAlert />}</span>
              <div>
                <p className="check__title">{verified ? 'Email verified' : 'Email verify nahi hua'}</p>
                <p className="check__text">{user.email}</p>
              </div>
            </li>
            <li className="check">
              <span className="check__icon is-done"><IconCheck /></span>
              <div>
                <p className="check__title">Secure session active</p>
                <p className="check__text">Login renew hoga: {fmt(data?.sessionExpiresAt)}</p>
              </div>
            </li>
            {hasProfile !== undefined && (
              <li className="check">
                <span className={`check__icon ${hasProfile ? 'is-done' : 'is-todo'}`}>{hasProfile ? <IconCheck /> : <IconAlert />}</span>
                <div>
                  <p className="check__title">{hasProfile ? 'Profile ban chuki hai' : 'Profile abhi nahi bani'}</p>
                  <p className="check__text">{hasProfile ? 'My profile me jaakar kabhi bhi edit kar sakte ho.' : 'Neeche “Create profile” dabao.'}</p>
                </div>
              </li>
            )}
          </ul>
        </section>

        {/* Safety */}
        <section className="safe">
          <span className="safe__icon"><IconShield /></span>
          <div>
            <h2 className="safe__title">Safe raho</h2>
            <p className="safe__text">
              Kisi ko paise, OTP ya personal documents mat bhejo. Pehli baar milna ho toh public jagah chuno
              aur kisi dost ko bata do.
            </p>
          </div>
        </section>

        {/* Details */}
        <section className="block">
          <h2 className="block__title">Account details</h2>
          <dl className="facts">
            <div className="facts__row"><dt>Member since</dt><dd>{fmtDate(data?.user.createdAt || user.createdAt)}</dd></div>
            <div className="facts__row"><dt>Email</dt><dd>{user.email}</dd></div>
          </dl>
        </section>
      </main>

      {/* Shared bottom navigation (same on every page) */}
      {hasProfile === true && <BottomNav />}

      {hasProfile === false && (
        <div className="cta">
          <button className="cta__btn" onClick={() => navigate('/create-profile')}>
            Create profile
          </button>
        </div>
      )}
    </div>
  );
}