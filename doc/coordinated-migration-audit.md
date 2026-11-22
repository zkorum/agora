# Coordinated schema and backfill audit

See [the expanded session-history review and backfill order](coordinated-backfill-order.md)
for the project-wide intent review, additional generation findings, and proposed phases.

Reviewed 2026-11-14 against HEAD `a64f5281` and the dirty working tree.

**Status: Drizzle v1 conversion and the rebased V0116 fractional deployment split
are staged for review, not production deployment approval.**
One raw RC5 migration now supersedes the unpublished schema drafts. The Flyway
split reuses the prepared SQL sources and places required data work before
generated constraints. No
application database was migrated or inspected. Target-history/data readiness,
production-scale locking/batching, and application routing remain open.

## 1. Product decisions recovered from session history

Session titles alone are misleading: several sessions changed scope substantially.
The following records were read through OpenCode's session API, alongside the
current implementation and local planning documents.

| Session | Work and latest relevant decision |
| --- | --- |
| `ses_e76abfcccffeVXyKOWjAM8dDeD` — Plan dynamic pairwise and bws switching | Added pairwise and method-neutral comparison naming; joint BWS learning replaces sequential learning. October 29 live BWS/pairwise switching was narrowed October 30 to zero-effective-vote conversion, then superseded by the November 11 publication policy below. Pairwise UI changed; the broader BWS interaction redesign was deferred. |
| `ses_e7d1b7105ffeG9NrhwD5bagQUJ` — Quadratic voting plan and code architecture review | QV creation, saved responses, worker-owned live participant counts, close/reopen calculations and frozen numerical inputs; later expanded into organization roles and retention/legal work. |
| `ses_e7d1ab3caffe5sFj8cHWAUZF0m` — Deletion service readiness and DELETE account gaps | Guest-merge vote ownership, exclusion of deleted accounts from live computation, and preparation for account unlinking. The user explicitly requested eventual fractional Flyway placement of the ownership repair and live-input refresh, not immediate execution. |
| `ses_e76ad44ebffeCX7I2ilIbG4xvZ` — Facilitator toggle for BWS participant statements | Mutable participant-statement permission on Polis/comparison config tables; no permission field on QV config. Polis defaults ON, comparisons OFF. Also improved first-guest submission/auth-state handoff. |
| `ses_e76a4edf7ffeJu7F29nZmuuk7o` — Plan to remove all traces of Zupass support | Remove ticket gating and integrations; preserve retired ticket/nullifier storage. Explicitly approved permanent removal of only retired event-ticket premium entitlements. |

### Method selection is intentionally draft-only

In the QV session, the user explicitly changed direction on November 11:

- 09:33 UTC, message `msg_1c9f4bce10011IbEUNoK11zZxw`: everything is editable in a
  draft; method identity becomes fixed when live.
- 09:35 UTC, message `msg_1c9f605e1001eEEnMt9dXVqKMT`: explicitly includes pairwise,
  quadratic and BWS; ordinary method-specific settings remain editable.
- 09:37 UTC, message `msg_1c9f86dec001LBiGGN14aGBhNV`: no backend drafts in this
  slice; keep the design simple and typesafe.

Therefore pairwise ↔ QV, BWS ↔ pairwise and Polis ↔ prioritization are supported
only in frontend-local creator drafts. Publishing fixes identity even with zero
votes, after Undo/withdrawal or after close/reopen. This is not caused by the
database table rename.

Current enforcement:

- `services/shared/src/utils/conversationTypeConfig.ts`:
  `canEditPublishedConversationTypeConfig`.
- `services/api/src/service/postEdit.ts`: checks that policy after taking the
  conversation write lock and rereading settings, before content mutations.
- `doc/quadratic-voting-implementation.md` and
  `doc/pairwise-comparison-implementation.md`: authoritative sections supersede
  archived conversion plans below them.

QV's permanent first-accepted-Save **statement** lock is a separate rule. It does
not mean method conversion is allowed before that Save.

