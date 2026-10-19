import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { socket, connectSocket } from '../socket.js';
import BottomNav from './Bottomnav.jsx';
import { readCache, writeCache } from '../cache.js';
import s from './requests.module.css';

export default function Requests() {
  const [items, setItems] = useState(() => readCache('requests')?.map(x => ({ ...x, result: null })) ?? null);
  const hasData = useRef(items !== null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() =>
    fetch('/api/connect/requests', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setError('');
        // keep rows already answered in this visit (they show "Accept ho gayi" until you leave)
        setItems(old => [...d.requests.map(x => ({ ...x, result: null })), ...(old || []).filter(x => x.result && !d.requests.some(r => r.id === x.id))]);
        writeCache('requests', d.requests); hasData.current = true;
      })
      .catch(() => { if (!hasData.current) setError('Requests load nahi ho payi.'); }), []); // cache hai toh purana dikhta rahe

  useEffect(() => {
    connectSocket();
    load();
    // New request: show it instantly (the event carries the full card). Old payload? just refetch.
    const onRequest = ({ request }) => {
      if (!request) return load();
      setItems(list => ((list || []).some(x => x.id === request.id) ? list : [{ ...request, result: null }, ...(list || [])]));
      writeCache('requests', [request, ...(readCache('requests') || []).filter(x => x.id !== request.id)]);
      hasData.current = true;
    };
    const onRemoved = ({ id }) => setItems(list => (list || []).filter(x => x.id !== id || x.result)); // answered in another tab
    socket.on('request', onRequest);
    socket.on('request:removed', onRemoved);
    socket.on('connect', load); // (re)connected: catch up on anything missed
    return () => { socket.off('request', onRequest); socket.off('request:removed', onRemoved); socket.off('connect', load); };
  }, [load]);

  // Optimistic: the card flips immediately, and rolls back only if the server says no.
  const respond = async (item, action) => {
    setBusy(item.id); setError('');
    const result = action === 'accept' ? 'accepted' : 'declined';
    setItems(list => list.map(x => (x.id === item.id ? { ...x, result } : x)));
    try {
      const res = await fetch(`/api/connect/requests/${item.id}/${action}`, { method: 'POST', credentials: 'include' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      writeCache('requests', (readCache('requests') || []).filter(x => x.id !== item.id));
      writeCache('count:pending', Math.max(0, (readCache('count:pending') || 0) - 1));
    } catch (e) {
      setItems(list => list.map(x => (x.id === item.id ? { ...x, result: null } : x)));
      setError(e.message || 'Kuch galat ho gaya.');
    } finally { setBusy(''); }
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