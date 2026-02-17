// Chess Peace Service Worker
// Offline support + caching strategy

const CACHE_NAME = 'chess-iphone-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  './solutions.json',
  './icon192.png'
];

// Install event – cache resurssit
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching essential assets');
      return cache.addAll(urlsToCache);
    })
  );
  // Skip waiting – aktivoi heti
  self.skipWaiting();
});

// Activate event – cleanup vanhat caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients heti
  return self.clients.claim();
});

// Fetch event – cache first, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;

  // Vain GET requests
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then(response => {
      // Palautetaan cachesta jos löytyy
      if (response) {
        // Päivitä taustalla
        fetch(request).then(freshResponse => {
          if (freshResponse && freshResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, freshResponse.clone());
            });
          }
        }).catch(() => {});
        return response;
      }

      // Ei cachessa – hae networkista
      return fetch(request)
        .then(response => {
          // Cache successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone response (can only consume once)
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Network failed & no cache – return offline page
          console.log('[SW] Offline: no cache for', request.url);
          // Voit palauttaa custom offline-sivun tässä
          // return caches.match('./offline.html');
        });
    })
  );
});

// Message event – communication with client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (bonusominaisuus)
// self.addEventListener('sync', event => {
//   if (event.tag === 'sync-solutions') {
//     event.waitUntil(syncSolutions());
//   }
// });
