import * as THREE from 'three';

export interface OrbitParams {
  semiMajorAxisAu: number; // in AU
  eccentricity?: number; // 0..1
  inclinationDeg?: number; // degrees
  periodDays?: number;
  argumentOfPeriapsisDeg?: number;
}

export class OrbitalMechanics {
  static meanMotion(periodDays: number): number { return (2 * Math.PI) / (periodDays * 86400); }
  static positionAtTime(params: OrbitParams, tSeconds: number) {
    const e = params.eccentricity ?? 0;
    const n = params.periodDays ? this.meanMotion(params.periodDays) : 0;
    const M = n * tSeconds; // mean anomaly
    // Solve Kepler (simple iterative)
    let E = M;
    for (let i = 0; i < 5; i++) { E = M + e * Math.sin(E); }
    const a = params.semiMajorAxisAu * 1.0; // scaled later
    const x = a * (Math.cos(E) - e);
    const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const inc = (params.inclinationDeg || 0) * Math.PI / 180;
    const cosi = Math.cos(inc), sini = Math.sin(inc);
    // Rotate by inclination around x-axis
    const X = x;
    const Y = y * cosi;
    const Z = y * sini;
    return new THREE.Vector3(X, Y, Z);
  }
}

export function createOrbitPath(params: OrbitParams, scale: number = 1): THREE.Line {
  const points: THREE.Vector3[] = [];
  const steps = 256;
  const e = params.eccentricity ?? 0;
  const a = params.semiMajorAxisAu * scale;
  for (let i = 0; i <= steps; i++) {
    const E = (i / steps) * 2 * Math.PI;
    const x = a * (Math.cos(E) - e);
    const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const inc = (params.inclinationDeg || 0) * Math.PI / 180;
    const cosi = Math.cos(inc), sini = Math.sin(inc);
    const X = x;
    const Y = y * cosi;
    const Z = y * sini;
    points.push(new THREE.Vector3(X, Y, Z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({ color: 0x88aaff, dashSize: 0.1, gapSize: 0.05, transparent: true, opacity: 0.7 });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function hostStarMesh(spectralType?: string, radius: number = 0.3): THREE.Mesh {
  const geom = new THREE.SphereGeometry(radius, 32, 32);
  const color = spectralTypeToColor(spectralType);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
  return new THREE.Mesh(geom, mat);
}

export function spectralTypeToColor(s?: string): number {
  if (!s) return 0xffffff;
  const t = s.trim().toUpperCase()[0];
  switch (t) {
    case 'O': return 0x9bbcff;
    case 'B': return 0xaec6ff;
    case 'A': return 0xcfe1ff;
    case 'F': return 0xf8f7ff;
    case 'G': return 0xfff4cc; // Sun-like
    case 'K': return 0xffd9a1;
    case 'M': return 0xffbb7c;
    default: return 0xffffff;
  }
}


