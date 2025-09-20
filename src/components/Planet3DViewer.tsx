import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, Html } from '@react-three/drei';
import { a as aThree, useTransition } from '@react-spring/three';
import { Planet } from '../lib/filters';
import { sphericalToCartesian, calculatePlanetScale, generateTemperatureData, generateAtmosphereData, generateHabitabilityData } from '../lib/planet-utils';
import type { Hotspot } from '../lib/planet-utils';
import type { Mesh } from 'three';
import { Vector3 } from 'three';
import { createStellarEnvironment, createAtmosphereEffects } from '../lib/particle-systems';
import { createAtmosphereMaterial } from '../lib/atmosphere-shaders';
import { createOrbitPath, hostStarMesh, OrbitalMechanics } from '../lib/orbital-mechanics';
import { performanceManager } from '../lib/performance-manager';
import { accessibilityManager } from '../lib/accessibility-manager';
import { analyticsManager } from '../lib/analytics-manager';

type ActiveLayers = { temperature: boolean; atmosphere: boolean; habitability: boolean };

interface Planet3DViewerProps {
  planet: Planet;
  activeLayers?: ActiveLayers;
  onToggleLayer?: (layer: keyof ActiveLayers, value: boolean) => void;
  onHotspotSelect?: (hotspot: Hotspot | null) => void;
  showInlineControls?: boolean;
  initialShowOrbit?: boolean;
  onRegisterApi?: (api: {
    focusOnHotspot: (hotspot: { lat: number; lon: number }) => void;
    rotateTo: (lat: number, lon: number) => void;
    resetCameraPosition: () => void;
    setLayer: (layer: keyof ActiveLayers, value: boolean) => void;
  }) => void;
  onFeaturesLoaded?: (features: Hotspot[]) => void;
}

// (legacy TexturedSphere removed as replaced by AnimatedTexturedSphere)

function AnimatedTexturedSphere({ textureUrl, scale = 1, opacity, segments }: { textureUrl: string; scale?: number; opacity: any; segments: number }) {
  const meshRef = useRef<Mesh>(null!);
  const texture = useTexture(textureUrl);
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });
  return (
    <mesh ref={meshRef} castShadow receiveShadow scale={scale}>
      <sphereGeometry args={[1, segments, segments]} />
      <aThree.meshStandardMaterial map={texture} roughness={0.9} metalness={0.0} transparent opacity={opacity} />
    </mesh>
  );
}

function DataLayerSphere({ type, visible, radius, segments, opacity: passedOpacity }: { type: keyof ActiveLayers; visible: boolean; radius: number; segments: number; opacity?: number }) {
  if (!visible) return null;
  // Simple overlay sphere using transparent material; can be replaced with shader for richer visuals
  const color = type === 'temperature' ? '#ef4444' : type === 'atmosphere' ? '#60a5fa' : '#10b981';
  const opacity = passedOpacity != null ? passedOpacity : (type === 'atmosphere' ? 0.18 : 0.12);
  return (
    <mesh scale={radius * 1.01}>
      <sphereGeometry args={[1.005, segments, segments]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} roughness={1} metalness={0} depthWrite={false} />
    </mesh>
  );
}

function StellarEnvironment({ starTempK, enabled }: { starTempK?: number; enabled: boolean }) {
  const group = useMemo(() => enabled ? createStellarEnvironment(starTempK) : null, [enabled, starTempK]);
  useEffect(() => {
    return () => {
      if (!group) return;
      group.traverse((obj: any) => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch {}
        }
        if (obj.material) {
          const mat = obj.material;
          try {
            if (Array.isArray(mat)) mat.forEach(m => m && m.dispose && m.dispose());
            else if (mat && mat.dispose) mat.dispose();
          } catch {}
        }
      });
    };
  }, [group]);
  if (!enabled || !group) return null;
  return <primitive object={group} />;
}

function AtmosphericParticles({ radius, density, enabled, onStepRef }: { radius: number; density: number; enabled: boolean; onStepRef: React.MutableRefObject<((dt: number) => void) | null>; }) {
  const data = useMemo(() => enabled ? createAtmosphereEffects(radius, density) : null, [enabled, radius, density]);
  useEffect(() => { onStepRef.current = data?.step || null; return () => { onStepRef.current = null; }; }, [data]);
  useEffect(() => {
    return () => {
      const group = data?.group;
      if (!group) return;
      group.traverse((obj: any) => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch {}
        }
        if (obj.material) {
          const mat = obj.material;
          try {
            if (Array.isArray(mat)) mat.forEach(m => m && m.dispose && m.dispose());
            else if (mat && mat.dispose) mat.dispose();
          } catch {}
        }
      });
    };
  }, [data]);
  if (!enabled || !data) return null;
  return <primitive object={data.group} />;
}

