import { Router, Request, Response } from 'express';
import { Event } from '../models/Event';
import { MetricsCache } from '../models/MetricsCache';
import { computeWorkerMetrics } from '../services/metricsService';

const router = Router();

const parseDateRange = (from?: string, to?: string) => ({
  fromDate: from ? new Date(from) : undefined,
  toDate:   to   ? new Date(to)   : undefined,
});

// ─── 1. Time-series: daily units + utilization for one worker or station ──────
/**
 * GET /api/analytics/timeseries
 * ?entity_id=W1&entity_type=worker&from=...&to=...
 */
router.get('/timeseries', async (req: Request, res: Response) => {
  try {
    const { entity_id, entity_type, from, to } = req.query as Record<string, string>;
    if (!entity_id || !entity_type) {
      return res.status(400).json({ error: 'entity_id and entity_type are required' });
    }

    const { fromDate, toDate } = parseDateRange(from, to);

    // First try the metrics cache (fast path)
    const cacheQuery: Record<string, unknown> = { entity_type, entity_id };
    if (fromDate) cacheQuery.date = { $gte: fromDate.toISOString().slice(0, 10) };
    if (toDate) {
      cacheQuery.date = {
        ...(cacheQuery.date as object ?? {}),
        $lte: toDate.toISOString().slice(0, 10),
      };
    }

    const cached = await MetricsCache.find(cacheQuery).sort({ date: 1 }).lean();

    if (cached.length > 0) {
      const points = cached.map((c) => ({
        date: c.date,
        units: c.units,
        active_hours: parseFloat((c.active_seconds / 3600).toFixed(2)),
        utilization_pct: c.utilization_pct,
      }));
      return res.json(points);
    }

    // Slow path — aggregate from raw events grouped by day
    const matchStage: Record<string, unknown> = {};
    if (entity_type === 'worker')  matchStage.worker_id      = entity_id;
    if (entity_type === 'station') matchStage.workstation_id = entity_id;
    if (fromDate || toDate) {
      matchStage.timestamp = {};
      if (fromDate) (matchStage.timestamp as Record<string, unknown>).$gte = fromDate;
      if (toDate)   (matchStage.timestamp as Record<string, unknown>).$lte = toDate;
    }

    // Group product_count by day for unit totals
    const unitAgg = await Event.aggregate([
      { $match: { ...matchStage, event_type: 'product_count' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          units: { $sum: '$count' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const unitsByDay: Record<string, number> = {};
    for (const u of unitAgg) unitsByDay[u._id as string] = u.units;

    // Get unique days from all events for x-axis
    const dayAgg = await Event.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const days = dayAgg.map((d) => d._id as string);

    // Per-day metrics by re-running computeWorkerMetrics with day boundaries
    const points = await Promise.all(
      days.map(async (day) => {
        const dayStart = new Date(`${day}T00:00:00.000Z`);
        const dayEnd   = new Date(`${day}T23:59:59.999Z`);

        let utilization_pct = 0;
        let active_hours    = 0;

        if (entity_type === 'worker') {
          const m = await computeWorkerMetrics(entity_id, dayStart, dayEnd);
          if (m[0]) {
            utilization_pct = m[0].utilization_pct;
            active_hours    = parseFloat((m[0].active_time_seconds / 3600).toFixed(2));
          }
        }

        return {
          date: day,
          units: unitsByDay[day] ?? 0,
          active_hours,
          utilization_pct,
        };
      })
    );

    return res.json(points);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute time series', detail: String(err) });
  }
});

// ─── 2. Low-confidence alerts ─────────────────────────────────────────────────
/**
 * GET /api/analytics/alerts
 * ?threshold=0.75&from=...&to=...
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { threshold = '0.75', from, to } = req.query as Record<string, string>;
    const { fromDate, toDate } = parseDateRange(from, to);

    const thresh = parseFloat(threshold);
    const query: Record<string, unknown> = { confidence: { $lt: thresh } };
    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) (query.timestamp as Record<string, unknown>).$gte = fromDate;
      if (toDate)   (query.timestamp as Record<string, unknown>).$lte = toDate;
    }

    const alerts = await Event.find(query)
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    return res.json({ count: alerts.length, alerts, threshold: thresh });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch alerts', detail: String(err) });
  }
});

// ─── 3. Shift comparison: today vs 7-day average for a worker ─────────────────
/**
 * GET /api/analytics/shift-comparison/:worker_id
 */
router.get('/shift-comparison/:worker_id', async (req: Request, res: Response) => {
  try {
    const { worker_id } = req.params;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [todayArr, weekArr] = await Promise.all([
      computeWorkerMetrics(worker_id, todayStart, todayEnd),
      computeWorkerMetrics(worker_id, weekStart, todayEnd),
    ]);

    const today       = todayArr[0] ?? null;
    const weekMetrics = weekArr[0];

    // Build daily metrics for the past 7 days to compute per-day averages
    const dailyResults = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1));
        const s = new Date(d); s.setHours(0, 0, 0, 0);
        const e = new Date(d); e.setHours(23, 59, 59, 999);
        return computeWorkerMetrics(worker_id, s, e);
      })
    );

    const days = dailyResults.map((r) => r[0]).filter(Boolean);

    const avg = (fn: (m: NonNullable<(typeof days)[0]>) => number) =>
      days.length > 0
        ? parseFloat((days.reduce((s, d) => s + fn(d!), 0) / days.length).toFixed(2))
        : 0;

    // Build a synthetic "7-day average" metrics object
    const seven_day_avg = weekMetrics
      ? {
          ...weekMetrics,
          active_time_seconds: Math.round(avg((m) => m.active_time_seconds)),
          idle_time_seconds:   Math.round(avg((m) => m.idle_time_seconds)),
          utilization_pct:     avg((m) => m.utilization_pct),
          total_units_produced: Math.round(avg((m) => m.total_units_produced)),
          units_per_hour:      avg((m) => m.units_per_hour),
        }
      : null;

    return res.json({ worker_id, today, seven_day_avg });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute shift comparison', detail: String(err) });
  }
});

// ─── 4. Model version breakdown ───────────────────────────────────────────────
/**
 * GET /api/analytics/model-versions
 */
router.get('/model-versions', async (_req: Request, res: Response) => {
  try {
    const agg = await Event.aggregate([
      {
        $group: {
          _id: '$model_version',
          count: { $sum: 1 },
          avg_confidence: { $avg: '$confidence' },
          first_seen: { $min: '$timestamp' },
          last_seen:  { $max: '$timestamp' },
        },
      },
      { $sort: { last_seen: -1 } },
    ]);

    return res.json(agg.map((v) => ({
      version:        v._id,
      event_count:    v.count,
      avg_confidence: parseFloat((v.avg_confidence as number).toFixed(4)),
      first_seen:     v.first_seen,
      last_seen:      v.last_seen,
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch model versions', detail: String(err) });
  }
});

export default router;
