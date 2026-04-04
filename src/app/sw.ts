/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Build runtime caching rules that work in both dev and prod.
// In dev, defaultCache is just [NetworkOnly for everything].
// We prepend our own rules so they match first.
const appCaching: typeof defaultCache = [
  // RSC prefetch requests — cache aggressively so tab switches work offline
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "pages-rsc-prefetch",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
      networkTimeoutSeconds: 3,
    }),
  },
  // RSC navigation requests — these fire when you click a sidebar link
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.headers.get("RSC") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "pages-rsc",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
      networkTimeoutSeconds: 5,
    }),
  },
  // HTML page navigations
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.destination === "document" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "pages-html",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
      networkTimeoutSeconds: 5,
    }),
  },
  // Next.js static assets (JS chunks, CSS)
  {
    matcher: /\/_next\/static\/.+/i,
    handler: new StaleWhileRevalidate({
      cacheName: "next-static",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  },
  // Images
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  },
  // Google Fonts
  {
    matcher: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 16,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...appCaching, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener('push', (event: any) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options: any = {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' },
        ...data,
      };
      event.waitUntil(self.registration.showNotification(data.title || 'BrewBrain', options));
    } catch (e) {
      event.waitUntil(
        self.registration.showNotification('BrewBrain', { body: event.data.text() })
      );
    }
  }
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  const promiseChain = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    let matchingClient = null;
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }
    if (matchingClient) {
      return (matchingClient as any).focus();
    } else {
      return self.clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// @ts-ignore - SyncEvent is not always typed properly
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      (async () => {
        try {
          // Tell active clients to process the queue immediately
          const clients = await self.clients.matchAll();
          let processedByClient = false;
          
          for (const client of clients) {
             client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
             processedByClient = true;
          }

          if (!processedByClient) {
            // No active tabs / completely closed. We handle it via native SW fetch
            // But we don't have idb-keyval directly in this scope unless bundled.
            // A more complex raw indexedDB script could be written, but notifying clients
            // covers 90% of suspended/backgrounded PWA cases on mobile.
            console.log('[SW] No active clients to flush queue. Waiting for next app open.')
          }
        } catch (e) {
          console.error('[SW] Sync Error:', e);
        }
      })()
    );
  }
});
