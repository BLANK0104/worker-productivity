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
      <div className="loading-state" style={{ padding: '20px 0' }}>
        <div className="spinner" />
        Loading chart…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '12px 0' }}>
        No time-series data available.
      </div>
    );
  }

  const GRID   = '#1d2840';
  const TICK   = { fill: '#64748b', fontSize: 11 };
  const TT_STYLE = { background: '#131a26', border: '1px solid #243355', borderRadius: 8, color: '#f0f4ff', fontSize: 12 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{entity_name} — Daily Trend</span>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', padding: 3, borderRadius: 8 }}>
          <button
            style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              background: mode === 'units' ? 'var(--surface3)' : 'transparent',
              color: mode === 'units' ? 'var(--text)' : 'var(--muted)',
              boxShadow: mode === 'units' ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
            }}
            onClick={() => setMode('units')}
          >
            Units
          </button>
          <button
            style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              background: mode === 'utilization' ? 'var(--surface3)' : 'transparent',
              color: mode === 'utilization' ? 'var(--text)' : 'var(--muted)',
              boxShadow: mode === 'utilization' ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
            }}
            onClick={() => setMode('utilization')}
          >
            Utilization
          </button>
        </div>
      </div>

      {mode === 'units' ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number) => [v.toLocaleString(), 'Units']}
              labelFormatter={formatDate}
              contentStyle={TT_STYLE}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={TICK} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" domain={[0, 100]} tick={TICK} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === 'utilization_pct' ? [`${v.toFixed(1)}%`, 'Utilization'] : [`${v.toFixed(1)}h`, 'Active Hrs']
              }
              labelFormatter={formatDate}
              contentStyle={TT_STYLE}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="utilization_pct"
              fill="rgba(59,130,246,0.12)"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="active_hours"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
