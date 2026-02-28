import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import eventRoutes from './routes/events';
import metricsRoutes from './routes/metrics';
import seedRoutes from './routes/seed';
import workerRoutes from './routes/workers';
import workstationRoutes from './routes/workstations';
import analyticsRoutes from './routes/analytics';
import { Event } from './models/Event';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://utsavc317:qwertyuiop@cluster0.edwt3ld.mongodb.net/worker_productivity';
const SERVER_START = Date.now();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/workstations', workstationRoutes);
app.use('/api/analytics', analyticsRoutes);

/**
 * Enhanced health check — includes MongoDB ping latency, uptime, event count.
 * Useful for container orchestrators and monitoring dashboards.
 */
app.get('/api/health', async (_req, res) => {
  const start = Date.now();
  let mongoStatus = 'ok';
  let mongoLatency = 0;
  let eventsCount = 0;

  try {
    await mongoose.connection.db!.admin().ping();
    mongoLatency = Date.now() - start;
    eventsCount  = await Event.estimatedDocumentCount();
  } catch {
    mongoStatus = 'error';
  }

  res.json({
    status: mongoStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    mongo: { status: mongoStatus, latency_ms: mongoLatency },
    uptime_seconds: Math.round((Date.now() - SERVER_START) / 1000),
    events_count: eventsCount,
  });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

export default app;
