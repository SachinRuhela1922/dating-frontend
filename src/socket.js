import { io } from 'socket.io-client';
import { api } from './api.js';

// The socket talks to the API host DIRECTLY (VITE_SOCKET_URL). Vercel/Netlify rewrites can't proxy
// WebSockets - through them Socket.IO silently falls back to slow, buffered long-polling.
// Leave VITE_SOCKET_URL empty for same-origin setups (local dev proxy / single-origin deploy).
const URL = import.meta.env.VITE_SOCKET_URL || undefined;

let wanted = false;   // true while a user is signed in
let retries = 0;

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'], // websocket first: no slow polling handshake
  tryAllTransports: true,               // ...but still works on networks that block websockets
  timeout: 8000,
  reconnectionDelay: 300,
  reconnectionDelayMax: 3000,
  // Fresh short-lived token on every (re)connect, fetched with the normal login cookie.
  auth: cb => { api('/auth/socket-token').then(d => cb({ token: d.token }), () => cb({})); },
});

const connectNow = () => { if (wanted && !socket.connected) socket.connect(); };

export const connectSocket = () => { wanted = true; connectNow(); }; // safe to call repeatedly
export const disconnectSocket = () => { wanted = false; retries = 0; socket.disconnect(); };

socket.on('connect', () => { retries = 0; });
// A rejected handshake (e.g. token fetch failed) is not retried by Socket.IO itself - do it ourselves.
socket.on('connect_error', () => {
  if (!wanted || socket.active) return;
  setTimeout(connectNow, Math.min(1000 * 2 ** retries++, 15000));
});

// Phones freeze background tabs: the connection can look open but be dead. When the app comes
// back (or the network returns) make sure it's alive; if not, reconnect immediately.
function wake() {
  if (!wanted) return;
  if (!socket.connected) return connectNow();
  socket.timeout(3000).emit('ping:check', err => { if (err) { socket.disconnect(); connectNow(); } });
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake(); });
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);
}
