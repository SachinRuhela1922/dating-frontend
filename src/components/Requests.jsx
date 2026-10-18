import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BottomNav from './Bottomnav.jsx';
import { readCache, writeCache } from '../cache.js';
import s from './requests.module.css';

export default function Requests() {
  const [items, setItems] = useState(() => readCache('requests')?.map(x => ({ ...x, result: null })) ?? null);
  const hasData = useRef(items !== null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    fetch('/api/connect/requests', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setError(''); setItems(d.requests.map(x => ({ ...x, result: null }))); writeCache('requests', d.requests); hasData.current = true; })
      .catch(() => { if (!hasData.current) setError('Requests load nahi ho payi.'); }); // cache hai toh purana dikhta rahe
  }, []);

  const respond = async (item, action) => {
    setBusy(item.id); setError('');
    try {
      const res = await fetch(`/api/connect/requests/${item.id}/${action}`, { method: 'POST', credentials: 'include' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setItems(list => list.map(x => (x.id === item.id ? { ...x, result: action === 'accept' ? 'accepted' : 'declined' } : x)));
      writeCache('requests', (readCache('requests') || []).filter(x => x.id !== item.id));
      writeCache('count:pending', Math.max(0, (readCache('count:pending') || 0) - 1));
    } catch (e) { setError(e.message || 'Kuch galat ho gaya.'); }
    finally { setBusy(''); }
  };

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
        <h1>Requests</h1>
      </header>

      {error && <p role="alert" className={s.error}>{error}</p>}
      {items === null && !error && <p className={s.msg}>Loading…</p>}
      {items?.length === 0 && <p className={s.msg}>Abhi koi nayi request nahi hai.</p>}

      <div className={s.list}>
        {items?.filter(x => x.result !== 'declined').map(x => (
          <article key={x.id} className={s.item}>
            <div className={s.head}>
              <img className={s.avatar} src={x.profile.photos[0].url} alt={x.profile.name} draggable={false} />
              <div className={s.info}>
                <h2>{x.profile.name}, {x.profile.age}</h2>
                <p className={s.meta}>{x.profile.location}</p>
              </div>
            </div>

            {x.note && <p className={s.noteText}>“{x.note}”</p>}
            {x.profile.bio && <p className={s.bio}>{x.profile.bio}</p>}
            <div className={s.chips}>{x.profile.interests.slice(0, 4).map(i => <span key={i}>{i}</span>)}</div>

            {x.result === 'accepted' ? (
              <div className={s.actions}>
                <span className={s.ok}>Accept ho gayi</span>
                <Link className={s.primary} to={`/messages/${x.profile.id}`}>Message</Link>
              </div>
            ) : (
              <div className={s.actions}>
                <button className={s.secondary} disabled={busy === x.id} onClick={() => respond(x, 'decline')}>Decline</button>
                <button className={s.primary} disabled={busy === x.id} onClick={() => respond(x, 'accept')}>Accept</button>
              </div>
            )}
          </article>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}