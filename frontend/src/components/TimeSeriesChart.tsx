import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Area,
} from 'recharts';
import { getTimeSeries } from '../api';
import type { TimeSeriesPoint, DateRange } from '../api';

interface Props {
  entity_id: string;
  entity_type: 'worker' | 'station';
  entity_name: string;
  range?: DateRange;
}

export default function TimeSeriesChart({ entity_id, entity_type, entity_name, range }: Props) {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'units' | 'utilization'>('units');

  useEffect(() => {
    setLoading(true);
    getTimeSeries(entity_id, entity_type, range)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [entity_id, entity_type, range]);

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  if (loading) {
    return (
      <div className="loading-state" style={{ padding: '24px 0' }}>
        <div className="spinner" />
        Loading chart…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>
        No time-series data available.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{entity_name} — Daily Trend</span>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={`tab-btn ${mode === 'units' ? 'active' : ''}`} onClick={() => setMode('units')}>
            Units
          </button>
          <button className={`tab-btn ${mode === 'utilization' ? 'active' : ''}`} onClick={() => setMode('utilization')}>
            Utilization
          </button>
        </div>
      </div>

      {mode === 'units' ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => [v.toLocaleString(), 'Units']}
              labelFormatter={formatDate}
              contentStyle={{ background: '#1a1d27', border: '1px solid #2e3348', borderRadius: 8, color: '#e2e8f0' }}
            />
            <Bar dataKey="units" fill="#4f8ef7" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === 'utilization_pct' ? [`${v.toFixed(1)}%`, 'Utilization'] : [`${v.toFixed(1)}h`, 'Active Hrs']
              }
              labelFormatter={formatDate}
              contentStyle={{ background: '#1a1d27', border: '1px solid #2e3348', borderRadius: 8, color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="utilization_pct"
              fill="rgba(79,142,247,0.15)"
              stroke="#4f8ef7"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="active_hours"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
