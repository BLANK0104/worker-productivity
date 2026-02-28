import { Router, Request, Response } from 'express';
import { Event } from '../models/Event';
import { buildDedupKey } from '../services/seedService';

const router = Router();

/**
 * POST /api/events
 * Ingest one or many AI-generated CCTV events.
 * Body: single event object OR array of event objects.
 *
 * Duplicate events (same timestamp + worker + station + type) are silently
 * ignored — the dedup_key unique index guarantees idempotency.
 *
 * Out-of-order events are accepted; metrics computation always re-sorts by
 * timestamp so ordering at ingest time doesn't matter.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    if (payload.length === 0) {
      return res.status(400).json({ error: 'Empty payload' });
    }

    const docs = payload.map((ev) => {
      const ts = new Date(ev.timestamp);
      if (isNaN(ts.getTime())) throw new Error(`Invalid timestamp: ${ev.timestamp}`);
      return {
        timestamp: ts,
        worker_id: ev.worker_id,
        workstation_id: ev.workstation_id,
        event_type: ev.event_type,
        confidence: ev.confidence ?? 1.0,
        count: ev.count ?? 0,
        dedup_key: buildDedupKey(ts, ev.worker_id, ev.workstation_id, ev.event_type),
      };
    });

    let inserted = 0;
    let skipped = 0;

    try {
      const result = await Event.insertMany(docs, { ordered: false });
      inserted = result.length;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'insertedDocs' in err) {
        const bulkErr = err as { insertedDocs: unknown[]; writeErrors?: unknown[] };
        inserted = bulkErr.insertedDocs.length;
        skipped = docs.length - inserted;
      } else {
        throw err;
      }
    }

    return res.status(201).json({ inserted, skipped, total: docs.length });
  } catch (err) {
    console.error('Event ingest error:', err);
    return res.status(500).json({ error: 'Failed to ingest events', detail: String(err) });
  }
});

/**
 * GET /api/events
 * Retrieve stored events with optional filters.
 * Query params: worker_id, workstation_id, from, to, limit (default 500)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { worker_id, workstation_id, from, to, limit = '500' } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};

    if (worker_id)      query.worker_id      = worker_id;
    if (workstation_id) query.workstation_id  = workstation_id;
    if (from || to) {
      query.timestamp = {};
      if (from) (query.timestamp as Record<string, unknown>).$gte = new Date(from);
      if (to)   (query.timestamp as Record<string, unknown>).$lte = new Date(to);
    }

    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    return res.json({ count: events.length, events });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch events', detail: String(err) });
  }
});

export default router;
