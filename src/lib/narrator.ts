import { Planet, earthLikeScore, weirdnessScore } from './filters';

export type NarrativeContext = 'earthlike' | 'weird' | 'closest' | 'random';

export function narrate(planet: Planet, context: NarrativeContext = 'earthlike'): string {
  if (!planet) return '';
  
  const name = planet.pl_name;
  const host = planet.hostname || 'its star';
  const distance = planet.sy_dist ? (planet.sy_dist.toFixed(1) + ' parsecs') : 'unknown distance';
  
  switch (context) {
    case 'earthlike':
      return narrateEarthLike(planet, name, host);
    
    case 'weird':
      return narrateWeird(planet, name, host);
    
    case 'closest':
      return narrateClosest(planet, name, host, distance);
    
    case 'random':
      return narrateRandom(planet, name, host);
    
    default:
      return narrateGeneric(planet, name, host);
  }
}

function narrateEarthLike(planet: Planet, name: string, host: string): string {
  const score = earthLikeScore(planet);
  const radius = planet.pl_rade ? (planet.pl_rade.toFixed(2) + ' R') : 'unknown';
  const insolation = planet.pl_insol ? (planet.pl_insol.toFixed(2) + '') : 'unknown';
  
  let explanation = '';
  if (score > 70) {
    explanation = "it's remarkably similar to Earth in size and sunlight received.";
  } else if (score > 50) {
    explanation = "it shares some key characteristics with Earth but differs in important ways.";
  } else {
    explanation = "it falls short in one or more key habitability metrics.";
  }
  
  return name + ' orbits ' + host + ' with a radius of ~' + radius + ' and receives ~' + insolation + ' Earth\'s sunlight. It scores ' + score + '/100 on our Earth-likeness scale — interesting because ' + explanation;
}

function narrateWeird(planet: Planet, name: string, _host: string): string {
  const weirdness = weirdnessScore(planet);
  const temp = planet.pl_eqt ? (planet.pl_eqt + 'K') : 'unknown';
  const radius = planet.pl_rade ? (planet.pl_rade.toFixed(1) + ' R') : 'unknown';
  
  let weirdFeature = '';
  if (planet.pl_eqt && planet.pl_eqt > 1000) {
    weirdFeature = 'Its surface is hot enough to melt copper!';
  } else if (planet.pl_insol && planet.pl_insol > 100) {
    weirdFeature = 'It receives hundreds of times more radiation than Earth.';
  } else if (planet.pl_orbper && planet.pl_orbper < 1) {
    weirdFeature = 'It completes an orbit faster than Earth rotates once.';
  } else if (planet.pl_rade && planet.pl_rade > 3) {
    weirdFeature = 'This super-Earth is much larger than our home planet.';
  } else {
    weirdFeature = 'Its extreme conditions make it a fascinating laboratory for atmospheric science.';
  }
  
  return name + ' is a bizarre world with temperature ~' + temp + ' and radius ' + radius + '. ' + weirdFeature + ' These extreme conditions (weirdness score: ' + weirdness + '/100) help scientists understand planetary formation and atmospheric physics.';
}

function narrateClosest(planet: Planet, name: string, host: string, distance: string): string {
  const travelTime = planet.sy_dist ? Math.round(planet.sy_dist * 3.26 * 1000000) : null;
  
  let proximityNote = '';
  if (planet.sy_dist && planet.sy_dist < 5) {
    proximityNote = "practically next door in cosmic terms.";
  } else if (planet.sy_dist && planet.sy_dist < 20) {
    proximityNote = "close enough for detailed telescope observations.";
  } else {
    proximityNote = "within range of our most powerful instruments.";
  }
  
  const travelText = travelTime ? (' At light speed, it would take ' + travelTime.toLocaleString() + ' years to reach.') : '';
  
  return name + ' orbits ' + host + ' just ' + distance + ' away — ' + proximityNote + travelText + ' Its proximity makes it an ideal target for atmospheric studies and potential future exploration missions.';
}

