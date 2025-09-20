/*
  ServiceWorkerManager: Registers and manages a progressive web app service worker.
  Provides basic offline caching indicators and background sync hook.
*/

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager | null = null;
  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) ServiceWorkerManager.instance = new ServiceWorkerManager();
    return ServiceWorkerManager.instance;
  }

  private registration: ServiceWorkerRegistration | null = null;
  private listeners: { online?: () => void; offline?: () => void } = {};

  async init(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const url = `${import.meta.env.BASE_URL}sw.js`;
        this.registration = await navigator.serviceWorker.register(url);
      } catch {
        // ignore
      }
    }
    window.addEventListener('online', () => this.listeners.online && this.listeners.online());
    window.addEventListener('offline', () => this.listeners.offline && this.listeners.offline());

    // Listen for SW messages (e.g., analytics flush trigger)
    navigator.serviceWorker?.addEventListener?.('message', (event: MessageEvent) => {
      if ((event.data as any)?.type === 'analytics-flush') {
        // No-op placeholder for future flush-to-server
      }
    });
  }

  onOnline(listener: () => void): void { this.listeners.online = listener; }
  onOffline(listener: () => void): void { this.listeners.offline = listener; }

  async queueSync(tag: string): Promise<void> {
    if (!('SyncManager' in window)) return;
    try {
      const reg = this.registration as any;
      await reg?.sync?.register(tag);
    } catch {
      // ignore
    }
  }
}

export const serviceWorkerManager = ServiceWorkerManager.getInstance();


