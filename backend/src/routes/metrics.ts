import { Router, Request, Response } from 'express';
import {
  computeWorkerMetrics,
  computeWorkstationMetrics,
  computeFactoryMetrics,
} from '../services/metricsService';

const router = Router();

const parseDateRange = (from?: string, to?: string) => ({
  fromDate: from ? new Date(from) : undefined,
  toDate:   to   ? new Date(to)   : undefined,
});

/**
 * GET /api/metrics/workers
 * Optional: ?worker_id=W1&from=2026-01-01&to=2026-01-31
 */
router.get('/workers', async (req: Request, res: Response) => {
  try {
    const { worker_id, from, to } = req.query as Record<string, string>;
    const { fromDate, toDate } = parseDateRange(from, to);
    const metrics = await computeWorkerMetrics(worker_id, fromDate, toDate);
    return res.json(metrics);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute worker metrics', detail: String(err) });
  }
});

/**
 * GET /api/metrics/workstations
 * Optional: ?station_id=S1&from=2026-01-01&to=2026-01-31
 */
router.get('/workstations', async (req: Request, res: Response) => {
  try {
    const { station_id, from, to } = req.query as Record<string, string>;
    const { fromDate, toDate } = parseDateRange(from, to);
    const metrics = await computeWorkstationMetrics(station_id, fromDate, toDate);
    return res.json(metrics);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute workstation metrics', detail: String(err) });
  }
});

/**
 * GET /api/metrics/factory
 * Optional: ?from=2026-01-01&to=2026-01-31
 */
router.get('/factory', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const { fromDate, toDate } = parseDateRange(from, to);
    const metrics = await computeFactoryMetrics(fromDate, toDate);
    return res.json(metrics);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute factory metrics', detail: String(err) });
  }
});

export default router;
