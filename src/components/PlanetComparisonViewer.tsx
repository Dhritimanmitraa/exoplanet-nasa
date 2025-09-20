import React, { useMemo, useState } from 'react';
import { Planet } from '../lib/filters';
import Planet3DViewer from './Planet3DViewer';
import { PlanetComparator, ComparisonMode } from '../lib/planet-comparator';

interface PlanetComparisonViewerProps {
  planets: Planet[]; // candidate list for selection
  initialSelection?: [Planet, Planet];
}

const PlanetComparisonViewer: React.FC<PlanetComparisonViewerProps> = ({ planets, initialSelection }) => {
  const [left, setLeft] = useState<Planet | null>(initialSelection?.[0] ?? null);
  const [right, setRight] = useState<Planet | null>(initialSelection?.[1] ?? null);
  const [mode, setMode] = useState<ComparisonMode>('size');

  const comparator = useMemo(() => new PlanetComparator([left!, right!].filter(Boolean) as Planet[], mode), [left, right, mode]);

  const metrics = useMemo(() => {
    if (!left || !right) return null;
    return comparator.metrics(left, right);
  }, [left, right, comparator]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <select className="border rounded px-2 py-1" value={mode} onChange={e => setMode(e.target.value as ComparisonMode)}>
          <option value="size">Size Comparison</option>
          <option value="habitability">Habitability</option>
          <option value="orbital">Orbital</option>
          <option value="discovery">Discovery</option>
        </select>
        <select className="border rounded px-2 py-1" value={left?.pl_name || ''} onChange={e => setLeft(planets.find(p => p.pl_name === e.target.value) || null)}>
          <option value="">Select left planet</option>
          {planets.map(p => (<option key={p.pl_name} value={p.pl_name}>{p.pl_name}</option>))}
        </select>
        <select className="border rounded px-2 py-1" value={right?.pl_name || ''} onChange={e => setRight(planets.find(p => p.pl_name === e.target.value) || null)}>
          <option value="">Select right planet</option>
          {planets.map(p => (<option key={p.pl_name} value={p.pl_name}>{p.pl_name}</option>))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded overflow-hidden bg-black/60">
          {left && (
            <div className="h-64">
              <Planet3DViewer planet={left} showInlineControls={true} />
            </div>
          )}
        </div>
        <div className="rounded overflow-hidden bg-black/60">
          {right && (
            <div className="h-64">
              <Planet3DViewer planet={right} showInlineControls={true} />
            </div>
          )}
        </div>
      </div>

      {metrics && (
        <div className="bg-white rounded p-3 border">
          <div className="text-sm">Size ratio (L/R): <b>{metrics.sizeRatio?.toFixed(2) ?? '—'}</b></div>
          <div className="text-sm">Temp difference: <b>{metrics.tempDifferenceK != null ? `${Math.round(metrics.tempDifferenceK)} K` : '—'}</b></div>
          {metrics.habitabilityScoreA != null && metrics.habitabilityScoreB != null && (
            <div className="text-sm">Habitability: <b>{metrics.habitabilityScoreA}</b> vs <b>{metrics.habitabilityScoreB}</b></div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanetComparisonViewer;


