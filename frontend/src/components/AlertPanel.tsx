import { useState, useEffect } from 'react';
import { getAlerts } from '../api';
import type { AlertEvent, DateRange } from '../api';

interface Props {
  range?: DateRange;
}

const THRESHOLDS = [0.9, 0.75, 0.5];

export default function AlertPanel({ range }: Props) {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [threshold, setThreshold] = useState(0.75);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAlerts(threshold, range)
      .then((r) => { setAlerts(r.alerts); setCount(r.count); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [threshold, range]);

  const fmt = (ts: string) =>
    new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Low-Confidence Alerts
          {count > 0 && (
            <span className="badge badge-red" style={{ marginLeft: 4 }}>{count}</span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="filter-label">Threshold:</span>
          <select value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} style={{ padding: '4px 8px', fontSize: 12 }}>
            {THRESHOLDS.map((t) => (
              <option key={t} value={t}>&lt; {(t * 100).toFixed(0)}%</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state" style={{ padding: '24px 0' }}>
          <div className="spinner" /> Loading…
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--green)' }}>All clear</div>
            <div>No alerts below {(threshold * 100).toFixed(0)}% confidence</div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, padding: '8px 12px', background: 'var(--yellow-dim)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 'var(--radius-sm)' }}>
            Showing top {alerts.length} of <strong style={{ color: 'var(--yellow)' }}>{count}</strong> events below{' '}
            <strong>{(threshold * 100).toFixed(0)}%</strong> confidence.
            {count > 20 && ' Consider model retraining.'}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Worker</th>
                  <th>Station</th>
                  <th>Type</th>
                  <th>Confidence</th>
                  <th>Model</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a._id} style={{ cursor: 'default' }}>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 11 }}>{fmt(a.timestamp)}</td>
                    <td><span className="badge badge-blue">{a.worker_id}</span></td>
                    <td><span style={{ color: 'var(--purple)' }}>{a.workstation_id}</span></td>
                    <td style={{ color: 'var(--subtle)' }}>{a.event_type}</td>
                    <td>
                      <span style={{
                        color: a.confidence < 0.5 ? 'var(--red)' : 'var(--yellow)',
                        fontWeight: 700,
                        fontSize: 13,
                      }}>
                        {(a.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 10, fontFamily: 'monospace' }}>{a.model_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