function AtmosphericRenderer({ radius, intensity, segments }: { radius: number; intensity: number; segments: number }) {
  const { camera } = useThree();
  const material = useMemo(() => createAtmosphereMaterial(0x66aaff, intensity), [intensity]);
  useEffect(() => { return () => { material.dispose(); }; }, [material]);
  useFrame(() => {
    (material.uniforms.cameraPositionW.value as any).copy((camera as any).position);
    material.uniforms.atmosphereIntensity.value = intensity;
  });
  return (
    <mesh scale={radius * 1.06}>
      <sphereGeometry args={[1.0, segments, segments]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}

function StellarSystem({ planet, show, timeScale, playing }: { planet: Planet; show: boolean; timeScale: number; playing: boolean }) {
  const orbitParams = useMemo(() => {
    const ecc = (planet as any).pl_orbeccen ?? 0;
    const incl = (planet as any).pl_orbincl ?? 0;
    const periodDays = planet.pl_orbper || 365;
    let semiMajorAxisAu = (planet as any).pl_orbsmax ?? (planet as any).pl_orbsmaxlim;
    if (!semiMajorAxisAu && periodDays) {
      const years = periodDays / 365.25;
      const starMassSolar = (planet as any).st_mass ?? 1;
      // Kepler's third law (in AU, years, solar masses): a^3 = M * P^2
      semiMajorAxisAu = Math.cbrt(Math.max(0.0001, starMassSolar * years * years));
    }
    return {
      semiMajorAxisAu: semiMajorAxisAu || 0.9,
      eccentricity: typeof ecc === 'number' ? ecc : 0,
      inclinationDeg: typeof incl === 'number' ? incl : 0,
      periodDays,
    };
  }, [planet]);
  const orbit = useMemo(() => show ? createOrbitPath(orbitParams, 0.9) : null, [show, orbitParams]);
  const star = useMemo(() => show ? hostStarMesh(planet.st_spectype, 0.2) : null, [show, planet]);
  const markerRef = useRef<Mesh>(null!);
  const startRef = useRef<number>(performance.now());
  useFrame(() => {
    if (!show || !markerRef.current) return;
    const t = (performance.now() - startRef.current) / 1000 * (playing ? timeScale : 0);
    const pos = OrbitalMechanics.positionAtTime(orbitParams, t);
    markerRef.current.position.set(pos.x, pos.y, pos.z);
  });
  if (!show) return null;
  return (
    <group>
      {star && <primitive object={star} />}
      {orbit && <primitive object={orbit} />}
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#88aaff" emissive="#6688ff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function HotspotMarker({ hotspot, radius, onSelect, selected, onHoverChange }: { hotspot: Hotspot; radius: number; onSelect: (h: Hotspot) => void; selected: boolean; onHoverChange: (h: Hotspot | null) => void; }) {
  const [x, y, z] = sphericalToCartesian(hotspot.lat, hotspot.lon, radius * 1.01);
  const scale = selected ? 1.2 : 1;
  return (
    <group position={[x, y, z]}
      onPointerOver={(e) => { e.stopPropagation(); onHoverChange(hotspot); }}
      onPointerOut={(e) => { e.stopPropagation(); onHoverChange(null); }}
    >
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(hotspot); }}
        onPointerDown={(e) => { e.stopPropagation(); }}
        scale={0.025 * scale}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={selected ? '#f59e0b' : '#eab308'} emissive={selected ? '#f59e0b' : '#ca8a04'} emissiveIntensity={selected ? 0.8 : 0.5} />
      </mesh>
      <Html center>
        <button
          className="hotspot-focus-btn"
          aria-label={`Hotspot: ${hotspot.name}`}
          onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => { if (e.key === 'Enter' || e.key === ' ') onSelect(hotspot); }}
          onClick={(e) => { e.stopPropagation(); onSelect(hotspot); }}
        />
      </Html>
    </group>
  );
}

function HotspotTooltip({ hotspot, radius }: { hotspot: Hotspot; radius: number }) {
  const [x, y, z] = sphericalToCartesian(hotspot.lat, hotspot.lon, radius * 1.06);
  return (
    <Html position={[x, y, z]} center className="hotspot-tooltip">
      <div className="hotspot-tooltip-inner">
        <div className="hotspot-title">{hotspot.name}</div>
        <div className="hotspot-type">{hotspot.type}</div>
      </div>
    </Html>
  );
}

