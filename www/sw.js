// ARK Studios offline support for the web version (the Android app never registers this worker).
// Network first for everything, so a deploy is picked up on the next load and old scripts are never
// mixed with a new page; the cache is only the fallback when there is no connection.
const CACHE = 'ark-studios-v4';
// Everything the page needs at startup, so it works offline after one visit (the scripts load before
// this worker takes control, so the runtime cache alone would miss them). test/offline-shell.test.js
// fails if index.html or fonts.css starts using a file that is not listed here.
const SHELL = ['./', './index.html', './manifest.webmanifest',
  './js/version.js', './js/core.js', './js/today.js', './js/native.js', './js/update.js', './js/swipe.js',
  './css/app.css', './fonts/fonts.css',
  './fonts/rozha-one-latin.woff2', './fonts/rozha-one-latin-ext.woff2',
  './icons/icon-192.png', './icons/apple-touch-icon.png'];

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
