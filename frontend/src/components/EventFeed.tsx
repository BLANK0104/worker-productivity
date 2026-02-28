import { useState, useEffect, useCallback, useRef } from 'react';
import { getEvents, subscribeToUpdates } from '../api';
import type { RawEvent } from '../api';

interface Props {
  worker_id?: string;
  workstation_id?: string;
  /** Auto-refresh via SSE when true */
  live?: boolean;
}

const EVENT_STYLES: Record<string, { color: string; bg: string }> = {
  working:       { color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  idle:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  absent:        { color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  product_count: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
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

  useEffect(() => {
    if (!live) return;
    const unsub = subscribeToUpdates((msg) => {
      if (msg.type === 'events:ingested') load();
    });
    return unsub;
  }, [live, load]);

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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Live Event Feed
          {live && (
            <span className="badge badge-green" style={{ fontSize: 10 }}>
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              LIVE
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            Auto-scroll
          </label>
          <button className="btn btn-sm btn-ghost" onClick={load}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.17"/>
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state" style={{ padding: '24px 0' }}>
          <div className="spinner" /> Loading…
        </div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: 'auto', fontFamily: 'monospace' }}>
          {events.length === 0 && (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              No events yet.
            </div>
          )}
          {events.map((ev) => {
            const style = EVENT_STYLES[ev.event_type] ?? { color: 'var(--subtle)', bg: 'transparent' };
            return (
              <div key={ev._id} className="event-row">
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{fmt(ev.timestamp)}</span>
                <span style={{ color: 'var(--accent-hover)', fontWeight: 600, fontSize: 11 }}>{ev.worker_id}</span>
                <span style={{ color: 'var(--purple)', fontSize: 11 }}>{ev.workstation_id}</span>
                <span>
                  <span style={{
                    background: style.bg,
                    color: style.color,
                    padding: '1px 7px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {ev.event_type}
                    {ev.event_type === 'product_count' && ev.count > 0 && (
                      <span style={{ color: 'var(--muted)', marginLeft: 4 }}>×{ev.count}</span>
                    )}
                  </span>
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.model_version}</span>
                <span style={{
                  color: ev.confidence < 0.75 ? 'var(--red)' : 'var(--muted)',
                  fontWeight: ev.confidence < 0.75 ? 700 : 400,
                  fontSize: 11,
                }}>
                  {(ev.confidence * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
