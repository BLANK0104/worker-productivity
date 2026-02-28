import type { Workstation, WorkstationMetrics } from '../types';
import { fmtDuration, r1, utilColour } from '../utils';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  station: Workstation;
  metrics: WorkstationMetrics | null;
  onClose: () => void;
}

export default function WorkstationDetail({ station, metrics, onClose }: Props) {
  return (
    <div className="card" style={{ position: 'sticky', top: 80, height: 'fit-content' }}>
      <div className="card-header">
        <span className="card-title">Station Detail</span>
        <button className="btn btn-sm" onClick={onClose}>✕ Close</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{station.name}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {station.station_id} · {station.type} · {station.location}
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
                  background={{ fill: '#2e3348' }}
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
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>OCCUPANCY vs ACTIVE</div>
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
        </>
      )}
    </div>
  );
}
