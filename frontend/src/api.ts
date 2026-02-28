import axios from 'axios';
import type {
  Worker,
  Workstation,
  WorkerMetrics,
  WorkstationMetrics,
  FactoryMetrics,
  CVEvent,
} from './types';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface DateRange { from?: string; to?: string }

export interface SeedResult {
  message: string;
  inserted: number;
  skipped: number;
}

export interface IngestResult {
  inserted: number;
  skipped: number;
  total: number;
}

export interface EventsResult {
  count: number;
  events: RawEvent[];
}

export interface RawEvent {
  _id: string;
  timestamp: string;
  worker_id: string;
  workstation_id: string;
  event_type: 'working' | 'idle' | 'absent' | 'product_count';
  confidence: number;
  count: number;
  model_version: string;
}

export interface TimeSeriesPoint {
  date: string;
  units: number;
  active_hours: number;
  utilization_pct: number;
}

export interface AlertEvent {
  _id: string;
  timestamp: string;
  worker_id: string;
  workstation_id: string;
  event_type: string;
  confidence: number;
  model_version: string;
}

export interface AlertsResult {
  count: number;
  alerts: AlertEvent[];
  threshold: number;
}

export interface HealthResult {
  status: string;
  timestamp: string;
  mongo: { status: string; latency_ms: number };
  uptime_seconds: number;
  events_count: number;
}

export interface ShiftComparison {
  worker_id: string;
  today: WorkerMetrics | null;
  seven_day_avg: WorkerMetrics | null;
}

export interface ModelVersion {
  version: string;
  event_count: number;
  avg_confidence: number;
  first_seen: string;
  last_seen: string;
}

// ─── Workers ──────────────────────────────────────────────────────────────────
export const getWorkers = (): Promise<Worker[]> =>
  api.get('/workers').then((r) => r.data);

export const getWorker = (id: string): Promise<Worker> =>
  api.get(`/workers/${id}`).then((r) => r.data);

// ─── Workstations ─────────────────────────────────────────────────────────────
export const getWorkstations = (): Promise<Workstation[]> =>
  api.get('/workstations').then((r) => r.data);

// ─── Metrics ──────────────────────────────────────────────────────────────────
export const getWorkerMetrics = (
  worker_id?: string,
  range?: DateRange
): Promise<WorkerMetrics[]> =>
  api.get('/metrics/workers', { params: { worker_id, ...range } }).then((r) => r.data);

export const getWorkstationMetrics = (
  station_id?: string,
  range?: DateRange
): Promise<WorkstationMetrics[]> =>
  api.get('/metrics/workstations', { params: { station_id, ...range } }).then((r) => r.data);

export const getFactoryMetrics = (range?: DateRange): Promise<FactoryMetrics> =>
  api.get('/metrics/factory', { params: range }).then((r) => r.data);

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getTimeSeries = (
  entity_id: string,
  entity_type: 'worker' | 'station',
  range?: DateRange
): Promise<TimeSeriesPoint[]> =>
  api.get('/analytics/timeseries', { params: { entity_id, entity_type, ...range } }).then((r) => r.data);

export const getAlerts = (threshold = 0.75, range?: DateRange): Promise<AlertsResult> =>
  api.get('/analytics/alerts', { params: { threshold, ...range } }).then((r) => r.data);

export const getShiftComparison = (worker_id: string): Promise<ShiftComparison> =>
  api.get(`/analytics/shift-comparison/${worker_id}`).then((r) => r.data);

export const getModelVersions = (): Promise<ModelVersion[]> =>
  api.get('/analytics/model-versions').then((r) => r.data);

// ─── Events ───────────────────────────────────────────────────────────────────
export const getEvents = (
  params: Partial<{ worker_id: string; workstation_id: string; from: string; to: string; limit: number }>
): Promise<EventsResult> =>
  api.get('/events', { params }).then((r) => r.data);

export const ingestEvents = (events: CVEvent | CVEvent[]): Promise<IngestResult> =>
  api.post('/events', events).then((r) => r.data);

// ─── Seed ─────────────────────────────────────────────────────────────────────
export const seedData = (days = 7): Promise<SeedResult> =>
  api.post('/seed', { days }).then((r) => r.data);

export const refreshData = (days = 7): Promise<SeedResult> =>
  api.post('/seed/refresh', { days }).then((r) => r.data);

// ─── Health ───────────────────────────────────────────────────────────────────
export const getHealth = (): Promise<HealthResult> =>
  api.get('/health').then((r) => r.data);

// ─── SSE (Server-Sent Events) stream ─────────────────────────────────────────
export function subscribeToUpdates(
  onUpdate: (data: { type: string; payload: unknown }) => void
): () => void {
  const es = new EventSource('/api/events/stream');
  es.onmessage = (e) => {
    try { onUpdate(JSON.parse(e.data)); } catch { /* ignore */ }
  };
  return () => es.close();
}
