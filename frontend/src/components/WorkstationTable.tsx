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

export default function WorkstationTable({ workstations, metrics, selected, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('utilization_pct');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [search, setSearch] = useState('');

  const stationMap = Object.fromEntries(workstations.map((s) => [s.station_id, s]));

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  };

  const arrow = (key: SortKey) => sortKey === key ? (sortDir === -1 ? ' ↓' : ' ↑') : '';

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
        <span className="card-title">Workstations ({metrics.length})</span>
        <input
          type="text"
          placeholder="Search station…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 160 }}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Station</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('occupancy_seconds')}>Occupancy{arrow('occupancy_seconds')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('utilization_pct')}>Utilization{arrow('utilization_pct')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('total_units_produced')}>Units{arrow('total_units_produced')}</th>
              <th style={{ cursor: 'pointer' }} onClick={() => toggle('throughput_rate')}>Throughput{arrow('throughput_rate')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: 'var(--muted)', textAlign: 'center', padding: '32px' }}>
                  No data. Click "+ Add Dummy Data" to seed.
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
                    <div style={{ fontWeight: 600 }}>{s?.name ?? m.station_id}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.station_id} · {s?.type} · {s?.location}</div>
                  </td>
                  <td>{fmtDuration(m.occupancy_seconds)}</td>
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
                  <td>{r1(m.throughput_rate)} u/hr</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
