import { Router, Request, Response } from 'express';
import { Workstation } from '../models/Workstation';

const router = Router();

/** GET /api/workstations */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const workstations = await Workstation.find().sort({ station_id: 1 }).lean();
    return res.json(workstations);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch workstations', detail: String(err) });
  }
});

/** GET /api/workstations/:station_id */
router.get('/:station_id', async (req: Request, res: Response) => {
  try {
    const station = await Workstation.findOne({ station_id: req.params.station_id }).lean();
    if (!station) return res.status(404).json({ error: 'Workstation not found' });
    return res.json(station);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch workstation', detail: String(err) });
  }
});

export default router;
