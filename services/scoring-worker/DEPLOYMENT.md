# Deploying BWS publication and fixed-scale scores

This runbook covers all of PR #1258: its initial diagnostics commit and the
subsequent publication, routing, history, and display-score changes.

## Deployment scope

| Change | Deployment required |
| --- | --- |
| Previous PR #1257 (Scenario 1 load-test corrections) | None; pull/build the load-testing tools when using them. |
| PR #1258 API logging, BWS history/routing, score reads, lifecycle snapshots | Redeploy `api`. |
| PR #1258 coherent computation/publication and native Solidago display scores | Redeploy `scoring-worker`. |
| PR #1258 plain whole-number percentage display and frontend dependency fixes | Rebuild/redeploy `agora` (the main frontend, whose image is named `agora-app-*`). |
| PR #1258 schema and existing score data | Apply Flyway through V0090, then run the separate Python backfill below. |

The SvelteKit landing service (`services/app`) does not require a deployment.
Other workers only receive generated schema/shared copies; they do not need to
restart for this feature. Apply the migrations before subsequently upgrading
those workers to the new generated schemas. Shared directories are source code,
not independently deployed services.

## 1. Prepare a release and private configuration files

Use one checkout/release containing the complete merged PR for migrations,
backfill, API, worker, and frontend. Generated schemas/models are committed;
production deployment does not require migration generation, schema syncing,
or OpenAPI regeneration.

Prepare the normal API and Agora release artifacts and the CPU scoring-worker
image using the existing service build commands. Use an immutable release tag.
The default CPU image supports the native BWS pipeline; GPU extras are unrelated
to this rollout. Build artifacts before starting the maintenance window.

For a manual backfill from the checkout, create or edit
`services/scoring-worker/.env`:

```dotenv
SCORING_WORKER_CONNECTION_STRING="postgresql://USER:PASSWORD@PRIMARY_HOST:5432/DATABASE"
```

Use the actual primary DSN, including your deployment's SSL options. URL-encode
special characters in credentials. This file is Git-ignored. `Settings()` reads
it automatically when the working directory is `services/scoring-worker`;
credentials need not appear in command-line arguments or exported variables.
Existing worker `.env` files can be reused. Already-exported settings take
precedence over file settings, so use a deployment shell without conflicting
database overrides. The backfill does not connect to Valkey or the read replica.

Set up the target database in the API's private
`services/api/database/flyway/flyway.conf` (also Git-ignored), for example:

```properties
flyway.url=jdbc:postgresql://PRIMARY_HOST:5432/DATABASE
flyway.user=USER
flyway.password=PASSWORD
```

Retain any SSL or other settings required by your normal migration process.
`pnpm db:migrate` mounts this directory as both Flyway's configuration and SQL
directories. It uses `flyway.conf`; a differently named configuration file is
not selected merely because it exists alongside it. The migration container and
the backfill process must both be able to reach the same deployment database.

## 2. Pause ranking writes and stop old instances

Use a short maintenance window: drain/stop the old API instances, including their
scheduled GitHub lifecycle sync, and gracefully stop **all** old scoring-worker
instances. Allow in-flight transactions to finish. Keep ranking/lifecycle writes
paused through the backfill. Do not let the old worker publish again after the
backfill: it does not populate the new display columns or provenance links.

## 3. Apply migrations on the primary

From `services/api`:

```bash
pnpm db:migrate
```

Flyway applies every pending migration in order. The additions in this PR are:

| Version | Purpose |
| --- | --- |
| `V0089__kind_ezekiel.sql` | Add the invalidation revision and its constraint. |
| `V0089.1__separate_ranking_scoring_invalidations.sql` | Distinguish new votes from edits/removals/eligibility invalidations and initialize the invalidation revision. |
| `V0089.2__normalize_ranking_score_json_backups.sql` | Repair double-encoded JSON backups; preserve numeric raw scores. |
| `V0090__complete_bloodscream.sql` | Add community/personal display columns, provenance links, and constraints. |

If this database is already at V0089.2, only V0090 is pending. A fresh database
must run the entire migration chain. No database drop, clean, vote deletion, or
manual replay of already-applied SQL is needed. Flyway tracks applied versions.
Wait for the read replica to replay these migrations before starting updated
services; new queries reference the new columns.

## 4. Run the separate Python backfill once

`pnpm db:migrate` does **not** execute this script.

From `services/scoring-worker`, using Python 3.13+ and uv:

