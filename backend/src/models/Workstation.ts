import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkstation extends Document {
  station_id: string;
  name: string;
  type: string;
  location: string;
  capacity: number;
  createdAt: Date;
}

const WorkstationSchema = new Schema<IWorkstation>(
  {
    station_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    location: { type: String, default: 'Floor A' },
    capacity: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Workstation = mongoose.model<IWorkstation>('Workstation', WorkstationSchema);