## 2. Drizzle prompt answers

The pre-upgrade baseline was `services/api/drizzle/meta/0113_snapshot.json`,
corresponding to Flyway `V0114__nice_bloodaxe.sql` (numbering differs).
Its v1 location is
`services/api/drizzle/20261109150108_nice_bloodaxe/snapshot.json`. v1 snapshots
may be incremental; use Drizzle Kit's reconstruction rather than treating the
latest file as a complete schema.
The API schema copy matches the canonical source apart from its generated header.

There are exactly three removed table names and three replacement names:

| New table | Choose |
| --- | --- |
| `comparison_answer` | Rename `maxdiff_comparison` |
| `comparison_response` | Rename `maxdiff_result` |
| `comparison_user_entity_score` | Rename `maxdiff_user_entity_score` |

For column prompts, rename `maxdiff_result_id` → `comparison_response_id` on
**both** `comparison_answer` and `comparison_user_entity_score`. Preserve IDs,
candidate order, answers, response linkage, timestamps and tombstones.

Other newly declared tables are genuinely new: choose **create**, not an unrelated
legacy comparison table:

- `credit_voting_config`
- `qv_response`, `qv_response_version`, `qv_allocation`, `qv_response_command`
- `qv_live_stats`, `qv_stats_refresh`
- `qv_calculation_state`, `qv_calculation`
- `qv_input_snapshot`, `qv_input_item`, `qv_input_ballot`,
  `qv_input_allocation`, `qv_result_item`
- `ranking_input_snapshot`, `ranking_input_participant`, `ranking_input_item`,
  `ranking_input_answer`
- `conversation_export_object`, `retired_device_key`

Do not infer any other rename merely from similar types or names. In particular,
`ranking_conversation_config.ranking_mode` remains its storage name.

Generation creates review artifacts; it is not approval to run `db:migrate`.
Do not run a second generator while the user's interactive generator is active.

### Generation failure after the correct rename decisions

The user's attempt with `drizzle-kit@0.31.10` crashed in
`preparePgAlterColumns` at `bin.cjs:26344`:

```text
TypeError: Cannot read properties of undefined (reading 'columns')
```

