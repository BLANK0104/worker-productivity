# AI-Powered Worker Productivity Dashboard

A full-stack web application that ingests AI-generated CCTV events from a manufacturing factory, stores them in MongoDB, computes real-time productivity metrics, and displays them in a clean dashboard.

---

## Quick Start

### Option A — Docker Compose (recommended)

```bash
# Clone and enter the directory
cd "worker productivity"

# Build and start both services (backend on :5000, frontend on :3000)
docker compose up --build

# On first run, seed the database with 7 days of dummy data
curl -X POST http://localhost:5000/api/seed

# Open the dashboard
open http://localhost:3000
```

### Option B — Local Development

**Backend**
```bash
cd backend
npm install
# .env is already set; edit MONGO_URI if needed
npm run dev          # ts-node-dev hot reload on :5000
```

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev          # Vite dev server on :3000, proxies /api → :5000
```

**Seed Dummy Data**
```bash
# Add 7 days of dummy events (safe to run multiple times — duplicates skipped)
curl -X POST http://localhost:5000/api/seed

# Wipe all events and regenerate from scratch
curl -X POST http://localhost:5000/api/seed/refresh
```

---

## Architecture

### Edge → Backend → Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  FACTORY FLOOR                                                      │
│                                                                      │
│  [CCTV Camera]──CV Model──▶ Edge Agent (gateway / local broker)    │
│  [CCTV Camera]──CV Model──▶     │                                   │
│       ...                       │  POST /api/events  (JSON batch)   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   Express + Mongoose API    │
                    │   ─────────────────────── │
                    │   POST /events  (ingest)   │
                    │   GET  /metrics/*          │
                    │   GET  /workers            │
                    │   GET  /workstations       │
                    │   POST /seed               │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │       MongoDB Atlas         │
                    │   workers / workstations /  │
                    │   events collections        │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   React + Vite (nginx)      │
                    │   ─────────────────────── │
                    │   Factory summary cards     │
                    │   Worker & station tables   │
                    │   Detail panels + charts    │
                    └────────────────────────────┘
```

The **Edge Agent** is the thin bridge between cameras and the API. In this exercise its role is played by `POST /api/events` (or the seed service). In production it would be a lightweight process running on an on-premises gateway that:
- Buffers events locally when connectivity is lost
- Deduplicates before sending
- Batches events (e.g., every 5 seconds) to reduce request overhead

---

## Database Schema

### `workers`
| Field        | Type   | Description              |
|-------------|--------|--------------------------|
| `worker_id` | String | Unique ID (W1–W6)        |
| `name`      | String | Full name                |
| `department`| String | e.g., Assembly, Welding  |
| `shift`     | String | Morning / Evening        |

### `workstations`
| Field        | Type   | Description                    |
|-------------|--------|--------------------------------|
| `station_id`| String | Unique ID (S1–S6)              |
| `name`      | String | Display name                   |
| `type`      | String | Assembly, Welding, QC, etc.    |
| `location`  | String | Floor A/B/C/D/E                |
| `capacity`  | Number | Max workers at once            |

### `events`
| Field           | Type   | Description                                  |
|----------------|--------|----------------------------------------------|
| `timestamp`    | Date   | ISO 8601 timestamp from camera               |
| `worker_id`    | String | References `workers.worker_id`               |
| `workstation_id`| String| References `workstations.station_id`         |
| `event_type`   | Enum   | `working` / `idle` / `absent` / `product_count` |
| `confidence`   | Number | Model confidence [0–1]                       |
| `count`        | Number | Units produced (only for `product_count`)    |
| `dedup_key`    | String | **Unique** SHA-256 of timestamp+worker+station+type |

**Indexes:** `(worker_id, timestamp)`, `(workstation_id, timestamp)`, `timestamp`, `event_type`, unique on `dedup_key`.

---

## Metric Definitions

### Assumptions

> **State-transition model:** Each event marks the beginning of a new state. The duration of state Eᵢ is `timestamp[i+1] − timestamp[i]`. The final event in any session contributes no duration (its end time is unknown and not estimated).

> **product_count is point-in-time:** `product_count` events do not represent a state change; their `count` field is summed to get units produced, but no duration is attributed to them.

> **Utilisation basis:** Utilisation is computed over the *observed* period (active + idle). Absent time is excluded from the denominator because the worker was not at their station.

### Worker Metrics

