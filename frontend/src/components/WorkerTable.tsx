import { useState } from 'react';
import type { Worker, WorkerMetrics } from '../types';
import { fmtDuration, utilBadge, r1 } from '../utils';

interface Props {
  workers: Worker[];
  metrics: WorkerMetrics[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

type SortKey = 'worker_id' | 'active_time_seconds' | 'utilization_pct' | 'total_units_produced' | 'units_per_hour';

export default function WorkerTable({ workers, metrics, selected, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('utilization_pct');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [search, setSearch] = useState('');

  const workerMap = Object.fromEntries(workers.map((w) => [w.worker_id, w]));

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  };

  const arrow = (key: SortKey) => sortKey === key ? (sortDir === -1 ? ' ↓' : ' ↑') : '';

  const filtered = metrics.filter((m) => {
    const w = workerMap[m.worker_id];
    const q = search.toLowerCase();
    return !q || (w?.name ?? '').toLowerCase().includes(q) || m.worker_id.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (av < bv) return -sortDir;
    if (av > bv) return  sortDir;
    return 0;
  });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Workers ({metrics.length})</span>
        <input
          type="text"
          placeholder="Search worker…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 160 }}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('active_time_seconds')}>Active Time{arrow('active_time_seconds')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('idle_time_seconds' as SortKey)}>Idle Time</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('utilization_pct')}>Utilization{arrow('utilization_pct')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('total_units_produced')}>Units{arrow('total_units_produced')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('units_per_hour')}>U/hr{arrow('units_per_hour')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--muted)', textAlign: 'center', padding: '32px' }}>
                  No data. Click "+ Add Dummy Data" to seed.
                </td>
              </tr>
            )}
            {sorted.map((m) => {
              const w = workerMap[m.worker_id];
              return (
                <tr
                  key={m.worker_id}
                  className={selected === m.worker_id ? 'selected' : ''}
                  onClick={() => onSelect(selected === m.worker_id ? null : m.worker_id)}
                >
                  <td>
                    <div style={{ fontWeight: 600 }}>{w?.name ?? m.worker_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.worker_id} · {w?.department}</div>
                  </td>
                  <td>{fmtDuration(m.active_time_seconds)}</td>
                  <td>{fmtDuration(m.idle_time_seconds)}</td>
                  <td>
                    <div className="progress-wrap">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(m.utilization_pct, 100)}%`,
                            background:
                              m.utilization_pct >= 75 ? '#22c55e' :
                              m.utilization_pct >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className={`badge ${utilBadge(m.utilization_pct)}`}>
                        {r1(m.utilization_pct)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.total_units_produced.toLocaleString()}</td>
                  <td>{r1(m.units_per_hour)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
