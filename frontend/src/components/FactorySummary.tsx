import type { FactoryMetrics } from '../types';
import { fmtDuration, fmtNum, r1 } from '../utils';

interface Props {
  metrics: FactoryMetrics;
}

export default function FactorySummary({ metrics }: Props) {
  const cards = [
    {
      label: 'Total Productive Time',
      value: fmtDuration(metrics.total_productive_seconds),
      sub: `${r1(metrics.total_productive_seconds / 3600)}h across all workers`,
      color: '#4f8ef7',
    },
    {
      label: 'Total Units Produced',
      value: fmtNum(metrics.total_units_produced),
      sub: `Avg rate: ${r1(metrics.avg_production_rate)} u/hr`,
      color: '#22c55e',
    },
    {
      label: 'Avg Worker Utilization',
      value: `${r1(metrics.avg_worker_utilization)}%`,
      sub: `${metrics.total_workers_active} workers tracked`,
      color: metrics.avg_worker_utilization >= 75 ? '#22c55e' : metrics.avg_worker_utilization >= 50 ? '#f59e0b' : '#ef4444',
    },
    {
      label: 'Avg Production Rate',
      value: `${r1(metrics.avg_production_rate)}`,
      sub: 'units per hour per worker',
      color: '#a78bfa',
    },
    {
      label: 'Total Events Ingested',
      value: fmtNum(metrics.total_events),
      sub: 'CCTV events in database',
      color: '#f59e0b',
    },
  ];

  return (
    <div>
      <div className="section-header">
        <span className="section-title">Factory Overview</span>
      </div>
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
