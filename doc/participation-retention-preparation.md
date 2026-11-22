# Participation retention: preparation and boundaries

Status: local implementation/design note. The original preparation did not change schema; the QV/comparison persistence follow-ups below record canonical source changes. No migration or hard-delete worker is part of this work. The [concise legal wording and all 10 translations](participation-retention-legal-review.en.md) are integrated for review; they describe the intended finished cleanup behavior, not implementation status. Nothing has been published.

## One rule, three separate responsibilities

| Responsibility              | Owns                                                                                 | Must not do                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Live participation          | Admission, current response/vote pointers, withdrawal, account hiding/recovery       | Reactivate deleted/detached participants from retained inputs                             |
| Retained numerical evidence | Exact inputs behind a retained result, numerical provenance, saved results/counts    | Require a continuing account profile or expose private ballots                            |
| Identity and later cleanup  | Private recovery associations, irreversible unlinking, source/operational tombstones | Change sealed numbers or erase result-owned evidence merely because an account is deleted |

Soft deletion expresses exclusion/intent, not completed erasure. A `deletedAt` on a working source is not sufficient permission to hard-delete numerical values still owned by a retained result. Either preserve that evidence independently before retiring the source or retain the necessary numerical rows without retaining their account graph. Applicable separately scoped erasure requests and parent deletion are different boundaries.

## Code organization prepared now

- `services/api/src/service/account.ts`: account-deletion orchestration, credential reservation, session revocation and transaction/lock ownership.
- `services/api/src/service/accountRecovery.ts`: verified recovery, deadline checks and fresh session creation. It no longer imports deletion orchestration to reuse unrelated helpers.
- `services/api/src/service/accountDatabaseTime.ts`: authoritative database wall time after lock waits, shared by deletion and recovery.
- `services/api/src/service/accountLiveInputs.ts`: one typed hide/restore boundary for personal statement/item visibility, QV root visibility, existing live reconciliation and content-free invalidation. It does not change numerical response values or account associations. Hiding uses the deletion transaction's database timestamp, not another application-clock timestamp.
- `services/shared-backend/src/accountParticipationSources.ts`: schema-backed detection of still-account-linked Polis, survey, comparison and QV sources before existing unlinking. This isolates future retention/source-handoff checks without weakening today's blockers.
- `services/shared-backend/src/deletionIdentity.ts`: existing guarded account-link removal only; not a new user-facing purge action.
- `services/shared-backend/src/qvAccountLifecycle.ts`: QV merge/private-source retirement. Frozen QV inputs are now separate `qv_input_*` rows with no private response/version/account FK, so source tombstones cannot erase their evidence. No physical purge is enabled by this separation.
- `services/shared-backend/src/qvStatsRefresh.ts` and `services/credit-voting-worker`: transactionally scheduled live participant refreshes, one Python-owned current count/revision and participant-only SSE. Account hiding/recovery changes live eligibility/counts, never frozen result evidence. `qv_stats_refresh` signals are operational cleanup candidates, not numerical evidence or a ballot/results history. The count projection and pending signals remain parent-owned; their later physical cleanup is outside this implementation.

No universal vote table, generic retention engine, backend drafts, or hard-delete framework is introduced. Keep method-specific numerical storage and workers; share identity/lifecycle invariants and ordinary typed Drizzle queries.

## Persistence implementation and rollout status

| Method         | Existing source                                                                                                                               | Target retained numerical evidence                                                                                                                                                   | Remaining boundary                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Polis          | Account-linked live votes; indexed snapshot matrices and separate local participant associations                                              | Preserve matrix cells/local participant rows and saved numerical artifacts                                                                                                           | Keep live account eligibility separate from frozen reads and eventual identity removal                                                |
| BWS / pairwise | Resumable `comparison_response` has a removable private account FK, irreversible `detached_at`, canonical answers and private personal scores | `ranking_input_*` owns local participant indices, original/effective candidate sets, ordered accepted tasks, the effective entity catalogue and method/algorithm/pipeline provenance | Source implemented; legacy results without evidence explicitly block unlinking; migration/upgrade validation and rollout remain gated |
| QV             | Conversation-local participant -> current response -> immutable versions/sparse allocations                                                   | Exact sealed allocations, frozen statements and fixed budget/pricing/opposition/rule provenance behind **one current** input/result set                                              | Source implemented; migration/upgrade validation, rollout and future parent-graph physical cleanup remain gated                       |