function SceneContents({ layers, features, onSelectHotspot, hoveredHotspot, setHoveredHotspot, scale, tempOpacity, atmOpacity, habOpacity, overlaySegments }: { layers: ActiveLayers; features: Hotspot[]; onSelectHotspot: (h: Hotspot) => void; hoveredHotspot: Hotspot | null; setHoveredHotspot: (h: Hotspot | null) => void; scale: number; tempOpacity: number; atmOpacity: number; habOpacity: number; overlaySegments: number; }) {
  return (
    <>
      <DataLayerSphere type="temperature" visible={layers.temperature} radius={scale} opacity={tempOpacity} segments={overlaySegments} />
      <DataLayerSphere type="atmosphere" visible={layers.atmosphere} radius={scale} opacity={atmOpacity} segments={overlaySegments} />
      <DataLayerSphere type="habitability" visible={layers.habitability} radius={scale} opacity={habOpacity} segments={overlaySegments} />
      {features.map((f) => (
        <HotspotMarker key={f.id} hotspot={f} radius={scale} onSelect={onSelectHotspot} selected={hoveredHotspot?.id === f.id} onHoverChange={setHoveredHotspot} />
      ))}
      {hoveredHotspot && <HotspotTooltip hotspot={hoveredHotspot} radius={scale} />}
    </>
  );
}

function FrameStepper({ stepRef }: { stepRef: React.MutableRefObject<((dt: number) => void) | null> }) {
  useFrame((_, dt) => { stepRef.current?.(dt); });
  return null;
}

