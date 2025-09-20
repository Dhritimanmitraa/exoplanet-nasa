/*
  AnalyticsManager: Privacy-first local analytics suitable for kiosks.
  Stores events offline using localforage, batches sync via SW when online.
*/

import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { serviceWorkerManager } from './service-worker-manager';

type EventPayload = Record<string, any>;

export type AnalyticsEvent = {
  id: string;
  ts: number;
  type: string;
  payload?: EventPayload;
  sessionId: string;
};

class AnalyticsStore {
  private static db = localforage.createInstance({ name: 'exo-analytics' });

  static async append(event: AnalyticsEvent): Promise<void> {
    const key = `event:${event.id}`;
    await this.db.setItem(key, event);
  }

  static async allKeys(): Promise<string[]> {
    const keys: string[] = [];
    await this.db.iterate((_v, k) => { keys.push(k as string); });
    return keys.filter(k => k.startsWith('event:'));
  }

  static async read(key: string): Promise<AnalyticsEvent | null> {
    return (await this.db.getItem(key)) as AnalyticsEvent | null;
  }

  static async listEvents(since?: number): Promise<AnalyticsEvent[]> {
    const keys = await this.allKeys();
    const events: AnalyticsEvent[] = [];
    for (const k of keys) {
      const e = await this.read(k);
      if (!e) continue;
      if (since && e.ts < since) continue;
      events.push(e);
    }
    events.sort((a, b) => a.ts - b.ts);
    return events;
  }
}

export class AnalyticsManager {
  private static instance: AnalyticsManager | null = null;
  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) AnalyticsManager.instance = new AnalyticsManager();
    return AnalyticsManager.instance;
  }

  private sessionId: string = uuidv4();
  private started = false;

  async init(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.track('session_start');
    window.addEventListener('beforeunload', () => {
      void this.track('session_end');
    });
  }

  async track(type: string, payload?: EventPayload): Promise<void> {
    const event: AnalyticsEvent = { id: uuidv4(), ts: Date.now(), type, payload, sessionId: this.sessionId };
    await AnalyticsStore.append(event);
    // schedule background sync to flush analytics when online
    void serviceWorkerManager.queueSync('analytics-flush');
  }

  async track3DInteraction(action: string, payload?: EventPayload): Promise<void> {
    await this.track('3d_' + action, payload);
  }

  async trackPerformance(metric: string, value: number, extra?: EventPayload): Promise<void> {
    await this.track('perf_' + metric, { value, ...(extra || {}) });
  }

  async listEvents(since?: number): Promise<AnalyticsEvent[]> {
    return AnalyticsStore.listEvents(since);
  }

  // Optional: allow foreground-triggered flush by asking SW
  async flush(): Promise<void> {
    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'analytics-flush' });
      }
    } catch {}
  }
}

export const analyticsManager = AnalyticsManager.getInstance();


