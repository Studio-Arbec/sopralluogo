/* Service worker - offline con aggiornamenti automatici */
const CACHE = 'sopralluogo-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Pagine HTML: prima la rete (così gli aggiornamenti arrivano subito), cache solo se offline
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then((resp) => {
        if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return resp;
      }).catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))
      )
    );
    return;
  }
  // Altri file: prima la cache (velocità), aggiornata in sottofondo dalla rete
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const rete = fetch(e.request).then((resp) => {
        if (e.request.method === 'GET' && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || rete;
    })
  );
});
