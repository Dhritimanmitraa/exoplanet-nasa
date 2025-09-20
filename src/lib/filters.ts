export interface Planet {
  pl_name: string;
  hostname?: string;
  sy_dist?: number;
  pl_rade?: number;
  pl_bmasse?: number;
  pl_orbper?: number;
  pl_insol?: number;
  pl_eqt?: number;
  discoverymethod?: string;
  discoveryyear?: number;
  st_spectype?: string;
  st_teff?: number;
  [k: string]: any;
}

function clamp(v: number, a = 0, b = 1): number {
  return Math.max(a, Math.min(b, v));
}

export function earthLikeScore(p: Planet): number {
  if (p.pl_rade == null || p.pl_insol == null) return 0;
  
  // radius closeness (ideal 1 R)
  const radiusDiff = Math.abs(p.pl_rade - 1) / 1;  // normalized
  const radiusScore = clamp(1 - radiusDiff, 0, 1);

  // insolation closeness (ideal 1 S)
  const insolDiff = Math.abs((p.pl_insol || 0) - 1) / 2; // allow broader spread
  const insolScore = clamp(1 - insolDiff, 0, 1);

  // temperature closeness (optional)
  let tempScore = 0.5;
  if (p.pl_eqt != null) {
    const ideal = 255; // rough Earth equilibrium K
    const tempDiff = Math.abs(p.pl_eqt - ideal) / 100;
    tempScore = clamp(1 - tempDiff, 0, 1);
  }

  // weighted combination
  const score = (0.5 * radiusScore) + (0.35 * insolScore) + (0.15 * tempScore);
  return Math.round(score * 100);
}

export function weirdnessScore(p: Planet): number {
  let weirdness = 0;
  
  // Extreme temperatures
  if (p.pl_eqt != null) {
    if (p.pl_eqt > 1000 || p.pl_eqt < 150) {
      weirdness += 30;
    }
  }
  
  // Extreme insolation
  if (p.pl_insol != null) {
    if (p.pl_insol > 100 || p.pl_insol < 0.1) {
      weirdness += 25;
    }
  }
  
  // Extreme radius
  if (p.pl_rade != null) {
    if (p.pl_rade > 4 || p.pl_rade < 0.5) {
      weirdness += 20;
    }
  }
  
  // Very short orbital periods (tidally locked, hot planets)
  if (p.pl_orbper != null && p.pl_orbper < 2) {
    weirdness += 15;
  }
  
  // Very massive planets
  if (p.pl_bmasse != null && p.pl_bmasse > 100) {
    weirdness += 10;
  }
  
  return Math.min(weirdness, 100);
}

export function filterEarthLike(planets: Planet[]): Planet[] {
  return planets
    .filter(p => earthLikeScore(p) > 30)
    .sort((a, b) => earthLikeScore(b) - earthLikeScore(a));
}

export function filterWeird(planets: Planet[]): Planet[] {
  return planets
    .filter(p => weirdnessScore(p) > 40)
    .sort((a, b) => weirdnessScore(b) - weirdnessScore(a));
}

export function filterClosest(planets: Planet[]): Planet[] {
  return planets
    .filter(p => p.sy_dist != null)
    .sort((a, b) => (a.sy_dist || 0) - (b.sy_dist || 0));
}

export function getRandomPlanet(planets: Planet[]): Planet | null {
  if (planets.length === 0) return null;
  return planets[Math.floor(Math.random() * planets.length)];
}
