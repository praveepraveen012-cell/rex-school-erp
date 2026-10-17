// Grexotix School Management Platform - PWA Service Worker v2.6.0
const CACHE_NAME = 'grexotix-school-v2.6.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.png',
  './assets/grexotix_logo.png',
  './assets/grexotix_emblem.png',
  './assets/app_icon_512.png',
  './css/design-system.css',
  './css/layout.css',
  './css/components.css',
  './css/modules.css',
  './css/home-webapp.css',
  './css/mobile-app.css',
  './css/print.css',
  './js/data.js',
  './js/api.js',
  './js/auth-ui.js',
  './js/platform.js',
  './js/transport.js',
  './js/home.js',
  './js/dashboard.js',
  './js/students.js',
  './js/attendance.js',
  './js/fees.js',
  './js/exams.js',
  './js/timetable.js',
  './js/communication.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('SW cache populate warning:', err));
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('Purging legacy service worker cache:', k);
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for live updates, fallback to cache when offline
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});