```bash
uv sync --locked
uv run --locked python scripts/backfill_display_scores.py
```

The script reads `.env` from this working directory. It uses native Solidago
`Squash(score_max=1)` and shifts the result to 0–1. It processes missing values
in 500-row transactions with row locks and updates current snapshot provenance
under configuration-row locks. It preserves raw scores, uncertainties, votes,
ranks, and scoring input revisions; it does not rerun learning or aggregation.

Output contains four counters:

```json
{
  "ranking_score_entity": 123,
  "maxdiff_user_entity_score": 456,
  "current_snapshots_linked": 7,
  "current_snapshots_skipped": 0
}
```

Counts depend on your database. Require a successful process exit **and**
`current_snapshots_skipped: 0`. Nonzero skipped snapshots mean that safe
current-score provenance could not be established: investigate those rows
before completing the rollout. A successful exit alone does not reject skips.
The script is resumable and idempotent; rerunning after success normally reports
zeros. A smaller batch can be selected with `--batch-size 100` if needed.

### Container execution instead of installing uv on the host

The updated scoring-worker image includes `/app/scripts/backfill_display_scores.py`.
From the directory containing your private `.env`, mount the file read-only;
replace the network and release placeholders with the deployed values:

```bash
docker run --rm --network DEPLOYMENT_NETWORK \
  --mount "type=bind,src=$(pwd)/.env,dst=/app/.env,readonly" \
  quay.io/zkorum/agora-scoring-worker:RELEASE_TAG \
  python /app/scripts/backfill_display_scores.py
```

The image's working directory is `/app`, so the mounted `.env` is discovered
automatically. This is a one-off job, not the long-running scoring process.

## 5. Verify, then start the updated services

On the primary, verify the migration and that no existing score needs backfill:

```sql
SELECT version, success
FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 1;

SELECT count(*) AS missing_community
FROM ranking_score_entity WHERE display_score IS NULL;

SELECT count(*) AS missing_personal
FROM maxdiff_user_entity_score WHERE display_score IS NULL;
```

Expect V0090 (or a later already-applied release), success, and zero missing
scores. Repeat the display-column checks on the replica after it catches up.

Start the **updated scoring-worker**, then the **updated API**, deploy the rebuilt
**Agora frontend**, and reopen traffic. Confirm new publications also populate
`display_score` and `ranking_conversation_stats_snapshot.ranking_score_id` when
scoring exists. For a quiet scored conversation, input and processed revisions
should converge. The default reconciliation interval is 300 seconds; normal new
votes also wake the worker through the existing Valkey dirty set.

Check a known conversation's community results and a completed personal ranking.
The API sends stored 0–1 display values; the frontend renders a plain integer
percentage such as `96%`. Ordering still comes from raw scores. The percentage
is a position on the fixed score scale, not a fraction of participants supporting
an item. Old browser tabs may need a reload to load the new frontend assets.

## Historical compatibility and rollback

New checkpoints and newly frozen lifecycle items retain raw-score provenance.
The backfill links only provably paired current snapshots. Older checkpoints or
frozen lifecycle items without provenance retain ranks/counts but return no
fixed-scale score (displayed as a dash). Recovering their spread from min–max
values alone is impossible; the script does not guess historical links.

Prefer a forward fix if verification fails. Keep the old worker stopped while
investigating; rerun the backfill after a partial failure. Restarting an old
worker would create rows with missing display values, and mixing old/new API
and frontend versions can produce inconsistent score presentation. Any rollback
must therefore coordinate API, worker, and frontend versions. Leave the additive
schema in place; do not use `db:clean` or undo these data migrations as an
application rollback.

## Monitoring from the earlier part of PR #1258

No new logging environment variables are required for normal production use.
Defaults: `API_LOG_LEVEL=info`, `API_LOG_SQL_QUERIES=false`,
`API_RANKING_PERFORMANCE_ENABLED=false`,
`SCORING_WORKER_PERFORMANCE_ENABLED=false`; the worker defaults to INFO outside
development. Performance flags are optional and belong in the existing private
service configuration files when enabling an investigation.

`make prepare-ranking-monitoring`, pg_stat_statements permissions, Prometheus,
and k6 are local performance-test tooling, not prerequisites for this rollout.
The preceding PR #1257 requires none of the migrations or service deployments
listed here. See [PERFORMANCE.md](../load-testing/PERFORMANCE.md) for load tests.
