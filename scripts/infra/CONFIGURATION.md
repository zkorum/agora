# Production Configuration Guide

## Infrastructure Sizing (Single Variable Configuration)

All services auto-calculate their resource needs from a single `TOTAL_VCPUS` environment variable.

### How to Configure:

**1. Set `TOTAL_VCPUS` in `docker-compose-production.yml`:**

```yaml
services:
  polis-server:
    environment:
      TOTAL_VCPUS: "2"  # ← Change this based on your instance

  math-updater:
    environment:
      TOTAL_VCPUS: "2"  # ← Keep in sync with polis-server
```

**2. Auto-calculated values:**

| Instance Type | vCPUs | Polis Workers | Math Concurrency | Batch Size | Notes |
|---------------|-------|---------------|------------------|------------|-------|
| t3.medium     | 2     | 2             | 3                | 6          | +1 buffer request |
| t3.large      | 2     | 2             | 3                | 6          | +1 buffer request |
| t3.xlarge     | 4     | 4             | 5                | 10         | +1 buffer request |
| t3.2xlarge    | 8     | 8             | 10               | 20         | +2 buffer requests |

### What Gets Auto-Configured:

**Python-Bridge (Polis Service):**
- `GUNICORN_WORKERS = TOTAL_VCPUS`
- Uses all vCPUs for CPU-intensive PCA/clustering calculations
- **Why match vCPUs?** CPU-bound work performs best with 1 worker per vCPU
  - More workers = context switching overhead (slower)
  - Fewer workers = wasted CPU capacity
- Backlog queue (2048 slots) handles overflow requests

**Math-Updater:**
- `MATH_UPDATER_JOB_CONCURRENCY = TOTAL_VCPUS + buffer`
  - Sends slightly more requests than available workers
  - **Why the buffer?** Eliminates idle time between requests
    - Without buffer: Worker finishes → gap → next request starts (wasted time)
    - With buffer: Worker finishes → queued request starts immediately (max throughput)
  - Buffer size: 1-2 requests (capped to prevent long queue waits)
  - Formula: `workers + min(2, ceil(workers × 0.25))`
  - Example (2 vCPUs): 2 workers + 1 buffer = 3 concurrent requests
- `MATH_UPDATER_BATCH_SIZE = CONCURRENCY × 2`
  - Fetches ahead to keep pipeline full (always have work ready)
  - Example (2 vCPUs): concurrency 3 → batch 6 jobs
- Database pool = `BATCH_SIZE + 5` (automatically sized for pg-boss operations)

**Efficiency Gain:** Buffer adds ~5-10% throughput vs exact worker matching

---

## How It Works (Visual)

**For t3.medium (2 vCPUs):**

```
┌─────────────────────────────────────────────────────────┐
│ Python-Bridge (Polis) - 2 workers                      │
├─────────────────────────────────────────────────────────┤
│ Worker 1: [Processing math calculation... ~60s]        │
│ Worker 2: [Processing math calculation... ~60s]        │
│ Backlog:  [1 request waiting] ← The "+1 buffer"        │
│                                                         │
│ Result: Zero idle time - queued request starts         │
│         immediately when a worker finishes              │
└─────────────────────────────────────────────────────────┘
                    ▲
                    │ Sends 3 concurrent requests
                    │ (2 process now, 1 queued)
                    │
┌─────────────────────────────────────────────────────────┐
│ Math-Updater: Concurrency = 3                          │
│ Batch Size = 6 (fetches 6 jobs, processes 3 at a time) │
└─────────────────────────────────────────────────────────┘
```

**Why not send more?**
- 10 concurrent on 2 workers = 8 requests waiting in queue
- Long wait times, potential timeouts (240s limit, calculations take 50-85s)

**Why not send fewer?**
- Exact match (2 concurrent) = gap between worker finishing and next request
- Idle time = wasted capacity (~5-10% slower throughput)

---

### Overriding Auto-Calculation (Advanced):

If you need custom values, set these explicitly:

```yaml
polis-server:
  environment:
    TOTAL_VCPUS: "4"
    GUNICORN_WORKERS: "3"  # Override: use only 3 workers instead of 4

math-updater:
  environment:
    TOTAL_VCPUS: "4"
    MATH_UPDATER_JOB_CONCURRENCY: "3"  # Match polis workers
    MATH_UPDATER_BATCH_SIZE: "15"      # Custom batch size
```

---

## Missing Services in docker-compose-production.yml

Note: The production compose file doesn't include PostgreSQL. Ensure you have:
- PostgreSQL running separately (RDS, managed instance, or separate compose)
- `CONNECTION_STRING` pointing to your database

---

## Deployment Checklist

1. ✅ Set `TOTAL_VCPUS` to match your instance type
2. ✅ All services have `restart: unless-stopped` (now fixed)
3. ✅ Update `CONNECTION_STRING` with real credentials
4. ✅ Update `TWILIO_*` credentials for SMS verification
5. ✅ Configure AWS CloudWatch logging (already set up)
