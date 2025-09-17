/**
 * Service Worker for frontend caching and offline capabilities
 */

const CACHE_NAME = 'kalross-real-estate-v1';
const STATIC_CACHE = 'kalross-static-v1';
const DYNAMIC_CACHE = 'kalross-dynamic-v1';
const IMAGE_CACHE = 'kalross-images-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  // Add other critical static assets
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
  '/api/properties',
  '/api/user',
  '/api/search',
];

// Image patterns to cache
const IMAGE_PATTERNS = [
  /\.(?:png|jpg|jpeg|webp|svg|gif)$/i,
  /\/api\/images\//,
  /cloudinary\.com/,
  /unsplash\.com/,
];

/**
 * Install service worker
 */
self.addEventListener('install', (event: any) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return (self as any).skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

/**
 * Activate service worker
 */
self.addEventListener('activate', (event: any) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Remove old caches
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && 
                     cacheName !== IMAGE_CACHE;
            })
            .map(cacheName => {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return (self as any).clients.claim();
      })
  );
});

/**
 * Fetch event handler with caching strategies
 */
self.addEventListener('fetch', (event: any) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

/**
 * Check if request is for an image
 */
function isImageRequest(request: Request): boolean {
  return IMAGE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Check if request is for API
 */
function isAPIRequest(request: Request): boolean {
  return API_CACHE_PATTERNS.some(pattern => request.url.includes(pattern));
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(request: Request): boolean {
  const url = new URL(request.url);
  return url.pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/) !== null;
}

/**
 * Handle image requests with cache-first strategy
 */
async function handleImageRequest(request: Request): Promise<Response> {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Image request failed', error);
    // Return fallback image or empty response
    return new Response('', { status: 404 });
  }
}

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request: Request): Promise<Response> {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    // Try network first
    try {
      const networkResponse = await fetch(request);
      
      // Cache successful responses
      if (networkResponse.status === 200) {
        await cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (networkError) {
      // Fall back to cache
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('Service Worker: Serving API from cache', request.url);
        return cachedResponse;
      }
      
      throw networkError;
    }
  } catch (error) {
    console.error('Service Worker: API request failed', error);
    return new Response(
      JSON.stringify({ error: 'Network unavailable' }), 
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request: Request): Promise<Response> {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Static asset request failed', error);
    return new Response('', { status: 404 });
  }
}

/**
 * Handle navigation requests
 */
async function handleNavigationRequest(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    // Return cached index.html for SPA routing
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle queued offline actions
  console.log('Service Worker: Background sync triggered');
  
  // Implementation for offline data sync
  // This could include syncing form submissions, favorites, etc.
}