import * as THREE from 'three';

export const AtmosphereVertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const AtmosphereFragmentShader = `
  varying vec3 vWorldPosition;
  uniform vec3 cameraPositionW;
  uniform vec3 lightDirection;
  uniform vec3 atmosphereColor;
  uniform float atmosphereIntensity;
  void main(){
    vec3 viewDir = normalize(cameraPositionW - vWorldPosition);
    float mu = max(dot(viewDir, normalize(lightDirection)), 0.0);
    float rayleigh = pow(1.0 + mu*mu, 1.5);
    vec3 color = atmosphereColor * rayleigh * atmosphereIntensity;
    gl_FragColor = vec4(color, clamp(atmosphereIntensity, 0.0, 0.6));
  }
`;

export function createAtmosphereMaterial(color: THREE.ColorRepresentation = 0x66aaff, intensity: number = 0.2) {
  return new THREE.ShaderMaterial({
    uniforms: {
      cameraPositionW: { value: new THREE.Vector3() },
      lightDirection: { value: new THREE.Vector3(1, 0, 0).normalize() },
      atmosphereColor: { value: new THREE.Color(color) },
      atmosphereIntensity: { value: intensity },
    },
    vertexShader: AtmosphereVertexShader,
    fragmentShader: AtmosphereFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export class ShaderManager {
  private materials: Set<THREE.ShaderMaterial> = new Set();
  register(mat: THREE.ShaderMaterial) { this.materials.add(mat); }
  update(camera: THREE.Camera) {
    this.materials.forEach(mat => {
      mat.uniforms.cameraPositionW.value.copy((camera as any).position);
    });
  }
}


