import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import eventRoutes from './routes/events';
import metricsRoutes from './routes/metrics';
import seedRoutes from './routes/seed';
import workerRoutes from './routes/workers';
import workstationRoutes from './routes/workstations';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://utsavc317:qwertyuiop@cluster0.edwt3ld.mongodb.net/worker_productivity';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/workstations', workstationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
