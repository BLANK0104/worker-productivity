import { Event, IEvent } from '../models/Event';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkerMetrics {
  worker_id: string;
  active_time_seconds: number;    // total "working" duration in seconds
  idle_time_seconds: number;      // total "idle" duration in seconds
  absent_time_seconds: number;    // total "absent" duration in seconds
  utilization_pct: number;        // active / (active + idle) × 100
  total_units_produced: number;   // sum of count from product_count events
  units_per_hour: number;         // units / (active_time / 3600)
  shift_duration_seconds: number; // first event → last event span
}

export interface WorkstationMetrics {
  station_id: string;
  occupancy_seconds: number;      // total time a worker was present (working/idle)
  utilization_pct: number;        // working_time / occupancy × 100
  total_units_produced: number;
  throughput_rate: number;        // units per hour across the station
}

export interface FactoryMetrics {
  total_productive_seconds: number;
  total_units_produced: number;
  avg_production_rate: number;    // units per hour, averaged over workers
  avg_worker_utilization: number; // average of individual worker utilization %
  total_workers_active: number;
  total_events: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a sorted list of events for one entity (worker or station), compute
 * durations per event type.
 *
 * Assumption:
 *   Each event is a STATE transition. The duration attributed to event[i] is:
 *     timestamp[i+1] - timestamp[i]
 *   The final event in the list contributes no duration (open-ended; we do not
 *   guess when the shift ended so we stay conservative).
 *
 *   product_count events do NOT contribute time — they are point-in-time unit
 *   counters and their `count` field is summed separately.
 */
function computeDurationsFromEvents(events: IEvent[]): {
  working_secs: number;
  idle_secs: number;
  absent_secs: number;
  total_units: number;
} {
  let working_secs = 0;
  let idle_secs = 0;
  let absent_secs = 0;
  let total_units = 0;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    // Accumulate product counts
    if (ev.event_type === 'product_count') {
      total_units += ev.count ?? 0;
    }

    // Duration is only defined when there is a next event
    if (i < events.length - 1) {
      const next = events[i + 1];
      const diffMs = new Date(next.timestamp).getTime() - new Date(ev.timestamp).getTime();
      // Ignore negative or zero gaps (can happen with out-of-order inserts that
      // slipped past the dedup key — shouldn't happen in practice)
      if (diffMs <= 0) continue;
      const diffSecs = diffMs / 1000;

      if (ev.event_type === 'working') working_secs += diffSecs;
      else if (ev.event_type === 'idle')    idle_secs  += diffSecs;
      else if (ev.event_type === 'absent')  absent_secs += diffSecs;
      // product_count events do not represent a state, so ignore their span
    }
  }

  return { working_secs, idle_secs, absent_secs, total_units };
}

// ─── Worker metrics ───────────────────────────────────────────────────────────

export async function computeWorkerMetrics(
  worker_id?: string,
  fromDate?: Date,
  toDate?: Date
): Promise<WorkerMetrics[]> {
  const query: Record<string, unknown> = {};
  if (worker_id) query.worker_id = worker_id;
  if (fromDate || toDate) {
    query.timestamp = {};
    if (fromDate) (query.timestamp as Record<string, unknown>).$gte = fromDate;
    if (toDate)   (query.timestamp as Record<string, unknown>).$lte = toDate;
  }

  // Fetch all relevant events sorted by worker then time
  const events = await Event.find(query).sort({ worker_id: 1, timestamp: 1 }).lean();

  // Group by worker_id
  const byWorker: Record<string, IEvent[]> = {};
  for (const ev of events) {
    if (!byWorker[ev.worker_id]) byWorker[ev.worker_id] = [];
    byWorker[ev.worker_id].push(ev as unknown as IEvent);
  }

  const results: WorkerMetrics[] = [];

  for (const [wid, wEvents] of Object.entries(byWorker)) {
    // Ensure ascending timestamp order (handles any out-of-order inserts)
    wEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const { working_secs, idle_secs, absent_secs, total_units } =
      computeDurationsFromEvents(wEvents);

    const shift_secs =
      wEvents.length > 1
        ? (new Date(wEvents[wEvents.length - 1].timestamp).getTime() -
            new Date(wEvents[0].timestamp).getTime()) /
          1000
        : 0;

    const occupied_secs = working_secs + idle_secs;
    const utilization_pct =
      occupied_secs > 0 ? (working_secs / occupied_secs) * 100 : 0;

    const active_hours = working_secs / 3600;
    const units_per_hour = active_hours > 0 ? total_units / active_hours : 0;

    results.push({
      worker_id: wid,
      active_time_seconds: Math.round(working_secs),
      idle_time_seconds: Math.round(idle_secs),
      absent_time_seconds: Math.round(absent_secs),
      utilization_pct: parseFloat(utilization_pct.toFixed(2)),
      total_units_produced: total_units,
      units_per_hour: parseFloat(units_per_hour.toFixed(2)),
      shift_duration_seconds: Math.round(shift_secs),
    });
  }

  return results;
}

