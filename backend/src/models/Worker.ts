import mongoose, { Document, Schema } from 'mongoose';

export interface IWorker extends Document {
  worker_id: string;
  name: string;
  department: string;
  shift: string;
  createdAt: Date;
}

const WorkerSchema = new Schema<IWorker>(
  {
    worker_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: { type: String, default: 'Production' },
    shift: { type: String, default: 'Morning' },
  },
  { timestamps: true }
);

export const Worker = mongoose.model<IWorker>('Worker', WorkerSchema);
