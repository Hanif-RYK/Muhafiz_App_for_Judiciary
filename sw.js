// Muhafiz Service Worker v2
// - HTML/navigation: network-first (users always get the latest app version when online)
// - Static assets: stale-while-revalidate (fast + refreshed in background)
const CACHE_NAME = 'muhafiz-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const clone = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
  }
  return response;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  // Only handle same-origin GET requests
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || req.destination === 'document';
  if (isPage) {
    e.respondWith(
      fetch(req)
        .then(res => putInCache(req, res))
        .catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => putInCache(req, res)).catch(() => cached);
      return cached || network;
    })
  );
});
