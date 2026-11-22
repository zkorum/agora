# Coordinated upgrade: recovered intent and backfill order

Reviewed 2026-11-14. Analysis and sequencing proposal, not executable SQL or
approval to apply migrations. Generated SQL and snapshots were not changed
during this session-history review.

Follow-up: the user subsequently approved placing the prepared sources into
fractional Flyway files. The unpublished packaging was moved to V0116 after
upstream's project-document compression migration, preserving the data/contract
ordering and dedicated `.0.1` concurrent-index and `.13` validation phases. See
[`COORDINATED_UPGRADE.md`](../services/api/database/flyway/COORDINATED_UPGRADE.md)
for the actual files, ordering and remaining deployment gates.

## 1. Coverage and decision evidence

The project API exposed 1,676 OpenCode sessions: 746 roots, including this
session, and 930 children. Available user-message text was retrieved and screened
across the other 1,675 sessions: 18,043 messages, with no retrieval errors.
This was a repository-project inventory, not an account-wide search of unrelated
repositories. Missing migrated attachments were not reconstructed.

Titles were navigation aids, not authority. Relevant user decisions were read
chronologically, together with visible assistant explanations in ten core
sessions, current schema/code, prepared SQL, the generated draft, and historical
triggers. Screening does not mean every unrelated conversation/tool result was
read in full. Child task prompts cannot override the user's decisions.

| Decision | Session / original user evidence | Current meaning |
| --- | --- | --- |
| QV hierarchy | `ses_e7d1b7105ffeG9NrhwD5bagQUJ`, `msg_1891f4909001hcAgUy3xlXNKSm` (Oct 29) | `ranking` becomes `prioritizing`; comparisons and QV remain separate. Existing BWS is not converted into QV. |
| Publication boundary | Same session, `msg_1c9f4bce10011IbEUNoK11zZxw`, `msg_1c9f605e1001eEEnMt9dXVqKMT`, `msg_1c9f86dec001LBiGGN14aGBhNV` (Nov 11) | Method selection is draft-only. Backend creation is publication; no backend drafts in this slice. |
| Earlier comparison proposal | `ses_e76abfcccffeVXyKOWjAM8dDeD`, `msg_18cf161c5001QZNnGbaWv1llPc` (Oct 30) | Joint BWS/pairwise remain wanted; its vote-dependent conversion policy is superseded by Nov 11. |
| Retained individual inputs | QV session, `msg_1caa4a18d0015T3blFAnaDl0CP`, `msg_1caa7ae1b001VM2aSXCrZtaJQZ` (Nov 11) | Keep result-owned numerical inputs with removable account links across methods; hard-deletion implementation is separate. |
| Capture consistency | QV session, `msg_1cfd365230013V4t2UYWDuV07H` (Nov 12) | Exact close-time membership is unnecessary, but captured inputs, totals and participant counts must agree. |
| Live versus saved counts | QV session, `msg_1cff73268001EiPNxyDF0FdQdA` (Nov 12) | Public QV live statistics need only participant count. Frozen calculation counts are separate; one current result, not a history browser. |
| Static roles / authorization | QV session, `msg_1ce77b068001D0lE2pxFnlfMqX`, `msg_1ce8b8950001iofnPLA0kZSqAg`, `msg_1ce8ffb5b001qXf2c1x5kp0yAn` (Nov 12) | Persist roles, derive capabilities statically, check actor access once at controllers; preserve transactional/database business invariants. |
| Historical role assignment | QV session, `msg_1cfa85624001DACyKX6LVjfv3I`, `msg_1cfcdf4b70010MbPbdzubNOBZU` (Nov 12) | Assign Admin to historical memberships lacking a role, before NOT NULL. No hard-deletion worker in this task. |
| No default-resource history repair | QV session, `msg_1cfa17524001FPDX7anh6ZeyCU`, `msg_1cfa7a553001M0GIx4g1ll1xOT` (Nov 12) | No retrospective personal-default retirement; refuse deletion when it removes the last required active Admin. |
| Deleted-account live eligibility | `ses_e7d1ab3caffe5sFj8cHWAUZF0m`, `msg_183024078001tVZgAp02beQq1l` (Oct 28) | Exclude deleted-account inputs from live results; preserve frozen checkpoints/matrices. |
| Backfill placement | Same session, `msg_18944f557001HCuxlpQt1FSdMq` (Oct 29) | Ownership repair and live refresh belong in ordered fractional Flyway migrations, not ad-hoc production cleanup. |
| Pending Valkey loss | Same session, `msg_182fc98b7001SrCOpE97jXkh3g`, `msg_182fda4b000150a21tGajB2nhh` (Oct 28) | Losing pending guest votes on merge is accepted; do not reintroduce durable vote admission to preserve them. |
| Participant-created opinions | `ses_e76ad44ebffeCX7I2ilIbG4xvZ`, `msg_18952bb29001CKN2uuaSmCd3mF`, `msg_18957d937001U7OZXpDlOw4YDq`, `msg_1cf3cb4a1001TjPFQwKxcFoan9` | Mapping defaults ON, comparisons OFF, QV unsupported; persist the setting only on applicable configs. |
| Ticket entitlement purge | `ses_e76a4edf7ffeJu7F29nZmuuk7o`, `msg_18963eb14001JxoU2a1gt5pIx9` (Oct 29) | Only the narrow retired-entitlement purge is approved, not ticket/nullifier identity removal. |
| Large-migration behavior | QV session, `msg_1d46ba010001GdC6Ult7UFhCgf` (Nov 13) | Large work needs real nonblocking phases, not one DDL/backfill transaction. |