// ─── Workstation metrics ──────────────────────────────────────────────────────

export async function computeWorkstationMetrics(
  station_id?: string,
  fromDate?: Date,
  toDate?: Date
): Promise<WorkstationMetrics[]> {
  const query: Record<string, unknown> = {};
  if (station_id) query.workstation_id = station_id;
  if (fromDate || toDate) {
    query.timestamp = {};
    if (fromDate) (query.timestamp as Record<string, unknown>).$gte = fromDate;
    if (toDate)   (query.timestamp as Record<string, unknown>).$lte = toDate;
  }

  const events = await Event.find(query)
    .sort({ workstation_id: 1, timestamp: 1 })
    .lean();

  // Group by station
  const byStation: Record<string, IEvent[]> = {};
  for (const ev of events) {
    if (!byStation[ev.workstation_id]) byStation[ev.workstation_id] = [];
    byStation[ev.workstation_id].push(ev as unknown as IEvent);
  }

  const results: WorkstationMetrics[] = [];

  for (const [sid, sEvents] of Object.entries(byStation)) {
    sEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const { working_secs, idle_secs, total_units } = computeDurationsFromEvents(sEvents);

    const occupancy_seconds = working_secs + idle_secs;
    const utilization_pct =
      occupancy_seconds > 0 ? (working_secs / occupancy_seconds) * 100 : 0;

    const occupancy_hours = occupancy_seconds / 3600;
    const throughput_rate = occupancy_hours > 0 ? total_units / occupancy_hours : 0;

    results.push({
      station_id: sid,
      occupancy_seconds: Math.round(occupancy_seconds),
      utilization_pct: parseFloat(utilization_pct.toFixed(2)),
      total_units_produced: total_units,
      throughput_rate: parseFloat(throughput_rate.toFixed(2)),
    });
  }

  return results;
}

// ─── Factory metrics ──────────────────────────────────────────────────────────

export async function computeFactoryMetrics(
  fromDate?: Date,
  toDate?: Date
): Promise<FactoryMetrics> {
  const [workerMetrics, totalEventCount] = await Promise.all([
    computeWorkerMetrics(undefined, fromDate, toDate),
    Event.countDocuments(),
  ]);

  const total_productive_seconds = workerMetrics.reduce(
    (sum, w) => sum + w.active_time_seconds,
    0
  );
  const total_units_produced = workerMetrics.reduce(
    (sum, w) => sum + w.total_units_produced,
    0
  );

  const activeWorkers = workerMetrics.filter(
    (w) => w.shift_duration_seconds > 0
  );

  const avg_production_rate =
    activeWorkers.length > 0
      ? activeWorkers.reduce((sum, w) => sum + w.units_per_hour, 0) /
        activeWorkers.length
      : 0;

  const avg_worker_utilization =
    activeWorkers.length > 0
      ? activeWorkers.reduce((sum, w) => sum + w.utilization_pct, 0) /
        activeWorkers.length
      : 0;

  return {
    total_productive_seconds,
    total_units_produced,
    avg_production_rate: parseFloat(avg_production_rate.toFixed(2)),
    avg_worker_utilization: parseFloat(avg_worker_utilization.toFixed(2)),
    total_workers_active: activeWorkers.length,
    total_events: totalEventCount,
  };
}
