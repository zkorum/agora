# Load Testing for Agora Guest Voting

k6 load testing infrastructure for stress testing guest voting scenarios with real-time monitoring.

## Monitoring Setup

This repository provides **two monitoring configurations**:

1. **Local Docker Setup** (this guide) - For local development and testing

    - Uses docker-compose with Grafana, Prometheus, and postgres-exporter
    - Monitors local PostgreSQL container

2. **AWS RDS Production** (see AWS RDS Monitoring section below) - For production load testing
    - Uses AWS RDS Performance Insights
    - CloudWatch metrics
    - Different configuration required

---

## Local Docker Setup (Development)

### 1. Start Monitoring Stack

```bash
cd services/api
docker-compose up -d
```

This starts:

- **PostgreSQL** (port 5432) - Your local database
- **postgres-exporter** (port 9187) - Exports PostgreSQL metrics to Prometheus
- **Prometheus** (port 9090) - Collects metrics from k6 and PostgreSQL
- **Grafana** (port 3000) - Real-time dashboards
- **pgAdmin** (port 5050) - Database management UI

### 2. Access Grafana

Open <http://localhost:3000>

- Username: `admin`
- Password: `admin`

Pre-installed dashboards:

- **PostgreSQL Database** - Database performance metrics
- **k6 Prometheus** - Load test metrics

### 3. Enable pg_stat_statements Extension

First time only:

```bash
psql -h localhost -U postgres -d agora -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

Password: see ../api/docker-compose.yml

### 4. Run Load Tests (Local)

#### Scenario 1: Single Conversation

```bash
cd services/load-testing
pnpm install
./scripts/run-scenario1-with-monitoring.sh <CONVERSATION_SLUG_ID>
```

Example:

```bash
./scripts/run-scenario1-with-monitoring.sh abc123xyz
```

#### Scenario 2: Multiple Conversations

```bash
./scripts/run-scenario2-with-monitoring.sh <CONVERSATION_SLUG_IDS>
```

Example:

```bash
./scripts/run-scenario2-with-monitoring.sh abc123,def456,ghi789
```

### 5. Monitor Real-Time (Local)

While tests are running, view Grafana dashboards at <http://localhost:3000>:

**PostgreSQL Dashboard shows:**

- Active connections and states
- Query performance (slow queries, execution times)
- Lock contention and blocking queries
- Transaction throughput and rollback rates
- Cache hit ratios
- Table statistics (inserts, updates, dead tuples)

**k6 Dashboard shows:**

- Virtual users (VUs) over time
- Request rate (requests/sec)
- Response times (p50, p95, p99)
- Error rates
- Custom metrics (opinions created, votes cast, success rates)

### 6. View PostgreSQL Logs (Local)

```bash
# View logs in real-time
docker exec -it postgres_container tail -f /data/postgres/log/postgresql-*.log

# Search for slow queries
docker exec -it postgres_container grep "duration:" /data/postgres/log/postgresql-*.log | tail -20

# Search for lock waits
docker exec -it postgres_container grep "lock wait" /data/postgres/log/postgresql-*.log

# Search for deadlocks
docker exec -it postgres_container grep "deadlock" /data/postgres/log/postgresql-*.log
```

---

## AWS RDS Production Setup

**TODO: AWS RDS monitoring configuration will be added here.**

When load testing against AWS RDS (production), you will need:

- AWS RDS Performance Insights (built-in, needs to be enabled)
- CloudWatch metrics for RDS
- Different connection configuration for k6
- Security group configuration to allow k6 to connect

This section will include:

- How to enable RDS Performance Insights
- How to view real-time query performance during load tests
- How to export metrics from RDS Performance Insights
- How to correlate k6 metrics with RDS metrics

---

## Test Scenarios

### Scenario 1: Single Conversation Heavy Load

Tests database contention on a single conversation:

- 50-200 concurrent guest users
- Each user creates 5-10 opinions
- Each user votes 5-15 times
- Actions interleaved (realistic user behavior)
- 20-minute test duration

**What it tests:**

- Row-level locking on single conversation
- Opinion table insert performance
- Vote table insert performance
- Transaction throughput limits

### Scenario 2: Multiple Conversations Heavy Load

Tests distributed load across multiple conversations:

- 50-200 concurrent guest users
- Load distributed across multiple conversations
- Same opinion/vote creation as Scenario 1

**What it tests:**

- Cross-conversation scalability
- Database contention with distributed load
- Overall transaction throughput

## Configuration

### Test Parameters

Edit scenario files to adjust:

- `MIN_OPINIONS_PER_USER` / `MAX_OPINIONS_PER_USER` (default: 5-10)
- `MIN_VOTES_PER_USER` / `MAX_VOTES_PER_USER` (default: 5-15)
- `MIN_SLEEP_BETWEEN_ACTIONS` / `MAX_SLEEP_BETWEEN_ACTIONS` (default: 0.5-2.0s)
- Load stages in `options.stages`

### Monitoring Configuration (Local Only)

Edit `services/api/postgresql-monitoring.conf` to adjust:

- `log_min_duration_statement` - Log queries slower than this (default: 1000ms)
- `pg_stat_statements.max` - Max distinct queries tracked (default: 10000)

## Troubleshooting (Local)

### Grafana shows no data

1. Check Prometheus is scraping metrics:

    - Open <http://localhost:9090>
    - Go to Status → Targets
    - Verify `postgresql` target is UP

2. Check postgres-exporter is running:

    ```bash
    docker logs postgres_exporter
    curl http://localhost:9187/metrics
    ```

### k6 metrics not appearing in Grafana

1. Verify k6 is sending to Prometheus:

    - Check k6 output shows "experimental-prometheus-rw" output
    - Verify `K6_PROMETHEUS_RW_SERVER_URL` is set correctly

2. Check Prometheus remote write is enabled:

    ```bash
    docker logs prometheus | grep "remote-write"
    ```

### pg_stat_statements not working

```bash
# Check extension is loaded
psql -h localhost -U postgres -d agora -c "SHOW shared_preload_libraries;"
# Should output: pg_stat_statements

# Check extension is created
psql -h localhost -U postgres -d agora -c "SELECT COUNT(*) FROM pg_stat_statements;"
# Should return a number (not an error)
```

## Clean Up (Local)

```bash
# Stop all containers
cd services/api
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v
```

## Architecture (Local Setup)

```
┌─────────┐
│   k6    │ ──── Prometheus Remote Write ───┐
└─────────┘                                  │
                                             ▼
┌────────────┐                        ┌────────────┐
│ PostgreSQL │ ───── queries ────────▶│ postgres-  │
│  (Docker)  │                         │ exporter   │
└────────────┘                        └────────────┘
                                             │
                                             │ scrape metrics
                                             ▼
                                      ┌────────────┐
                                      │ Prometheus │
                                      │            │
                                      └────────────┘
                                             │
                                             │ query metrics
                                             ▼
                                      ┌────────────┐
                                      │  Grafana   │◀─── User views dashboards
                                      │            │
                                      └────────────┘
```

## Next Steps

- Run baseline tests locally to establish performance expectations
- Identify bottleneck queries using Grafana dashboards
- Optimize indexes and queries based on findings
- Re-run tests to validate improvements
- **Configure AWS RDS monitoring for production load testing**