Supporting sources: [QV](quadratic-voting-implementation.md),
[comparison scope](pairwise-comparison-implementation.md),
[governance](organization-governance.md),
[participant policy](participant-statement-creation-plan.md),
[retention](participation-retention-preparation.md), and the existing
[migration audit](coordinated-migration-audit.md).

## 2. Is the overall direction good?

**Yes for the domain design; no for deploying the generated SQL unchanged.**

The useful separation is: mutable live participation; immutable result-owned
numerical evidence; private/removable account association; and later physical
cleanup. Method-specific storage/workers are justified. A universal vote table,
generic retention engine, backend drafts, live method conversion, or durable
Polis admission would reintroduce complexity the user rejected.

Static roles are simpler than arbitrary historical grants. The initial Admin
backfill is an **intentional privilege expansion**, not an inferred least-
privilege conversion. Preserve explicit role choices and deleted membership
status. Missing responsible people/owners still require reconciliation.

Missing old numerical evidence cannot be recovered by relabelling mutable
current responses. Missing captures and unclassified account-keyed blobs remain
irreversible-unlink blockers, not permission to fabricate ballots or erase results.
Account-unlinked data is not automatically guaranteed anonymous. Technical
readiness and legal/operational approval remain separate.

Several features, data repairs, database-only contracts and serializer changes
were generated into one draft. A green `drizzle-kit check` validates metadata,
not populated-data readiness, stored functions, lock duration or rollout.

## 3. Additional findings in the generated draft

The findings below describe the original unpublished Drizzle draft
(`20261114120826_conscious_luminals`), since superseded by a consolidated
generation from upstream V0115.

- **302 timestamp type alterations are textual normalization only relative to the
  pre-upgrade snapshot:** `timestamp (0)` → `timestamp(0)` and equivalent
  precision-preserving forms. All 302 were compared. Confirm actual target
  catalog types, then remove unnecessary deployment statements. Truncating
  historical timestamps is not an intended data backfill.
- There are **118 CREATE INDEX statements**, including rebuilds—not 118 proven
  new requirements. Review structural equivalence and relation sizes first.
- The generated enum recreation cannot cast existing `ranking` strings into an
  enum omitting that value. Prefer a reviewed native enum-label rename where
  compatible, coordinated with discriminator data and stored functions.
- Required organization roles and vote ownership/account FKs precede their
  required data preparation.
- Snapshot generation does not replace SQL/PLpgSQL scoring bodies referencing
  old relation, transition-table column and enum names.
- `DROP COLUMN ranking_score.group_sources_snapshot` is irreversible data
  removal. Removing plural BWS code does not establish that all deployed blobs
  are empty/dispensable. Inspect/classify them; defer the drop if unresolved.
- New comparison checks require legacy answers to satisfy position,
  distinct-choice and candidate bounds. Bad accepted history is a review blocker,
  not permission to silently rewrite answers.

## 4. Required data work and prerequisites

