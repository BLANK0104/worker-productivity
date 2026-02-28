// ─── Domain types (mirrors backend) ──────────────────────────────────────────

export interface Worker {
  worker_id: string;
  name: string;
  department: string;
  shift: string;
}

export interface Workstation {
  station_id: string;
  name: string;
  type: string;
  location: string;
  capacity: number;
}

export interface WorkerMetrics {
  worker_id: string;
  active_time_seconds: number;
  idle_time_seconds: number;
  absent_time_seconds: number;
  utilization_pct: number;
  total_units_produced: number;
  units_per_hour: number;
  shift_duration_seconds: number;
}

export interface WorkstationMetrics {
  station_id: string;
  occupancy_seconds: number;
  utilization_pct: number;
  total_units_produced: number;
  throughput_rate: number;
}

export interface FactoryMetrics {
  total_productive_seconds: number;
  total_units_produced: number;
  avg_production_rate: number;
  avg_worker_utilization: number;
  total_workers_active: number;
  total_events: number;
}

export interface CVEvent {
  timestamp: string;
  worker_id: string;
  workstation_id: string;
  event_type: 'working' | 'idle' | 'absent' | 'product_count';
  confidence: number;
  count?: number;
}
