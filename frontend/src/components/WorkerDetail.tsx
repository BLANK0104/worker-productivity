import type { Worker, WorkerMetrics } from '../types';
import { fmtDuration, r1, utilColour } from '../utils';
import type { DateRange } from '../api';
import {
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import TimeSeriesChart from './TimeSeriesChart';
import ShiftComparison from './ShiftComparison';

interface Props {
  worker: Worker;
  metrics: WorkerMetrics | null;
  range?: DateRange;
  onClose: () => void;
}

export default function WorkerDetail({ worker, metrics, range, onClose }: Props) {
  const timeData = metrics
    ? [
        { name: 'Active', value: metrics.active_time_seconds, color: '#22c55e' },
        { name: 'Idle',   value: metrics.idle_time_seconds,   color: '#f59e0b' },
        { name: 'Absent', value: metrics.absent_time_seconds, color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="card" style={{ position: 'sticky', top: 80, height: 'fit-content', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <div className="card-header">
        <span className="card-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Worker Detail
        </span>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(59,130,246,0.15)', color: 'var(--accent-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, flexShrink: 0,
        }}>
          {worker.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{worker.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {worker.worker_id} &nbsp;·&nbsp; {worker.department} &nbsp;·&nbsp; {worker.shift} Shift
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
                innerRadius="60%"
                outerRadius="100%"
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
              <span className="detail-label">Active Time</span>
              <span className="detail-value" style={{ color: '#22c55e' }}>{fmtDuration(metrics.active_time_seconds)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Idle Time</span>
              <span className="detail-value" style={{ color: '#f59e0b' }}>{fmtDuration(metrics.idle_time_seconds)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Absent Time</span>
              <span className="detail-value" style={{ color: '#ef4444' }}>{fmtDuration(metrics.absent_time_seconds)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Units Produced</span>
              <span className="detail-value">{metrics.total_units_produced.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Units / Hour</span>
              <span className="detail-value">{r1(metrics.units_per_hour)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Shift Duration</span>
              <span className="detail-value">{fmtDuration(metrics.shift_duration_seconds)}</span>
            </div>
          </div>

          {/* Time breakdown pie */}
          {timeData.length > 0 && (
            <>
              <div className="sep" />
              <div className="mini-title">Time Breakdown</div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={timeData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {timeData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [fmtDuration(v), '']}
                      contentStyle={{ background: '#131a26', border: '1px solid #243355', borderRadius: 8, color: '#f0f4ff', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                {timeData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    {d.name}: {fmtDuration(d.value)}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Daily trend chart */}
          <div className="sep" />
          <div className="mini-title">Daily Trend</div>
          <TimeSeriesChart
            entity_id={worker.worker_id}
            entity_type="worker"
            entity_name={worker.name}
            range={range}
          />

          {/* Shift comparison */}
          <div className="sep" />
          <div className="mini-title">Today vs 7-Day Avg</div>
          <ShiftComparison worker_id={worker.worker_id} worker_name={worker.name} />
        </>
      )}
    </div>
  );
}
