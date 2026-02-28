import { useState } from 'react';
import type { Workstation, WorkstationMetrics } from '../types';
import { fmtDuration, utilBadge, r1 } from '../utils';

interface Props {
  workstations: Workstation[];
  metrics: WorkstationMetrics[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

type SortKey = 'station_id' | 'occupancy_seconds' | 'utilization_pct' | 'total_units_produced' | 'throughput_rate';

const TYPE_ICONS: Record<string, string> = {
  assembly:    '⚙',
  packaging:   '📦',
  inspection:  '🔍',
  welding:     '🔧',
  painting:    '🎨',
};

const SortIcon = ({ active, dir }: { active: boolean; dir: 1 | -1 }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
    style={{ opacity: active ? 1 : 0.3, color: active ? 'var(--accent-hover)' : 'inherit', marginLeft: 3 }}>
    {dir === -1 ? <polyline points="6 9 12 15 18 9"/> : <polyline points="18 15 12 9 6 15"/>}
  </svg>
);

export default function WorkstationTable({ workstations, metrics, selected, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('utilization_pct');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [search, setSearch] = useState('');

  const stationMap = Object.fromEntries(workstations.map((s) => [s.station_id, s]));

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  };

  const filtered = metrics.filter((m) => {
    const s = stationMap[m.station_id];
    const q = search.toLowerCase();
    return !q || (s?.name ?? '').toLowerCase().includes(q) || m.station_id.toLowerCase().includes(q);
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
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
          </svg>
          Workstations ({metrics.length})
        </span>
        <div className="search-wrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search stations…"
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
              <th>Station</th>
              <th className={`sortable ${sortKey === 'occupancy_seconds' ? 'sort-active' : ''}`} onClick={() => toggle('occupancy_seconds')}>
                Occupancy <SortIcon active={sortKey === 'occupancy_seconds'} dir={sortDir} />
              </th>
              <th className={`sortable ${sortKey === 'utilization_pct' ? 'sort-active' : ''}`} onClick={() => toggle('utilization_pct')}>
                Utilization <SortIcon active={sortKey === 'utilization_pct'} dir={sortDir} />
              </th>
              <th className={`sortable ${sortKey === 'total_units_produced' ? 'sort-active' : ''}`} onClick={() => toggle('total_units_produced')}>
                Units <SortIcon active={sortKey === 'total_units_produced'} dir={sortDir} />
              </th>
              <th className={`sortable ${sortKey === 'throughput_rate' ? 'sort-active' : ''}`} onClick={() => toggle('throughput_rate')}>
                Throughput <SortIcon active={sortKey === 'throughput_rate'} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr style={{ cursor: 'default' }}>
                <td colSpan={5}>
                  <div className="empty-state">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                    No station data. Click "Add Data" to seed.
                  </div>
                </td>
              </tr>
            )}
            {sorted.map((m) => {
              const s = stationMap[m.station_id];
              return (
                <tr
                  key={m.station_id}
                  className={selected === m.station_id ? 'selected' : ''}
                  onClick={() => onSelect(selected === m.station_id ? null : m.station_id)}
                >
                  <td>
                    <div className="cell-with-avatar">
                      <div className="avatar" style={{ background: 'var(--accent-dim)', color: 'var(--accent-hover)', borderRadius: 8, fontSize: 16 }}>
                        {TYPE_ICONS[s?.type ?? ''] ?? '🏭'}
                      </div>
                      <div className="cell-name">
                        <span className="cell-name-primary">{s?.name ?? m.station_id}</span>
                        <span className="cell-name-secondary">{m.station_id} · {s?.type} · {s?.location}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--accent-hover)' }}>{fmtDuration(m.occupancy_seconds)}</td>
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
                  <td style={{ color: 'var(--subtle)' }}>{r1(m.throughput_rate)} <span style={{ fontSize: 11, color: 'var(--muted)' }}>u/hr</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
