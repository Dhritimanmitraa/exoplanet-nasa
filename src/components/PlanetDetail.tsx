import React, { useEffect, useRef, useState } from 'react';
import { Planet } from '../lib/filters';
import type { Hotspot } from '../lib/planet-utils';
import { narrate, getShareText, NarrativeContext, VoiceNarrator, narrateForVoice, narrateHotspotForVoice, narrateLayerForVoice, ExplorationTracker, TourManager, type Planet3DViewerApi, type VoiceSettings } from '../lib/narrator';
import Planet3DViewer from './Planet3DViewer';
import PlanetComparisonViewer from './PlanetComparisonViewer';
import AudioControls from './AudioControls';

interface PlanetDetailProps {
  planet: Planet | null;
  isOpen: boolean;
  onClose: () => void;
  context: NarrativeContext;
  allPlanets: Planet[];
}

const PlanetDetail: React.FC<PlanetDetailProps> = ({ planet, isOpen, onClose, context, allPlanets }) => {
  if (!isOpen || !planet) return null;
  const [showVideo, setShowVideo] = useState(true);
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'orbital' | 'compare'>('2d');
  const [activeLayers, setActiveLayers] = useState<{ temperature: boolean; atmosphere: boolean; habitability: boolean }>({ temperature: false, atmosphere: false, habitability: false });
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [subtitle, setSubtitle] = useState('');
  const [tourEnabled, setTourEnabled] = useState(() => {
    try { return localStorage.getItem('exo-tour-enabled') === '1'; } catch { return false; }
  });
  const [tourRunning, setTourRunning] = useState(false);
  const [tourProgress, setTourProgress] = useState({ index: 0, total: 1 });

  const narratorRef = useRef<VoiceNarrator | null>(null);
  const trackerRef = useRef<ExplorationTracker | null>(null);
  const tourRef = useRef<TourManager | null>(null);
  const viewerApiRef = useRef<Planet3DViewerApi | null>(null);
  const [features, setFeatures] = useState<Hotspot[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const raw = localStorage.getItem('exo-voice-settings');
      return raw ? JSON.parse(raw) : { rate: 1, pitch: 1, volume: 1, enabled: true };
    } catch {
      return { rate: 1, pitch: 1, volume: 1, enabled: true };
    }
  });

  const [state, setState] = useState<'idle' | 'speaking' | 'paused'>('idle');

  // Determine a candidate video src: prefer explicit planet.video, fall back to replacing image extension with .mp4
  const videoCandidate = (planet as any).video || (planet.image ? planet.image.replace(/\.[^/.]+$/, '.mp4') : '');
  const hasVideoCandidate = Boolean(videoCandidate);
  const has2D = hasVideoCandidate || Boolean(planet.image);

  // Reset video visibility on planet change
  useEffect(() => {
    setShowVideo(true);
  }, [planet]);

  // Hide video when there is no candidate
  useEffect(() => {
    if (!hasVideoCandidate) {
      setShowVideo(false);
    }
  }, [hasVideoCandidate]);

  // Initialize view mode on planet change: '2d' if any 2D media exists, else '3d'
  useEffect(() => {
    setViewMode(has2D ? '2d' : '3d');
  }, [planet, has2D]);

  useEffect(() => {
    // mark body as having a modal open so global UI (like expanded previews) can adjust
    document.body.classList.add('modal-open');
    return () => { document.body.classList.remove('modal-open'); };
  }, []);

  // Setup narrator, tracker, and tour
  useEffect(() => {
    const narrator = new VoiceNarrator(voiceSettings);
    narratorRef.current = narrator;
    const unsub1 = narrator.on('statechange', ({ state }) => setState(state));
    const unsub2 = narrator.on('subtitle', ({ text }) => setSubtitle(text));
    const tracker = new ExplorationTracker();
    trackerRef.current = tracker;
    const tour = new TourManager(narrator);
    tourRef.current = tour;
    const offRun = tour.on('running', ({ running }) => setTourRunning(running));
    const offProg = tour.on('progress', (p) => setTourProgress(p));
    const keyHandler = (e: any) => {
      const action = e?.detail?.action;
      if (!action) return;
      if (action === 'toggle') {
        const s = narratorRef.current?.getState();
        if (s === 'speaking') narrator.pause();
        else if (s === 'paused') narrator.resume();
        else narrator.speak(narrateForVoice(planet, context));
      } else if (action === 'mute-toggle') {
        const v = (voiceSettings.volume ?? 1) > 0 ? 0 : 1;
        setVoiceSettings(s => ({ ...s, volume: v }));
      } else if (action === 'tour-toggle') {
        setTourEnabled(t => !t);
      } else if (action === 'volume-up') {
        setVoiceSettings(s => ({ ...s, volume: Math.min(1, (s.volume ?? 1) + 0.05) }));
      } else if (action === 'volume-down') {
        setVoiceSettings(s => ({ ...s, volume: Math.max(0, (s.volume ?? 1) - 0.05) }));
      } else if (action === 'stop') {
        narrator.stop();
      }
    };
    window.addEventListener('exo-voice-key' as any, keyHandler);
    return () => { unsub1(); unsub2(); narrator.stop(); offRun(); offProg(); window.removeEventListener('exo-voice-key' as any, keyHandler); };
  }, []);

  // Refresh voices when browser loads them asynchronously
  useEffect(() => {
    try {
      const updateVoices = () => {
        try { setVoices(window.speechSynthesis?.getVoices?.() || []); } catch { setVoices([]); }
      };
      updateVoices();
      window.speechSynthesis?.addEventListener?.('voiceschanged', updateVoices as any);
      return () => { try { window.speechSynthesis?.removeEventListener?.('voiceschanged', updateVoices as any); } catch {} };
    } catch { /* no-op */ }
  }, []);

  // Build tour steps when planet or features change
  useEffect(() => {
    if (planet && features.length && tourRef.current) {
      tourRef.current.buildFromFeatures(planet, features.map(f => ({ id: f.id, name: f.name, lat: f.lat, lon: f.lon, description: f.description, type: f.type })));
      setTourProgress(tourRef.current.getProgress());
    }
  }, [planet, features]);

  // Persist voice settings
  useEffect(() => {
    try { localStorage.setItem('exo-voice-settings', JSON.stringify(voiceSettings)); } catch {}
    if (narratorRef.current) narratorRef.current.setSettings(voiceSettings);
  }, [voiceSettings]);

  // Persist tour setting
  useEffect(() => { try { localStorage.setItem('exo-tour-enabled', tourEnabled ? '1' : '0'); } catch {} }, [tourEnabled]);

  const handleShare = async () => {
    const shareText = getShareText(planet, context);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ExoArchive - ' + planet.pl_name,
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
        fallbackShare(shareText);
      }
    } else {
      fallbackShare(shareText);
    }
  };

  const fallbackShare = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Planet details copied to clipboard!');
    }).catch(() => {
      alert('Unable to copy to clipboard');
    });
  };

  const formatValue = (value: number | null | undefined, unit: string = '', precision: number = 2): string => {
    if (value == null) return 'Unknown';
    return value.toFixed(precision) + unit;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50" style={{ zIndex: 2000 }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-2">{planet.pl_name}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode('2d')} className={`px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors ${viewMode==='2d'?'bg-gray-100':''}`} aria-pressed={viewMode === '2d'}>2D</button>
              <button onClick={() => setViewMode('3d')} className={`px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors ${viewMode==='3d'?'bg-gray-100':''}`} aria-pressed={viewMode === '3d'}>Planet</button>
              <button onClick={() => setViewMode('orbital')} className={`px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors ${viewMode==='orbital'?'bg-gray-100':''}`} aria-pressed={viewMode === 'orbital'}>Orbital</button>
              <button onClick={() => setViewMode('compare')} className={`px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors ${viewMode==='compare'?'bg-gray-100':''}`} aria-pressed={viewMode === 'compare'}>Compare</button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Media area: toggle between 2D (video/image) and 3D viewer */}
          <div className="media-toggle-area transition-opacity duration-300 ease-out">
            {viewMode === '2d' ? (
              showVideo && hasVideoCandidate ? (
                <div className="mb-4 rounded overflow-hidden">
                  <video
                    src={videoCandidate}
                    poster={planet.image}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-56 object-cover rounded-lg"
                    onError={() => setShowVideo(false)}
                  />
                </div>
              ) : (
                planet.image && (
                  <div className="mb-4 rounded overflow-hidden">
                    <img src={planet.image} alt={planet.pl_name} className="w-full h-56 object-cover rounded-lg" />
                  </div>
                )
              )
            ) : viewMode === '3d' ? (
              <div className="mb-4 rounded overflow-hidden planet-3d-wrapper">
                <div className="w-full h-56 sm:h-72 md:h-80 lg:h-[420px]">
                  <Planet3DViewer
                    planet={planet}
                    activeLayers={activeLayers}
                    onToggleLayer={(k, v) => setActiveLayers(prev => ({ ...prev, [k]: v }))}
                    onHotspotSelect={(h) => {
                      setSelectedHotspot(h);
                      if (!h) return;
                      trackerRef.current?.recordHotspot(h.id);
                      narratorRef.current?.speak(narrateHotspotForVoice(planet, { name: h.name, type: h.type, description: h.description }));
                      const top = trackerRef.current?.getTopInterests(1) || [];
                      if (top.length) {
                        const key = top[0];
                        const personalized = 'You seem interested in ' + key.replace('hotspot:', 'feature ') + '. Let\'s explore more.';
                        narratorRef.current?.speak([personalized]);
                      }
                    }}
                    showInlineControls={false}
                    onFeaturesLoaded={setFeatures}
                    onRegisterApi={(api) => {
                      viewerApiRef.current = api;
                      tourRef.current?.attachViewer(api);
                    }}
                  />
                </div>
              </div>
            ) : viewMode === 'orbital' ? (
              <div className="mb-4 rounded overflow-hidden planet-3d-wrapper">
                <div className="w-full h-56 sm:h-72 md:h-80 lg:h-[420px]">
                  <Planet3DViewer
                    planet={planet}
                    activeLayers={activeLayers}
                    onToggleLayer={(k, v) => setActiveLayers(prev => ({ ...prev, [k]: v }))}
                    onHotspotSelect={(h) => {
                      setSelectedHotspot(h);
                      if (!h) return;
                      trackerRef.current?.recordHotspot(h.id);
                      narratorRef.current?.speak(narrateHotspotForVoice(planet, { name: h.name, type: h.type, description: h.description }));
                      const top = trackerRef.current?.getTopInterests(1) || [];
                      if (top.length) {
                        const key = top[0];
                        const personalized = 'You seem interested in ' + key.replace('hotspot:', 'feature ') + '. Let\'s explore more.';
                        narratorRef.current?.speak([personalized]);
                      }
                    }}
                    showInlineControls={true}
                    initialShowOrbit={true}
                    onFeaturesLoaded={setFeatures}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded overflow-hidden planet-3d-wrapper">
                <div className="w-full">
                  <PlanetComparisonViewer planets={allPlanets} />
                </div>
              </div>
            )}
          </div>

          {/* Narrative Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4">
            <p className="text-gray-800 leading-relaxed text-sm sm:text-base">{narrate(planet, context)}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">Planet Properties</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="text-gray-900">{planet.pl_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Host Star:</span>
                  <span className="text-gray-900">{planet.hostname || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Distance:</span>
                  <span className="text-gray-900">{formatValue(planet.sy_dist, ' parsecs')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Radius:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_rade, ' R')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Mass:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_bmasse, ' M')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Orbital Period:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_orbper, ' days')}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Atmospheric Conditions</h3>
              <div className="flex gap-2 mb-3">
                <button
                  className={`pill-btn ${activeLayers.temperature ? 'pill-active' : 'pill-inactive'} px-3 py-1 rounded`}
                  aria-pressed={activeLayers.temperature}
                  onClick={() => {
                    const next = !activeLayers.temperature;
                    setActiveLayers(p => ({ ...p, temperature: next }));
                    trackerRef.current?.recordLayerToggle('temperature', next);
                    if (next) narratorRef.current?.speak(narrateLayerForVoice('temperature'));
                    const top = trackerRef.current?.getTopInterests(1) || [];
                    if (top.length) {
                      const key = top[0];
                      const personalized = 'Focusing on ' + key + ' given your interest.';
                      narratorRef.current?.speak([personalized]);
                    }
                  }}
                >
                  Temperature
                </button>
                <button
                  className={`pill-btn ${activeLayers.atmosphere ? 'pill-active' : 'pill-inactive'} px-3 py-1 rounded`}
                  aria-pressed={activeLayers.atmosphere}
                  onClick={() => {
                    const next = !activeLayers.atmosphere;
                    setActiveLayers(p => ({ ...p, atmosphere: next }));
                    trackerRef.current?.recordLayerToggle('atmosphere', next);
                    if (next) narratorRef.current?.speak(narrateLayerForVoice('atmosphere'));
                    const top = trackerRef.current?.getTopInterests(1) || [];
                    if (top.length) {
                      const key = top[0];
                      const personalized = 'Focusing on ' + key + ' given your interest.';
                      narratorRef.current?.speak([personalized]);
                    }
                  }}
                >
                  Atmosphere
                </button>
                <button
                  className={`pill-btn ${activeLayers.habitability ? 'pill-active' : 'pill-inactive'} px-3 py-1 rounded`}
                  aria-pressed={activeLayers.habitability}
                  onClick={() => {
                    const next = !activeLayers.habitability;
                    setActiveLayers(p => ({ ...p, habitability: next }));
                    trackerRef.current?.recordLayerToggle('habitability', next);
                    if (next) narratorRef.current?.speak(narrateLayerForVoice('habitability'));
                    const top = trackerRef.current?.getTopInterests(1) || [];
                    if (top.length) {
                      const key = top[0];
                      const personalized = 'Focusing on ' + key + ' given your interest.';
                      narratorRef.current?.speak([personalized]);
                    }
                  }}
                >
                  Habitability
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Equilibrium Temp:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_eqt, ' K', 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Insolation:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_insol, ' Earth')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Star Type:</span>
                  <span className="text-gray-900">{planet.st_spectype || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Star Temperature:</span>
                  <span className="text-gray-900">{formatValue(planet.st_teff, ' K', 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Discovery Method:</span>
                  <span className="text-gray-900">{planet.discoverymethod || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Discovery Year:</span>
                  <span className="text-gray-900">{planet.discoveryyear || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>

          {selectedHotspot && (
            <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-gray-900">Hotspot: {selectedHotspot.name}</h4>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedHotspot(null)} aria-label="Close hotspot details">✕</button>
              </div>
              <div className="mt-2 text-sm text-gray-700">{selectedHotspot.description}</div>
              <div className="mt-1 text-xs text-gray-500">Type: {selectedHotspot.type}</div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 bg-cosmic-purple text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Share Discovery
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Audio Controls */}
          <div className="mt-4">
            <AudioControls
              state={state}
              subtitle={subtitle}
              settings={voiceSettings}
              onSettingsChange={(next) => setVoiceSettings((prev: VoiceSettings) => ({ ...prev, ...next }))}
              voices={voices}
              onPlay={() => narratorRef.current?.speak(narrateForVoice(planet, context))}
              onPause={() => narratorRef.current?.pause()}
              onResume={() => narratorRef.current?.resume()}
              onStop={() => narratorRef.current?.stop()}
              tour={{
                enabled: tourEnabled,
                running: tourRunning,
                progress: tourProgress,
                onToggleEnabled: (v) => setTourEnabled(v),
                onStart: () => {
                  if (features.length === 0) return;
                  setTourRunning(true);
                  tourRef.current?.start(planet);
                  setTourProgress(tourRef.current?.getProgress() || { index: 0, total: 1 });
                },
                onStop: () => { setTourRunning(false); tourRef.current?.stop(); },
                onNext: () => { tourRef.current?.next(); const p = tourRef.current?.getProgress(); setTourProgress(p || { index: 0, total: 1 }); if (p && p.index >= p.total) setTourRunning(false); },
                onPrev: () => { tourRef.current?.prev(); setTourProgress(tourRef.current?.getProgress() || { index: 0, total: 1 }); },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanetDetail;