const Planet3DViewer: React.FC<Planet3DViewerProps> = ({ planet, activeLayers, onToggleLayer, onHotspotSelect, showInlineControls = true, initialShowOrbit, onRegisterApi, onFeaturesLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [internalLayers, setInternalLayers] = useState<ActiveLayers>({ temperature: false, atmosphere: false, habitability: false });
  const layers = activeLayers || internalLayers;
  const setLayer = (key: keyof ActiveLayers, value: boolean) => {
    if (onToggleLayer) onToggleLayer(key, value);
    else setInternalLayers(prev => ({ ...prev, [key]: value }));
  };

  const [allFeatures, setAllFeatures] = useState<Record<string, Hotspot[]>>({});
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<Hotspot | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFeaturesLoading(true);
    const url = `${import.meta.env.BASE_URL}data/planet-features.json`;
    fetch(url)
      .then(r => r.json())
      .then((arr: Array<{ planet: string; features: Hotspot[] }>) => {
        if (cancelled) return;
        const map: Record<string, Hotspot[]> = {};
        arr.forEach(item => { map[item.planet] = item.features; });
        setAllFeatures(map);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFeaturesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSelectedHotspot(null);
    setHoveredHotspot(null);
  }, [planet]);

  const features: Hotspot[] = useMemo(() => allFeatures[planet.pl_name] || [], [allFeatures, planet]);

  // notify parent when features for this planet are available/changed
  useEffect(() => {
    if (onFeaturesLoaded) onFeaturesLoaded(features);
    // also notify on planet change even if empty to reset upstream
  }, [features, onFeaturesLoaded, planet]);

  function handleSelectHotspot(h: Hotspot) {
    setSelectedHotspot(h);
    if (onHotspotSelect) onHotspotSelect(h);
  }

  const currentScale = useMemo(() => calculatePlanetScale(planet), [planet]);
  const transitions = useTransition(planet, {
    keys: p => p.pl_name,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: { tension: 160, friction: 20 }
  });

  // Dynamic overlay intensities based on planet data
  const temp = useMemo(() => generateTemperatureData(planet), [planet]);
  const atm = useMemo(() => generateAtmosphereData(planet), [planet]);
  const hab = useMemo(() => generateHabitabilityData(planet), [planet]);
  const tempOpacity = useMemo(() => Math.min(0.35, (temp.base - temp.min) / (temp.max - temp.min)), [temp]);
  const atmOpacity = useMemo(() => Math.min(0.35, atm.density * 0.25 + atm.haze * 0.2), [atm]);
  const habOpacity = useMemo(() => Math.min(0.35, hab.suitability * 0.3), [hab]);

  const controlsRef = useRef<any>(null);
  const atmosphereStepRef = useRef<((dt: number) => void) | null>(null);

  const [showParticles, setShowParticles] = useState(false);
  const [showAtmosFx, setShowAtmosFx] = useState(false);
  const [showOrbit, setShowOrbit] = useState(initialShowOrbit ?? false);
  const [timeScale, setTimeScale] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  // Initialize managers once
  useEffect(() => {
    performanceManager.init();
    void analyticsManager.init();
  }, []);

  // Apply heuristics to visual toggles
  useEffect(() => {
    const h = performanceManager.getHeuristics();
    setShowAtmosFx(h.enableAtmosphereFx);
  }, [planet]);

  // Heuristics-driven geometry detail and controls tuning
  const heuristics = performanceManager.getHeuristics();
  const seg = heuristics.qualityLevel === 'low' ? 32 : heuristics.qualityLevel === 'medium' ? 48 : 64;
  const overlaySeg = Math.max(16, seg - 16);
  const rotateSpeed = heuristics.qualityLevel === 'low' ? 0.4 : heuristics.qualityLevel === 'medium' ? 0.55 : 0.6;
  const damping = heuristics.qualityLevel === 'low' ? 0.06 : heuristics.qualityLevel === 'medium' ? 0.08 : 0.1;

  // Optionally choose lower-res textures for low quality if available
  function getTextureForPlanet(p: Planet): string | undefined {
    const t = typeof p.image === 'string' ? p.image : undefined;
    if (!t) return undefined;
    if (heuristics.qualityLevel === 'low') {
      return t.replace(/(\.)(png|jpg|jpeg|webp)$/i, '@0.5x$1$2');
    }
    return t;
  }

  // FPS reporting to analytics
  useEffect(() => {
    performanceManager.onFps((fps) => {
      void analyticsManager.trackPerformance('fps', fps);
    });
  }, []);

  function ApiBridge() {
    const { camera } = useThree();
    const targetPosRef = useRef<Vector3 | null>(null);

    // smooth camera interpolation towards target position
    useFrame((_, delta) => {
      const tp = targetPosRef.current;
      if (!tp) return;
      const camPos = (camera as any).position as Vector3;
      const t = Math.min(1, delta * 5); // ~600-800ms easing depending on frame rate
      camPos.lerp(tp, t);
    });

    useEffect(() => {
      // initialize target to current camera position
      const camPos = (camera as any).position as Vector3;
      targetPosRef.current = camPos.clone();
    }, []);
    useEffect(() => {
      if (!onRegisterApi) return;
      const api = {
        focusOnHotspot: ({ lat, lon }: { lat: number; lon: number }) => {
          const [x, y, z] = sphericalToCartesian(lat, lon, currentScale * 1.05);
          if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
          }
          targetPosRef.current = new Vector3(x * 2.4, y * 2.4, z * 2.4);
        },
        rotateTo: (lat: number, lon: number) => {
          const [x, y, z] = sphericalToCartesian(lat, lon, currentScale * 1.05);
          if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
          }
          targetPosRef.current = new Vector3(x * 2.2, y * 2.2, z * 2.2);
        },
        resetCameraPosition: () => {
          if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
          }
          targetPosRef.current = new Vector3(0, 0, 2.6);
        },
        setLayer: (layer: keyof ActiveLayers, value: boolean) => setLayer(layer, value),
      };
      onRegisterApi(api);
    }, [onRegisterApi, currentScale]);
    return null;
  }

  return (
    <div className={`planet-3d-container ${isDragging ? 'dragging' : ''}`} aria-label={`3D view of ${planet.pl_name}`} tabIndex={0}
      ref={(el) => { if (el) { accessibilityManager.register3DView(el); accessibilityManager.setupKeyboardNavigationFor3D(el, {
        onArrow: (dx, dy) => {
          // map arrows to small camera target nudges
          const step = 0.06;
          if (controlsRef.current) {
            controlsRef.current.target.x += dx * step;
            controlsRef.current.target.y += dy * step;
            controlsRef.current.update();
          }
          void analyticsManager.track3DInteraction('camera_nudge', { dx, dy });
        },
        onSelect: () => { if (selectedHotspot) void analyticsManager.track3DInteraction('hotspot_select', { id: selectedHotspot.id }); }
      }); } }}
    >
      <Canvas
        className="r3f-canvas"
        shadows
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerOut={() => setIsDragging(false)}
        camera={{ position: [0, 0, 2.6], fov: 45 }}
      >
        <color attach="background" args={[0, 0, 0]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 2, 2]} intensity={1.0} castShadow />
        <Suspense fallback={<Html center><div className="three-loading">Loading 3D…</div></Html>}>
          <StellarEnvironment starTempK={planet.st_teff} enabled={showParticles} />
          {transitions((style, p) => {
            const tUrl = getTextureForPlanet(p);
            const scale = calculatePlanetScale(p);
            return tUrl ? (
              <AnimatedTexturedSphere textureUrl={tUrl} scale={scale} opacity={style.opacity} segments={seg} />
            ) : (
              <mesh castShadow receiveShadow scale={scale}>
                <sphereGeometry args={[1, seg, seg]} />
                <aThree.meshStandardMaterial color="#9aa5b1" roughness={0.9} metalness={0.0} opacity={style.opacity} />
              </mesh>
            );
          })}
          <SceneContents layers={layers} features={features} onSelectHotspot={(h)=>{ handleSelectHotspot(h); void analyticsManager.track3DInteraction('hotspot_click', { id: h.id }); }} hoveredHotspot={hoveredHotspot} setHoveredHotspot={setHoveredHotspot} scale={currentScale} tempOpacity={tempOpacity} atmOpacity={showAtmosFx ? 0.02 : atmOpacity} habOpacity={habOpacity} overlaySegments={overlaySeg} />
          {showAtmosFx && (
            <>
              <AtmosphericParticles radius={currentScale} density={atm.density * heuristics.particleDensityScale} enabled={true} onStepRef={atmosphereStepRef} />
              <AtmosphericRenderer radius={currentScale} intensity={atmOpacity} segments={overlaySeg} />
            </>
          )}
          <StellarSystem planet={planet} show={showOrbit} timeScale={timeScale} playing={isPlaying} />
        </Suspense>
        <FrameStepper stepRef={atmosphereStepRef} />
        <ApiBridge />
        <OrbitControls ref={controlsRef} enablePan={false} enableDamping dampingFactor={damping} rotateSpeed={rotateSpeed} makeDefault enableZoom={true} enableRotate={!hoveredHotspot}
          onChange={() => { /* avoid double counting frames */ }}
          />
      </Canvas>
      {showInlineControls && (
        <div className="layer-controls" aria-label="Data layer controls">
          <button className={`layer-btn ${layers.temperature ? 'active' : ''}`} aria-pressed={layers.temperature} onClick={() => { const v = !layers.temperature; setLayer('temperature', v); accessibilityManager.announce(`Temperature layer ${v ? 'on' : 'off'}`); void analyticsManager.track3DInteraction('toggle_layer', { layer: 'temperature', value: v }); }}>Temp</button>
          <button className={`layer-btn ${layers.atmosphere ? 'active' : ''}`} aria-pressed={layers.atmosphere} onClick={() => { const v = !layers.atmosphere; setLayer('atmosphere', v); accessibilityManager.announce(`Atmosphere layer ${v ? 'on' : 'off'}`); void analyticsManager.track3DInteraction('toggle_layer', { layer: 'atmosphere', value: v }); }}>Atm</button>
          <button className={`layer-btn ${layers.habitability ? 'active' : ''}`} aria-pressed={layers.habitability} onClick={() => { const v = !layers.habitability; setLayer('habitability', v); accessibilityManager.announce(`Habitability layer ${v ? 'on' : 'off'}`); void analyticsManager.track3DInteraction('toggle_layer', { layer: 'habitability', value: v }); }}>Habit</button>
          <button className={`layer-btn ${showParticles ? 'active' : ''}`} aria-pressed={showParticles} onClick={() => { setShowParticles(v => !v); void analyticsManager.track3DInteraction('toggle_particles', { value: !showParticles }); }}>Stars</button>
          <button className={`layer-btn ${showAtmosFx ? 'active' : ''}`} aria-pressed={showAtmosFx} title="Realistic atmospheric scattering shader" onClick={() => { setShowAtmosFx(v => !v); void analyticsManager.track3DInteraction('toggle_atmofx', { value: !showAtmosFx }); }}>AtmoFx</button>
          <button className={`layer-btn ${showOrbit ? 'active' : ''}`} aria-pressed={showOrbit} onClick={() => setShowOrbit(v => !v)}>Orbit</button>
          {showOrbit && (
            <div className="flex items-center gap-1">
              <button className="layer-btn" onClick={() => { setIsPlaying(p => !p); void analyticsManager.track3DInteraction('orbit_play_toggle', { value: !isPlaying }); }}>{isPlaying ? 'Pause' : 'Play'}</button>
              <button className="layer-btn" onClick={() => setTimeScale(s => Math.max(0.25, s / 2))}>-</button>
              <div className="layer-btn" aria-label="speed">{timeScale.toFixed(2)}x</div>
              <button className="layer-btn" onClick={() => setTimeScale(s => Math.min(32, s * 2))}>+</button>
            </div>
          )}
        </div>
      )}
      {featuresLoading && <div className="hotspot-loading">Loading features…</div>}
      {selectedHotspot && (
        <div className="hotspot-selected-announcer" role="status" aria-live="polite">Selected hotspot: {selectedHotspot.name}</div>
      )}
    </div>
  );
};

export default Planet3DViewer;


