/**
 * ============================================================================
 * SERVICE WORKER - BITÁCORA DE CATACIÓN VARIETALE (PWA)
 * ============================================================================
 * Proporciona soporte offline, caché de recursos estáticos y experiencia nativa.
 * Versión v3: Forzado inmediato de limpieza de cachés y activación sin espera.
 */

const CACHE_NAME = 'varietale-pwa-v3';

// Recursos críticos para navegación inicial y funcionamiento sin conexión
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png',
  './og-image.png'
];

// 1. INSTALACIÓN: Precarga inmediata y skipWaiting forzado
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Advertencia al precargar recursos en caché inicial:', err);
      });
    })
  );
});

// 2. ACTIVACIÓN: Destrucción forzada de todas las versiones anteriores de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. MENSAJES: Permite a la aplicación solicitar skipWaiting o purga forzada
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    if (event.data.type === 'PURGE_CACHES') {
      event.waitUntil(
        caches.keys().then((names) => {
          return Promise.all(names.map((n) => caches.delete(n)));
        })
      );
    }
  }
});

// 4. ESTRATEGIA DE INTERCEPTACIÓN DE PETICIONES (FETCH)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No interceptar peticiones de extensiones de navegador ni métodos no-GET
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. Peticiones de navegación (Páginas HTML): Network First con fallback a index.html en caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
          return caches.match('./');
        })
    );
    return;
  }

  // B. Peticiones API de catálogo (/api/varietale-coffees): Network First con fallback a caché
  if (url.pathname.startsWith('/api/varietale-coffees') || url.pathname.startsWith('/api/varietale-catalog')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // C. Recursos estáticos (JS, CSS, imágenes, fuentes): Network First para evitar assets rotos
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
