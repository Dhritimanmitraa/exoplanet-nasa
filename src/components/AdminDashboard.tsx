import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore - type shim provided
import { format } from 'date-fns';
import { analyticsManager } from '../lib/analytics-manager';
// @ts-ignore - type shim provided
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { listContent, upsertContent, deleteContent, ContentItem } from '../lib/content-manager';

type SimpleMetric = { ts: number; value: number };

const AdminDashboard: React.FC = () => {
  const [sessionStartCount, setSessionStartCount] = useState(0);
  const [perfFpsSeries, setPerfFpsSeries] = useState<SimpleMetric[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await analyticsManager.init();
      const events = await analyticsManager.listEvents(Date.now() - 1000 * 60 * 60 * 24);
      if (!mounted) return;
      const sessions = events.filter(e => e.type === 'session_start');
      setSessionStartCount(sessions.length);
      const fps = events.filter(e => e.type === 'perf_fps');
      const series = fps.map(e => ({ ts: e.ts, value: Number(e.payload?.value) || 0 }));
      setPerfFpsSeries(series);
      setContent(await listContent());
    })();
    return () => { mounted = false; };
  }, []);

  const chartData = useMemo(() => perfFpsSeries.map(d => ({ name: format(d.ts, 'HH:mm:ss'), fps: d.value })), [perfFpsSeries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-dark via-space-blue to-cosmic-purple text-white">
      <div className="max-w-7xl mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-blue-200">System monitoring, analytics, and configuration</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4">
            <div className="text-gray-600 text-sm">Sessions Today</div>
            <div className="text-3xl font-bold text-gray-900">{sessionStartCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-gray-600 text-sm">Avg FPS (recent)</div>
            <div className="text-3xl font-bold text-gray-900">{Math.round(chartData.reduce((a, b) => a + b.fps, 0) / Math.max(1, chartData.length))}</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-gray-600 text-sm">Offline Ready</div>
            <div className="text-3xl font-bold text-gray-900">Yes</div>
          </div>
        </section>

        <section className="bg-white rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Performance (FPS)</h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#6b7280' }} hide />
                <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} domain={[0, 120]} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.08)', color: '#e6eef8' }} />
                <Line type="monotone" dataKey="fps" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Configuration</h2>
          <div className="text-gray-700">This is a placeholder for kiosk settings, accessibility defaults, and content management.</div>
        </section>

        <section className="bg-white rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Content Manager</h2>
          <div className="grid gap-3 mb-4">
            <input className="border border-gray-300 rounded px-3 py-2" placeholder="Title" value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} />
            <textarea className="border border-gray-300 rounded px-3 py-2" placeholder="Body" rows={4} value={draftBody} onChange={e=>setDraftBody(e.target.value)} />
            <div>
              <button className="bg-cosmic-purple text-white px-4 py-2 rounded" onClick={async ()=>{ if(!draftTitle) return; await upsertContent({ title: draftTitle, body: draftBody }); setDraftTitle(''); setDraftBody(''); setContent(await listContent()); }}>Add</button>
            </div>
          </div>
          <ul className="space-y-2">
            {content.map(item => (
              <li key={item.id} className="border border-gray-200 rounded p-3">
                <div className="font-semibold text-gray-900">{item.title}</div>
                <div className="text-gray-600 text-sm mb-2">{format(item.updatedAt, 'PPpp')}</div>
                <div className="text-gray-700 whitespace-pre-wrap mb-2">{item.body}</div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded bg-gray-100" onClick={async ()=>{ await deleteContent(item.id); setContent(await listContent()); }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;


