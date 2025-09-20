import type { Planet } from './filters';

export interface Hotspot { id: string; name: string; lat: number; lon: number; type: string; description: string; }

export interface ColorStop {
  stop: number; // 0..1
  color: [number, number, number]; // rgb 0..1
}

export function sphericalToCartesian(latDeg: number, lonDeg: number, radius: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = radius * Math.cos(lat) * Math.cos(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.sin(lon);
  return [x, y, z];
}

export function interpolateColors(value: number, colorStops: ColorStop[]): [number, number, number] {
  const v = Math.max(0, Math.min(1, value));
  if (colorStops.length === 0) return [1, 1, 1];
  if (v <= colorStops[0].stop) return colorStops[0].color;
  for (let i = 0; i < colorStops.length - 1; i++) {
    const a = colorStops[i];
    const b = colorStops[i + 1];
    if (v >= a.stop && v <= b.stop) {
      const t = (v - a.stop) / (b.stop - a.stop || 1);
      return [
        a.color[0] + (b.color[0] - a.color[0]) * t,
        a.color[1] + (b.color[1] - a.color[1]) * t,
        a.color[2] + (b.color[2] - a.color[2]) * t,
      ];
    }
  }
  return colorStops[colorStops.length - 1].color;
}

export function calculatePlanetScale(planet: Planet): number {
  const earthRadius = 1; // base unit sphere represents 1 Earth radius
  const radius = planet.pl_rade != null ? planet.pl_rade : 1;
  // Keep within a sensible range for viewing
  return Math.max(0.6, Math.min(2.5, radius / earthRadius));
}

export function generateTemperatureData(planet: Planet) {
  const base = planet.pl_eqt != null ? planet.pl_eqt : 255;
  // Provide simple normalized ranges for shader uniforms or data layers
  const min = Math.max(50, base - 150);
  const max = Math.min(3500, base + 150);
  return { min, max, base };
}

export function generateAtmosphereData(planet: Planet) {
  const insol = planet.pl_insol != null ? planet.pl_insol : 1;
  const scale = Math.min(1.0, Math.max(0.0, insol / 5));
  return { density: scale, haze: Math.min(1.0, scale * 0.8) };
}

export function generateHabitabilityData(planet: Planet) {
  // Normalize earth-like score to 0..1 for visual intensity
  const raw = (planet as any).earthLikeScore != null ? (planet as any).earthLikeScore : undefined;
  const score = typeof raw === 'number' ? raw : undefined;
  const normalized = score != null ? Math.max(0, Math.min(1, score / 100)) : 0.3;
  return { suitability: normalized };
}


