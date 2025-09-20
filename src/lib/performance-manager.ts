/*
  PerformanceManager: Kiosk-oriented performance optimization and monitoring.
  Provides device capability detection, FPS monitoring, simple quality heuristics,
  and idle/session helpers. Designed to be a lightweight integration layer. 
*/

export type QualityLevel = 'low' | 'medium' | 'high';

type PerformanceListeners = {
  fps?: (fps: number) => void;
  quality?: (q: QualityLevel) => void;
};

export interface QualityHeuristics {
  qualityLevel: QualityLevel;
  particleDensityScale: number; // 0..1
  enableAtmosphereFx: boolean;
}

export class PerformanceManager {
  private static instance: PerformanceManager | null = null;
  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) PerformanceManager.instance = new PerformanceManager();
    return PerformanceManager.instance;
  }

  private rafId: number | null = null;
  private frames = 0;
  private lastFpsSample = performance.now();
  private listeners: PerformanceListeners = {};
  private currentHeuristics: QualityHeuristics | null = null;
  // removed unused timestamp to satisfy noUnusedLocals
  private fpsSamples: number[] = [];
  private readonly maxSamples = 30; // moving average window
  private consecutiveLow = 0;
  private consecutiveHigh = 0;

  init(): void {
    // noop for now; reserved for future WebGL/GPU queries
    this.currentHeuristics = this.computeQualityHeuristics();
    this.startFpsLoop();
  }

  onFps(listener: (fps: number) => void): void {
    this.listeners.fps = listener;
  }

  onQualityChange(listener: (q: QualityLevel) => void): void {
    this.listeners.quality = listener;
  }

  recordFrame(_deltaMs?: number): void {
    // No-op to avoid double-counting if external loops already call requestAnimationFrame
    // intentionally empty
  }

  getHeuristics(): QualityHeuristics {
    if (!this.currentHeuristics) this.currentHeuristics = this.computeQualityHeuristics();
    return this.currentHeuristics;
  }

  private startFpsLoop(): void {
    const loop = () => {
      this.frames += 1;
      const now = performance.now();
      const elapsed = now - this.lastFpsSample;
      if (elapsed >= 1000) {
        const fps = (this.frames * 1000) / elapsed;
        this.frames = 0;
        this.lastFpsSample = now;
        const rounded = Math.round(fps);
        if (this.listeners.fps) this.listeners.fps(rounded);
        // Moving average
        this.fpsSamples.push(rounded);
        if (this.fpsSamples.length > this.maxSamples) this.fpsSamples.shift();
        const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, this.fpsSamples.length);
        // Hysteresis thresholds: medium below 45, high above 55 for 5 consecutive samples
        const prevQuality = this.currentHeuristics?.qualityLevel;
        let nextQuality: QualityLevel = prevQuality || 'high';
        if (avg < 45) {
          this.consecutiveLow += 1; this.consecutiveHigh = 0;
          if (this.consecutiveLow >= 5) nextQuality = 'medium';
        } else if (avg > 55) {
          this.consecutiveHigh += 1; this.consecutiveLow = 0;
          if (this.consecutiveHigh >= 5) nextQuality = 'high';
        } else {
          this.consecutiveLow = 0; this.consecutiveHigh = 0;
        }
        if (!prevQuality) {
          nextQuality = avg < 45 ? 'medium' : 'high';
        }
        // If avg very low (<30) sustain low
        if (avg < 30) nextQuality = 'low';
        const nextHeuristics: QualityHeuristics = nextQuality === 'low'
          ? { qualityLevel: 'low', particleDensityScale: 0.3, enableAtmosphereFx: false }
          : nextQuality === 'medium'
          ? { qualityLevel: 'medium', particleDensityScale: 0.6, enableAtmosphereFx: true }
          : { qualityLevel: 'high', particleDensityScale: 1.0, enableAtmosphereFx: true };
        if (!this.currentHeuristics || this.currentHeuristics.qualityLevel !== nextHeuristics.qualityLevel) {
          this.currentHeuristics = nextHeuristics;
          if (this.listeners.quality) this.listeners.quality(nextHeuristics.qualityLevel);
        } else {
          this.currentHeuristics = nextHeuristics;
        }
      }
      this.rafId = requestAnimationFrame(loop);
    };
    if (this.rafId == null) this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private computeQualityHeuristics(): QualityHeuristics {
    // Basic device heuristics using hardwareConcurrency and memory where available.
    // Conservative defaults for kiosk stability.
    const cores = (navigator as any).hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    if (deviceMemory <= 2 || cores <= 2) {
      return { qualityLevel: 'low', particleDensityScale: 0.35, enableAtmosphereFx: false };
    }
    if (deviceMemory <= 4 || cores <= 4) {
      return { qualityLevel: 'medium', particleDensityScale: 0.7, enableAtmosphereFx: true };
    }
    return { qualityLevel: 'high', particleDensityScale: 1.0, enableAtmosphereFx: true };
  }
}

export const performanceManager = PerformanceManager.getInstance();


