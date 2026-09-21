// Rex Senior Secondary School - PWA Service Worker
const CACHE_NAME = 'rex-school-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.png',
  './css/design-system.css',
  './css/layout.css',
  './css/components.css',
  './css/modules.css',
  './css/home-webapp.css',
  './css/mobile-app.css',
  './css/print.css',
  './js/data.js',
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
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Cache error', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
