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

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6'];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const SortIcon = ({ active, dir }: { active: boolean; dir: 1 | -1 }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
    style={{ opacity: active ? 1 : 0.3, color: active ? 'var(--accent-hover)' : 'inherit', marginLeft: 3 }}>
    {dir === -1 ? <polyline points="6 9 12 15 18 9"/> : <polyline points="18 15 12 9 6 15"/>}
  </svg>
);

export default function WorkerTable({ workers, metrics, selected, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('utilization_pct');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [search, setSearch] = useState('');

  const workerMap = Object.fromEntries(workers.map((w) => [w.worker_id, w]));

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  };

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
        <span className="card-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Workers ({metrics.length})
        </span>
        <div className="search-wrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search workersâ€¦"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 180 }}
          />
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th className={`sortable ${sortKey === 'active_time_seconds' ? 'sort-active' : ''}`} onClick={() => toggle('active_time_seconds')}>
                Active <SortIcon active={sortKey === 'active_time_seconds'} dir={sortDir} />
              </th>
              <th>Idle</th>
              <th className={`sortable ${sortKey === 'utilization_pct' ? 'sort-active' : ''}`} onClick={() => toggle('utilization_pct')}>
                Utilization <SortIcon active={sortKey === 'utilization_pct'} dir={sortDir} />
              </th>
              <th className={`sortable ${sortKey === 'total_units_produced' ? 'sort-active' : ''}`} onClick={() => toggle('total_units_produced')}>
                Units <SortIcon active={sortKey === 'total_units_produced'} dir={sortDir} />
              </th>
              <th className={`sortable ${sortKey === 'units_per_hour' ? 'sort-active' : ''}`} onClick={() => toggle('units_per_hour')}>
                U/hr <SortIcon active={sortKey === 'units_per_hour'} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr style={{ cursor: 'default' }}>
                <td colSpan={6}>
                  <div className="empty-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                    No worker data. Click "Add Data" to seed.
                  </div>
                </td>
              </tr>
            )}
            {sorted.map((m) => {
              const w = workerMap[m.worker_id];
              const color = getAvatarColor(m.worker_id);
              return (
                <tr
                  key={m.worker_id}
                  className={selected === m.worker_id ? 'selected' : ''}
                  onClick={() => onSelect(selected === m.worker_id ? null : m.worker_id)}
                >
                  <td>
                    <div className="cell-with-avatar">
                      <div className="avatar" style={{ background: color + '22', color }}>
                        {getInitials(w?.name ?? m.worker_id)}
                      </div>
                      <div className="cell-name">
                        <span className="cell-name-primary">{w?.name ?? m.worker_id}</span>
                        <span className="cell-name-secondary">{m.worker_id} Â· {w?.department}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--green)' }}>{fmtDuration(m.active_time_seconds)}</td>
                  <td style={{ color: 'var(--yellow)' }}>{fmtDuration(m.idle_time_seconds)}</td>
                  <td>
                    <div className="progress-wrap">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(m.utilization_pct, 100)}%`,
                            background: m.utilization_pct >= 75 ? 'var(--green)' : m.utilization_pct >= 50 ? 'var(--yellow)' : 'var(--red)',
                          }}
                        />
                      </div>
                      <span className={`badge ${utilBadge(m.utilization_pct)}`}>
                        {r1(m.utilization_pct)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{m.total_units_produced.toLocaleString()}</td>
                  <td style={{ color: 'var(--subtle)' }}>{r1(m.units_per_hour)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
