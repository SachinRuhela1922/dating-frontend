import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { socket, connectSocket } from '../socket.js';
import { readCache, writeCache } from '../cache.js';
import s from './connect.module.css';

const newCid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [other, setOther] = useState(() => readCache(`chat:${id}`)?.profile ?? null);
  const [messages, setMessages] = useState(() => readCache(`chat:${id}`)?.messages ?? []);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottom = useRef(null);
  const typingTimer = useRef();
  const lastTypingSent = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/connect/chat/${id}`, { credentials: 'include' }); // also marks as read
      const d = await res.json();
      if (res.status === 403 || res.status === 404) return navigate('/messages', { replace: true });
      if (!res.ok) throw new Error(d.error);
      setOther(d.profile);
      // keep messages that are still being sent / failed: the server doesn't know them yet
      setMessages(local => {
        const known = new Set(d.messages.map(m => m.id));
        const keep = local.filter(m => m.status && !(m.id && known.has(m.id)));
        const seen = new Set(d.messages.map(m => m.cid).filter(Boolean));
        return [...d.messages, ...keep.filter(m => !seen.has(m.cid))];
      });
      writeCache(`chat:${id}`, { profile: d.profile, messages: d.messages.slice(-100) });
    } catch (e) { setError(e.message || 'Chat load nahi ho paya.'); }
  }, [id, navigate]);

  useEffect(() => {
    connectSocket();
    load();

    const askPresence = () => socket.emit('presence:get', id, setOnline);
    const onMessage = ({ fromProfileId, message }) => {
      if (fromProfileId !== id) return;
      setMessages(m => (m.some(x => x.id === message.id) ? m : [...m, message]));
      setTyping(false);
      fetch(`/api/connect/chat/${id}/read`, { method: 'POST', credentials: 'include' }).catch(() => {});
    };
    // Confirmed copy of a message I sent (from this tab or another tab of mine).
    const onSync = ({ profileId, message }) => {
      if (profileId !== id) return;
      setMessages(m => {
        if (m.some(x => x.cid && x.cid === message.cid)) return m.map(x => (x.cid === message.cid ? { ...message } : x));
        return m.some(x => x.id === message.id) ? m : [...m, message];
      });
    };
    const onTyping = ({ profileId }) => {
      if (profileId !== id) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    };
    const onPresence = ({ profileId, online: on }) => { if (profileId === id) setOnline(on); };
    const onConnect = () => { load(); askPresence(); }; // after a (re)connect, catch up on anything missed

    socket.on('message', onMessage);
    socket.on('message:sync', onSync);
    socket.on('typing', onTyping);
    socket.on('presence', onPresence);
    socket.on('connect', onConnect);
    if (socket.connected) askPresence();

    return () => {
      socket.off('message', onMessage); socket.off('message:sync', onSync); socket.off('typing', onTyping);
      socket.off('presence', onPresence); socket.off('connect', onConnect);
      clearTimeout(typingTimer.current);
    };
  }, [id, load]);

  // naye/bheje gaye messages bhi cache me rakho (offline/APK reopen pe turant dikhein)
  useEffect(() => {
    if (other) writeCache(`chat:${id}`, { profile: other, messages: messages.filter(m => !m.status).slice(-100) });
  }, [messages, other, id]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length, typing]);

  const onType = e => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) { lastTypingSent.current = now; socket.emit('typing', id); }
  };

  const patch = (cid, changes) => setMessages(m => m.map(x => (x.cid === cid ? { ...x, ...changes } : x)));

  // Socket first (instant). If the socket is down or doesn't answer, fall back to REST with the
  // SAME cid - the server de-duplicates, so a retry can never create a double message.
  const deliver = msg => {
    const settle = res => {
      if (res?.ok) patch(msg.cid, { ...res.message, cid: msg.cid, status: undefined });
      else { patch(msg.cid, { status: 'failed' }); setError(res?.error || 'Message nahi ja paya.'); }
    };
    const viaRest = () =>
      fetch(`/api/connect/chat/${id}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: msg.text, cid: msg.cid }),
      })
        .then(async r => { const d = await r.json().catch(() => ({})); settle(r.ok ? { ok: true, message: d.message } : { ok: false, error: d.error }); })
        .catch(() => settle({ ok: false }));

    if (!socket.connected) return viaRest();
    socket.timeout(8000).emit('chat:send', { profileId: id, text: msg.text, cid: msg.cid }, (err, res) => (err ? viaRest() : settle(res)));
  };

  const send = e => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const msg = { cid: newCid(), text: t, mine: true, createdAt: new Date().toISOString(), status: 'sending' };
    setMessages(m => [...m, msg]); // shows up instantly
    setText(''); setError('');
    deliver(msg);
  };

  const retry = m => { if (m.status !== 'failed') return; setError(''); patch(m.cid, { status: 'sending' }); deliver(m); };

  return (
    <div className={s.chat}>
      <header className={s.chatHead}>
        <Link to="/messages" className={s.back} aria-label="Messages par wapas">←</Link>
        {other && (
          <>
            <img className={s.avatarSm} src={other.photos[0].url} alt="" />
            <div>
              <strong>{other.name}</strong>
              <p className={s.status} aria-live="polite">{typing ? 'typing…' : online ? 'Online' : 'Offline'}</p>
            </div>
          </>
        )}
      </header>
      <div className={s.thread}>
        {messages.length === 0 && <p className={s.msg}>Pehla message bhejo.</p>}
        {messages.map(m => (
          <p
            key={m.cid || m.id}
            className={`${m.mine ? s.mine : s.theirs} ${m.status === 'sending' ? s.sending : ''} ${m.status === 'failed' ? s.failed : ''}`}
            onClick={() => retry(m)}
          >
            {m.text}
            {m.status === 'failed' && <small className={s.retryHint}> · Not sent. Tap to retry</small>}
          </p>
        ))}
        {typing && <p className={`${s.theirs} ${s.typingBubble}`}>…</p>}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" className={s.error}>{error}</p>}
      <form className={s.compose} onSubmit={send}>
        <input value={text} maxLength={1000} placeholder="Message likho…" onChange={onType} aria-label="Message" />
        <button className={s.primary} disabled={!text.trim()}>Send</button>
      </form>
    </div>
  );
}
