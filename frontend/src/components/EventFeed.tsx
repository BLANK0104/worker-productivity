import { useState, useEffect, useCallback, useRef } from 'react';
import { getEvents, subscribeToUpdates } from '../api';
import type { RawEvent } from '../api';

interface Props {
  worker_id?: string;
  workstation_id?: string;
  /** Auto-refresh via SSE when true */
  live?: boolean;
}

const EVENT_COLOURS: Record<string, string> = {
  working:       '#22c55e',
  idle:          '#f59e0b',
  absent:        '#ef4444',
  product_count: '#4f8ef7',
};

export default function EventFeed({ worker_id, workstation_id, live }: Props) {
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    getEvents({ worker_id, workstation_id, limit: 50 })
      .then((r) => setEvents(r.events))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [worker_id, workstation_id]);

  useEffect(() => { load(); }, [load]);

  // SSE: reload list when new events arrive
  useEffect(() => {
    if (!live) return;
    const unsub = subscribeToUpdates((msg) => {
      if (msg.type === 'events:ingested') load();
    });
    return unsub;
  }, [live, load]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  const fmt = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          Live Event Feed
          {live && (
            <span className="badge badge-green" style={{ marginLeft: 8, fontSize: 10 }}>
              ● LIVE
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-scroll
          </label>
          <button className="btn btn-sm" onClick={load}>↺</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state" style={{ padding: '16px 0' }}>
          <div className="spinner" /> Loading…
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace' }}>
          {events.length === 0 && (
            <div style={{ color: 'var(--muted)', padding: '16px 0', textAlign: 'center' }}>
              No events yet.
            </div>
          )}
          {events.map((ev) => (
            <div
              key={ev._id}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 28px 36px 1fr 1fr 60px',
                gap: 8,
                padding: '4px 0',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--muted)' }}>{fmt(ev.timestamp)}</span>
              <span style={{ color: '#4f8ef7', fontWeight: 600 }}>{ev.worker_id}</span>
              <span style={{ color: '#a78bfa' }}>{ev.workstation_id}</span>
              <span style={{ color: EVENT_COLOURS[ev.event_type] ?? 'var(--text)' }}>
                {ev.event_type}
                {ev.event_type === 'product_count' && ev.count > 0 && (
                  <span style={{ color: 'var(--muted)', marginLeft: 4 }}>×{ev.count}</span>
                )}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 10 }}>{ev.model_version}</span>
              <span style={{
                color: ev.confidence < 0.75 ? '#ef4444' : 'var(--muted)',
                fontWeight: ev.confidence < 0.75 ? 700 : 400,
              }}>
                {(ev.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