Prepared paths below are relative to `services/api/scripts/`.

| Data work | Prerequisite | Must precede | Boundaries |
| --- | --- | --- | --- |
| `prepare-organization-role-backfill.sql` | Role enum and **nullable** role column | No-missing-role verification, NOT NULL, governance | Set only missing roles to Admin, including inactive history; never reactivate or replace explicit roles. |
| Existing comparison subtype | Nullable `conversation.prioritization_type`; known legacy ranking rows | Final subtype CHECK and new method-specific readers | Existing ranking becomes `prioritizing/comparisons`; preserve config, BWS method, IDs and answers. |
| `repair-guest-merge-vote-ownership.sql` | Existing content/opinion relations and coordinated vote writers | `vote_current_content_owner_fk` enforcement/validation | Copy exact cross-owned current values/timestamps into destination-owned content; abort on cross-opinion corruption. |
| Participant/account consistency, **conditional** | Inspect vote/group bindings and actual V0111.1 state | New composite participant/account FKs | Repair only from authoritative scope/account facts; otherwise stop. Do not blindly rerun the full historical participant backfill. |
| `prepare-deletion-intent-backfill.sql` | Intent/hidden/retirement-cycle columns and compatible scoring/AI triggers | Dependent source-intent validation and live refresh | Discovery times are not historical deletion requests; preserve seed content and frozen evidence. |
| Data part of `prepare-realtime-retention-contract.sql` | Delivery timestamps/replay floor and compatible event readers | Retention/pruning enablement and replay verification | Preserve IDs/topics; timestamp legacy delivered rows at discovery; scrub obsolete free text. Never guess delivery age for pending events. |
| `refresh-deleted-account-live-inputs.sql` | Ownership repair, source normalization, correct eligibility and renamed scoring functions | Compatible workers reconcile live results | Update working counts/dirty revisions only. Preserve finalized results/history. Record once rather than rerunning arbitrary maintenance. |
| Retired ticket entitlement removal (`V0115.1`) | V0115 applied; incompatible writers drained | V0116 and the ticket-free runtime contract | Use the exact hash-pinned migration. Do not broaden the purge or change deployed checksums. |
| `backfill-default-project-directory-visibility.sql` (`V0116.15`) | Existing conversation indexing intent and current content, after lifecycle repairs | Deploying project-aware feed/crawler discovery | List qualifying active auto-provisioned projects only; keep named projects and conversation flags unchanged. |

The participant-policy plan explicitly gives existing mapping configs true and
comparison configs false. QV has no permission field. This changes creation
permission, not existing opinions, answers or normal voting.

### Do not backfill these

- Historical QV ballots, allocations, calculations or results: these are new tables.
- Synthetic `ranking_input_*` evidence from today's mutable comparison responses.
  Missing exact evidence stays an explicit legacy blocker.
- Invented deletion reasons, recovery request/deadline dates, old credential
  reservations or personal-default retirement-cycle markers.
- Mass comparison identity detachment just because `detached_at` now exists.
- Historical learner conversion/recalculation of frozen results solely because
  joint BWS replaces the live learner.
- Backend drafts, Gathering fields/responses and translations, or post-close
  selection roots. The tables are new; no old published activity implies any
  corresponding working draft, saved response, or certified closing capture.
- Existing conversations keep their participation mode through the
  `conversation_override` default. Setting them all to inherit the new project's
  `guest` default would change admission. Historical ranking items are comparisons,
  not QV items; the new QV position does not require inventing a retained order.
- Existing numerical payloads remain version 1; `uses_closing_inputs` defaults
  false on old work. Do not manufacture baseline certificates, account mappings,
  or retroactive permission to retain account-hidden text.

`conversation_export_object` needs operational verification, not guessed SQL
history: `cleanupExportObjects` already discovers legacy artifact keys in
bounded batches and registers durable addresses before clearing references.
Check the configured bucket/region against storage history.
`source_data_generation` is captured on export claim; a legacy null causes
artifacts to regenerate rather than asserting an invented old source revision.

## 5. Recommended dependency order

This is a graph, not “put all backfills after V0115.” Assign actual versions after
the reviewed split and target history are known.

### A. Preflight and narrow the draft

