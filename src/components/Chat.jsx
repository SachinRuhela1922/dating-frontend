import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { socket, connectSocket } from '../socket.js';
import { readCache, writeCache } from '../cache.js';
import s from './connect.module.css';

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [other, setOther] = useState(() => readCache(`chat:${id}`)?.profile ?? null);
  const [messages, setMessages] = useState(() => readCache(`chat:${id}`)?.messages ?? []);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
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
      setOther(d.profile); setMessages(d.messages);
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
    const onTyping = ({ profileId }) => {
      if (profileId !== id) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    };
    const onPresence = ({ profileId, online: on }) => { if (profileId === id) setOnline(on); };
    const onConnect = () => { load(); askPresence(); }; // after a reconnect, catch up on missed messages

    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    socket.on('presence', onPresence);
    socket.on('connect', onConnect);
    if (socket.connected) askPresence();

    return () => {
      socket.off('message', onMessage); socket.off('typing', onTyping);
      socket.off('presence', onPresence); socket.off('connect', onConnect);
      clearTimeout(typingTimer.current);
    };
  }, [id, load]);

  // naye/bheje gaye messages bhi cache me rakho (offline/APK reopen pe turant dikhein)
  useEffect(() => {
    if (other) writeCache(`chat:${id}`, { profile: other, messages: messages.slice(-100) });
  }, [messages, other, id]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length, typing]);

  const onType = e => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) { lastTypingSent.current = now; socket.emit('typing', id); }
  };

  const send = async e => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setError('');
    try {
      const res = await fetch(`/api/connect/chat/${id}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMessages(m => [...m, d.message]); setText('');
    } catch (err) { setError(err.message || 'Message nahi ja paya.'); }
    finally { setSending(false); }
  };

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
        {messages.map(m => <p key={m.id} className={m.mine ? s.mine : s.theirs}>{m.text}</p>)}
        {typing && <p className={`${s.theirs} ${s.typingBubble}`}>…</p>}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" className={s.error}>{error}</p>}
      <form className={s.compose} onSubmit={send}>
        <input value={text} maxLength={1000} placeholder="Message likho…" onChange={onType} aria-label="Message" />
        <button className={s.primary} disabled={sending || !text.trim()}>Send</button>
      </form>
    </div>
  );
}