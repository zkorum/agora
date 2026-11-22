# V0116 coordinated upgrade

These files are staged for review. No application database has been migrated.
Use the **Flyway chain**, not the unsplit Drizzle SQL. Upstream V0115
(`equal_golden_guardian`, project-document compression) is the unchanged
baseline and must already be applied or run first.

| Version | Purpose |
| --- | --- |
| V0116 | Generated expansion/renames; nullable role; native enum-label rename and additions |
| .0.1 | Concurrent builds for existing-table indexes/uniqueness; short attachment/swap steps |
| .1 | Replace comparison scoring functions and account-source trigger |
| .2 | Prepared historical Admin-role backfill |
| .3 | Existing comparison subtype backfill |
| .4 | Prepared cross-owned vote-content repair |
| .5 | Prepared explicit deletion intent/account hiding |
| .6 | Prepared replay timestamp/text normalization and boundary guard |
| .7 | Prepared live eligibility/count refresh |
| .8 | Prepared participant unlink/binding contract |
| .9 | Prepared retired-device guard |
| .10 | Prepared sealed comparison-input/retention contract |
| .11 | Install required-role CHECK and generated existing-table FKs/CHECKs NOT VALID |
| .12 | Existing-data governance checks and prepared governance triggers |
| .13 | Validate constraints without retaining the installation locks; finalize role NOT NULL |
| .14 | Install retained Polis input, survey, closing generation and participant-eligibility guards |
| .15 | Restore default-project directory visibility where eligible, preserving conversation indexing intent |

The prepared SQL sources remain under `scripts/` because existing regression
tests and the staging tool use them. They are assembly inputs, not extra manual
production steps. `scripts/stage_coordinated_migration.mjs` packages their reviewed
predicates into this chain. Large historical backfills use bounded keyset
procedures. The directory backfill updates only eligible default-project rows.
Do not independently edit both copies.

One generated Drizzle migration and snapshot record the complete delta from
upstream V0115. The deployment split corrects generation limitations: backfill
before NOT NULL/FKs, native enum rename instead of invalid string casting, and
forward SQL-function replacements. The base phase commits new enum labels before
the concurrent indexes and CHECK constraints use them. The split omits 306
equivalent timestamp type changes, 94 equivalent index rebuilds and 116
equivalent CHECK replacements, preserving the existing objects instead of
rebuilding or scanning them.
The misleading intermediate vote-FK rename is omitted; the final contract
replaces the original FK directly.

## Large-table execution

- New empty-table indexes remain ordinary, fast transactional builds. The 31
  remaining existing-table index/unique builds run `CONCURRENTLY` in `.0.1`.
  Replacements are built under temporary names before the old index is dropped;
  unique constraints attach their completed indexes in a short DDL step.
- `.2`–`.7` use fixed-high-water, primary-key batches of at most 5,000 root rows,
  with a commit between batches. Small tables fit in one batch. Large single
  opinions/conversations can still require expensive aggregate reads; this is
  not a bound on total rows scanned or elapsed time.
- Session settings `agora.migration_batch_size` (1–5000) and
  `agora.migration_batch_pause_ms` (0–1000, default 0) allow smaller batches or
  throttling after workload review. They are not new schema tables or workers.
- **Ship every `.sql.conf` sidecar.** The concurrent-index and batched-data files
  require `executeInTransaction=false`. CALLs manage their own batch commits;
  wrapping the entire file/chain in BEGIN defeats this and PostgreSQL rejects it.
- **Use Flyway's PostgreSQL session lock.** Both `pnpm db:migrate` entry points
  set `FLYWAY_POSTGRESQL_TRANSACTIONAL_LOCK=false`. Set it on any other Flyway
  runner too: the default transaction-level advisory lock can block the first
  `CREATE INDEX CONCURRENTLY` even with the per-script sidecar.
- The five-second lock timeout follows the existing backend lock-timeout default:
  metadata contention fails rather than building a long lock queue. It is not an
  index-build/backfill statement timeout or a deployment-duration guarantee.
- Migration timestamps are explicitly evaluated in UTC, including on connections
  whose default timezone differs. This preserves the existing timestamp-without-
  time-zone storage convention for discovery/deletion/replay markers.
- Existing-table CHECK/FKs install NOT VALID in `.11` and validate in `.13`,
  outside the installation transaction. NOT VALID still enforces new writes.
  A validated temporary role CHECK permits the final NOT NULL step without
  another full-table scan.
- Flyway still runs versions in dependency order. “Concurrent” means allowing
  ordinary database activity, not launching dependent migrations in parallel.
  Breaking names/contracts still require an incompatible-service cutover.

`scripts/reviewed_drizzle_migrations.mjs` pins the source and all deployment-phase
hashes. The normal copier verifies this reviewed split instead of overwriting it
or copying the unsplit draft into another version. Staging refuses unrecognized
edits. To inspect/regenerate the approved packaging:

```sh
node scripts/stage_coordinated_migration.mjs
node scripts/stage_coordinated_migration.mjs --write
```

## Deployment gates

- Inspect actual target Flyway history, including pending V0113.1, before choosing
  any deployment command. A database migrated with upstream main through V0115
  does **not** have this branch's V0113.1. Stop if it is missing; do not let
  application cutover silently skip ticket retirement. In a separately approved
  maintenance window, verify V0113.1 is the **only** outstanding migration
  through V0115, drain incompatible writers, apply that pinned version, and
  verify its successful history entry before normal V0116 migration. Do not
  enable out-of-order execution globally or apply other historical gaps by guess.
- This packaging is editable only while unapplied. Once any phase is deployed,
  freeze its contents/checksum and use forward migrations for changes; do not
  restage an already-applied version.
- Drain incompatible writers for this breaking table/enum/contract cutover.
  Ownership/live-refresh scripts retain their original stopped-writer requirement.
- V0116 fails before DDL if nonempty legacy `group_sources_snapshot` needs
  classification; .11 rechecks before dropping the column. No blobs are erased
  to make a migration pass. .12 refuses orphan organizations/projects rather
  than inventing an Admin/owner.
- Measure target sizes, write load, I/O/WAL headroom, long transactions and
  replica lag. Concurrent builds/batched commits reduce blocking, not resource
  consumption; they do not certify an entirely online or fast deployment.
- A failed concurrent build may leave an invalid temporary index. Inspect its
  state/definition and the failed Flyway version before approving repair.
  There is no blind IF NOT EXISTS recovery or automatic destructive cleanup.
- A failed batched phase can have committed earlier chunks. Its procedure can
  be recreated on retry; most predicates only repair outstanding rows. The live
  refresh can advance dirty revisions again on retry, but never rewrites frozen
  numerical evidence. Review Flyway's failed entry before any repair/retry.
- Rehearse against a representative target clone. The regression test uses a
  populated reconstructed pre-upgrade schema with actual historical scoring and
  participant triggers, not the complete production Flyway/data history.
- Keep permanent purge disabled. Missing old captures/account-context
  classification, storage/restore-journal checks, new-worker rollout and replica
  routing remain separately gated.

Detailed intent and sequencing: `doc/coordinated-backfill-order.md`.

Local verification covers final-schema catalog parity, one-row batch boundaries,
failure/retry, frozen evidence, and writer compatibility during concurrent index
creation and FK validation. A separate Flyway 11.20.3 / PostgreSQL 16 rehearsal
applied the SQL history through V0115, seeded legacy rows, and applied all 17
V0116 phases; `validate` passed and a second `migrate` had no work. Preexisting
Flyway files through V0115 are unchanged. No application migration was run.
