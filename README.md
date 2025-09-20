# ExoArchive Pocket

A kiosk-friendly, offline-capable React + TypeScript app to explore notable exoplanets and space exploration data. Includes a 3D planet viewer, analytics captured offline, and a PWA with Background Sync for reliable delivery when the network is intermittent.

## What’s in this fork

- Custom Service Worker (Workbox via vite-plugin-pwa) using injectManifest
  - Background Sync tag: `analytics-flush`
  - Reads analytics events from IndexedDB (localforage instance `exo-analytics`)
  - Optionally POSTs to a backend (gated by env)
- Analytics pipeline
  - `src/lib/analytics-manager.ts` stores events locally and requests a sync
  - `src/sw.ts` flushes on `sync` and `message` events
- 3D performance improvements
  - Geometry LOD applies to textured sphere, overlays, and atmospheric sphere
  - Quality heuristics (low/medium/high) dictate sphere segments (32/48/64)
- Admin Dashboard timestamp formatting
  - Uses `date-fns` for chart labels and content timestamps
- Build fixes
  - Search index script resilient to BOM in JSON
  - Web Vitals wired via `onCLS/onFID/onLCP/onTTFB/onFCP`

## Getting Started

Requirements:
- Node 18+ (Node 20/22 OK)

Install:
```bash
npm install
```

Development:
```bash
npm run dev
```

Production build + preview (PWA/offline check):
```bash
npm run build
npm run preview
```
Open the preview URL, then in DevTools Application tab:
- Verify the Service Worker is installed
- Toggle network offline to confirm precaching and runtime caching work
- Trigger some interactions in the app; the SW will pick up the `analytics-flush` sync when the network returns

## Environment variables (optional)

- `VITE_ENABLE_ANALYTICS_POST=true` to enable POSTing analytics from the SW
- `VITE_ANALYTICS_ENDPOINT=/your/endpoint` endpoint to receive `{ events: AnalyticsEvent[] }`

In development or demos, omit the vars to no-op (the SW will just log and purge).

## Key Files

- `vite.config.ts`
  - `vite-plugin-pwa` set to `strategies: 'injectManifest'`
  - Uses `src/sw.ts` and emits `dist/sw.js`
- `src/sw.ts`
  - Minimal install/activate
  - Runtime caching similar to prior config
  - Background Sync `sync` handler and `flushAnalytics()`
- `src/lib/analytics-manager.ts`
  - Queues events in localforage under `exo-analytics`
  - Calls `queueSync('analytics-flush')`
  - Exposes `flush()` to request SW flush via `postMessage`
- `src/components/Planet3DViewer.tsx`
  - `AnimatedTexturedSphere` accepts `segments`
  - Overlays and atmosphere geometry use reduced segments on low/medium
- `src/components/AdminDashboard.tsx`
  - `date-fns` `format()` for labels/timestamps

## Notes

- Service worker registration remains in `src/lib/service-worker-manager.ts` and points to `${import.meta.env.BASE_URL}sw.js`.
- For low-end devices, geometry segments reduce and the app should sustain smoother FPS.

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build search index, type-check, and build for production (includes SW)
- `npm run preview` - Preview the built app

## License

MIT
