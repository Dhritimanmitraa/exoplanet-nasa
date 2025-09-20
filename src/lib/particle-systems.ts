import * as THREE from 'three';

export interface ParticleSystemOptions {
  maxParticles?: number;
  size?: number;
  color?: THREE.ColorRepresentation;
  opacity?: number;
}

export class StarField extends THREE.Points {
  constructor(count: number = 5000, radius: number = 200, opts: ParticleSystemOptions = {}) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = radius * (0.8 + 0.2 * Math.random());
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: opts.color ?? 0xffffff,
      size: opts.size ?? 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: opts.opacity ?? 0.9,
      depthWrite: false
    });
    super(geometry, material);
    this.frustumCulled = false;
  }
}

export class Nebula extends THREE.Points {
  constructor(count: number = 8000, radius: number = 80, hue: number = 280) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = radius * Math.pow(Math.random(), 0.6);
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      color.setHSL((hue + Math.random() * 20) / 360, 0.65, 0.5 + Math.random() * 0.2);
      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    super(geometry, material);
    this.renderOrder = -1;
  }
}

export class StellarWind extends THREE.Points {
  velocity: Float32Array;
  constructor(count: number = 3000, spread: number = 2.5, direction: THREE.Vector3 = new THREE.Vector3(1, 0, 0)) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      const v = 0.02 + Math.random() * 0.06;
      velocity[i * 3 + 0] = direction.x * v;
      velocity[i * 3 + 1] = direction.y * v;
      velocity[i * 3 + 2] = direction.z * v;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffeeaa, size: 0.03, transparent: true, opacity: 0.8, depthWrite: false });
    super(geometry, material);
    this.velocity = velocity;
  }
  step(dt: number) {
    const pos = (this.geometry as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.array[i * 3 + 0] += this.velocity[i * 3 + 0] * dt * 60;
      pos.array[i * 3 + 1] += this.velocity[i * 3 + 1] * dt * 60;
      pos.array[i * 3 + 2] += this.velocity[i * 3 + 2] * dt * 60;
    }
    pos.needsUpdate = true;
  }
}

export class CosmicDust extends THREE.Points {
  constructor(count: number = 2000, region: number = 6) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * region;
      positions[i * 3 + 1] = (Math.random() - 0.5) * region;
      positions[i * 3 + 2] = (Math.random() - 0.5) * region;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, opacity: 0.6, transparent: true, depthWrite: false });
    super(geometry, material);
  }
}

export class AtmosphericHaze extends THREE.Mesh {
  constructor(radius: number = 1.03, color: THREE.ColorRepresentation = 0x66aaff, intensity: number = 0.15) {
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity, depthWrite: false, blending: THREE.AdditiveBlending });
    super(geometry, material);
  }
}

export class CloudSystem extends THREE.Mesh {
  private speed: number;
  constructor(radius: number = 1.02, speed: number = 0.002) {
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 1, metalness: 0 });
    super(geometry, material);
    this.speed = speed;
  }
  step(dt: number) { this.rotation.y += this.speed * dt * 60; }
}

export class AuroraEffect extends THREE.Mesh {
  constructor(radius: number = 1.04, color: THREE.ColorRepresentation = 0x00ffaa) {
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending });
    super(geometry, material);
  }
}

export class VolcanicPlumes extends THREE.Points {
  constructor(count: number = 600, radius: number = 1.01) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xff5500, size: 0.02, transparent: true, opacity: 0.7, depthWrite: false });
    super(geometry, material);
  }
}

export class ParticleManager extends THREE.Group {
  private updaters: Array<(dt: number) => void> = [];
  constructor() { super(); }
  addSystem(obj: THREE.Object3D, updater?: (dt: number) => void) {
    this.add(obj);
    if (updater) this.updaters.push(updater);
  }
  step(dt: number) { this.updaters.forEach(fn => fn(dt)); }
}

export function createStellarEnvironment(starTempK?: number) {
  const group = new THREE.Group();
  const starColor = new THREE.Color().setHSL(
    starTempK && starTempK > 0 ? THREE.MathUtils.clamp((7000 - starTempK) / 7000, 0, 1) * 0.15 : 0.08,
    0.6,
    0.8
  );
  const stars = new StarField(4000, 180, { color: starColor.getHex() });
  const nebula = new Nebula(6000, 60, 260);
  group.add(stars);
  group.add(nebula);
  return group;
}

export function createAtmosphereEffects(planetRadius: number, density: number) {
  const group = new THREE.Group();
  const haze = new AtmosphericHaze(planetRadius * 1.04, 0x66aaff, THREE.MathUtils.clamp(density * 0.25, 0.08, 0.35));
  const clouds = new CloudSystem(planetRadius * 1.02, 0.002);
  group.add(haze);
  group.add(clouds);
  return { group, step: (dt: number) => clouds.step(dt) };
}
