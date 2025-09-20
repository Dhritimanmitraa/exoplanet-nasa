// Ambient module shims for tools that may not see installed types at lint time
declare module 'workbox-precaching' {
  export const precacheAndRoute: any;
}
declare module 'workbox-routing' {
  export const registerRoute: any;
}
declare module 'workbox-strategies' {
  export const CacheFirst: any;
  export const NetworkFirst: any;
  export const StaleWhileRevalidate: any;
}
declare module 'workbox-expiration' {
  export const ExpirationPlugin: any;
}

declare module 'localforage' {
  const x: any;
  export default x;
}
declare module 'uuid' {
  export const v4: () => string;
}
declare module 'recharts' {
  export const LineChart: any;
  export const Line: any;
  export const XAxis: any;
  export const YAxis: any;
  export const Tooltip: any;
  export const ResponsiveContainer: any;
}
declare module 'date-fns' {
  export function format(date: number | Date, fmt: string): string;
}

// web-vitals typed shims for usage pattern in App.tsx
declare module 'web-vitals' {
  export type Metric = { name: string; value: number };
  export function onCLS(cb: (m: Metric) => void): void;
  export function onFID(cb: (m: Metric) => void): void;
  export function onLCP(cb: (m: Metric) => void): void;
  export function onTTFB(cb: (m: Metric) => void): void;
  export function onFCP(cb: (m: Metric) => void): void;
}


