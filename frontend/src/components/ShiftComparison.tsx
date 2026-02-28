import { useState, useEffect } from 'react';
import { getShiftComparison } from '../api';
import type { ShiftComparison as ShiftComparisonData } from '../api';
import { fmtDuration, r1 } from '../utils';

interface Props {
  worker_id: string;
  worker_name: string;
}

function Delta({ now, avg, higherIsBetter = true }: { now: number; avg: number; higherIsBetter?: boolean }) {
  if (avg === 0) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>;
  const pct = ((now - avg) / avg) * 100;
  const positive = higherIsBetter ? pct >= 0 : pct <= 0;
  return (
    <span style={{ fontSize: 11, color: positive ? '#22c55e' : '#ef4444', marginLeft: 6 }}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function ShiftComparison({ worker_id, worker_name }: Props) {
  const [data, setData] = useState<ShiftComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getShiftComparison(worker_id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [worker_id]);

  if (loading) {
    return (
      <div className="loading-state" style={{ padding: '12px 0' }}>
        <div className="spinner" /> Loading comparison…
      </div>
    );
  }

  if (!data || (!data.today && !data.seven_day_avg)) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
        No comparison data available.
      </div>
    );
  }

  const rows: { label: string; today: string; avg: string; todayNum: number; avgNum: number; higherIsBetter?: boolean }[] = [
    {
      label: 'Active Time',
      today:    fmtDuration(data.today?.active_time_seconds ?? 0),
      avg:      fmtDuration(data.seven_day_avg?.active_time_seconds ?? 0),
      todayNum: data.today?.active_time_seconds ?? 0,
      avgNum:   data.seven_day_avg?.active_time_seconds ?? 0,
    },
    {
      label: 'Utilization',
      today:    `${r1(data.today?.utilization_pct ?? 0)}%`,
      avg:      `${r1(data.seven_day_avg?.utilization_pct ?? 0)}%`,
      todayNum: data.today?.utilization_pct ?? 0,
      avgNum:   data.seven_day_avg?.utilization_pct ?? 0,
    },
    {
      label: 'Units Produced',
      today:    (data.today?.total_units_produced ?? 0).toLocaleString(),
      avg:      (data.seven_day_avg?.total_units_produced ?? 0).toLocaleString(),
      todayNum: data.today?.total_units_produced ?? 0,
      avgNum:   data.seven_day_avg?.total_units_produced ?? 0,
    },
    {
      label: 'Units / Hour',
      today:    r1(data.today?.units_per_hour ?? 0),
      avg:      r1(data.seven_day_avg?.units_per_hour ?? 0),
      todayNum: data.today?.units_per_hour ?? 0,
      avgNum:   data.seven_day_avg?.units_per_hour ?? 0,
    },
    {
      label: 'Idle Time',
      today:    fmtDuration(data.today?.idle_time_seconds ?? 0),
      avg:      fmtDuration(data.seven_day_avg?.idle_time_seconds ?? 0),
      todayNum: data.today?.idle_time_seconds ?? 0,
      avgNum:   data.seven_day_avg?.idle_time_seconds ?? 0,
      higherIsBetter: false,
    },
  ];

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
        <strong style={{ color: 'var(--text)' }}>{worker_name}</strong> — Today vs 7-day average
      </div>
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Today</th>
            <th>7-Day Avg</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={{ color: 'var(--muted)' }}>{r.label}</td>
              <td style={{ fontWeight: 600 }}>{r.today}</td>
              <td style={{ color: 'var(--muted)' }}>{r.avg}</td>
              <td>
                <Delta now={r.todayNum} avg={r.avgNum} higherIsBetter={r.higherIsBetter} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
