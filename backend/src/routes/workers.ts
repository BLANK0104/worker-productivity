import { Router, Request, Response } from 'express';
import { Worker } from '../models/Worker';

const router = Router();

/** GET /api/workers */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const workers = await Worker.find().sort({ worker_id: 1 }).lean();
    return res.json(workers);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch workers', detail: String(err) });
  }
});

/** GET /api/workers/:worker_id */
router.get('/:worker_id', async (req: Request, res: Response) => {
  try {
    const worker = await Worker.findOne({ worker_id: req.params.worker_id }).lean();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    return res.json(worker);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch worker', detail: String(err) });
  }
});

export default router;
