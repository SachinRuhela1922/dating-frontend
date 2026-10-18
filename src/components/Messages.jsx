import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { socket, connectSocket } from '../socket.js';
import BottomNav from './Bottomnav.jsx';
import { readCache, writeCache } from '../cache.js';
import s from './messages.module.css';

// Ek hi user ke duplicate entries hatao (latest message wala rakho)
function dedupeMatches(list = []) {
  const map = new Map();
  for (const item of list) {
    const id = item?.profile?.id;
    if (id == null) continue;

    const prev = map.get(id);
    if (!prev) {
      map.set(id, item);
      continue;
    }

    const prevTime = prev.lastMessage?.createdAt ? new Date(prev.lastMessage.createdAt).getTime() : 0;
    const currTime = item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt).getTime() : 0;

    // jiska message naya ho wo rakho; tie me unread zyada wala
    if (currTime > prevTime || (currTime === prevTime && (item.unread || 0) > (prev.unread || 0))) {
      map.set(id, item);
    }
  }
  return [...map.values()];
}

export default function Messages() {
  const [matches, setMatches] = useState(() => readCache('matches')); // cache hai toh Loading nahi dikhega
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const hasData = useRef(matches !== null); // cache ya server se data aa chuka hai?

  const load = useCallback(() => {
    const myReq = ++reqId.current;
    return fetch('/api/connect/matches', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (myReq !== reqId.current) return; // purana response ignore
        setError('');
        const fresh = dedupeMatches(d.matches);
        setMatches(fresh);
        writeCache('matches', fresh);
        hasData.current = true;
      })
      .catch(() => {
        if (myReq !== reqId.current) return;
        if (!hasData.current) setError('Messages load nahi ho paye.'); // cache hai toh purana data dikhta rahe
      });
  }, []);

  useEffect(() => {
    connectSocket();
    load();
    socket.on('message', load); // new message -> refresh list (last message + unread)
    return () => socket.off('message', load);
  }, [load]);

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
        <h1>Messages</h1>
      </header>

      {error && <p role="alert" className={s.error}>{error}</p>}
      {matches === null && !error && <p className={s.msg}>Loading...</p>}
      {matches?.length === 0 && <p className={s.msg}>Abhi koi connection nahi hai. Request accept hone par yahan dikhega.</p>}

      <div className={s.list}>
        {matches?.map(({ profile: p, lastMessage: m, unread }) => (
          <Link key={p.id} to={`/messages/${p.id}`} className={`${s.row} ${unread ? s.unreadRow : ''}`}>
            <img className={s.avatarSm} src={p.photos?.[0]?.url} alt="" draggable={false} />
            <div className={s.rowText}>
              <strong>{p.name}</strong>
              <p className={s.meta}>{m ? `${m.mine ? 'Aap: ' : ''}${m.text.slice(0, 60)}` : 'Hello bolo!'}</p>
            </div>
            {unread > 0 && <span className={s.badge} aria-label={`${unread} unread`}>{unread}</span>}
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}