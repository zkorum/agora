# Load Testing for Agora Guest Voting and Ranking

k6 load testing infrastructure for stress testing guest voting and ranking scenarios with real-time monitoring.

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

#### Scenario 1: Conversation Voting

```bash
cd services/load-testing
pnpm install
./scripts/run-scenario1-with-monitoring.sh <CONVERSATION_SLUG_IDS>
```

Example:

```bash
./scripts/run-scenario1-with-monitoring.sh abc123xyz,def456uvw
```

The script wraps k6 with the root dev log runner. Outputs are written to:

- `.local/logs/latest/load-testing.log` for the full k6 console output.
- `.local/logs/latest/load-testing.events.jsonl` for semantic events such as user setup, opinion creation, votes, page fetches, and teardown failures.
- `.local/logs/latest/load-testing.summary.json` for the k6 summary export.

Search semantic events directly with `rg`, for example `rg '"outcome":"failure"' .local/logs/latest/load-testing.events.jsonl`.

#### Scenario 2: Solidago Ranking

Use **disposable environments only**. Guest users and comparison history remain in the database; only load-generator keys are cleared after each participant. It requires distinct ranking fixtures, not the voting fixtures used by Scenario 1. Neither runner launches the other scenario. The former `test:all` command is now named `test:conversation-voting:build`; use `test:solidago-ranking:build` to build and run ranking load instead.

Precreate each conversation in the UI with:

- Conversation type `ranking`, `rankingMode: "bws"`, and `participationMode: "guest"`.
- At least 4 active ranking items.
- No required survey and no event-ticket requirement.
- Open participation and no moderation restrictions (open/unmoderated).

Start the API and scoring worker against the same disposable environment, for example with root `make dev-api` and `make dev-scoring-worker`. Setup validates the fixtures before participant load starts; the scenario does not create them. Keep fixture items and participation settings unchanged during the run.

From the repository root, a small single-conversation run with monitoring:

```bash
RANKING_USERS_PER_CONVERSATION=10 \
RANKING_VUS_PER_CONVERSATION=2 \
RANKING_COMPARISONS_PER_USER=3 \
make load-test-scenario2 CONVERSATION_SLUG_IDS=slug1
```

Three conversations with 100 users and 10 VUs **each** means 300 participants and 30 VUs total:

```bash
RANKING_USERS_PER_CONVERSATION=100 \
RANKING_VUS_PER_CONVERSATION=10 \
make load-test-scenario2 CONVERSATION_SLUG_IDS=slug1,slug2,slug3
```

The root target accepts the same `conversations=slug1,slug2` alias as Scenario 1; `CONVERSATION_SLUG_IDS` takes precedence. The monitoring wrapper builds first and can also be invoked from `services/load-testing` with `bash scripts/run-scenario2-with-monitoring.sh slug1,slug2`. It sends Prometheus remote-write metrics to `http://localhost:9090/api/v1/write` by default; set `K6_PROMETHEUS_RW_SERVER_URL` to override that endpoint.

Without Prometheus, from `services/load-testing`:

```bash
pnpm build
CONVERSATION_SLUG_IDS=slug1 pnpm test:solidago-ranking
```

Both Scenario 2 runners use the durable logger with service name `load-testing-solidago`. Outputs are relative to the repository root:

- `.local/logs/latest/load-testing-solidago.log` for k6 console output.
- `.local/logs/latest/load-testing-solidago.events.jsonl` for semantic events.
- `.local/logs/latest/load-testing-solidago.summary.json` for the k6 summary export.

Logs and metrics are tagged by conversation, so inspect individual conversations rather than only aggregate throughput. To follow scoring progress, inspect `.local/logs/latest/scoring-worker.log` (captured by `make dev-scoring-worker`).

Inspect failures and actual completed workloads without relying on terminal scrollback:

```bash
rg '"outcome":"failure"' .local/logs/latest/load-testing-solidago.events.jsonl
rg '"action":"user_completed"' .local/logs/latest/load-testing-solidago.events.jsonl
rg '"action":"results_observed"' .local/logs/latest/load-testing-solidago.events.jsonl
```

The configuration event records the target API, conversation list, per-conversation budgets/deadline, and total users/VUs. `comparison_saved` records accepted history growth and request timing; `user_completed` records the actual comparison count and `ranking_complete` or `comparison_budget` stop reason. `results_observed` records scored-item and participant counts before load, after each participant, and after cooldown, always with `scoringFreshnessVerified: false`. Request failures record status/transport codes, schema issue paths, or enumerated participation rejection reasons, not raw response bodies, credentials, or UCAN tokens. Inspect the preceding request failure when a terminal `user_failed` event reports a request failure.

Custom k6 metrics are `ranking_request_success`, `ranking_request_duration` (milliseconds), `ranking_users_completed`, `ranking_user_success`, `ranking_comparisons_saved` (new comparisons, not cumulative rewritten rows), and `ranking_history_length`. Request metrics include `conversation`, `operation`, and `phase` tags; other metrics include `conversation`. Thresholds require all configured users to finish in every conversation, over 95% request/user success, save p95 below 5 seconds both globally and per conversation, and HTTP failures below 5%. Interrupted or failed participant flows fail the completion threshold rather than silently reporting a smaller successful workload.

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

### Scenario 1: Conversation Voting Load

Tests voting load on one or more conversations:

- Configurable opinion creators and additional voters
- Initial opinions distributed across all configured conversations
- Each user votes on 50-100% of fetched opinions
- Users occasionally create new opinions while voting
- Page fetches are mixed in to simulate realistic browsing behavior
- Requires conversations with `participationMode: "guest"` and no event-ticket requirement. The scenario generates fresh guest identities and does not perform account registration, email verification, or strong verification.

**What it tests:**

- Row-level locking on hot conversations
- Opinion table insert performance
- Vote table insert performance
- Multiple-conversation voting throughput
- Transaction throughput limits

### Scenario 2: Solidago Ranking Load

`src/scenario2-solidago-ranking.ts` builds to its own CommonJS entry, `dist/scenario2-solidago-ranking.cjs`. Each conversation gets an independent, concurrent k6 `shared-iterations` pool. Users and VUs are configured **per conversation**, not divided across the supplied slugs. Each iteration creates a fresh guest identity, even when the same VU runs multiple iterations.

Participants fetch active items and use deterministic preferences across four groups to choose best/worst items from server-provided candidate sets. They reuse the frontend's shared MaxDiff engine and save the whole comparison history, including final ranking/completion state in the final comparison's save. There is no extra completion write. `RANKING_COMPARISONS_PER_USER` is a maximum per participant: users stop earlier once the engine has resolved all pairs. Four-item fixtures can finish in just two comparisons; use more items (for example, 20-50) to sustain longer sessions. Budget-limited sessions remain incomplete but still trigger scoring. Terminal events record the stop reason and actual comparison count.

API success means the comparison history was accepted, **not that the scoring worker published updated results**. After the participant load ends, cooldown only waits and then reads results. It cannot prove the worker caught up, and existing results on previously used fixtures do not prove freshness for this run.

After load stops, monitor `.local/logs/latest/scoring-worker.log` and compare `ranking_conversation_config.scoring_input_revision` with `processed_scoring_input_revision` for each tested conversation. A lagging processed revision means there is still unprocessed scoring input; wait for it to catch up before interpreting results as current. Ensure other writers have stopped too when making this comparison.

The scoring worker consumes the Valkey dirty set lightest-first. Dirty-set entries deduplicate repeated updates for a single conversation, so a hot single-conversation run does not imply one queued scoring job per API save. Multiple conversations exercise scheduling across independent dirty entries; API throughput and worker publication throughput are different measurements.

## Configuration

### Scenario 1 Parameters

Edit scenario files to adjust:

- `OPINION_CREATOR_COUNT` / `ADDITIONAL_VOTERS` (default: 50/50)
- `INTERMITTENT_OPINION_CREATION_PROBABILITY` (default: 0.1)
- `MAIN_PAGE_FETCH_PROBABILITY` / `CONVERSATION_PAGE_FETCH_PROBABILITY`
- `INITIAL_CONVERSATION_PAGE_FETCH_PROBABILITY` to override the initial frontend page-load probability. If omitted, an explicit `CONVERSATION_PAGE_FETCH_PROBABILITY` value is reused; otherwise the initial page load defaults to always on.
- `SLEEP_BETWEEN_ACTIONS` and retry constants in the scenario file

### Scenario 2 Parameters

Set these environment variables when invoking either Scenario 2 runner:

| Variable                         | Default                    | Meaning                                                               |
| -------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| `CONVERSATION_SLUG_IDS`          | Required                   | One ranking conversation slug or a comma-separated list.              |
| `RANKING_USERS_PER_CONVERSATION` | `100`                      | Fresh guest participant iterations per conversation.                  |
| `RANKING_VUS_PER_CONVERSATION`   | `10`                       | Concurrent VUs in each conversation's independent pool.               |
| `RANKING_COMPARISONS_PER_USER`   | `20`                       | Maximum comparisons per guest; natural completion can stop earlier.   |
| `RANKING_THINK_TIME_SECONDS`     | `0.5`                      | Think time between participant actions.                               |
| `RANKING_COOLDOWN_SECONDS`       | `30`                       | Wait before reading final results, not a worker freshness guarantee.  |
| `RANKING_MAX_DURATION_SECONDS`   | `1800`                     | Deadline per conversation pool; increase for larger/slower workloads. |
| `RANKING_ALLOW_INSECURE_HTTP`    | `false`                    | Explicit opt-in to unencrypted HTTP outside loopback.                 |
| `API_BASE_URL`                   | `http://127.0.0.1:8084`    | Existing local API default.                                           |
| `BACKEND_DID`                    | `did:web:localhost%3A8084` | Must be explicitly set when overriding the API origin.                |

`API_BASE_URL` must be an HTTP(S) origin without credentials, path, query, or fragment; one trailing slash is normalized away. HTTPS is required outside loopback unless `RANKING_ALLOW_INSECURE_HTTP=true` explicitly allows a disposable private-network target. UCAN audiences are not inferred from hostnames: set `BACKEND_DID` to the actual backend audience. API requests do not follow redirects.

### Local Verification

From `services/load-testing`, these commands verify the bundles, lint, and types without running a load test:

```bash
pnpm build
pnpm lint
pnpm exec tsc --noEmit
```

Building emits both separate scenario bundles but executes neither. Choose the runner matching your fixture type explicitly.

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

## License

AGPL-3.0. See [COPYING](./COPYING).
