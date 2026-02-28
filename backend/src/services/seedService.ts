import crypto from 'crypto';
import { Worker } from '../models/Worker';
import { Workstation } from '../models/Workstation';
import { Event, EventType } from '../models/Event';

// ─── Static metadata ──────────────────────────────────────────────────────────

export const WORKERS = [
  { worker_id: 'W1', name: 'Alice Johnson',  department: 'Assembly',          shift: 'Morning' },
  { worker_id: 'W2', name: 'Bob Smith',      department: 'Welding',           shift: 'Morning' },
  { worker_id: 'W3', name: 'Carol Davis',    department: 'Quality Control',   shift: 'Morning' },
  { worker_id: 'W4', name: 'David Wilson',   department: 'Packaging',         shift: 'Morning' },
  { worker_id: 'W5', name: 'Emma Brown',     department: 'Assembly',          shift: 'Morning' },
  { worker_id: 'W6', name: 'Frank Miller',   department: 'Material Handling', shift: 'Morning' },
];

export const WORKSTATIONS = [
  { station_id: 'S1', name: 'Assembly Line A',     type: 'Assembly',          location: 'Floor A', capacity: 1 },
  { station_id: 'S2', name: 'Assembly Line B',     type: 'Assembly',          location: 'Floor A', capacity: 1 },
  { station_id: 'S3', name: 'Welding Station',     type: 'Welding',           location: 'Floor B', capacity: 1 },
  { station_id: 'S4', name: 'Quality Control',     type: 'Quality Control',   location: 'Floor C', capacity: 1 },
  { station_id: 'S5', name: 'Packaging Station',   type: 'Packaging',         location: 'Floor D', capacity: 1 },
  { station_id: 'S6', name: 'Material Handling',   type: 'Material Handling', location: 'Floor E', capacity: 1 },
];

// ─── Dedup key helper ─────────────────────────────────────────────────────────

export function buildDedupKey(
  timestamp: Date,
  worker_id: string,
  workstation_id: string,
  event_type: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${timestamp.toISOString()}|${worker_id}|${workstation_id}|${event_type}`)
    .digest('hex');
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

type RawEvent = {
  timestamp: Date;
  worker_id: string;
  workstation_id: string;
  event_type: EventType;
  confidence: number;
  count: number;
  model_version: string;
};

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

/**
 * Generate a realistic 8-hour shift for one worker at one station.
 * Pattern: [arrive → working bursts → breaks → working → leave]
 */
function generateShift(
  date: Date,
  worker_id: string,
  workstation_id: string,
  shiftStartHour = 8
): RawEvent[] {
  const events: RawEvent[] = [];
  let cursor = new Date(date);
  cursor.setHours(shiftStartHour, 0, 0, 0);

  // How productive this worker is today (random variance)
  const productivity = 0.65 + Math.random() * 0.30; // 65–95%

  // Simulate model version: most events on recent version, some on older
  const MODEL_VERSIONS = ['cv-activity-v1.0.0', 'cv-activity-v1.1.0', 'cv-activity-v2.0.0'];
  const modelVersion = MODEL_VERSIONS[Math.floor(Math.random() * MODEL_VERSIONS.length)];

  const push = (
    offsetMins: number,
    event_type: EventType,
    confidence = 0.9 + Math.random() * 0.09,
    count = 0
  ) => {
    const ts = addMinutes(cursor, offsetMins);
    events.push({
      timestamp: ts,
      worker_id,
      workstation_id,
      event_type,
      confidence: parseFloat(confidence.toFixed(3)),
      count,
      model_version: modelVersion,
    });
  };

  // Arrival
  let t = 0;
  push(t, 'working');

  // 8-hour shift split into segments
  const segments = [
    { duration: 90, type: 'working' },   // 90 min working
    { duration: 15, type: 'idle' },      // 15 min idle (small break)
    { duration: 75, type: 'working' },   // 75 min working
    { duration: 30, type: 'absent' },    // 30 min lunch
    { duration: 80, type: 'working' },   // 80 min working
    { duration: 10, type: 'idle' },      // 10 min idle
    { duration: 80, type: 'working' },   // 80 min working
    { duration: 10, type: 'idle' },      // 10 min idle
    { duration: 80, type: 'working' },   // final burst
  ];

  let unitBatch = 0;
  for (const seg of segments) {
    t += seg.duration;
    const etype = seg.type as EventType;
    push(t, etype);

    // Drop product_count events during working segments
    if (seg.type === 'working') {
      // Units produced proportional to productivity and duration
      const units = Math.round((seg.duration / 60) * productivity * (8 + Math.random() * 6));
      unitBatch += units;
      // Scatter 2–4 product_count events within the segment
      const numEvents = 2 + Math.floor(Math.random() * 3);
      const unitsPerEvent = Math.ceil(units / numEvents);
      for (let i = 1; i <= numEvents; i++) {
        const offsetWithin = Math.floor((seg.duration / (numEvents + 1)) * i);
        const prevSegEnd = t - seg.duration;
        push(prevSegEnd + offsetWithin, 'product_count', 0.99, unitsPerEvent);
      }
    }
  }

  // Sort to ensure ascending timestamps (product_count events may interleave)
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return events;
}

// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDatabase(days = 7): Promise<{ inserted: number; skipped: number }> {
  // Upsert workers and workstations
  await Promise.all([
    ...WORKERS.map((w) =>
      Worker.findOneAndUpdate({ worker_id: w.worker_id }, w, { upsert: true, new: true })
    ),
    ...WORKSTATIONS.map((s) =>
      Workstation.findOneAndUpdate({ station_id: s.station_id }, s, { upsert: true, new: true })
    ),
  ]);

  // Generate events for the last `days` days
  const today = new Date();
  const rawEvents: RawEvent[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);

    // Pair each worker with their primary station (W1→S1, W2→S2, …)
    for (let i = 0; i < WORKERS.length; i++) {
      const worker_id = WORKERS[i].worker_id;
      const workstation_id = WORKSTATIONS[i].station_id;
      const shiftEvents = generateShift(date, worker_id, workstation_id, 8);
      rawEvents.push(...shiftEvents);
    }
  }

  // Build documents with dedup keys; skip duplicates using ordered:false bulk write
   type EventDoc = {
    timestamp: Date;
    worker_id: string;
    workstation_id: string;
    event_type: EventType;
    confidence: number;
    count: number;
    model_version: string;
    dedup_key: string;
  };

  const docs: EventDoc[] = rawEvents.map((ev) => ({
    ...ev,
    dedup_key: buildDedupKey(ev.timestamp, ev.worker_id, ev.workstation_id, ev.event_type),
  }));

  let inserted = 0;
  let skipped = 0;

  // Insert in batches of 500 to avoid hitting BSON limit
  const BATCH = 500;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    try {
      const res = await Event.insertMany(batch, { ordered: false });
      inserted += res.length;
    } catch (err: unknown) {
      // BulkWriteError — some docs were duplicates (E11000)
      if (err && typeof err === 'object' && 'insertedDocs' in err) {
        const bulkErr = err as { insertedDocs: unknown[] };
        inserted += bulkErr.insertedDocs.length;
        skipped += batch.length - bulkErr.insertedDocs.length;
      } else {
        // Partial insert — count what we can
        skipped += batch.length;
      }
    }
  }

  return { inserted, skipped };
}

/**
 * Drop all events (not workers/stations) and re-seed from scratch.
 * Useful for "refresh dummy data" endpoint.
 */
export async function refreshDatabase(days = 7): Promise<{ inserted: number; skipped: number }> {
  await Event.deleteMany({});
  return seedDatabase(days);
}
