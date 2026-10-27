# Valkey voting rollout

## Deployment

Use one maintenance window with the production Docker Compose configuration:

1. **Stop `api` and all backend workers:** `math-updater`,
   `ai-description-retry-worker`, `description-translation-retry-worker`,
   `scoring-worker`, `import-worker`, `content-translation-worker`, and
   `conversation-email-update-worker`. Leave PostgreSQL, its replica, and Valkey
   running.
2. **Run `pnpm db:migrate` from `services/api`** with the production Flyway
   configuration. Wait for the replica to catch up before restarting consumers.
3. **Restart using the new images** with `docker compose up -d`, including the
   frontend (`app` in the production Compose file). Pull the rebuilt images and
   update their tags first; do not restart the old backend version after migrating.

This coordinated stop allows the schema additions and old-table removal to ship
in one migration. A separate expand/contract rollout is unnecessary.

The old buffer is not carried over: recent unflushed votes may be lost during
the switch. Persisted votes and historical results are retained.

## Migration

`V0112__parallel_puppet_master.sql` is generated from the canonical schema. It:

- Drops the obsolete `vote_submission` staging table.
- Adds `conversation.vote_buffer_epoch` (random UUID) and
  `conversation.vote_buffer_drained` (default true).
- Adds `vote.buffer_epoch` (nullable) and `vote.buffer_sequence` (default zero).
- Creates the partial `conversation_vote_buffer_drain_idx` index.

The random UUID default rewrites existing conversation rows, and the DDL takes
table locks. Run it during the stopped-backend window. Existing votes, statement
counters, participant identities, and finalized conversation state are unchanged.

## Runtime contract

A successful vote response means Valkey accepted the action. PostgreSQL writes
are batched; cache loss can lose recent votes. Known enqueue failures return an
error without a memory or SQL fallback. Statement creation remains successful if
its optional automatic agreement cannot be queued after the statement commits.

Source versions, epochs, sequences, and the closing drain barrier prevent stale
batches from changing edited statements, reopened choices, or finalized results.
One-at-a-time voting advances immediately, with bounded concurrent requests and
contextual rejection feedback at natural review transitions.

## Verification

The scoring publication suites replay the real Flyway history. A populated
upgrade test additionally verifies that persisted votes, counters, participant
identities, and closed state survive this migration with correct new defaults.
Query-plan regression tests verify indexed vote-source and closing-drain reads
against 100,000-row synthetic datasets.
