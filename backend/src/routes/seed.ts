import { Router, Request, Response } from 'express';
import { seedDatabase, refreshDatabase } from '../services/seedService';

const router = Router();

/**
 * POST /api/seed
 * Add dummy data without removing existing events.
 * Body: { days?: number }  (default 7)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.body?.days ?? '7', 10);
    const result = await seedDatabase(days);
    return res.status(201).json({ message: 'Seed complete', ...result });
  } catch (err) {
    return res.status(500).json({ error: 'Seed failed', detail: String(err) });
  }
});

/**
 * POST /api/seed/refresh
 * Drop all events and re-seed from scratch.
 * Body: { days?: number }  (default 7)
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.body?.days ?? '7', 10);
    const result = await refreshDatabase(days);
    return res.status(201).json({ message: 'Refresh complete', ...result });
  } catch (err) {
    return res.status(500).json({ error: 'Refresh failed', detail: String(err) });
  }
});

export default router;
