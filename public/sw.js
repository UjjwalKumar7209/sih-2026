const CACHE_NAME = 'industrial-fire-ai-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/globals.css',
  '/icon.svg',
  '/manifest.webmanifest',
  '/api/detections?limit=1500' // Pre-cache historical dataset for offline demo usage!
];

// Install Event - Pre-cache essential shells and fallback data
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First falling back to Cache strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and ignore chrome-extension or external queries
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses dynamically
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        console.log('[Service Worker] Network unavailable. Serving from cache:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If offline and request is page navigation, return root page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
