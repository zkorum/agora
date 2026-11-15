# Drizzle upgrade: focused review

Scope: the ORM/Kit RC5 upgrade, explicit-reader API, routing callsites changed
here, migration-history conversion, and associated tooling/tests. Other dirty
branch features are not included.

## 1. Correctness

- Fixed the legacy Flyway copier's silent-success case. The subsequent v1 bridge
  now fingerprints and skips the 114 converted historical migrations, checks the
  deployed baseline anchor, and copies only new migration folders. Allocation is
  locked; copies are exclusive and idempotent. Modified historical SQL/copies,
  duplicate copies, mixed formats, and version exhaustion fail explicitly.
  Do not replay historical Drizzle SQL; deployed Flyway migrations include
  intentional corrections.
- Replaced a disposable-database test's piped CLI export with the existing
  programmatic `pushSchema` pattern. RC5 exits before large piped stdout drains,
  so the CLI capture could return a truncated schema despite exit code zero.
  Makefile exports already use regular files and are not affected by that pipe
  failure.
- Verified primary-default reads/writes, explicit replica reads, primary-only
  operation, transaction preservation, row locks, and writable SELECT CTEs.
- Official `drizzle-kit check` passes for all 114 converted migrations. The
  historical SQL is unchanged; no application migration was applied.

## 2. Type safety

- `ReplicaDatabase` exposes only immutable SELECT/count methods; it cannot
  mutate the shared handle's methods, write, open transactions, execute raw SQL,
  or construct CTEs through that type.
- Strengthened the locking lint rule to recognize reader capabilities rather
  than one type-alias name. Regression coverage includes renamed mapped types,
  unions, saved builders, `satisfies` wrappers, and computed method access.
- API and worker typechecks include the compile-time reader-contract tests.
  No type assertions or lint suppressions were added.

## 3. Clean code

- Removed the obsolete replica-then-primary fallback from the voting source
  metadata lookup; it now performs one explicit, fresh primary lookup.
- Use one central replica accessor, not a replacement automatic-routing layer.
  Query-only builders keep the caller's chosen handle.
- The lint rule uses TypeScript's symbol resolution for local builder aliases,
  without introducing a second scope-resolution implementation.

## 4. Security

- Fixed both privacy loggers' registrations for the new replica-routing message.
  Emitted-log regression tests verify the API preserves approved text and the
  worker still classifies the event correctly.
- Query-error privacy tests pass with RC5. Credentials, SQL, and parameter
  values remain filtered; `paramsInErrors` was not enabled.
- Read-only TypeScript types and lint are guardrails, **not a database security
  boundary or proof of SQL purity**. Raw fragments and cross-function builder
  provenance still need review; replica credentials should enforce read-only
  access independently.

## 5. Performance — remaining deployment blocker

Replica routing is not fully migrated. A scoped inventory found 523 unclassified
`db` read-builder calls in API services/shared backend. This is not 523 proven
replica-eligible reads: some receive transactions or explicit primary handles.
Calls receiving the root handle now run on primary instead of v0's automatic
replica. That can increase writer load and requires classification before rollout.
Bulk-rerouting these calls would risk stale authorization, admission, or
read-after-write results, so it was deliberately not done in this review.

The changes to feed selection, hydration, display counts, and import polling
explicitly use replicas while preserving transaction/primary callers.

## 6. Dead code

Removed the unsupported `db:drop` command, old prepared-query import, and obsolete
replica fallback. No additional deletion was justified. Historical migration SQL
is not dead code and was preserved.

## Verification

- Focused API checks: 104 tests passed; API typecheck passed.
- Locking-rule tests: aliases/wrappers/computed access rejected; primary and
  transaction exceptions accepted.
- Worker: 276 tests passed; worker typecheck passed.
- Shared backend: 41 tests passed.
- Legacy and v1 migration-copy regression suites: 33 tests passed. The v1 helper
  also passes strict JavaScript typechecking.
- Targeted API/worker ESLint and whitespace checks passed.
- Two broader schema-export harness tests still fail because their command stub
  does not recognize the branch's `sync-qv-rules-cli.ts` Makefile step. This is
  outside the Drizzle changes and was not silently changed here.
