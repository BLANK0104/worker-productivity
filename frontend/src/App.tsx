import { useState, useEffect, useCallback } from 'react';
import {
  getWorkers,
  getWorkstations,
  getWorkerMetrics,
  getWorkstationMetrics,
  getFactoryMetrics,
  seedData,
  refreshData,
} from './api';
import type {
  Worker,
  Workstation,
  WorkerMetrics,
  WorkstationMetrics,
  FactoryMetrics,
} from './types';
import FactorySummary from './components/FactorySummary';
import WorkerTable from './components/WorkerTable';
import WorkstationTable from './components/WorkstationTable';
import WorkerDetail from './components/WorkerDetail';
import WorkstationDetail from './components/WorkstationDetail';

type Tab = 'overview' | 'workers' | 'workstations';

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
    <div className="app">
      {/* ── Top bar ── */}
      <nav className="topbar">
        <div className="topbar-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
            <path d="M7 8l3 3 4-4 3 3"/>
          </svg>
          Worker Productivity Dashboard
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm" onClick={() => handleSeed(false)} disabled={seeding}>
            + Add Dummy Data
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => handleSeed(true)} disabled={seeding}>
            ↺ Refresh Data
          </button>
          <button className="btn btn-sm btn-primary" onClick={load} disabled={loading}>
            ⟳ Reload
          </button>
        </div>
      </nav>

      <main className="main">
        {/* ── Seed message ── */}
        {seedMsg && (
          <div className="error-banner" style={{ background: 'rgba(34,197,94,.1)', borderColor: 'rgba(34,197,94,.3)', color: '#22c55e' }}>
            {seedMsg}
          </div>
        )}

        {/* ── Error ── */}
        {error && <div className="error-banner">{error}</div>}

        {/* ── Date filters ── */}
        <div className="filter-row" style={{ marginBottom: 20 }}>
          <span className="filter-label">Date range:</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="filter-label">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {(from || to) && (
            <button className="btn btn-sm" onClick={() => { setFrom(''); setTo(''); }}>
              Clear
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          {(['overview', 'workers', 'workstations'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Loading ── */}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Top Workers by Units</span>
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
                      <span className="card-title">Top Workstations by Throughput</span>
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
                    onClose={() => setSelectedStation(null)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