| Metric                  | Definition                                      |
|------------------------|-------------------------------------------------|
| `active_time_seconds`  | Sum of durations where `event_type = 'working'` |
| `idle_time_seconds`    | Sum of durations where `event_type = 'idle'`    |
| `absent_time_seconds`  | Sum of durations where `event_type = 'absent'`  |
| `utilization_pct`      | `active / (active + idle) × 100`                |
| `total_units_produced` | Sum of `count` across all `product_count` events|
| `units_per_hour`       | `total_units / (active_time / 3600)`             |
| `shift_duration_seconds`| `last_event_ts − first_event_ts`               |

### Workstation Metrics

| Metric                  | Definition                                            |
|------------------------|-------------------------------------------------------|
| `occupancy_seconds`    | Sum of durations for `working` + `idle` events        |
| `utilization_pct`      | `working_duration / occupancy × 100`                  |
| `total_units_produced` | Sum of `count` for `product_count` events at station  |
| `throughput_rate`      | `total_units / (occupancy / 3600)` — units per hour   |

### Factory Metrics

| Metric                     | Definition                                      |
|---------------------------|-------------------------------------------------|
| `total_productive_seconds` | Sum of `active_time_seconds` across all workers |
| `total_units_produced`     | Sum of all `product_count` counts               |
| `avg_production_rate`      | Mean of `units_per_hour` across active workers  |
| `avg_worker_utilization`   | Mean of `utilization_pct` across active workers |

### Production Event Aggregation

`product_count` events are **independent** of time-based activity events. They are emitted by the CV model when it detects a completed product unit and carry a `count` field (≥1). They do not carry a duration and do not change the worker's activity state. When computing `units_per_hour`, we divide total units by the worker's *active* hours only (not total shift time), capturing productive throughput rather than a diluted average.

---

## API Reference

| Method | Path                       | Description                                        |
|--------|----------------------------|----------------------------------------------------|
| POST   | `/api/events`              | Ingest 1 or many events (body: object or array)    |
| GET    | `/api/events`              | Query events (`worker_id`, `workstation_id`, `from`, `to`, `limit`) |
| GET    | `/api/metrics/workers`     | Worker metrics (opt. `worker_id`, `from`, `to`)    |
| GET    | `/api/metrics/workstations`| Station metrics (opt. `station_id`, `from`, `to`)  |
| GET    | `/api/metrics/factory`     | Factory-wide metrics (opt. `from`, `to`)           |
| GET    | `/api/workers`             | List all workers                                   |
| GET    | `/api/workstations`        | List all workstations                              |
| POST   | `/api/seed`                | Add 7 days of dummy data (idempotent)              |
| POST   | `/api/seed/refresh`        | Wipe events and reseed                             |
| GET    | `/api/health`              | Health check                                       |

**Example event payload:**
```json
{
  "timestamp": "2026-01-15T10:15:00Z",
  "worker_id": "W1",
  "workstation_id": "S3",
  "event_type": "working",
  "confidence": 0.93,
  "count": 1
}
```

---

## Theoretical Questions

### 1. Handling Reliability Concerns

#### Intermittent Connectivity
The edge agent should implement a **store-and-forward** buffer:
1. Events are written to a local SQLite/RocksDB queue on the edge device first.
2. A background sender drains the queue to the backend when connectivity is available.
3. The queue is durable — events survive a gateway reboot.
4. The API endpoint accepts **arrays** of events so a reconnecting agent can flush a backlog in one request.

For a managed approach, use a message broker (e.g., Azure IoT Hub, AWS IoT Core) which handles buffering and at-least-once delivery natively.

#### Duplicate Events
Events are deduplicated via the `dedup_key` field: a SHA-256 hash of `(timestamp, worker_id, workstation_id, event_type)`. The MongoDB collection has a **unique index** on this field, so inserting a duplicate silently fails without an error response. The API returns `{ inserted, skipped }` counts so the caller can verify. This makes the ingest endpoint fully **idempotent**.

#### Out-of-Order Timestamps
Events are accepted regardless of order. The metrics service **re-sorts events by timestamp** before computing durations, so late-arriving events (e.g., flushed from an offline buffer) are incorporated correctly once they arrive. The only caveat is that metrics computed before the late event arrived will differ from metrics computed after — callers should treat metrics as eventually consistent and avoid caching them with long TTLs.

---

### 2. ML Model Versioning, Drift Detection, and Retraining

