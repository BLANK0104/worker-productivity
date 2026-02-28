import type { FactoryMetrics } from '../types';
import { fmtDuration, fmtNum, r1 } from '../utils';

interface Props {
  metrics: FactoryMetrics;
}

const CARDS = (metrics: FactoryMetrics) => [
  {
    label: 'Total Productive Time',
    value: fmtDuration(metrics.total_productive_seconds),
    sub: `${r1(metrics.total_productive_seconds / 3600)}h across all workers`,
    accent: '#3b82f6',
    dim: 'rgba(59,130,246,0.14)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    label: 'Total Units Produced',
    value: fmtNum(metrics.total_units_produced),
    sub: `Avg rate: ${r1(metrics.avg_production_rate)} u/hr`,
    accent: '#10b981',
    dim: 'rgba(16,185,129,0.14)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
  },
  {
    label: 'Avg Worker Utilization',
    value: `${r1(metrics.avg_worker_utilization)}%`,
    sub: `${metrics.total_workers_active} workers tracked`,
    accent: metrics.avg_worker_utilization >= 75 ? '#10b981' : metrics.avg_worker_utilization >= 50 ? '#f59e0b' : '#ef4444',
    dim: metrics.avg_worker_utilization >= 75 ? 'rgba(16,185,129,0.14)' : metrics.avg_worker_utilization >= 50 ? 'rgba(245,158,11,0.14)' : 'rgba(239,68,68,0.14)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Avg Production Rate',
    value: r1(metrics.avg_production_rate),
    sub: 'units per hour per worker',
    accent: '#8b5cf6',
    dim: 'rgba(139,92,246,0.14)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    label: 'Total Events Ingested',
    value: fmtNum(metrics.total_events),
    sub: 'CCTV events in database',
    accent: '#f59e0b',
    dim: 'rgba(245,158,11,0.14)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
];

export default function FactorySummary({ metrics }: Props) {
  const cards = CARDS(metrics);
  return (
    <div>
      <div className="section-header">
        <span className="section-title">Factory Overview</span>
      </div>
      <div className="stat-grid">
        {cards.map((c) => (
          <div
            className="stat-card"
            key={c.label}
            style={{ '--stat-accent': c.accent, '--stat-accent-dim': c.dim } as React.CSSProperties}
          >
            <div className="stat-icon" style={{ background: c.dim, color: c.accent }}>
              {c.icon}
            </div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
