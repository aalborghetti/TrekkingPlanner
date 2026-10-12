/**
 * TrekkingPlanner Service Worker
 * Cache-First offline shell strategy for 100% offline-first experience.
 */

const CACHE_NAME = 'trekking-planner-spa-v1.2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './default-trek.json',
  './css/app.css',
  './css/leaflet.css',
  './leaflet.css',
  './leaflet.js',
  './js/app.js',
  './js/db.js',
  './js/models/trek-schema.js',
  './js/models/pace-calculator.js',
  './js/models/gpx-parser.js',
  './js/views/dashboard-view.js',
  './js/views/stages-view.js',
  './js/views/map-view.js',
  './js/views/checklist-view.js',
  './js/views/evening-view.js',
  './js/views/services-view.js',
  './js/views/settings-view.js',
  './manifest.webmanifest',
  './favicon.ico',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching offline shell assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Cache external or dynamic assets if valid (e.g. map tiles)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
