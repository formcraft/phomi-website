/* PHOMI service worker (made by scripts/seo-build.mjs from src/sw-template.js at every build).
   - Pages: fresh from the network when it answers within a few seconds, otherwise the saved copy, so pages still open with no signal.
   - Scripts, styles and fonts (their names change every build): saved once, then served instantly.
   - Pictures: saved as they are seen (up to 150), served instantly next time.
   - Bible chapters: shown from the saved copy at once, then refreshed in the background.
   - Live content (/api/content): fresh when online, the saved copy with no signal.
   - Never touches the admin page, sign-in, forms, giving, uploads in progress or videos. */
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const SHELL = __SHELL__;
const CORE = `phomi-core-${VERSION}`;
const PAGES = 'phomi-pages';
const MEDIA = 'phomi-media';
const DATA = 'phomi-data';

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const core = await caches.open(CORE);
    await core.addAll(ASSETS).catch(() => {});
    const pages = await caches.open(PAGES);
    await Promise.all(SHELL.map((p) => fetch(p, { cache: 'no-cache' }).then((r) => r.ok && pages.put(p, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('phomi-core-') && k !== CORE) await caches.delete(k);
    await self.clients.claim();
  })());
});

const timeout = (ms) => new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms));

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/admin') || p.startsWith('/api/admin') || p.startsWith('/api/install') || p.startsWith('/api/give') || p.startsWith('/__') || p.startsWith('/video/') || req.headers.has('range')) return;

  // Pages: network first (3 s), then the saved page, then the saved home page (the app shell)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const pages = await caches.open(PAGES);
      try {
        const res = await Promise.race([fetch(req), timeout(3000)]);
        if (res.ok) pages.put(p, res.clone());
        return res;
      } catch {
        return (await pages.match(p)) || (await pages.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Build files: cache first
  if (p.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(CORE).then((c) => c.put(req, res.clone()));
      return res;
    })));
    return;
  }

  // Pictures: cache first, kept to the 150 most recent
  if (/^\/(img|uploads)\/.+\.(jpe?g|png|webp|svg)$/i.test(p) || /^\/favicon|apple-touch-icon/.test(p)) {
    e.respondWith(caches.open(MEDIA).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { c.put(req, res.clone()); trim(MEDIA, 150); }
      return res;
    }));
    return;
  }

  // Bible text never changes: saved copy now, refreshed in the background
  if (p.startsWith('/api/bible/')) {
    e.respondWith(caches.open(DATA).then(async (c) => {
      const hit = await c.match(req);
      const fresh = fetch(req).then((res) => {
        if (res.ok) { c.put(req, res.clone()); trim(DATA, 200); }
        return res;
      });
      if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
      return fresh;
    }));
    return;
  }

  // Live content and the verse: always fresh when online (the server answers "nothing changed" in a few bytes),
  // the saved copy when there is no signal
  if (p === '/api/content' || p === '/api/verse') {
    e.respondWith(caches.open(DATA).then(async (c) => {
      try {
        const res = await Promise.race([fetch(req), timeout(5000)]);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch {
        return (await c.match(req)) || Response.error();
      }
    }));
  }
});
