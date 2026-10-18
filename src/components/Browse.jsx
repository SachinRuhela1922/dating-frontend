import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import BottomNav from './Bottomnav.jsx';
import { readCache, writeCache } from '../cache.js';
import s from './browse.module.css';

const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Gujarati', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Urdu'];
const INTERESTS = ['Travel', 'Music', 'Movies', 'Fitness', 'Cooking', 'Gaming', 'Reading', 'Photography', 'Dancing', 'Art', 'Foodie', 'Tech'];
const LOOKING = { 'one-day': 'Ek din ka saath', 'long-term': 'Long relationship' };
const PACE = { reserved: 'Reserved', moderate: 'Moderate', open: 'Open' };
const CHAT = { normal: 'Normal baat', open: 'Open baat', anything: 'Kuch bhi baat' };
const NO_FILTERS = { ageMin: '', ageMax: '', city: '', language: '', lookingFor: '', interests: [] };

function Card({ p }) {
  const [i, setI] = useState(0);
  const photo = p.photos[i];
  return (
    <article className={s.card}>
      <img className={s.main} src={photo.url} alt={photo.caption || p.name} draggable={false} />
      <div className={s.thumbs}>
        {p.photos.map((x, j) => (
          <button key={j} type="button" className={j === i ? s.on : ''} onClick={() => setI(j)} aria-label={`Photo ${j + 1}`}>
            <img src={x.url} alt="" draggable={false} />
          </button>
        ))}
      </div>
      {photo.caption && <p className={s.caption}>{photo.caption}</p>}
      <h2>{p.name}, {p.age}</h2>
      <p className={s.meta}>{p.location}</p>
      {p.bio && <p className={s.bio}>{p.bio}</p>}
      <p className={s.meta}>{LOOKING[p.lookingFor]} · Pace: {PACE[p.datingPace]} · Chat: {CHAT[p.chatComfort]}</p>
      <p className={s.meta}>Languages: {p.languages.join(', ')}</p>
      <div className={s.chips}>{p.interests.map(x => <span key={x}>{x}</span>)}</div>
    </article>
  );
}

export default function Browse() {
  const [profiles, setProfiles] = useState(() => readCache('browse') ?? []);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(() => !readCache('browse')); // cache hai toh Loading nahi
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needProfile, setNeedProfile] = useState(false);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [note, setNote] = useState('');

  const load = useCallback(async (f, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (f.ageMin) q.set('ageMin', f.ageMin);
      if (f.ageMax) q.set('ageMax', f.ageMax);
      if (f.city.trim()) q.set('city', f.city.trim());
      if (f.language) q.set('language', f.language);
      if (f.lookingFor) q.set('lookingFor', f.lookingFor);
      if (f.interests.length) q.set('interests', f.interests.join(','));
      const res = await fetch(`/api/profile/browse?${q}`, { credentials: 'include' });
      const d = await res.json();
      if (res.status === 403) return setNeedProfile(true);
      if (!res.ok) throw new Error(d.error);
      setProfiles(d.profiles); setIndex(0); setNote('');
      if (!f.ageMin && !f.ageMax && !f.city.trim() && !f.language && !f.lookingFor && !f.interests.length) writeCache('browse', d.profiles);
    } catch (e) { if (!silent) setError(e.message || 'Profiles load nahi ho paye.'); } // silent = cache dikh raha hai, error chhupao
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(NO_FILTERS, Boolean(readCache('browse'))); }, [load]);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const toggleInterest = i => setFilters(f => ({
    ...f, interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i],
  }));
  const apply = e => { e.preventDefault(); setNotice(''); load(filters); };
  const clear = () => { setFilters(NO_FILTERS); setNotice(''); load(NO_FILTERS); };

  const current = profiles[index];
  const next = () => { setNotice(''); setNote(''); setIndex(i => i + 1); };

  const sendRequest = async () => {
    setSending(true); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/profile/${current.id}/request`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }),
      });
      const d = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(d.error || 'Request nahi ja payi.');
      setNotice(res.status === 409 ? d.error : `${current.name} ko request bhej di.`);
      setNote(''); setIndex(i => i + 1);
    } catch (e) { setError(e.message); }
    finally { setSending(false); }
  };

  if (needProfile) return <Navigate to="/create-profile" replace />;

  const block = e => e.preventDefault(); // no long-press menu, no image drag

  return (
    <div className={s.page} onContextMenu={block} onDragStart={block}>
      <header className={s.top}>
        <Link to="/dashboard.html" className={s.back} aria-label="Dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1>Profiles</h1>
      </header>

      <details className={s.filters}>
        <summary>Filters</summary>
        <form onSubmit={apply} className={s.fform}>
          <div className={s.frow}>
            <label>Min age<input type="number" inputMode="numeric" min="18" max="99" value={filters.ageMin} onChange={e => setF('ageMin', e.target.value)} /></label>
            <label>Max age<input type="number" inputMode="numeric" min="18" max="99" value={filters.ageMax} onChange={e => setF('ageMax', e.target.value)} /></label>
          </div>
          <label>City / location<input value={filters.city} maxLength={60} placeholder="Jaise Delhi" onChange={e => setF('city', e.target.value)} /></label>
          <div className={s.frow}>
            <label>Language
              <select value={filters.language} onChange={e => setF('language', e.target.value)}>
                <option value="">Koi bhi</option>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label>Kya dhundh rahe hain
              <select value={filters.lookingFor} onChange={e => setF('lookingFor', e.target.value)}>
                <option value="">Koi bhi</option>
                <option value="one-day">Ek din ka saath</option>
                <option value="long-term">Long relationship</option>
              </select>
            </label>
          </div>
          <div>
            <span className={s.flabel}>Interests (koi bhi ek match ho)</span>
            <div className={s.fchips}>
              {INTERESTS.map(i => (
                <button type="button" key={i} aria-pressed={filters.interests.includes(i)}
                  className={filters.interests.includes(i) ? s.fon : ''} onClick={() => toggleInterest(i)}>{i}</button>
              ))}
            </div>
          </div>
          <div className={s.actions}>
            <button type="button" className={s.skip} onClick={clear}>Clear</button>
            <button className={s.req}>Apply</button>
          </div>
        </form>
      </details>

      {error && <p role="alert" className={s.error}>{error}</p>}
      {notice && <p role="status" className={s.ok}>{notice}</p>}
      {loading && <p className={s.msg}>Loading…</p>}

      {!loading && current && (
        <>
          <Card key={current.id} p={current} />
          <input className={s.note} value={note} maxLength={150} placeholder="Request ke saath ek line likho (optional)"
            aria-label="Request ke saath ek line" onChange={e => setNote(e.target.value)} />

          {/* fixed at the bottom */}
          <div className={s.bar}>
            <div className={s.actions}>
              <button className={s.skip} onClick={next} disabled={sending}>Next</button>
              <button className={s.req} onClick={sendRequest} disabled={sending}>{sending ? 'Bhej raha hai…' : 'Request'}</button>
            </div>
          </div>
        </>
      )}

      {!loading && !current && !error && (
        <div className={s.msg}>
          <p>Abhi aur profiles nahi hain.</p>
          <button className={s.req} onClick={() => load(filters)}>Dobara dekho</button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}