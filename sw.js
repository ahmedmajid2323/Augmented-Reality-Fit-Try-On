const CACHE_NAME = 'ar-fittry-head-v1.0.0';
const RUNTIME_CACHE = 'ar-fittry-runtime';

// Fichiers à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/main.js',
  '/js/config.js',
  '/js/modules/FaceTracker.js',
  '/js/modules/KalmanFilter.js',
  '/js/modules/ModelManager.js',
  '/js/modules/RenderEngine.js',
  '/js/modules/WebXRManager.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des fichiers statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de l\'installation:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== CACHE_NAME && name !== RUNTIME_CACHE;
            })
            .map((name) => {
              console.log('[SW] Suppression de l\'ancien cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// Stratégie de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Stratégie pour les fichiers statiques : Cache First
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          });
        })
    );
    return;
  }

  // Stratégie pour les modèles 3D : Cache First avec fallback
  if (url.pathname.includes('/models/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Modèle 3D servi depuis le cache:', url.pathname);
            return cachedResponse;
          }
          
          return fetch(request).then((response) => {
            // Ne cacher que les réponses réussies
            if (response && response.status === 200) {
              return caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, response.clone());
                return response;
              });
            }
            return response;
          });
        })
        .catch(() => {
          console.error('[SW] Impossible de charger le modèle:', url.pathname);
        })
    );
    return;
  }

  // Stratégie pour les CDN (Three.js, TensorFlow) : Network First
  if (url.hostname.includes('cdn.jsdelivr.net') || 
      url.hostname.includes('unpkg.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Stratégie par défaut : Network First
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('[SW] Erreur:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Promise rejetée:', event.reason);
});
