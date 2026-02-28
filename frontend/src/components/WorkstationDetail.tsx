import type { Workstation, WorkstationMetrics } from '../types';
import { fmtDuration, r1, utilColour } from '../utils';
import type { DateRange } from '../api';
import TimeSeriesChart from './TimeSeriesChart';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  station: Workstation;
  metrics: WorkstationMetrics | null;
  range?: DateRange;
  onClose: () => void;
}

export default function WorkstationDetail({ station, metrics, range, onClose }: Props) {
  return (
    <div className="card" style={{ position: 'sticky', top: 80, height: 'fit-content', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
          </svg>
          Station Detail
        </span>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          background: 'var(--accent-dim)', color: 'var(--accent-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>🏭</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{station.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {station.station_id} &nbsp;·&nbsp; {station.type} &nbsp;·&nbsp; {station.location}
          </div>
        </div>
      </div>

      {!metrics ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>No metrics for selected period.</div>
      ) : (
        <>
          {/* Utilization radial */}
          <div style={{ height: 140 }}>
            <ResponsiveContainer>
              <RadialBarChart
                cx="50%" cy="100%"
                innerRadius="60%" outerRadius="100%"
                startAngle={180} endAngle={0}
                data={[{ value: metrics.utilization_pct }]}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={4}
                  fill={utilColour(metrics.utilization_pct)}
                  background={{ fill: '#192034' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 16, marginTop: -10 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: utilColour(metrics.utilization_pct) }}>
              {r1(metrics.utilization_pct)}%
            </span>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Utilization</div>
          </div>

          {/* Key stats */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Occupancy Time</span>
              <span className="detail-value" style={{ color: '#4f8ef7' }}>{fmtDuration(metrics.occupancy_seconds)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Units Produced</span>
              <span className="detail-value">{metrics.total_units_produced.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Throughput Rate</span>
              <span className="detail-value">{r1(metrics.throughput_rate)} <span style={{ fontSize: 12, color: 'var(--muted)' }}>u/hr</span></span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Capacity</span>
              <span className="detail-value">{station.capacity}</span>
            </div>
          </div>

          <div className="sep" />

          {/* Occupancy vs active visual */}
          <div className="mini-title">Occupancy vs Active</div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Active (working)</span>
              <span>{r1(metrics.utilization_pct)}%</span>
            </div>
            <div className="progress-bar" style={{ height: 10, marginBottom: 12 }}>
              <div className="progress-fill" style={{
                width: `${metrics.utilization_pct}%`,
                background: utilColour(metrics.utilization_pct),
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Total occupancy</span>
              <span>{fmtDuration(metrics.occupancy_seconds)}</span>
            </div>
            <div className="progress-bar" style={{ height: 10 }}>
              <div className="progress-fill" style={{ width: '100%', background: '#4f8ef7' }} />
            </div>
          </div>

          {/* Daily trend chart */}
          <div className="sep" />
          <div className="mini-title">Daily Trend</div>
          <TimeSeriesChart
            entity_id={station.station_id}
            entity_type="station"
            entity_name={station.name}
            range={range}
          />
        </>
      )}
    </div>
  );
}
