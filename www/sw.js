// ARK Studios offline support for the web version (the Android app never registers this worker).
// Network first for everything, so a deploy is picked up on the next load and old scripts are never
// mixed with a new page; the cache is only the fallback when there is no connection.
const CACHE = 'ark-studios-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './fonts/fonts.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Deletes every other cache, including the old "taal-v2" one.
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req)
    .then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy));
      }
      return res;
    })
    .catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req)
      .then(hit => hit || caches.match(req, { ignoreSearch: true }))));
});
