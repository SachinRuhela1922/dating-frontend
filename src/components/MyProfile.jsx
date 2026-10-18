import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import BottomNav from './Bottomnav.jsx';
import { readCache, writeCache } from '../cache.js';
import s from './my-profile.module.css';

const LOOKING = { 'one-day': 'Ek din ka saath', 'long-term': 'Long relationship' };
const PACE = { reserved: 'Reserved', moderate: 'Moderate', open: 'Open' };
const CHAT = { normal: 'Normal baat', open: 'Open baat', anything: 'Kuch bhi baat' };

const block = e => e.preventDefault(); // no long-press menu, no image drag

function Top() {
  return (
    <header className={s.top}>
      <Link to="/dashboard.html" className={s.back} aria-label="Dashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <h1>My profile</h1>
    </header>
  );
}

export default function MyProfile() {
  const [profile, setProfile] = useState(() => readCache('profile')?.profile); // undefined = loading, null = not created
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/profile/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setProfile(d.profile); writeCache('profile', { profile: d.profile ?? null }); writeCache('dash:hasProfile', Boolean(d.profile)); })
      .catch(() => { setProfile(p => { if (p === undefined) setError('Profile load nahi ho paya.'); return p; }); });
  }, []);

  const remove = async () => {
    if (!window.confirm('Profile delete karna hai? Photos bhi hat jayengi.')) return;
    setDeleting(true); setError('');
    try {
      const res = await fetch('/api/profile/me', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      writeCache('profile', { profile: null }); writeCache('dash:hasProfile', false); writeCache('browse', null);
      navigate('/dashboard.html', { replace: true });
    } catch { setError('Profile delete nahi ho paya. Dobara try karo.'); setDeleting(false); }
  };

  // load fail / loading: page ka shell dikhao (header + nav ke saath)
  if (!profile && error) {
    return (
      <div className={s.page} onContextMenu={block} onDragStart={block}>
        <Top />
        <p role="alert" className={s.error}>{error}</p>
        <BottomNav />
      </div>
    );
  }
  if (profile === undefined) {
    return (
      <div className={s.page} onContextMenu={block} onDragStart={block}>
        <Top />
        <p className={s.msg}>Loading…</p>
        <BottomNav />
      </div>
    );
  }
  if (profile === null) return <Navigate to="/create-profile" replace />;

  return (
    <div className={s.page} onContextMenu={block} onDragStart={block}>
      <Top />

      <div className={s.photos}>
        {profile.photos.map((p, i) => (
          <figure key={i} className={s.photo}>
            <img src={p.url} alt={p.caption || `Photo ${i + 1}`} draggable={false} />
            {p.caption && <figcaption>{p.caption}</figcaption>}
          </figure>
        ))}
      </div>

      <h2 className={s.name}>{profile.name}, {profile.age}</h2>
      <p className={s.meta}>{profile.location} · {profile.gender}</p>
      {profile.bio && <p className={s.bio}>{profile.bio}</p>}

      <dl className={s.facts}>
        <div><dt>Dhundh rahe hain</dt><dd>{LOOKING[profile.lookingFor]}</dd></div>
        <div><dt>Dating pace</dt><dd>{PACE[profile.datingPace]}</dd></div>
        <div><dt>Chat comfort</dt><dd>{CHAT[profile.chatComfort]}</dd></div>
        <div><dt>Languages</dt><dd>{profile.languages.join(', ')}</dd></div>
      </dl>

      <div className={s.chips}>{profile.interests.map(i => <span key={i}>{i}</span>)}</div>

      {error && <p role="alert" className={s.error}>{error}</p>}

      <Link to="/create-profile" className={s.edit}>Profile edit karo</Link>
      <button type="button" className={s.del} onClick={remove} disabled={deleting}>
        {deleting ? 'Delete ho raha hai…' : 'Profile delete karo'}
      </button>

      <BottomNav />
    </div>
  );
}