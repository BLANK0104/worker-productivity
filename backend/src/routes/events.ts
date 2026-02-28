import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { Event } from '../models/Event';
import { buildDedupKey } from '../services/seedService';

// ─── Rate limiter: max 200 event ingests per 15 s per IP ─────────────────────
const ingestLimiter = rateLimit({
  windowMs: 15_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});

// ─── Zod schema for a single event ───────────────────────────────────────────
const EventSchema = z.object({
  timestamp:        z.string().datetime({ offset: true }),
  worker_id:        z.string().min(1),
  workstation_id:   z.string().min(1),
  event_type:       z.enum(['working', 'idle', 'absent', 'product_count']),
  confidence:       z.number().min(0).max(1).default(1.0),
  count:            z.number().int().min(0).default(0),
  model_version:    z.string().default('cv-activity-v1.0.0'),
});

const BulkEventSchema = z.union([EventSchema, z.array(EventSchema)]);

// ─── SSE clients registry ─────────────────────────────────────────────────────
type SSEClient = {
  id: number;
  res: Response;
};
let sseClients: SSEClient[] = [];
let sseClientId = 0;

export function broadcastSSE(type: string, payload: unknown) {
  const msg = `data: ${JSON.stringify({ type, payload })}\n\n`;
  sseClients = sseClients.filter((c) => {
    try { c.res.write(msg); return true; }
    catch { return false; }
  });
}

const router = Router();

/**
 * POST /api/events
 * Ingest one or many AI-generated CCTV events.
 * - Validated with zod (returns 400 on schema errors)
 * - Rate limited to 200 req / 15 s per IP
 * - Duplicate events silently skipped via dedup_key unique index
 * - Broadcasts SSE 'events:ingested' to connected dashboard clients
 */
router.post('/', ingestLimiter, async (req: Request, res: Response) => {
  // ── Validate ──────────────────────────────────────────────────────────────
  const parsed = BulkEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const payload = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  if (payload.length === 0) return res.status(400).json({ error: 'Empty payload' });

  try {
    const docs = payload.map((ev) => {
      const ts = new Date(ev.timestamp);
      return {
        timestamp: ts,
        worker_id: ev.worker_id,
        workstation_id: ev.workstation_id,
        event_type: ev.event_type,
        confidence: ev.confidence,
        count: ev.count,
        model_version: ev.model_version,
        dedup_key: buildDedupKey(ts, ev.worker_id, ev.workstation_id, ev.event_type),
      };
    });

    let inserted = 0;
    let skipped  = 0;

    try {
      const result = await Event.insertMany(docs, { ordered: false });
      inserted = result.length;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'insertedDocs' in err) {
        const bulkErr = err as { insertedDocs: unknown[] };
        inserted = bulkErr.insertedDocs.length;
        skipped  = docs.length - inserted;
      } else {
        throw err;
      }
    }

    // Notify SSE clients
    broadcastSSE('events:ingested', { inserted, skipped, total: docs.length });

    return res.status(201).json({ inserted, skipped, total: docs.length });
  } catch (err) {
    console.error('Event ingest error:', err);
    return res.status(500).json({ error: 'Failed to ingest events', detail: String(err) });
  }
});

/**
 * GET /api/events/stream
 * Server-Sent Events stream — dashboard subscribes here to get pushed
 * notifications whenever new events are ingested.
 */
router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client: SSEClient = { id: ++sseClientId, res };
  sseClients.push(client);

  // heartbeat every 25 s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { /* client disconnected */ }
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c.id !== client.id);
  });
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
