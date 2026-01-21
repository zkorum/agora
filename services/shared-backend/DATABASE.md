# Database Documentation

## PostgreSQL Setup

The application uses PostgreSQL with read replica support:

- **Primary database**: Handles all writes and consistent reads
- **Read replica** (optional): Handles SELECT queries for improved performance
- **Automatic routing**: Drizzle's `withReplicas()` routes SELECTs to replica, writes to primary

## Query Monitoring

### Local Development

PostgreSQL is configured with query logging in `services/api/postgresql-monitoring.conf`:

- Queries taking >100ms are logged with execution time
- Logs include query text, parameters, duration, and context
- Both primary and replica containers use the same configuration

**View PostgreSQL logs:**

```bash
# Access container and navigate to logs
docker exec -it postgres_container bash
cd /var/lib/postgresql/data/log
vi postgresql-*.log  # or: less postgresql-*.log

# Watch logs in real-time
docker exec postgres_container tail -f /var/lib/postgresql/data/log/postgresql-*.log

# Filter for slow queries with duration
docker exec postgres_container tail -f /var/lib/postgresql/data/log/postgresql-*.log | grep "duration:"

# View read replica logs
docker exec -it postgres_replica_container bash
cd /var/lib/postgresql/data/log
```

**Log format example:**

```
2025-10-27 10:23:45.123 [1234]: user=postgres,db=agora,app=api duration: 5234.567 ms  statement: SELECT "opinion"."id" FROM "opinion" WHERE ...
```

### Production (AWS RDS)

**RDS Performance Insights:**

- Enabled via custom DB Parameter Group for postgres16
- Configuration:
    - `log_min_duration_statement=1000` (log queries >1s)
    - `log_statement=none`
    - `log_destination=stderr`
- CloudWatch Logs export enabled for PostgreSQL logs
- Slow SQL tab in Performance Insights shows queries with execution plans

**How to access:**

1. AWS Console → RDS → Performance Insights
2. View top SQL queries by CPU time, AAS (Average Active Sessions)
3. Click "Slow SQL" tab for queries exceeding log_min_duration_statement
4. CloudWatch Logs → `/aws/rds/instance/<instance-name>/postgresql`

## Drizzle Query Logging

Application-level query logging via `DrizzleFastifyLogger` (defined in `logger.ts`):

- **Enabled in all environments** (production + development)
- Logs query text and parameters to application logs
- **Does not include execution time** (use PostgreSQL logs for timing)
- Helps correlate queries with application code during debugging

**Log format:**

```json
{
    "level": 30,
    "msg": "SELECT \"opinion\".\"id\" FROM \"opinion\" WHERE ... -- [param1, param2]"
}
```

## Performance Analysis

### Identifying Slow Queries

**Local development:**

1. Run your workload (e.g., load tests)
2. Check PostgreSQL logs for queries with high `duration:` values
3. Identify table scans, missing indexes, or expensive JOINs

**Production (RDS):**

1. Performance Insights → Top SQL
2. Sort by "Load" or "Avg duration"
3. Click query to see execution plan and wait events
4. Look for "CPU Execute" (CPU-bound) vs "IO:DataFileRead" (I/O-bound)

### Key Metrics

- **Cache Hit Rate**: Should be >95% (data reads from RAM vs disk)
- **Lock Counts**: RowExclusiveLock, AccessShareLock should be low (<100 avg)
- **CPU Time**: Per-query CPU usage (high values indicate expensive queries)
- **AAS (Average Active Sessions)**: Concurrent query load (compare to vCPU count)

### Index Analysis

Missing indexes cause sequential scans (high CPU usage):

```sql
-- Check index usage on tables
SELECT
    tablename,
    seq_scan,
    idx_scan,
    ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) as pct_index_used
FROM pg_stat_user_tables
WHERE tablename IN ('opinion', 'vote', 'polis_cluster_opinion')
ORDER BY seq_scan DESC;
```

**Target**: >95% index usage on frequently queried tables.

## Connection Pooling

Using `postgres-js` with default configuration:

- **Max connections**: 10 (default, suitable for 4 vCPU database)
- **Connection lifecycle**: Managed automatically (45-90 min lifetime)
- **No manual configuration needed**: Default settings are optimal

**Why 10 connections?**

- Database has 4 vCPUs
- More connections doesn't help CPU-bound queries
- Moves bottleneck from pool to OS scheduler
- See `services/api/database/DB_POOL_ANALYSIS.md` for details

## Read Replica Configuration

**Local development:**

- Primary: `postgres:5432`
- Replica: `postgres-replica:5433`
- Configured via `CONNECTION_STRING` and `CONNECTION_STRING_READ` in `.env`

**Production (AWS RDS):**

- Primary: Main RDS instance
- Replica: RDS read replica instance
- Configured via:
    - `AWS_SECRET_ID` + `AWS_SECRET_REGION` + `DB_HOST` (primary)
    - `AWS_SECRET_ID_READ` + `AWS_SECRET_REGION_READ` + `DB_HOST_READ` (replica)

**Query routing (automatic):**

- `SELECT` queries → Read replica
- `INSERT`, `UPDATE`, `DELETE` → Primary
- Transactions → Primary (for consistency)

Implemented in `db.ts` using Drizzle's `withReplicas()`.
