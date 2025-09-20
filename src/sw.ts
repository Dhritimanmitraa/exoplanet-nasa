/// <reference lib="webworker" />

// @ts-ignore - types resolved at build by vite-plugin-pwa
import { precacheAndRoute } from 'workbox-precaching';
// @ts-ignore - types resolved at build by vite-plugin-pwa
import { registerRoute } from 'workbox-routing';
// @ts-ignore - types resolved at build by vite-plugin-pwa
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
// @ts-ignore - types resolved at build by vite-plugin-pwa
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

// Precache assets injected at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Runtime caching similar to previous generateSW config
registerRoute(
  (args: any) => args.url.pathname.includes('/data/'),
  new NetworkFirst({ cacheName: 'exo-data', networkTimeoutSeconds: 6 })
);

registerRoute(
  (args: any) => args.request.destination === 'image' || /\.(?:png|jpg|jpeg|gif|webp|svg|hdr|ktx2)$/i.test(args.url.pathname),
  new CacheFirst({
    cacheName: 'exo-images',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })]
  })
);

registerRoute(
  (args: any) => (args.request.headers.get('accept') || '').includes('application/json'),
  new StaleWhileRevalidate({ cacheName: 'exo-json' })
);

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event: ExtendableEvent) => { event.waitUntil(self.clients.claim()); });

// Background Sync for analytics
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'analytics-flush') {
    event.waitUntil(flushAnalytics());
  }
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data: any = event.data;
  if (data && data.type === 'analytics-flush') {
    event.waitUntil(flushAnalytics());
  }
});

async function flushAnalytics(): Promise<void> {
  try {
    const events = await readAnalyticsEvents();
    if (events.length === 0) return;

    const endpoint = (import.meta as any).env?.VITE_ANALYTICS_ENDPOINT || '/__analytics';
    const enablePost = Boolean((import.meta as any).env?.VITE_ENABLE_ANALYTICS_POST) || ((import.meta as any).env?.PROD && Boolean((import.meta as any).env?.VITE_ANALYTICS_ENDPOINT));

    let ok = true;
    if (enablePost) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        });
        ok = res.ok;
      } catch (err) {
        ok = false;
      }
    } else {
      // Dev/demo: no-op, just log
      try { console.log('[SW] analytics flush (dev/demo):', events.length); } catch {}
      ok = true;
    }

    if (ok) {
      await purgeAnalyticsEvents(events.map(e => `event:${e.id}`));
    }
  } catch (err) {
    // swallow errors to avoid breaking sync
  }
}

type AnalyticsEvent = { id: string; ts: number; type: string; payload?: any; sessionId: string };

function openAnalyticsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('exo-analytics', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      // localforage creates 'keyvaluepairs' by default; if absent, create for safety
      try {
        if (!req.result.objectStoreNames.contains('keyvaluepairs')) {
          req.result.createObjectStore('keyvaluepairs');
        }
      } catch {}
    };
  });
}

async function readAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  const db = await openAnalyticsDb();
  try {
    const tx = db.transaction('keyvaluepairs', 'readonly');
    const store = tx.objectStore('keyvaluepairs');
    const events: AnalyticsEvent[] = [];
    await new Promise<void>((resolve, reject) => {
      const cursorReq = store.openCursor();
      cursorReq.onerror = () => reject(cursorReq.error);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result as IDBCursorWithValue | null;
        if (!cursor) { resolve(); return; }
        const key = cursor.key as string;
        if (typeof key === 'string' && key.startsWith('event:')) {
          try { events.push(cursor.value as AnalyticsEvent); } catch {}
        }
        cursor.continue();
      };
    });
    return events.sort((a, b) => a.ts - b.ts);
  } finally {
    try { db.close(); } catch {}
  }
}

async function purgeAnalyticsEvents(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const db = await openAnalyticsDb();
  try {
    const tx = db.transaction('keyvaluepairs', 'readwrite');
    const store = tx.objectStore('keyvaluepairs');
    await Promise.all(keys.map(k => new Promise<void>((resolve) => {
      const req = store.delete(k);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    })));
  } finally {
    try { db.close(); } catch {}
  }
}


