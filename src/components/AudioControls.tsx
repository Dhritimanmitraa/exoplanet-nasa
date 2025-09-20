import React, { useEffect, useMemo, useState } from 'react';
import type { VoiceSettings, NarrationState } from '../lib/narrator';

export interface AudioControlsProps {
  state: NarrationState;
  subtitle?: string;
  settings: VoiceSettings;
  onSettingsChange: (next: Partial<VoiceSettings>) => void;
  voices: SpeechSynthesisVoice[];
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  tour?: {
    enabled: boolean;
    running: boolean;
    progress: { index: number; total: number };
    onToggleEnabled: (v: boolean) => void;
    onStart: () => void;
    onStop: () => void;
    onNext: () => void;
    onPrev: () => void;
  };
}

const AudioControls: React.FC<AudioControlsProps> = ({ state, subtitle, settings, onSettingsChange, voices, onPlay, onPause, onResume, onStop, tour }) => {
  const [collapsed, setCollapsed] = useState(false);
  const speaking = state === 'speaking';
  const paused = state === 'paused';

  // Keep voice list refreshed (some browsers load async)
  useEffect(() => {
    const handler = () => { /* noop; parent passes voices */ };
    try { window.speechSynthesis?.addEventListener?.('voiceschanged', handler as any); } catch {}
    return () => { try { window.speechSynthesis?.removeEventListener?.('voiceschanged', handler as any); } catch {} };
  }, []);

  // derive but don't store to avoid unused var warning
  useMemo(() => voices.find(v => v.voiceURI === settings.voiceURI) || null, [voices, settings.voiceURI]);

  return (
    <div className={`audio-controls ${collapsed ? 'collapsed' : ''}`} aria-label="Audio controls">
      <div className="audio-controls-header">
        <div className="left">
          <button className={`ac-btn ${speaking ? 'active' : ''}`} aria-pressed={speaking} onClick={() => (speaking ? onPause() : onPlay())} title={speaking ? 'Pause narration' : 'Play narration'}>
            {speaking ? (
              <span aria-hidden>⏸</span>
            ) : (
              <span aria-hidden>▶</span>
            )}
          </button>
          {paused && (
            <button className="ac-btn" onClick={onResume} title="Resume narration"><span aria-hidden>⏵</span></button>
          )}
          <button className="ac-btn" onClick={onStop} title="Stop narration"><span aria-hidden>⏹</span></button>
          <div className={`speaking-indicator ${speaking ? 'on' : paused ? 'paused' : ''}`} aria-live="polite">{speaking ? 'Speaking' : paused ? 'Paused' : 'Idle'}</div>
        </div>
        <div className="right">
          <button className="ac-btn" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand audio controls' : 'Collapse audio controls'}>
            {collapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="audio-controls-body">
          <div className="sliders">
            <label className="ac-field">
              <span>Volume</span>
              <input type="range" min={0} max={1} step={0.01} value={settings.volume} onChange={(e) => onSettingsChange({ volume: parseFloat(e.target.value) })} />
            </label>
            <label className="ac-field">
              <span>Rate</span>
              <input type="range" min={0.5} max={2} step={0.05} value={settings.rate} onChange={(e) => onSettingsChange({ rate: parseFloat(e.target.value) })} />
            </label>
            <label className="ac-field">
              <span>Pitch</span>
              <input type="range" min={0} max={2} step={0.05} value={settings.pitch} onChange={(e) => onSettingsChange({ pitch: parseFloat(e.target.value) })} />
            </label>
          </div>
          <div className="selectors">
            <label className="ac-field">
              <span>Voice</span>
              <select value={settings.voiceURI || ''} onChange={(e) => onSettingsChange({ voiceURI: e.target.value || undefined })}>
                <option value="">Default</option>
                {voices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} {v.lang ? `(${v.lang})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="ac-checkbox">
              <input type="checkbox" checked={settings.enabled} onChange={(e) => onSettingsChange({ enabled: e.target.checked })} />
              <span>Enable voice</span>
            </label>
          </div>

          {tour && (
            <div className="tour-controls">
              <label className="ac-checkbox">
                <input type="checkbox" checked={tour.enabled} onChange={(e) => tour.onToggleEnabled(e.target.checked)} />
                <span>Tour mode</span>
              </label>
              <div className="tour-buttons">
                {!tour.running ? (
                  <button className="ac-btn" onClick={tour.onStart} disabled={!tour.enabled}>Start Tour</button>
                ) : (
                  <>
                    <button className="ac-btn" onClick={tour.onPrev}>Prev</button>
                    <button className="ac-btn" onClick={tour.onNext}>Next</button>
                    <button className="ac-btn" onClick={tour.onStop}>Stop</button>
                  </>
                )}
                <div className="tour-progress" aria-live="polite">
                  Step {tour.progress.index + 1} / {Math.max(1, tour.progress.total)}
                </div>
              </div>
            </div>
          )}

          {subtitle && (
            <div className="subtitle-area" aria-live="polite">{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioControls;


