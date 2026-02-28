import mongoose, { Document, Schema } from 'mongoose';

/**
 * Pre-aggregated daily metric bucket.
 * Written by the cacheService, read by /api/metrics endpoints when available.
 * Falls back to live computation if cache is stale or missing.
 */
export interface IMetricsCache extends Document {
  date: string;          // "YYYY-MM-DD"
  entity_type: 'worker' | 'station' | 'factory';
  entity_id: string;     // worker_id / station_id / "factory"
  active_seconds: number;
  idle_seconds: number;
  absent_seconds: number;
  units: number;
  occupancy_seconds: number;
  utilization_pct: number;
  computed_at: Date;
}

const MetricsCacheSchema = new Schema<IMetricsCache>({
  date:            { type: String, required: true },
  entity_type:     { type: String, enum: ['worker', 'station', 'factory'], required: true },
  entity_id:       { type: String, required: true },
  active_seconds:  { type: Number, default: 0 },
  idle_seconds:    { type: Number, default: 0 },
  absent_seconds:  { type: Number, default: 0 },
  units:           { type: Number, default: 0 },
  occupancy_seconds: { type: Number, default: 0 },
  utilization_pct: { type: Number, default: 0 },
  computed_at:     { type: Date, default: Date.now },
});

// Unique per day + entity
MetricsCacheSchema.index({ date: 1, entity_type: 1, entity_id: 1 }, { unique: true });

// TTL: auto-delete buckets older than 90 days
MetricsCacheSchema.index({ computed_at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const MetricsCache = mongoose.model<IMetricsCache>('MetricsCache', MetricsCacheSchema);
