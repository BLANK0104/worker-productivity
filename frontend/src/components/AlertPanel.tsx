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
          Low-Confidence Alerts
          {count > 0 && (
            <span className="badge badge-red" style={{ marginLeft: 8 }}>
              {count}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="filter-label">Threshold:</span>
          <select value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))}>
            {THRESHOLDS.map((t) => (
              <option key={t} value={t}>&lt; {(t * 100).toFixed(0)}%</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state" style={{ padding: '12px 0' }}>
          <div className="spinner" /> Loading…
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0', textAlign: 'center' }}>
          ✓ No alerts below {(threshold * 100).toFixed(0)}% confidence
          {count === 0 && ' — model performing well.'}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            Showing top {alerts.length} of {count} events below{' '}
            <strong style={{ color: 'var(--yellow)' }}>{(threshold * 100).toFixed(0)}%</strong> confidence.
            {count > 20 && ' Consider model retraining.'}
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
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
                  <tr key={a._id}>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmt(a.timestamp)}</td>
                    <td style={{ color: '#4f8ef7', fontWeight: 600 }}>{a.worker_id}</td>
                    <td style={{ color: '#a78bfa' }}>{a.workstation_id}</td>
                    <td>{a.event_type}</td>
                    <td>
                      <span style={{
                        color: a.confidence < 0.5 ? '#ef4444' : '#f59e0b',
                        fontWeight: 700,
                      }}>
                        {(a.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{a.model_version}</td>
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