QV follow-up (2026-11-13): the target persistence and writer-authorized aggregate
read path are implemented in source. Worker-time capture commits before tallying;
retries use the saved capture. Account deletion before capture can exclude a user,
whereas later deletion/hiding/unlinking cannot change the frozen values or result
participant count. Snapshots use fresh local ballot indices, not account-linked
source pointers. Reopen hides the current calculation; re-close replaces its current
reference after completion, without a history API or physical-version-count promise.
Migration/upgrade validation, deployment and parent-graph physical cleanup remain
separately gated.

Comparison follow-up (2026-11-13): the complete `ranking_input_snapshot`, local
participants, ordered entity catalogue and answers commit before computation,
outside conversation/config publication locks. Each existing statistics/checkpoint
publication atomically attaches its prepared capture with scores, counts and current
pointers, including empty results. Capture uses the same repeatable-read input
already used by Solidago, not a later reread of mutable sessions. The shared normalizer preserves both the accepted
candidate order and the effective candidate subset actually used by the learner.
The root records BWS/pairwise identity, scoring revision, algorithm/Solidago
versions and numerical pipeline parameters, including equal trust. There are no
account, response, answer or personal-score FKs in that retained graph. Existing
checkpoint retention/pruning still determines its lifetime; no new results-history
API or cross-version exact-rerun guarantee was added.
The review follow-up seals each graph before commit and checks declared counts,
contiguous local indices/task order and catalogue references. Sealed child inserts
and updates are rejected; active published evidence cannot be deleted. Publication
must match the sealed counts. The worker uses immutable conversation-scoped prepared
records and one parsed `ComparisonRecipe` for pipeline construction/provenance;
normalization is shared by capture, computation and counts. Processed revisions
skip the copy, and exact-revision/recipe sealed unbound captures can be reused on
retry under the existing scoring advisory lock.
Existing comparison revision invalidations still reject an unpublished computation
if eligibility changes before publication. A prepared but unbound capture is not
a public/retained checkpoint. Future orphan cleanup must acquire the worker's
conversation advisory lock and recheck publication roots before removing it.

`services/shared-backend/src/comparisonAccountLifecycle.ts` supplies a bounded,
transaction-required purge-phase handoff, not an executor. A deleted **and purging**
account is required; account deletion/recovery alone never retires its session.
It locks account then ordered conversations, waits for unfinished closes, and
blocks retained legacy checkpoints/current scores that lack captured evidence.
Unclassified legacy non-null account-keyed trust blobs, even on unrooted score
copies, are a global quarantine checked before source retirement and at the shared
account-unlink boundary. This deliberately blocks accounts with no surviving
response, and potentially unrelated accounts, until reviewed classification/cleanup
establishes safe scope. SQL NULL and JSON null are absent context. The handoff never
guesses identity/provenance or silently rewrites a recipe; old writers must be drained
before purge-phase callers are enabled.
It tombstones bounded answer/personal-score batches, then clears private session
JSON and detaches only roots with no remaining active children. The existing
retained-contribution unlink contract can proceed after those private account
links are gone. The PostgreSQL-only binding contract rejects scope changes and
reattachment; new registrations receive a new session rather than reclaiming old
inputs. Source retirement cannot change captured values or saved counts.
No historical inputs are fabricated from current mutable answers. The staged
contract is `services/api/scripts/prepare-comparison-retention-contract.sql`;
its production installation and populated-data compatibility remain approval gates.

Frozen numerical payloads must not contain user IDs, DIDs, emails, credential hashes, free-text personal settings, or an account-ownership lookup. Their temporary association with active/recoverable accounts remains separately removable. Stable local participants stay distinct; do not merge all deleted people into a shared placeholder. Necessary source references must not create an account-retention dependency.