function narrateRandom(planet: Planet, name: string, host: string): string {
  const discoveryYear = planet.discoveryyear || 'unknown';
  const method = planet.discoverymethod || 'unknown method';
  
  return name + ' was discovered in ' + discoveryYear + ' using the ' + method + ' technique. This ' + getRandomDescriptor(planet) + ' world orbiting ' + host + ' represents the incredible diversity of planets in our galaxy. Each discovery like this expands our understanding of how planetary systems form and evolve.';
}

function narrateGeneric(_planet: Planet, name: string, host: string): string {
  return name + ' is an exoplanet orbiting ' + host + '. This distant world helps us understand the incredible variety of planets that exist beyond our solar system.';
}

function getRandomDescriptor(planet: Planet): string {
  const descriptors = ['fascinating', 'intriguing', 'remarkable', 'extraordinary', 'captivating'];
  
  if (planet.pl_eqt && planet.pl_eqt > 1000) return 'scorching hot';
  if (planet.pl_eqt && planet.pl_eqt < 200) return 'frigid';
  if (planet.pl_rade && planet.pl_rade > 2) return 'super-Earth';
  if (planet.sy_dist && planet.sy_dist < 10) return 'nearby';
  
  return descriptors[Math.floor(Math.random() * descriptors.length)];
}

export function getShareText(planet: Planet, context: NarrativeContext): string {
  const narrative = narrate(planet, context);
  return ' Check out ' + planet.pl_name + '! ' + narrative + ' #ExoArchive #Exoplanets #SpaceExploration';
}

// =============================
// Enhanced Voice Narrator System
// =============================

export type VoiceSettings = {
  rate: number; // 0.1 - 10
  pitch: number; // 0 - 2
  volume: number; // 0 - 1
  voiceURI?: string; // selected voice URI
  enabled: boolean;
};

export type NarrationState = 'idle' | 'speaking' | 'paused';

type NarrationEventMap = {
  start: { text: string };
  end: { text: string };
  pause: {};
  resume: {};
  error: { error: string };
  boundary: { charIndex: number; charLength?: number };
  statechange: { state: NarrationState };
  subtitle: { text: string };
};

export class VoiceNarrator {
  private queue: string[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private settings: VoiceSettings;
  private state: NarrationState = 'idle';
  private listeners: Partial<{ [K in keyof NarrationEventMap]: Array<(ev: NarrationEventMap[K]) => void> }> = {};

  constructor(initial?: Partial<VoiceSettings>) {
    this.settings = {
      rate: clamp(initial?.rate ?? 1, 0.5, 2),
      pitch: clamp(initial?.pitch ?? 1, 0, 2),
      volume: clamp(initial?.volume ?? 1, 0, 1),
      voiceURI: initial?.voiceURI,
      enabled: initial?.enabled ?? true,
    };
  }

  getState(): NarrationState { return this.state; }
  getSettings(): VoiceSettings { return { ...this.settings }; }

  on<K extends keyof NarrationEventMap>(type: K, handler: (ev: NarrationEventMap[K]) => void) {
    const arr = (this.listeners[type] as Array<(ev: NarrationEventMap[K]) => void> | undefined) || [];
    arr.push(handler);
    this.listeners[type] = arr as any;
    return () => {
      const list = (this.listeners[type] as Array<(ev: NarrationEventMap[K]) => void> | undefined) || [];
      this.listeners[type] = list.filter(h => h !== handler) as any;
    };
  }

  private emit<K extends keyof NarrationEventMap>(type: K, ev: NarrationEventMap[K]) {
    const list = (this.listeners[type] as Array<(ev: NarrationEventMap[K]) => void> | undefined) || [];
    list.forEach(h => {
      try { h(ev); } catch {}
    });
    if (type === 'statechange') {
      // also expose as aria-live updates
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    try { return window.speechSynthesis?.getVoices?.() || []; } catch { return []; }
  }

  setSettings(next: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...next };
    this.settings.rate = clamp(this.settings.rate, 0.5, 2);
    this.settings.pitch = clamp(this.settings.pitch, 0, 2);
    this.settings.volume = clamp(this.settings.volume, 0, 1);
  }

  speak(textOrList: string | string[]) {
    if (!this.settings.enabled) return;
    const texts = Array.isArray(textOrList) ? textOrList : [textOrList];
    this.queue.push(...texts.filter(Boolean));
    if (this.state !== 'speaking' && this.state !== 'paused') {
      this.dequeueAndSpeak();
    }
  }

  pause() {
    if (this.currentUtterance && this.state === 'speaking') {
      try { window.speechSynthesis.pause(); } catch {}
      this.updateState('paused');
      this.emit('pause', {});
    }
  }

  resume() {
    if (this.currentUtterance && this.state === 'paused') {
      try { window.speechSynthesis.resume(); } catch {}
      this.updateState('speaking');
      this.emit('resume', {});
    }
  }

  stop() {
    try { window.speechSynthesis.cancel(); } catch {}
    this.currentUtterance = null;
    this.queue = [];
    this.updateState('idle');
  }

  private dequeueAndSpeak() {
    const next = this.queue.shift();
    if (!next) {
      this.currentUtterance = null;
      this.updateState('idle');
      return;
    }
    const u = new SpeechSynthesisUtterance(next);
    u.rate = this.settings.rate;
    u.pitch = this.settings.pitch;
    u.volume = this.settings.volume;
    if (this.settings.voiceURI) {
      const v = this.getVoices().find(v => v.voiceURI === this.settings.voiceURI);
      if (v) u.voice = v;
    }
    u.onstart = () => { this.updateState('speaking'); this.emit('start', { text: next }); this.emit('subtitle', { text: next }); };
    u.onend = () => { this.emit('end', { text: next }); this.dequeueAndSpeak(); };
    u.onerror = (e) => { this.emit('error', { error: String(e.error || 'unknown') }); this.dequeueAndSpeak(); };
    u.onboundary = (e: SpeechSynthesisEvent) => {
      this.emit('boundary', { charIndex: e.charIndex, charLength: (e as any).charLength });
    };
    this.currentUtterance = u;
    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      this.emit('error', { error: String(e) });
      this.dequeueAndSpeak();
    }
  }