The installed implementation has already constructed `columnsPatchedSnap1` with
the resolved table/column renames, but passes the original `json1` snapshot into
`preparePgAlterColumns`. That helper looks up the **new** table/column key in
the **old** snapshot. This is the bug described in
[upstream issue #3539](https://github.com/drizzle-team/drizzle-orm/issues/3539).
Identity sequence changes on renamed identity tables can also trigger this path;
merely separating obvious column changes is not a guaranteed workaround.

There is a second error-handling defect: `prepareAndMigratePg` catches and prints
the exception without setting a failure exit status (`bin.cjs:32215–32217`).
Consequently the package command's `&&` still runs the SQL copy/rename script.
`Transfer starting` does not mean generation succeeded.

Post-failure inspection found no new coordinated SQL or snapshot, no new journal
entry, and no new versioned Flyway migration. The existing journal diff is only
its already-present trailing newline. No database migration command was run.

The user subsequently approved upgrading ORM and Kit to exactly `1.0.0-rc.5`,
following the official v1 migration guide. This supersedes the earlier local-patch
recommendation. Do not change rename choices to create/drop or remove identity
generation to bypass the original crash.

### Official v1 history upgrade: verified metadata repair

Before conversion, the journal had 114 entries but only 113 snapshots: entry
0032 referenced the missing `meta/0032_snapshot.json`. The repair was tested on
temporary copies before the user approved applying it to repository history.

Commit `c56945ff` renamed that snapshot to 0033 while retaining journal entry
0032. The original snapshot is recoverable verbatim with
`git show 'c56945ff^:services/api/drizzle/meta/0032_snapshot.json'`
(SHA-256 `832f90dfaebd2b42e0aa1d65936651f30bd81d162ada47d38e94993e05f2a71a`).
Restoring it alone is insufficient: 0033 still points to 0031, creating two
branches that both add `conversation.is_closed`. v1's `check` correctly rejects
that conflict.

The approved repair, verified on a second temporary copy and then applied, was:

1. Restore the original 0032 snapshot verbatim.
2. Change only 0033's `prevId` from
   `2c5c93d9-85d4-4baf-869c-94d2a37f3f7b` to restored 0032's ID,
   `7e0b4440-6a3b-4896-8583-1634d659ab5d`.
3. Run the official `up`, then `check`.

Both commands passed on the copy and on the real repository history, upgrading
114 migrations to timestamp-named folders containing `migration.sql` and
`snapshot.json`. Every migrated SQL file was compared byte-for-byte with its
original: zero differences. All 174 files under `services/api/database/flyway/`
were also checked against their pre-conversion SHA-256 hashes: unchanged,
including filenames and contents. This is a
necessary historical **metadata** repair, not permission to change historical
Flyway SQL or replay old Drizzle SQL. The latter already contains differences
from deployed Flyway migrations (including a duplicated `is_closed` addition in
0033); Flyway remains the deployment source of truth.

No database migration was applied. A complete pre-conversion history backup,
file hashes, and the official `up`/`check` reports were retained outside the
repository at
`/private/var/folders/sd/wks8crcd4dj17kdp9j41j28w0000gn/T/opencode/drizzle-v1-upgrade-xza6iynj/`.
The Flyway-copy script now dispatches v1 folders to
`services/api/scripts/copy_drizzle_v1_migrations.mjs`. The bridge pins the names
and SQL hashes of all 114 converted migrations and requires the unchanged
`V0114__nice_bloodaxe.sql` baseline anchor. It never replays those historical
Drizzle files, whose contents can intentionally differ from Flyway's deployed
SQL. New folders receive the next four-digit Flyway main version, with the full
Drizzle folder ID in the description to disambiguate reused random names.

The bridge locks version allocation, refuses overwrites and modified copies,
checks all pending plans before copying, and leaves Drizzle SQL/snapshots alone.
Rerunning it is idempotent. The legacy flat-file mode remains for historical
tooling, while mixed formats are rejected. A leftover `.drizzle-copy.lock` after a
crash must be inspected manually; another process's lock is never removed.

### Original generation and copy result (historical)

The user's interactive RC5 generation succeeded at
`services/api/drizzle/20261114120826_conscious_luminals/migration.sql`.
Its table/column, comparison unique/check, index, and comparison FK selections
preserve the intended renames. The unusual `vote` FK selection generates an
intermediate rename, then explicitly drops/recreates `vote_participant_account_fk`
on `(participant_id, author_id)` referencing
`conversation_participant(id, user_id)`, matching the canonical schema. It also
creates `vote_current_content_owner_fk` with the intended ownership columns.
The final FK definitions are correct; existing data still needs its repair
before these constraints can be enforced.

Initially only the failed copy step was resumed, without regeneration:

- Superseded Flyway draft: `V0115__20261114120826_conscious_luminals.sql`
- SQL SHA-256: `2339f3204e100a136c2625fe66b21221eb98d64bbe41975cbd3fec286ea18f36`
- Source and copied SQL were initially byte-identical; the approved deployment
  split below now replaces that unsplit Flyway draft.
- All 174 preexisting Flyway files remain byte-identical.
- A second copy run created nothing.

**Do not apply the raw Drizzle draft as-is.** Its generated enum conversion casts existing
`ranking` values into an enum containing only `polis | prioritizing`, and it adds
`organization_membership.role NOT NULL` before filling existing rows. It also
adds the new vote ownership/account FKs before the planned data repairs. These
are the ordering/correction blockers detailed below, not reasons to repeat the
interactive rename prompts.

### Approved fractional placement (now V0116)

Following the user's explicit instruction to place the prepared sources in
fractional Flyway files, `V0116` contains generated expansion/renames with
the narrowly required corrections. `.1` replaces affected scoring functions;
`.2`–`.7` provide historical roles, subtype, ownership, intent, replay and live
refresh; `.8`–`.10` install prepared identity/device/comparison contracts;
`.11` applies required roles and generated FK/CHECK constraints; `.12` installs
governance after checking existing owner/Admin integrity. `.14` installs retained
Polis and participant-eligibility guards; `.15` backfills default-project discovery.

The prepared bodies are reused, not replaced by a new backfill policy. The
consolidated Drizzle source and snapshot start from upstream V0115. A hash-pinned reviewed
mapping makes the copier verify all deployment phases instead of replaying the
raw draft. See `services/api/database/flyway/COORDINATED_UPGRADE.md`.

The populated recorded-baseline rehearsal passes, including real historical
triggers, legacy BWS rows, cross-owned content, deleted accounts/memberships,
frozen counts and replay data. Negative tests retain unclassified legacy group
data and reject orphan governance instead of fabricating repair decisions.
This is not a complete production-history/scale rehearsal or an applied migration.

The subsequent completeness/performance pass compares the resulting columns,
enums, constraints and standalone indexes against a fresh final-snapshot schema.
They match. It removes 91 catalog-proven equivalent index rebuilds and 113 CHECK
replacements in addition to the 302 timestamp no-ops. Necessary existing-table
indexes/uniqueness move to nontransactional `.0.1` concurrent builds; data phases
use committed keyset batches. Existing-table CHECK/FKs install NOT VALID in `.11`
and validate separately in `.13`, including the final role NOT NULL transition.
The original logical data/contract phases remain in place.

## 3. Upgrade blockers beyond the prompts

### A. Conversation hierarchy and enum values

The old enum is `polis | ranking`; the target is `gathering | polis | prioritizing`.
Existing ranking conversations also need `prioritization_type = 'comparisons'`.
They must keep their existing ranking configuration and BWS mode.

Review generated enum conversion carefully: casting the old string `ranking`
directly into a replacement enum without that label fails. PostgreSQL's native
enum-value rename is a possible low-rewrite implementation, but Drizzle may not
express it as such. Any necessary generated-SQL correction must be explained and
reviewed, not silently substituted.

The old subtype CHECK and functions containing `'ranking'` must be accounted for
before removing/renaming that label. Install the final subtype CHECK only after
existing comparison rows have their discriminator. Old API/worker binaries are
not automatically compatible with renamed tables or enum labels.

### B. Required organization role

Canonical `organization_membership.role` is required without a default. Adding it
as `NOT NULL` directly fails on a populated table.

Required order: nullable addition → historical-role backfill → verification →
required constraint → governance guards. The approved backfill assigns Admin to
every historical membership lacking a role, including deleted memberships without
reactivating them; it preserves explicitly assigned roles. This privilege
expansion was intentional and confirmed November 12 in the QV session.

Installing governance triggers does not retroactively validate all old rows.
Separately check active organizations have active-account Admins and active
projects have active owners; assigning historical roles cannot repair an
organization with no eligible membership.

### C. Vote-content ownership

`repair-guest-merge-vote-ownership.sql` must precede validation/enforcement of
`vote_current_content_owner_fk`. It copies the exact currently referenced value
into a content row owned by the destination vote, then switches that pointer.
It does not infer new participation or rewrite historical numerical snapshots.

An actual cross-statement mismatch intentionally aborts the script for review.

### D. SQL function bodies are not covered by Drizzle snapshots

Active scoring functions installed by `V0082.1` and `V0089.1` contain
`maxdiff_result`, `maxdiff_result_id` and/or `'ranking'`. Renaming relations does
not reliably rewrite textual PL/pgSQL bodies or transition-table field accesses.

A forward migration must replace the affected live definitions, including
`mark_ranking_scoring_input_dirty`, comparison insertion/update/deletion handlers,
and account-source handling. `prepare-ranking-account-source-contract.sql`
replaces only the account handler, not the whole dependency set.

Do not edit historical migrations. Preserve append-versus-invalidation semantics
and pending-close retargeting. Exercise the actual triggers after upgrade.

`conversationFinalization.test.ts` adapts historical SQL with string replacements
inside its fixture setup; `surveyOptionText.test.ts` installs historical scoring
SQL against a current-schema fixture. Neither substitutes for an ordered upgrade
test. Most new QV/retention suites push the canonical schema into empty containers.

### E. Frozen numerical evidence

Do not fabricate old `ranking_input_*` captures from today's resumable responses.
Missing historical evidence and unclassified legacy trust context remain explicit
unlink blockers. Account purge/hard-deletion remains a separately gated project.

## 4. Prepared SQL dependency inventory

All paths below are under `services/api/scripts/`.

| Prepared source | Required placement | Deployment concern |
| --- | --- | --- |
| `repair-guest-merge-vote-ownership.sql` | Before the new vote/content ownership FK is validated/enforced | Current script explicitly requires stopped vote writers; INSERT/UPDATE is unbounded. Do not call it online-safe unchanged. |
| `prepare-organization-role-backfill.sql` | After nullable role addition, before NOT NULL and governance installation | Unbounded UPDATE. Batch if measured size requires it; no permanent privilege-granting default. |
| `prepare-deletion-intent-backfill.sql` | After intent/hidden/retirement columns and personal-project retirement marker exist; before dependent rollout enablement | Multiple unbounded UPDATEs, source/AI/scoring trigger side effects; requires drained legacy writers. Never invent recovery deadlines or historical deletion reasons. |
| `prepare-participant-unlink-contract.sql` | After participant foundation (`V0111.1`), nullable identity support and compatible readers; before unlink enablement | Replaces the existing binding function and adds anti-reattachment protection. Validate existing participant/account pairs before new composite FKs. |
| `prepare-device-retirement-contract.sql` | After `retired_device_key` exists, before retirement callers are enabled | Installs a device write guard; confirm all device paths and target indexes. |
| `prepare-ranking-account-source-contract.sql` | After comparison rename and account-source columns, before account lifecycle cutover | Replaces one scoring handler/trigger; not a complete comparison-trigger rename migration. |
| `prepare-realtime-retention-contract.sql` | After delivery timestamp/replay-floor columns; coordinate compatible producers/readers | Mixes unbounded outbox UPDATEs and trigger DDL. Split those phases for a large outbox. |
| `refresh-deleted-account-live-inputs.sql` | After comparison rename and corrected live eligibility; coordinate after historical intent/source normalization | Retallies votes and advances live analysis/scoring revisions. Current script requires stopped writers; not fully operationally idempotent because reruns advance revisions. Preserve frozen results. |
| `prepare-organization-governance.sql` | After role backfill, required role/indexes and existing organization/project reconciliation | Multi-table trigger installation needs brief metadata locks. Trigger creation alone does not prove legacy data meets the invariant. |
| `prepare-comparison-retention-contract.sql` | After renamed nullable comparison sources and all `ranking_input_*` tables; coordinate compatible scoring writer | Sealing/immutability/unlink guards; drain incompatible scoring writers. Legacy evidence blockers must remain blockers. |

`services/api/database/flyway/V0115.1__retire_zupass.sql` is hash-pinned by
the soft-delete policy. It runs after the deployed V0115 baseline and before
V0116; its approved SQL is unchanged.

### Fractional versions must separate real phases

A `.1` file runs **after its parent version's entire migration**. It cannot repair
an earlier failing required-column addition or FK within that parent file.

Use the following dependency order, assigning actual versions only after reviewing
the generated statements and target Flyway history:

1. Preflight and any prerequisites that can run against the old schema.
2. Generated expand operations: new empty tables and compatible nullable columns.
3. Approved data preparation: role backfill, ownership repair and hierarchy data.
4. Required constraints/validation and coordinated table/enum/writer cutover.
5. Updated PostgreSQL functions and supported integrity guards.
6. Source-intent/live projection/outbox work in separately reviewed phases.
7. Compatible workers/API/frontend enablement and post-deploy verification.

Some dependencies require finer interleaving; this is a graph, not a blanket rule
that every prepared script belongs after one monolithic generated migration.

## 5. Nonblocking deployment requirements

There is no zero-lock promise. Table/column renames and most ALTERs need brief
metadata locks; an ALTER waiting behind a long transaction can queue subsequent
traffic. The operational goal is bounded waits, short transactions and independently
observable expensive work.

- Measure relation/index/TOAST sizes, affected rows, write rates, long transactions,
  WAL/disk headroom and replica lag on an explicitly selected database first.
- Set reviewed short lock timeouts on DDL phases; fail/retry rather than wait
  indefinitely. Keep long scans/backfills out of transactions holding ALTER locks.
- Existing-table indexes may need `CREATE INDEX CONCURRENTLY` in dedicated
  nontransactional Flyway files with per-file configuration; never disable
  transactions globally. New empty-table indexes normally do not need this.
- Add supported existing-table CHECK/FK constraints `NOT VALID`, then validate in
  separate transactions after data readiness. UNIQUE/PRIMARY KEY do not support
  that shortcut; consider concurrent unique-index construction plus attachment.
- Preserve structurally equivalent existing indexes where possible rather than
  drop/rebuild solely for renamed labels. Review sequence/constraint names too.
- Large backfills need keyset batches, short commits, explicit progress/retry
  semantics and throttling. Merely putting an UPDATE in `.1` does not batch it.
- Current ownership repair and counter refresh require writer coordination.
  Either accept a bounded affected-writer pause after measurement, or separately
  design/test online coordination. Do not silently remove their safety condition.
- Table/enum renames prevent a naive old/new rolling deployment. Drain incompatible
  API/import/analysis/scoring writers as appropriate, or design an explicit
  compatibility expansion before claiming uninterrupted writes.

See `doc/retention-rollout-readiness.md` for the bounded read-only audit and online
DDL strategy. Its report is not itself a migration safety certificate.

## 6. Validation gates once generation finishes

1. Review **both** Drizzle SQL and copied Flyway SQL, metadata/journal changes,
   rename mappings, identity sequences, FK targets and every destructive operation.
2. Rehearse the actual ordered Flyway chain in disposable PostgreSQL, first empty,
   then from a representative populated pre-upgrade baseline. Do not use
   `pushSchema` as the upgrade test.
3. Include legacy BWS answers/personal scores, soft-deleted history, mismatched
   guest-merge ownership, old memberships, deleted accounts, finalized/pending
   closes, outbox replay and old ticket entitlements.
4. Assert preserved IDs/answers/order/links and numerical checkpoints; correct
   hierarchy/participant defaults; valid constraints/indexes; updated functions;
   required roles; no resurrection or invented recovery eligibility.
5. Exercise new writes after upgrade, including comparison save/Undo/scoring
   invalidation, account lifecycle, QV Save/withdraw/close/reopen/result publication,
   statement permissions, governance and SSE replay.
6. Rehearse contention with concurrent readers/writers and long transactions.
   Record lock wait/hold duration, latency, WAL/I/O and lag, not just SQL success.
7. Run affected API/frontend/worker suites and authenticated standalone/project/
   embedded journeys. Source-schema test success is not upgrade-path evidence.

### Checks performed in this review

- Six shared publication-policy/QV math tests pass. The policy test checks all
  36 pairs of its six configurations.
- Canonical/API schema synchronization and baseline table-name comparison checked:
  20 genuinely new tables plus three renamed tables, no other removed table names.
- Session decision history, prepared SQL and selected historical trigger/test
  dependencies reviewed.
- No generated coordinated migration, database audit, populated upgrade rehearsal,
  production-scale benchmark or migration-backed integration run has occurred.