Account deletion excludes future live input immediately. During recovery, necessary identity links stay private. Irreversible unlinking removes associations, not sealed numerical inputs/results. Unlinked evidence is never a new live ballot. Re-registering cannot reclaim detached inputs. QV reopen hides the old set; re-close replaces it from current eligible saved responses. Existing Polis/comparison checkpoints are not expanded into a new history mechanism.

Retained evidence is not every browser draft, intermediate save version, idempotency receipt, session timestamp, raw survey answer or obsolete personal score. Do not retain extra social identifiers for a hypothetical future plural formula. Preserve only provenance actually needed by the chosen computation.

## Verification and remaining gates

The [read-only rollout audit and online migration plan](retention-rollout-readiness.md)
reports capped blocker counts, source-schema/guard gaps and PostgreSQL storage
estimates. It runs only against an explicitly selected database, uses short
read-only transactions/timeouts, and performs no migrations or backfills. Large
existing-table indexes, constraint validation and any separately approved data
backfill must be phased rather than bundled into a blocking deploy transaction.

- Comparison persistence/review follow-up: **189 focused API tests across seven suites and
  all 136 scoring-worker tests pass**. Coverage includes retained BWS/pairwise task
  replay, effective/original candidate order, distinct detached participants,
  real persisted-score replay with a parsed saved recipe, sealed/complete graph and
  immutable input/binding checks, prepared-capture publication rollback, preparation
  while lifecycle/config write locks are held, bounded source retirement, unfinished
  close/legacy-evidence/account-context blockers (including no-response accounts),
  processed-revision copy avoidance, exact-capture retry reuse and no registration reattachment.
  API/scoring typechecks, scoped ESLint/Ruff, generated artifacts/inventory and
  soft-delete policy checks pass. These are disposable-schema/source checks, not
  production migration, permanent-purge enablement or scale benchmarks.

- Verification for this preparation: 181 tests across recovery, QV, deletion-contract, finalization and auth suites pass, along with API typechecking, scoped ESLint/Prettier, soft-delete policy and whitespace checks. Disposable canonical-schema tests do not validate a migration or production rollout.
- Preparation tests cover actual account deletion/recovery with BWS, pairwise and QV numerical source records in open and manually seeded closed states, plus existing Polis frozen-matrix/finalization tests. They verify values survive, QV hiding uses the account-deletion timestamp, seed content survives, and existing source/unlink blockers remain.
- The original preparation checks were not proof of the later QV/comparison persistence slices. Those source implementations now have separate tests; an operating permanent purge still does not exist.
- Next schema/API/worker tests must cover deletion before worker capture (exclusion is permitted, with a consistent result and captured participant count), deletion after capture (frozen evidence and numbers remain unchanged), unchanged evidence after irreversible unlinking, explicit withdrawal vs recovery, no new-account reattachment, superseded QV inputs, and parent ownership. Close need not capture exact close-time membership. Live participant counts and their revisions are separate from saved calculation counts/generations. Canonical source/codegen work is authorized; `pnpm db:generate` and migration application remain prohibited without explicit approval.
- Later deletion-worker handoff stays small: retain result-owned numerical evidence, remove unnecessary identity/private source/operational copies, honor parent deletion and applicable rights, and fence unfinished work. Do not implement the worker here.

## Legal and localization gate

Review the [integrated multilingual legal draft](participation-retention-legal-review.en.md) before publication. The English privacy notice is about 2,500 words, consolidating repetition across visibility, providers, retention and recovery. Following user authorization, both legal documents were reconciled in all 10 other display locales: Spanish, French, Traditional/Simplified Chinese, Japanese, Arabic, Persian, Hebrew, Kyrgyz and Russian. The English source and publication dates are unchanged. Numerical inputs behind saved results are kept indefinitely for analysis/recalculation, with account links removed at permanent cleanup. Public wording does not discuss unfinished deletion-service implementation, promise a post-unlink individual-record management workflow or guarantee anonymity. General statutory-rights provisions remain. All 49 focused legal-content tests pass; the separate legal-basis, operational and publication gates remain.
