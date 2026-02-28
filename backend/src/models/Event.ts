import mongoose, { Document, Schema } from 'mongoose';

export type EventType = 'working' | 'idle' | 'absent' | 'product_count';

export interface IEvent extends Document {
  timestamp: Date;
  worker_id: string;
  workstation_id: string;
  event_type: EventType;
  confidence: number;
  count: number;
  dedup_key: string;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    timestamp: { type: Date, required: true },
    worker_id: { type: String, required: true },
    workstation_id: { type: String, required: true },
    event_type: {
      type: String,
      required: true,
      enum: ['working', 'idle', 'absent', 'product_count'],
    },
    confidence: { type: Number, default: 1.0, min: 0, max: 1 },
    count: { type: Number, default: 0 },
    // dedup_key is a hash of (timestamp + worker_id + workstation_id + event_type)
    dedup_key: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

// Compound index for efficient querying
EventSchema.index({ worker_id: 1, timestamp: 1 });
EventSchema.index({ workstation_id: 1, timestamp: 1 });
EventSchema.index({ timestamp: 1 });
EventSchema.index({ event_type: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
