// Service worker Kanè Dijital: aplikasyon an louvri menm san entènèt.
// Chanje VERSION chak fwa w mete yon nouvo vèsyon an liy.
const VERSION = 'kane-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './js/app.js',
  './js/api.js',
  './js/db.js',
  './js/format.js',
  './js/reminder.js',
  './js/stats.js',
  './js/store.js',
  './js/sync.js',
  './js/ui.js',
  './js/views/auth.js',
  './js/views/customer.js',
  './js/views/customer-form.js',
  './js/views/customers.js',
  './js/views/reports.js',
  './js/views/entry.js',
  './js/views/home.js',
  './js/views/settings.js',
  './js/views/shared.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API a ak paj piblik yo: toujou rezo a, pa janm kach.
  if (url.origin === self.location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/k/'))) return;

  // Navigasyon: retounen aplikasyon an menm offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  // Fichye aplikasyon an + font: kach anvan, epi mete l ajou an aryè.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
