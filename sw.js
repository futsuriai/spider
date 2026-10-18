// Network first, so a refresh always gets the latest version when online.
// Falls back to the cached copy when offline, so the game still opens on a plane.
const CACHE = 'spider-v1';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'game.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'court/spade_jack.png',
  'court/spade_queen.png',
  'court/spade_king.png',
  'court/heart_jack.png',
  'court/heart_queen.png',
  'court/heart_king.png',
  'court/diamond_jack.png',
  'court/diamond_queen.png',
  'court/diamond_king.png',
  'court/club_jack.png',
  'court/club_queen.png',
  'court/club_king.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
