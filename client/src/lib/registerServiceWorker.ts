/**
 * Service Worker registration and management
 */

import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

/**
 * Register service worker with configuration
 */
export function registerServiceWorker(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    // Only register in production or if explicitly enabled in development
    if (import.meta.env.PROD || import.meta.env.VITE_SW_DEV === 'true') {
      window.addEventListener('load', () => {
        const swUrl = '/sw.js';

        if (isLocalhost) {
          // Check if service worker exists in localhost
          checkValidServiceWorker(swUrl, config);
          
          // Add logging for localhost
          navigator.serviceWorker.ready.then(() => {
            console.log(
              'This web app is being served cache-first by a service worker. ' +
              'To learn more, visit https://cra.link/PWA'
            );
          });
        } else {
          // Register service worker in production
          registerValidServiceWorker(swUrl, config);
        }
      });
    }
  }

  // Setup online/offline event listeners
  setupNetworkListeners(config);
}

function registerValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log('Service Worker registered successfully:', registration);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('New content available, please refresh.');
              config?.onUpdate?.(registration);
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('Content cached for offline use.');
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  // Check if the service worker can be found.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidServiceWorker(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

function setupNetworkListeners(config?: ServiceWorkerConfig) {
  window.addEventListener('online', () => {
    console.log('App is back online');
    config?.onOnline?.();
  });

  window.addEventListener('offline', () => {
    console.log('App is now offline');
    config?.onOffline?.();
  });
}

/**
 * Unregister service worker
 */
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
        console.log('Service Worker unregistered');
      })
      .catch(error => {
        console.error('Error unregistering service worker:', error);
      });
  }
}

/**
 * Update service worker
 */
export function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.update();
        console.log('Service Worker update check triggered');
      })
      .catch(error => {
        console.error('Error updating service worker:', error);
      });
  }
}

/**
 * Hook for service worker status
 */
export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const config: ServiceWorkerConfig = {
      onSuccess: (registration) => {
        setSwRegistration(registration);
      },
      onUpdate: (registration) => {
        setSwRegistration(registration);
        setHasUpdate(true);
      },
      onOnline: () => setIsOnline(true),
      onOffline: () => setIsOnline(false),
    };

    registerServiceWorker(config);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const refreshApp = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [swRegistration]);

  return {
    isOnline,
    hasUpdate,
    refreshApp,
    swRegistration,
  };
}