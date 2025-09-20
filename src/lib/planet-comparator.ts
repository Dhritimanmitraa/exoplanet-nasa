import { Planet } from './filters';

export type ComparisonMode = 'size' | 'habitability' | 'orbital' | 'discovery';

export interface ComparisonMetrics {
  sizeRatio: number | null;
  tempDifferenceK: number | null;
  habitabilityScoreA?: number;
  habitabilityScoreB?: number;
}

export class PlanetComparator {
  planets: Planet[];
  mode: ComparisonMode;
  constructor(planets: Planet[], mode: ComparisonMode = 'size') {
    this.planets = planets;
    this.mode = mode;
  }
  setMode(mode: ComparisonMode) { this.mode = mode; }
  updatePlanets(planets: Planet[]) { this.planets = planets; }
  metrics(a: Planet, b: Planet): ComparisonMetrics {
    const sizeRatio = a.pl_rade && b.pl_rade ? a.pl_rade / b.pl_rade : null;
    const tempDifferenceK = (a.pl_eqt != null && b.pl_eqt != null) ? Math.abs(a.pl_eqt - b.pl_eqt) : null;
    const habitabilityScoreA = typeof (a as any).earthLikeScore === 'number' ? (a as any).earthLikeScore : undefined;
    const habitabilityScoreB = typeof (b as any).earthLikeScore === 'number' ? (b as any).earthLikeScore : undefined;
    return { sizeRatio, tempDifferenceK, habitabilityScoreA, habitabilityScoreB };
  }
}