#### Model Versioning
- Add a `model_version` field to every event (e.g., `"model_version": "cv-activity-v2.1.0"`).
- Store versioned model metadata in a `model_registry` collection: version, deployed_at, architecture, training_dataset_id.
- The edge agent tags each event with the version of the running model at the time of inference.
- This allows per-version metric breakdowns and A/B comparison in the dashboard.

#### Detecting Model Drift
Monitor these signals continuously:
1. **Confidence score distribution** — if average confidence drops below a threshold (e.g., 0.75) over a rolling window, flag potential drift. Store confidence histograms by model_version in a time-series collection.
2. **Label distribution shift** — compare the ratio of `working:idle:absent` events over time. A sudden spike in `idle` or `absent` during known busy hours may indicate the model is misclassifying.
3. **Shadow comparison** — run a new candidate model in parallel (shadow mode) without acting on its output; compute a disagreement rate between models. A disagreement rate > 15% triggers a human review.
4. **Ground-truth labels** — periodically have supervisors label a random sample of frames. Compute precision/recall against model predictions; trigger a retraining alert if accuracy drops below acceptable thresholds.

#### Triggering Retraining
1. **Rule-based trigger**: if rolling 7-day average confidence < 0.80 OR accuracy on labelled sample < 0.85.
2. **Scheduled trigger**: retrain quarterly with accumulated production data regardless of drift signals.
3. **Pipeline**: new labelled data → staging environment → CI pipeline runs `model_eval.py` → if metrics pass → push new version to model registry → edge agents pull update on next heartbeat.
4. Store fine-tuning datasets tagged by `factory_id` and date to support factory-specific model variants.

---

### 3. Scaling: 5 Cameras → 100+ Cameras → Multi-Site

#### 5 Cameras (current)
Single backend process + MongoDB Atlas free tier. The current architecture handles this comfortably. Events are low-volume and metrics are computed on-demand.

#### 100+ Cameras at One Site
| Concern | Solution |
|---------|---------|
| Write throughput | Introduce a message queue (Redis Streams / Kafka) between edge agents and backend. Workers consume events asynchronously and batch-write to MongoDB. |
| Read latency | Pre-aggregate hourly buckets using MongoDB aggregation pipelines or a scheduled job writing to a `metrics_cache` collection. Serve the dashboard from cache. |
| DB load | Add read replicas; shard the `events` collection on `{ worker_id: 1, timestamp: 1 }`. |
| Edge bandwidth | Batch events on the camera gateway (send every 5s instead of per-event). |

#### Multi-Site (dozens of factories)
| Concern | Solution |
|---------|---------|
| Data isolation | Separate MongoDB database per site OR a `site_id` field on all documents plus multi-tenant API middleware that scopes queries. |
| Global dashboard | A read-optimised aggregation tier (ClickHouse / BigQuery) that ingests from all site Kafkas. |
| Edge autonomy | Each site runs its own edge broker (MQTT / Kafka) and a local backend API that functions offline. Data syncs to the central platform periodically. |
| Model distribution | Central model registry; edge agents poll for updates. Site-specific fine-tuned models are tagged with `site_id` in the registry. |
| Operational | Kubernetes per region for the backend tier, with a global API gateway (Kong / AWS API GW) routing by `X-Site-ID` header. |

---

## Project Structure

```
worker productivity/
├── backend/
│   ├── src/
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express route handlers
│   │   ├── services/        # metricsService, seedService
│   │   └── index.ts         # App entry point
│   ├── .env
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # FactorySummary, WorkerTable, etc.
│   │   ├── App.tsx
│   │   ├── api.ts           # Axios API layer
│   │   ├── types.ts         # Shared TypeScript types
│   │   └── utils.ts         # Formatting helpers
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Tradeoffs

| Decision | Rationale |
|---------|-----------|
| MongoDB over relational DB | Schema flexibility for event payloads; Atlas free tier for easy remote hosting; time-range queries on indexed timestamp fields are fast. |
| On-demand metric computation | Simpler implementation; acceptable for ≤ 6 workers × 7 days. For larger datasets, pre-aggregation into hourly buckets would be added. |
| SHA-256 dedup key | Deterministic, stateless, works across distributed edge agents without coordination. |
| No auth on API | Scope constraint — add JWT middleware and `site_id` claims for production. |
| Vite proxy in dev | Avoids CORS issues locally; nginx proxy in production container is equivalent. |
