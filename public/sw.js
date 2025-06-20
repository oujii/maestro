// Version management - increment this when deploying updates
const APP_VERSION = '2.0.0';
const CACHE_PREFIX = 'maestro-quiz';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${APP_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-v${APP_VERSION}`;
const AUDIO_CACHE = `${CACHE_PREFIX}-audio-v${APP_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/quiz',
  '/results',
  '/leaderboard',
  '/instructions'
];

// Audio file patterns for special caching
const AUDIO_PATTERNS = [
  /\.mp3$/,
  /\.wav$/,
  /\.ogg$/,
  /deezer\.com.*preview/,
  /youtube\.com.*audio/,
  /cdns-preview.*\.mp3/
];

// API patterns that should not be cached
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /supabase/,
  /auth/,
  /localhost:54321/, // Supabase local
  /\.supabase\.co/
];

// Font Awesome and external assets
const EXTERNAL_ASSETS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /fontawesome/,
  /cdnjs\.cloudflare\.com/
];

// Quiz-specific cache settings
const QUIZ_CACHE_CONFIG = {
  // Audio files cache for 7 days (quiz songs change daily)
  audioMaxAge: 7 * 24 * 60 * 60 * 1000,
  // Static assets cache for 30 days
  staticMaxAge: 30 * 24 * 60 * 60 * 1000,
  // Dynamic content cache for 1 hour
  dynamicMaxAge: 60 * 60 * 1000
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${APP_VERSION}`);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(error => {
              console.warn(`[SW] Failed to cache ${url}: ${error.message}`);
              return Promise.resolve();
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Fetch event - handle requests with different caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip requests that shouldn't be cached
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return;
  }

  event.respondWith(handleFetch(request));
});

// Handle different types of requests with appropriate caching strategies
async function handleFetch(request) {
  const url = new URL(request.url);

  try {
    // Audio files - cache first with expiration check
    if (AUDIO_PATTERNS.some(pattern => pattern.test(request.url))) {
      return await cacheFirstWithExpiration(request, AUDIO_CACHE, QUIZ_CACHE_CONFIG.audioMaxAge);
    }

    // External assets (fonts, CDNs) - cache first, long expiration
    if (EXTERNAL_ASSETS.some(pattern => pattern.test(request.url))) {
      return await cacheFirstWithExpiration(request, STATIC_CACHE, QUIZ_CACHE_CONFIG.staticMaxAge);
    }

    // Static assets - cache first, network fallback
    if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
      return await cacheFirst(request, STATIC_CACHE);
    }

    // Dynamic content - network first, cache fallback with short expiration
    return await networkFirstWithExpiration(request, DYNAMIC_CACHE, QUIZ_CACHE_CONFIG.dynamicMaxAge);

  } catch (error) {
    console.error('[SW] Fetch error:', error);

    // Return offline fallback if available
    if (url.pathname === '/' || STATIC_ASSETS.includes(url.pathname)) {
      const cache = await caches.open(STATIC_CACHE);
      return await cache.match('/') || new Response('Offline', { status: 503 });
    }

    return new Response('Network error', { status: 503 });
  }
}

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${APP_VERSION}`);

  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, AUDIO_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName.startsWith(CACHE_PREFIX) && !currentCaches.includes(cacheName)) {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        // Take control of all clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Clean expired cache entries
        return Promise.all([
          cleanExpiredCache(AUDIO_CACHE, QUIZ_CACHE_CONFIG.audioMaxAge),
          cleanExpiredCache(DYNAMIC_CACHE, QUIZ_CACHE_CONFIG.dynamicMaxAge)
        ]);
      })
      .then(() => {
        // Notify clients about the update
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: APP_VERSION
            });
          });
        });
      })
  );
});

// Cache first strategy - good for static assets and audio
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn(`[SW] Network failed for ${request.url}:`, error);
    throw error;
  }
}

// Network first strategy - good for dynamic content
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn(`[SW] Network failed for ${request.url}, trying cache:`, error);

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: APP_VERSION });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// Cache first with expiration check
async function cacheFirstWithExpiration(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if cached response is still fresh
    const cachedDate = cachedResponse.headers.get('sw-cached-date');
    if (cachedDate) {
      const age = Date.now() - parseInt(cachedDate);
      if (age < maxAge) {
        return cachedResponse;
      }
      // Cache expired, delete it
      await cache.delete(request);
    } else {
      // No cache date, assume it's fresh for backward compatibility
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone response and add cache timestamp
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());

      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });

      cache.put(request, modifiedResponse);
    }

    return networkResponse;
  } catch (error) {
    console.warn(`[SW] Network failed for ${request.url}:`, error);
    // Return stale cache if available
    return cachedResponse || Promise.reject(error);
  }
}

// Network first with expiration for dynamic content
async function networkFirstWithExpiration(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cached-date', Date.now().toString());

      const responseToCache = new Response(networkResponse.clone().body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });

      cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.warn(`[SW] Network failed for ${request.url}, trying cache:`, error);

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cached response is still acceptable
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate);
        // For network-first, allow slightly stale content when offline
        if (age < maxAge * 2) {
          return cachedResponse;
        }
      } else {
        return cachedResponse;
      }
    }

    throw error;
  }
}

// Clear all caches (useful for debugging)
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames
    .filter(name => name.startsWith(CACHE_PREFIX))
    .map(name => caches.delete(name));

  return Promise.all(deletePromises);
}

// Clean expired entries from cache
async function cleanExpiredCache(cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();

  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const cachedDate = response.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = Date.now() - parseInt(cachedDate);
        if (age > maxAge) {
          await cache.delete(request);
          console.log(`[SW] Cleaned expired cache entry: ${request.url}`);
        }
      }
    }
  }
}
