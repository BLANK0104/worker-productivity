import { useState, useEffect, useCallback } from 'react';
import {
  getWorkers,
  getWorkstations,
  getWorkerMetrics,
  getWorkstationMetrics,
  getFactoryMetrics,
  seedData,
  refreshData,
  subscribeToUpdates,
  getModelVersions,
} from './api';
import type {
  Worker,
  Workstation,
  WorkerMetrics,
  WorkstationMetrics,
  FactoryMetrics,
} from './types';
import type { ModelVersion } from './api';
import FactorySummary from './components/FactorySummary';
import WorkerTable from './components/WorkerTable';
import WorkstationTable from './components/WorkstationTable';
import WorkerDetail from './components/WorkerDetail';
import WorkstationDetail from './components/WorkstationDetail';
import ErrorBoundary from './components/ErrorBoundary';
import AlertPanel from './components/AlertPanel';
import EventFeed from './components/EventFeed';

type Tab = 'overview' | 'workers' | 'workstations' | 'alerts';

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [workerMetrics, setWorkerMetrics] = useState<WorkerMetrics[]>([]);
  const [stationMetrics, setStationMetrics] = useState<WorkstationMetrics[]>([]);
  const [factoryMetrics, setFactoryMetrics] = useState<FactoryMetrics | null>(null);

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Selection
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);

  const range = { from: from || undefined, to: to || undefined };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, s, wm, sm, fm] = await Promise.all([
        getWorkers(),
        getWorkstations(),
        getWorkerMetrics(undefined, range),
        getWorkstationMetrics(undefined, range),
        getFactoryMetrics(range),
      ]);
      setWorkers(w);
      setWorkstations(s);
      setWorkerMetrics(wm);
      setStationMetrics(sm);
      setFactoryMetrics(fm);
    } catch (e) {
      setError('Failed to load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  // Live SSE subscription — reload when new events are ingested
  useEffect(() => {
    const unsub = subscribeToUpdates(() => { load(); });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch model version stats
  useEffect(() => {
    getModelVersions().then(setModelVersions).catch(() => {/* silent */});
  }, []);

  // Date preset helpers
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFrom(isoDate(start));
    setTo(isoDate(end));
  };

  const handleSeed = async (refresh: boolean) => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const result = refresh ? await refreshData(7) : await seedData(7);
      setSeedMsg(`${result.message}: ${result.inserted} events inserted, ${result.skipped} skipped.`);
      await load();
    } catch {
      setSeedMsg('Seed failed. Check backend logs.');
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedMsg(null), 5000);
    }
  };

  // Enrich metrics with metadata
  const workerMap = Object.fromEntries(workers.map((w) => [w.worker_id, w]));
  const stationMap = Object.fromEntries(workstations.map((s) => [s.station_id, s]));

  const selectedWorkerData = selectedWorker ? workerMap[selectedWorker] : null;
  const selectedWorkerMetrics = selectedWorker
    ? workerMetrics.find((m) => m.worker_id === selectedWorker) ?? null
    : null;

  const selectedStationData = selectedStation ? stationMap[selectedStation] : null;
  const selectedStationMetrics = selectedStation
    ? stationMetrics.find((m) => m.station_id === selectedStation) ?? null
    : null;

  return (
    <ErrorBoundary>
    <div className="app">
      {/* ── Top bar ── */}
      <nav className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
            </svg>
          </div>
          <span>Worker Productivity</span>
          <div className="topbar-live">
            <span className="live-dot" />
            LIVE
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm" onClick={() => handleSeed(false)} disabled={seeding}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Data
          </button>
          <div className="topbar-divider" />
          <button className="btn btn-sm btn-danger" onClick={() => handleSeed(true)} disabled={seeding}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.17"/></svg>
            Refresh
          </button>
          <button className="btn btn-sm btn-primary" onClick={load} disabled={loading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-.49-4.17"/></svg>
            Reload
          </button>
        </div>
      </nav>

      <main className="main">
        {seedMsg && (
          <div className="banner banner-success">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {seedMsg}
          </div>
        )}
        {error && (
          <div className="banner banner-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {/* ── Date filters ── */}
        <div className="filter-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="filter-label">Range:</span>
          <button className={`btn btn-sm ${!from && !to ? 'btn-primary' : ''}`} onClick={() => { setFrom(''); setTo(''); }}>All time</button>
          <button className="btn btn-sm" onClick={() => setPreset(0)}>Today</button>
          <button className="btn btn-sm" onClick={() => setPreset(7)}>7 days</button>
          <button className="btn btn-sm" onClick={() => setPreset(30)}>30 days</button>
          <div className="filter-sep" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {(from || to) && (
            <button className="btn btn-sm btn-ghost" onClick={() => { setFrom(''); setTo(''); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Overview
          </button>
          <button className={`tab-btn ${tab === 'workers' ? 'active' : ''}`} onClick={() => setTab('workers')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Workers
          </button>
          <button className={`tab-btn ${tab === 'workstations' ? 'active' : ''}`} onClick={() => setTab('workstations')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Workstations
          </button>
          <button className={`tab-btn ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Alerts
          </button>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            Loading metrics…
          </div>
        )}

        {!loading && (
          <>
            {/* ── Overview tab ── */}
            {tab === 'overview' && (
              <>
                {factoryMetrics && <FactorySummary metrics={factoryMetrics} />}
                <div className="overview-grid-2">
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        Top Workers by Units
                      </span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Worker</th>
                          <th>Units</th>
                          <th>Utilization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...workerMetrics]
                          .sort((a, b) => b.total_units_produced - a.total_units_produced)
                          .slice(0, 6)
                          .map((m) => (
                            <tr key={m.worker_id} onClick={() => { setTab('workers'); setSelectedWorker(m.worker_id); }}>
                              <td>
                                <strong>{workerMap[m.worker_id]?.name ?? m.worker_id}</strong>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.worker_id}</div>
                              </td>
                              <td>{m.total_units_produced.toLocaleString()}</td>
                              <td>
                                <div className="progress-wrap">
                                  <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${m.utilization_pct}%`, background: m.utilization_pct >= 75 ? '#22c55e' : m.utilization_pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                                  </div>
                                  <span style={{ fontSize: 12, minWidth: 38, color: 'var(--muted)' }}>{m.utilization_pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                        Top Workstations by Throughput
                      </span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Station</th>
                          <th>Units</th>
                          <th>Utilization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...stationMetrics]
                          .sort((a, b) => b.total_units_produced - a.total_units_produced)
                          .slice(0, 6)
                          .map((m) => (
                            <tr key={m.station_id} onClick={() => { setTab('workstations'); setSelectedStation(m.station_id); }}>
                              <td>
                                <strong>{stationMap[m.station_id]?.name ?? m.station_id}</strong>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.station_id}</div>
                              </td>
                              <td>{m.total_units_produced.toLocaleString()}</td>
                              <td>
                                <div className="progress-wrap">
                                  <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${m.utilization_pct}%`, background: m.utilization_pct >= 75 ? '#22c55e' : m.utilization_pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                                  </div>
                                  <span style={{ fontSize: 12, minWidth: 38, color: 'var(--muted)' }}>{m.utilization_pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {modelVersions.length > 0 && (
                  <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                      <span className="card-title">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        AI Model Versions
                      </span>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Version</th>
                          <th>Events</th>
                          <th>Avg Confidence</th>
                          <th>Last Seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelVersions.map((mv) => (
                          <tr key={mv.version} style={{ cursor: 'default' }}>
                            <td><span className="badge badge-purple" style={{ fontFamily: 'monospace', letterSpacing: 0 }}>{mv.version}</span></td>
                            <td style={{ fontWeight: 600 }}>{mv.event_count.toLocaleString()}</td>
                            <td>
                              <span style={{ color: mv.avg_confidence >= 0.75 ? 'var(--green)' : 'var(--yellow)', fontWeight: 700 }}>
                                {(mv.avg_confidence * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(mv.last_seen).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Workers tab ── */}
            {tab === 'workers' && (
              <div style={{ display: 'grid', gridTemplateColumns: selectedWorker ? '1fr 360px' : '1fr', gap: 20 }}>
                <WorkerTable
                  workers={workers}
                  metrics={workerMetrics}
                  selected={selectedWorker}
                  onSelect={setSelectedWorker}
                />
                {selectedWorker && selectedWorkerData && (
                  <WorkerDetail
                    worker={selectedWorkerData}
                    metrics={selectedWorkerMetrics}
                    range={range}
                    onClose={() => setSelectedWorker(null)}
                  />
                )}
              </div>
            )}

            {/* ── Workstations tab ── */}
            {tab === 'workstations' && (
              <div style={{ display: 'grid', gridTemplateColumns: selectedStation ? '1fr 360px' : '1fr', gap: 20 }}>
                <WorkstationTable
                  workstations={workstations}
                  metrics={stationMetrics}
                  selected={selectedStation}
                  onSelect={setSelectedStation}
                />
                {selectedStation && selectedStationData && (
                  <WorkstationDetail
                    station={selectedStationData}
                    metrics={selectedStationMetrics}
                    range={range}
                    onClose={() => setSelectedStation(null)}
                  />
                )}
              </div>
            )}
            {tab === 'alerts' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <ErrorBoundary>
                  <AlertPanel />
                </ErrorBoundary>
                <ErrorBoundary>
                  <EventFeed live />
                </ErrorBoundary>
              </div>
            )}
          </>
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}
