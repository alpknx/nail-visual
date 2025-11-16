// Service Worker для PWA
const CACHE_NAME = 'nail-visual-v1';
const urlsToCache = [
  '/',
  '/manifest.webmanifest',
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('Cache install failed:', err);
      })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Стратегия: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы (POST, PUT, DELETE и т.д.)
  if (event.request.method !== 'GET') {
    return;
  }

  // Пропускаем запросы к API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Кэшируем только успешные GET запросы
        if (response.status === 200) {
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, используем кэш
        return caches.match(event.request);
      })
  );
});