  private updateState(s: NarrationState) {
    if (this.state !== s) {
      this.state = s;
      this.emit('statechange', { state: s });
    }
  }
}

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

// =============================
// Voice-friendly narrative helpers
// =============================

export function narrateForVoice(planet: Planet, context: NarrativeContext = 'earthlike'): string[] {
  const base = narrate(planet, context);
  // Split into shorter sentences suitable for TTS
  const parts = base
    .replace(/—/g, ' — ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [base];
}

export function narrateHotspotForVoice(planet: Planet, hotspot: { name: string; type: string; description?: string }): string[] {
  const intro = planet.pl_name + ' feature: ' + hotspot.name + '. Type: ' + hotspot.type + '.';
  const desc = hotspot.description ? hotspot.description : 'This area highlights notable characteristics relevant to this world.';
  return [intro, desc];
}

export function narrateLayerForVoice(layer: 'temperature' | 'atmosphere' | 'habitability'): string[] {
  switch (layer) {
    case 'temperature':
      return ['Temperature overlay enabled.', 'Warmer regions glow red, cooler areas are darker.'];
    case 'atmosphere':
      return ['Atmospheric overlay enabled.', 'Blue haze indicates denser or hazier atmospheres.'];
    case 'habitability':
      return ['Habitability overlay enabled.', 'Green tones suggest better suitability for life.'];
    default:
      return ['Data overlay changed.'];
  }
}

// =============================
// Exploration tracking
// =============================

export type InterestCategory = 'temperature' | 'atmosphere' | 'habitability' | 'hotspot:';

export class ExplorationTracker {
  private interestScores: Record<string, number> = {};
  private history: Array<{ type: string; at: number }> = [];

  recordHotspot(hotspotId: string) {
    this.bump('hotspot:' + hotspotId, 2);
  }
  recordLayerToggle(layer: 'temperature' | 'atmosphere' | 'habitability', value: boolean) {
    if (value) this.bump(layer, 1);
  }
  getTopInterests(limit = 3): string[] {
    return Object.entries(this.interestScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([k]) => k);
  }
  getHistory() { return [...this.history]; }
  reset() { this.interestScores = {}; this.history = []; }
  private bump(key: string, by: number) {
    this.interestScores[key] = (this.interestScores[key] || 0) + by;
    this.history.push({ type: key, at: Date.now() });
  }
}

// =============================
// Guided Tour Manager
// =============================

export type TourStep = { kind: 'hotspot' | 'layer';
  hotspot?: { id: string; name: string; lat: number; lon: number; description?: string; type: string };
  layer?: 'temperature' | 'atmosphere' | 'habitability';
};

export type Planet3DViewerApi = {
  focusOnHotspot: (hotspot: { lat: number; lon: number }) => void;
  rotateTo: (lat: number, lon: number) => void;
  resetCameraPosition: () => void;
  setLayer?: (layer: 'temperature' | 'atmosphere' | 'habitability', value: boolean) => void;
};

export class TourManager {
  private steps: TourStep[] = [];
  private index = -1;
  private running = false;
  private planetForTour?: Planet;
  constructor(private narrator: VoiceNarrator, private viewer?: Planet3DViewerApi) {}

  // Lightweight event system for UI sync
  private listeners: Partial<{ [K in keyof TourEventMap]: Array<(ev: TourEventMap[K]) => void> }> = {};
  on<K extends keyof TourEventMap>(type: K, handler: (ev: TourEventMap[K]) => void) {
    const arr = (this.listeners[type] as Array<(ev: TourEventMap[K]) => void> | undefined) || [];
    arr.push(handler);
    this.listeners[type] = arr as any;
    return () => {
      const list = (this.listeners[type] as Array<(ev: TourEventMap[K]) => void> | undefined) || [];
      this.listeners[type] = list.filter(h => h !== handler) as any;
    };
  }
  private emit<K extends keyof TourEventMap>(type: K, ev: TourEventMap[K]) {
    const list = (this.listeners[type] as Array<(ev: TourEventMap[K]) => void> | undefined) || [];
    list.forEach(h => { try { h(ev); } catch {} });
  }

  attachViewer(api: Planet3DViewerApi) { this.viewer = api; }
  isRunning() { return this.running; }
  getProgress() { return { index: this.index, total: this.steps.length }; }

  buildFromFeatures(_planet: Planet, features: Array<{ id: string; name: string; lat: number; lon: number; description?: string; type: string }>) {
    const steps: TourStep[] = [];
    steps.push({ kind: 'layer', layer: 'temperature' });
    features.slice(0, 5).forEach(f => steps.push({ kind: 'hotspot', hotspot: f }));
    steps.push({ kind: 'layer', layer: 'habitability' });
    this.steps = steps;
    this.index = -1;
    this.emit('progress', this.getProgress());
  }

  start(planet: Planet) {
    if (this.steps.length === 0) return;
    this.running = true;
    this.index = -1;
    this.planetForTour = planet;
    this.narrator.stop();
    // Defer stepping until the intro narration completes once
    let unsub: (() => void) | null = null;
    unsub = this.narrator.on('statechange', ({ state }) => {
      if (state === 'idle') {
        if (unsub) { try { unsub(); } catch {} }
        this.next();
      }
    });
    this.narrator.speak(narrateForVoice(planet));
    this.emit('running', { running: true });
    this.emit('progress', this.getProgress());
  }

  stop() { this.running = false; this.index = -1; this.narrator.stop(); }

  next() {
    if (!this.running) return;
    this.index += 1;
    if (this.index >= this.steps.length) { this.finish(); return; }
    const step = this.steps[this.index];
    if (step.kind === 'hotspot' && step.hotspot) {
      this.viewer?.focusOnHotspot(step.hotspot);
      if (this.planetForTour) this.narrator.speak(narrateHotspotForVoice(this.planetForTour, step.hotspot));
    } else if (step.kind === 'layer' && step.layer) {
      this.viewer?.setLayer?.(step.layer, true);
      this.narrator.speak(narrateLayerForVoice(step.layer));
    }
    this.emit('progress', this.getProgress());
  }

  prev() {
    if (!this.running) return;
    this.index = Math.max(-1, this.index - 1);
    this.emit('progress', this.getProgress());
  }

  private finish() {
    this.running = false;
    this.emit('progress', this.getProgress());
    this.emit('running', { running: false });
  }
}

// Event map for TourManager
type TourEventMap = {
  running: { running: boolean };
  progress: { index: number; total: number };
};