Inspect actual Flyway history/schema, relation/index sizes, long transactions,
WAL/disk headroom and replica lag on the explicitly selected database. This review
did not connect to it. An incomplete old-schema audit does not mean zero blockers.

Count missing roles, orphan owners/admins, cross-owned vote pointers, participant
mismatches, invalid comparison answers, legacy blobs, unfinished closes and
retained results without exact captures. From the V0115 baseline, ticket
retirement runs first in the normal forward migration.

Remove verified serializer-only SQL; hold destructive column removal if legacy
data classification has not established a safe action.

### B. Compatible expansion

Create new empty tables and compatible nullable columns. Add role nullable, with
no permanent Admin default. Keep new features/purge callers off. Build required
large existing-table indexes in separate reviewed nontransactional/concurrent
phases where appropriate.

### C. Reconstructible pre-constraint data

Run the role backfill and ownership repair with their prerequisites. Audit/fix
participant bindings only where their mapping is established. Prepare comparison
discriminators before the final subtype CHECK.

Large work needs bounded batches, progress, short commits and a final
catch-up/write fence where old writers can add rows after a high-water mark.
Do not hold DDL locks throughout unbounded updates.

### D. Coordinated naming/function cutover

Drain incompatible API/import/analysis/scoring/email writers as applicable.
Preserve data through renames, coordinate enum label/discriminator changes, and
install forward function replacements before post-rename mutations can execute
old bodies.

Replace `mark_ranking_scoring_input_dirty`, inserted/updated/deleted comparison
transition-table handlers and account-source invalidation as needed. Replacing
only the account handler is insufficient. Preserve append-versus-invalidation
semantics and pending-close retargeting.

The current old/new binaries are not safely rolling-compatible. Expensive
backfills must not be hidden in this cutover transaction. Actual pause duration
requires a populated rehearsal; no zero-lock promise is justified.

### E. Intent, replay and live normalization

After their columns and compatible trigger bodies exist, run staged intent/
hiding and replay data work, then the one-time live eligibility refresh. Do not
run updates that fire invalid old scoring functions. Only compatible workers
should consume the newly dirty work.

Some jobs may move earlier using old-name-compatible SQL; some must move later.
Choose the boundaries explicitly. Current unbounded staging scripts are not
already online-safe merely because they can be put in fractional SQL files.

### F. Constraints and database-only contracts

- Set role NOT NULL after verification; enforce/validate ownership/account FKs
  after repairs and referenced uniqueness prerequisites.
- Where supported, install existing-table CHECK/FK constraints NOT VALID and
  validate separately. **NOT VALID still constrains new writes.** It does not
  let incompatible writers continue. UNIQUE/PRIMARY KEY need a different plan.
- Reconcile orphan organizations/projects before governance; trigger creation
  does not retroactively certify old data.
- Install participant-unlink, device-retirement, replay-boundary, ranking
  account-source and comparison retained-input contracts after their schema
  prerequisites, coordinated with compatible writers.
- Put database-only contracts and approved data work in ordered fractional
  Flyway phases. `V0116.1` cannot repair a failure earlier inside V0116.

### G. Rehearse, enable and observe

Rehearse the real ordered upgrade from a populated pre-upgrade baseline, not
`pushSchema` into an empty database. Preserve IDs/answers/checkpoints and exercise
actual triggers, merge/withdrawal, deleted accounts, pending closes, replay and
ownership handover.

Deploy compatible API/frontend/import/email/analysis/scoring services and the
new credit-voting worker as needed. Replica-routing completion and worker
packaging are separate release gates. Keep permanent purge disabled while
evidence/context/restore-journal/storage gates remain unresolved.
Generation approval is not application approval.

## 6. Recommended next action

Keep the generated snapshot: no database cleaning or repeated interactive rename
selection is needed. Prepare a reviewed **expand → data → cutover →
contracts/validation** deployment split, remove verified normalization churn,
and rehearse it against representative populated data.

Do not independently edit copied Flyway SQL and then rerun the copier: mismatch
refusal is intentional. If one generated draft becomes several reviewed deployment
phases, record that explicit source-to-phase mapping and verify approved hashes;
do not create another copy or silently overwrite a reviewed one.

The architecture does not need another redesign first. The missing work is
deployment composition, data-readiness evidence and a migration-backed test,
not more speculative domain abstractions.
