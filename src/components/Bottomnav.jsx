import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket, connectSocket } from '../socket.js';
import { readCache, writeCache } from '../cache.js';
import './bottomnav.css';

/* ---------- Icons (inline SVG, bold) ---------- */
const Svg = ({ children }) => (
  <svg className="bnav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" draggable="false">
    {children}
  </svg>
);

const IconProfiles = () => (
  <Svg>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c0-3.1 2.7-5 6-5s6 1.9 6 5" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" />
    <path d="M18 14.3c1.8.6 3 2 3 4.7" />
  </Svg>
);
const IconRequests = () => (
  <Svg>
    <circle cx="10" cy="8" r="3.4" />
    <path d="M3.5 19.5c0-3.3 2.9-5.5 6.5-5.5" />
    <path d="M18 13v6M15 16h6" />
  </Svg>
);
const IconMessages = () => (
  <Svg>
    <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.3A7.5 7.5 0 1 1 20 12Z" />
  </Svg>
);
const IconMe = () => (
  <Svg>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
  </Svg>
);

// Order: Profiles (start) · Requests · Messages (middle) · My profile (last)
const TABS = [
  { key: 'browse',   label: 'Profiles',   path: '/browse',   Icon: IconProfiles },
  { key: 'requests', label: 'Requests',   path: '/requests', Icon: IconRequests },
  { key: 'messages', label: 'Messages',   path: '/messages', Icon: IconMessages },
  { key: 'profile',  label: 'My profile', path: '/profile',  Icon: IconMe },
];

// URL se active tab nikalta hai. Dashboard (ya koi aur page) pe default = Profiles.
function activeKey(pathname) {
  const hit = TABS.find(t => pathname === t.path || pathname.startsWith(t.path + '/'));
  return hit ? hit.key : 'browse';
}

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pending, setPending] = useState(() => readCache('count:pending') ?? 0);
  const [unread, setUnread] = useState(() => readCache('count:unread') ?? 0);

  useEffect(() => {
    connectSocket();
    const syncCounts = () => {
      fetch('/api/connect/requests', { credentials: 'include' })
        .then(r => r.json()).then(d => { const n = d.requests?.length || 0; setPending(n); writeCache('count:pending', n); }).catch(() => {});
      fetch('/api/connect/unread', { credentials: 'include' })
        .then(r => r.json()).then(d => { const n = d.count || 0; setUnread(n); writeCache('count:unread', n); }).catch(() => {});
    };
    syncCounts(); // fresh badges on every page/route change
    const onMessage = () => setUnread(n => n + 1);
    const onRequest = () => setPending(n => n + 1);
    const onRemoved = () => setPending(n => Math.max(0, n - 1)); // I accepted/declined one (any tab)
    socket.on('message', onMessage);
    socket.on('request', onRequest);
    socket.on('request:removed', onRemoved);
    socket.on('connect', syncCounts); // (re)connected: badges might have missed events
    return () => {
      socket.off('message', onMessage); socket.off('request', onRequest);
      socket.off('request:removed', onRemoved); socket.off('connect', syncCounts);
    };
  }, [pathname]);

  const badges = { requests: pending, messages: unread };
  const active = activeKey(pathname);

  return (
    <nav className="bnav" aria-label="Main" onContextMenu={e => e.preventDefault()}>
      {TABS.map(({ key, label, path, Icon }) => {
        const n = badges[key] || 0;
        return (
          <button
            key={key}
            type="button"
            className={`bnav__item${active === key ? ' is-active' : ''}`}
            aria-label={label}
            aria-current={active === key ? 'page' : undefined}
            onClick={() => { if (!(pathname === path || pathname.startsWith(path + '/'))) navigate(path); }}
          >
            <span className="bnav__iconwrap">
              <Icon />
              {n > 0 && <span className="bnav__badge">{n > 99 ? '99+' : n}</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}