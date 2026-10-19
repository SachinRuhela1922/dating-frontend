// Kindred service worker.
// - App shell (HTML/JS/CSS/fonts/images) cache hota hai => app offline/slow net pe bhi turant khulta hai.
// - /api aur /socket.io KABHI cache nahi hote (private data; woh app ke localStorage cache me rehta hai).
// Naya version deploy karo toh VERSION badal do taaki purana cache saaf ho jaye.
const VERSION = 'v1';
const SHELL = `kindred-shell-${VERSION}`;
const ASSETS = `kindred-assets-${VERSION}`;
const IMAGES = `kindred-images-${VERSION}`;
const ALL = [SHELL, ASSETS, IMAGES];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !ALL.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const putIfOk = async (cacheName, req, res) => {
  // opaque (cross-origin <img>) responses bhi cache kar lo
  if (res && (res.ok || res.type === 'opaque')) {
    const c = await caches.open(cacheName);
    c.put(req, res.clone()).catch(() => {});
  }
  return res;
};

const cacheFirst = async (req, cacheName) => {
  const hit = await caches.match(req);
  if (hit) return hit;
  return putIfOk(cacheName, req, await fetch(req));
};

const staleWhileRevalidate = async (req, cacheName) => {
  const hit = await caches.match(req);
  const net = fetch(req).then(res => putIfOk(cacheName, req, res)).catch(() => hit);
  return hit || net;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Private/live data: SW ko chhuna hi nahi
  if (url.origin === location.origin && (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io'))) return;
  if (url.pathname.includes('/api/')) return; // cross-origin backend
  if (url.pathname.startsWith('/socket.io')) return; // realtime socket (direct to the API host)

  // Page navigation: network first, fail hone par cached app shell
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { putIfOk(SHELL, '/', res); return res; })
        .catch(async () => (await caches.match('/')) || Response.error())
    );
    return;
  }

  // Vite ke hashed build files: kabhi badalte nahi => cache first
  if (url.origin === location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(cacheFirst(req, ASSETS));
    return;
  }

  // Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req, ASSETS));
    return;
  }

  // Profile photos / images: pehle cache se, peeche refresh
  if (req.destination === 'image') {
    e.respondWith(staleWhileRevalidate(req, IMAGES));
    return;
  }

  // Baaki same-origin static files (icons, manifest)
  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req, SHELL));
  }
});
