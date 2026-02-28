import axios from 'axios';
import type {
  Worker,
  Workstation,
  WorkerMetrics,
  WorkstationMetrics,
  FactoryMetrics,
  CVEvent,
} from './types';

const BASE = '/api';

const api = axios.create({ baseURL: BASE });

// ─── Workers ──────────────────────────────────────────────────────────────────
export const getWorkers = (): Promise<Worker[]> =>
  api.get('/workers').then((r) => r.data);

// ─── Workstations ─────────────────────────────────────────────────────────────
export const getWorkstations = (): Promise<Workstation[]> =>
  api.get('/workstations').then((r) => r.data);

// ─── Metrics ──────────────────────────────────────────────────────────────────
interface DateRange { from?: string; to?: string }

export const getWorkerMetrics = (
  worker_id?: string,
  range?: DateRange
): Promise<WorkerMetrics[]> =>
  api
    .get('/metrics/workers', { params: { worker_id, ...range } })
    .then((r) => r.data);

export const getWorkstationMetrics = (
  station_id?: string,
  range?: DateRange
): Promise<WorkstationMetrics[]> =>
  api
    .get('/metrics/workstations', { params: { station_id, ...range } })
    .then((r) => r.data);

export const getFactoryMetrics = (range?: DateRange): Promise<FactoryMetrics> =>
  api.get('/metrics/factory', { params: range }).then((r) => r.data);

// ─── Events ───────────────────────────────────────────────────────────────────
export const ingestEvents = (events: CVEvent | CVEvent[]) =>
  api.post('/events', events).then((r) => r.data);

// ─── Seed ─────────────────────────────────────────────────────────────────────
export const seedData = (days = 7) =>
  api.post('/seed', { days }).then((r) => r.data);

export const refreshData = (days = 7) =>
  api.post('/seed/refresh', { days }).then((r) => r.data);

export const checkHealth = () =>
  api.get('/health').then((r) => r.data);
