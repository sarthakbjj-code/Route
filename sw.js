/**
 * Service worker for Route PWA.
 *
 * Provides:
 *   - Offline caching of app shell
 *   - Background sync for pending delivery records
 */

var CACHE_NAME = 'route-v1'; // bump version to bust cache on deploy
var APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/db.js',
  './js/sync.js',
  './js/app.js',
  './manifest.json'
];

/* ---- Install: pre-cache app shell ---- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

/* ---- Activate: clean old caches ---- */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
              .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

/* ---- Fetch: cache-first for app shell, network-first for API ---- */
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Let API requests go straight to network
  if (event.request.method === 'POST') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        // Cache successful GET responses for app shell resources
        if (response.ok && event.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        // Offline fallback: return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

/* ---- Background Sync ---- */
self.addEventListener('sync', function (event) {
  if (event.tag === 'sync-deliveries') {
    event.waitUntil(syncDeliveries());
  }
});

function syncDeliveries() {
  // Background sync triggers the same sync logic used by the main thread.
  // We post a message to all clients to invoke RouteSync.syncPendingRecords().
  return self.clients.matchAll().then(function (clients) {
    clients.forEach(function (client) {
      client.postMessage({ type: 'sync-deliveries' });
    });
  });
}
