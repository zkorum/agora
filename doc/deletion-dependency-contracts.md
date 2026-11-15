# Purge-safe dependency contracts

This is the Stage 3 handoff for account recovery and the later deletion worker.
It describes source contracts, not an applied migration or enabled hard purge.
Execution order remains in `AGENTS_DELETION_PREPARATION_PLAN.md`.

## Updated retention decision — 2026-11-11

Target policy for **Polis, BWS, pairwise and QV**: retain the individual numerical inputs behind each retained result, not only aggregates, with separately removable account associations. This supersedes earlier proposals to erase QV frozen ballots or comparison inputs merely because their account is deleted. It is a product decision, not a claim that the source contracts below already implement it.

The [code-preparation note](participation-retention-preparation.md) separates live visibility, retained evidence and account-source/unlink boundaries. The user authorized translating the concise English legal draft; see the [legal review/status note](participation-retention-legal-review.en.md) for translation verification and remaining publication gates.

- Retain exact sealed vote cells, comparison choices/candidate sets and QV allocations with stable conversation-local participant identities and the numerical provenance needed to interpret them. Remove account/DID/credential associations at irreversible cleanup, after the existing private recovery window. Do not keep a deleted-account lookup or reattach these participants to later registrations.
- Account deletion excludes the participant from current/future input selection; it does not rewrite sealed inputs or their result/counts. Unlinked retained inputs must not become live votes on reopening. QV still has only one current sealed input/result set, not a results history; superseded inputs are not retained merely because they once existed.
- This does not retain every save revision, session record, idempotency receipt, timestamp, survey answer, personal setting or credential. Separate the retained numerical evidence from unnecessary private/operational source records. Account-unlinked is not a guarantee of anonymity, and retention/access remain subject to the privacy policy and applicable rights.
- Later cleanup must preserve retained numerical evidence while removing identity links and unnecessary source copies; parent deletion owns the retained graph. Adapt existing QV retirement/unlink guards and comparison storage before enabling purge. No deletion worker, schema change or migration is authorized by this note. Update the privacy-policy explanation before rollout.

### Source follow-up — 2026-11-13

QV and comparison evidence/source separation are now implemented in canonical
source, under later explicit authorization; this note still authorizes neither
production migrations nor a hard-deletion worker. For BWS/pairwise, each existing
statistics/checkpoint publication owns `ranking_input_snapshot`,
`ranking_input_participant`, `ranking_input_item` and `ranking_input_answer`.
Their local indices, original/effective candidate sets, ordered tasks, catalogue
and versioned pipeline provenance contain no account or private source references.
Complete captures commit before computation without lifecycle/config write locks;
publication atomically attaches them with the corresponding scores, counts and
pointers, including publications without a raw score. This is not a new checkpoint/history
mechanism or an exact-rerun guarantee across engine versions.
Unpublished calculations retain the existing revision-invalidation behavior.
Unbound prepared captures are orphan-cleanup candidates, not additional history;
the future cleaner must coordinate the per-conversation scoring advisory lock and
recheck publication roots, never discard an active capture merely for age.

`retireComparisonAccountInputs` requires a locked deleted/purging account and
ordered conversation locks. It refuses unfinished closes and retained legacy
checkpoints/current scores with no captured evidence. Bounded answer and personal
score tombstones precede clearing session JSON and setting its account link to
NULL with irreversible `detached_at`. The binding trigger rejects reattachment,
scope moves and premature unlinking. Recovery-window deletion alone cannot invoke
this handoff. No historical evidence is reconstructed from mutable sessions.
Legacy account-keyed trust blobs, including unrooted score copies, also block the
handoff globally until separately reviewed classification/cleanup establishes scope.
Both source retirement and the shared account-unlink boundary check this quarantine,
including accounts with no surviving response; SQL NULL/JSON null are absent context.
This conservative gate may block unrelated accounts and requires draining old writers
before purge enablement. New captures
store explicit local equal-trust provenance and no account-keyed weight snapshot.
Captures must seal completely before commit/computation; counts, contiguous local
indices and catalogue references are validated. Sealed children reject later inserts
and updates, and active published graphs reject deletion. Publication binds only
matching sealed counts/revision. Exact sealed unbound captures can be reused for
retry under the scoring advisory lock, never rebound to another publication.
The later worker must preserve all retained `ranking_input_*` graphs, retire only
unneeded private/session copies, and respect existing checkpoint and parent intent.
Source-unlinked responses cannot become live inputs or attach to new registration.
QV's independent `qv_input_*` graph already supplies the corresponding boundary.

## Structural inventory

`deletion-dependency-inventory.json` is generated from canonical schema metadata
with `services/api/scripts/export-deletion-dependency-inventory.ts` after shared
source synchronization. It inventories every table, column/nullability, actual
foreign key, unique constraint, check and index. Consult the generated inventory
for current counts. Do not infer cascades from comments or treat
this structural list as a classification of semantic copies.

## Root and table-family ownership

| Family                                                                                                               | Account purge contract                                                                                                                                                                                                                                                                                                                                                                                                    | Parent/compaction contract                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user`, credentials, auth attempts/destination state, devices                                                        | Credentials and challenges/private attempt identifiers are account-owned. Erase them before the user; reserve recovery credentials in Stage 4. Retire signing keys into `retired_device_key` before deleting devices. The retirement record contains no account association.                                                                                                                                              | No generic device/guest/active-account age cleanup. Preserve live backoff/SMS caps.                                                                                                                                                                                                              |
| Languages, mutes, follows, memberships and recipient preferences                                                     | Account-owned settings/relationship children are removed, including incoming mute links.                                                                                                                                                                                                                                                                                                                                  | Deleted relationship intent is distinct from a live disabled preference.                                                                                                                                                                                                                         |
| `conversation_participant`, `opinion_group_user`                                                                     | Membership account IDs and participant account links become nullable; stable local participant IDs and numerical membership rows remain distinct. Unlink memberships before their participant root. Composite account FKs protect linked rows; the binding trigger rejects reattachment and scope changes.                                                                                                                | Conversation-owned roots. Frozen matrices, membership/group counts and results are not rewritten.                                                                                                                                                                                                |
| `vote`, `vote_content`, raw survey responses/answers/options; `comparison_response`, answers/personal scores         | Private working sources, separate from retained matrices/`ranking_input_*`. Comparison retirement is bounded and purge-gated: clear/tombstone private copies before detaching the nullable account link. Do not retain every session/revision or private survey answer. Explicit withdrawal differs from account hiding.                                                                                                  | Preserve necessary in-flight sources; unfinished comparison closes block retirement. Frozen numerical evidence must not depend on the source account. Saved survey aggregates remain independent of individual answers.                                                                          |
| `opinion`, `ranking_item`, source versions/translations/work                                                         | Personal source text stays private while recovery is possible. At purge erase private versions and account attribution; keep content-free roots needed by frozen results. Project-owned seeds retain content and lose administering-account attribution. Edited flags and state timestamps survive editor erasure.                                                                                                        | A deleted parent owns its full source/report graph. Null construction pointers alone are not intent.                                                                                                                                                                                             |
| `qv_response`, `qv_response_version`, `qv_allocation`, `qv_response_command`                                         | Account deletion hides the current root during recovery. `retireQvAccountInputs` tombstones private sources before participant unlinking; independent `qv_input_*` rows retain sealed numerical inputs without source/account FKs. No physical purge is enabled.                                                                                                                                                          | Ordinary replacement/withdrawal moves the current pointer; the permanent statement lock survives. Reopen hides the one current result and re-close replaces it. Detached inputs never re-enter live selection; parent cleanup owns the retained graph.                                           |
| `analysis_input_snapshot`, snapshots/results/candidates, metrics, groups/stats, views/checkpoints, survey aggregates | Numerical history survives account removal. Active-account historical personalization remains while linked; account unlinking does not renumber local indices or change hashes/payloads/counts. New live input loading requires active voters and matching linked participant scope, plus independent statement eligibility and required-survey gating.                                                                   | Every retained checkpoint roots its numerical input/output and supporting artifacts. Only unrooted intermediates are compaction candidates. Source references may be cleared without dropping numerical result rows.                                                                             |
| Lineage, descriptions/translations, locale requests/work, definitions/specs                                          | Existing historical AI descriptions are not automatically rewritten for ordinary deletion. New provider reads/publication must recheck source eligibility. Definitions are not account-owned.                                                                                                                                                                                                                             | Preserve retained result/lineage/work roots; parent deletion removes exclusively owned descriptions/work.                                                                                                                                                                                        |
| Ranking score/config/entity/stats/item/checkpoint graph and `ranking_input_*`; credit-voting config                  | Preserve snapshot-local comparison participants/tasks/catalogues and numerical pipeline provenance, not every private session/personal score. Frozen evidence has no account/response/answer FK. Legacy retained results without this evidence remain explicit unlink blockers.                                                                                                                                           | Preserve active baseline/current/published checkpoints and their input graph. Only unrooted intermediates are cleanup candidates. Clear a stats item's content reference and external URL together before private source erasure. Parent deletion owns the graph; no new exact-rerun guarantee.  |
| Organizations/projects, localizations, ownership/attribution/contact/documents/assets                                | Shared parents survive administering-account deletion when another active Admin remains. Refuse the last Admin of a non-default organization and direct them to administrator support. Account-only default-shell retirement is not independent project-deletion intent and must never cascade into content/numerical-evidence deletion. Unlink provenance without inferring ownership; see `organization-governance.md`. | Restore only exact-cycle marked defaults during account recovery. Preserve the project's retirement distinction beyond account unlinking; do not purge its conversation/evidence graph merely because the shell is retired. Documents retain exact owned object keys through confirmed deletion. |
| Moderation, reports, grants/revocations and control/audit actors                                                     | Retained independently necessary cases/controls may lose actors. Preserve action/deletion/lift timestamps and current enforcement state; absence of an erased actor does not reverse a decision. Purge facilitator-target blocks before erasing their target account.                                                                                                                                                     | Necessity and restricted-case retention are separate from ordinary content retention.                                                                                                                                                                                                            |
| Notifications and typed detail                                                                                       | Remove own notifications and other notifications whose subject/author dependency is erased when that detail has no independent purpose. `notification_new_opinion.author_id` deliberately remains required; remove its detail/root in FK order.                                                                                                                                                                           | Preserve typed parent/detail integrity; counters must ignore reversed moderation history correctly.                                                                                                                                                                                              |
| Export generation/request/file/artifact/object graph                                                                 | Own requests/private requester artifacts must be removed in graph order. Other authorized requests can retain shared artifacts until fixed expiry. An artifact address cannot disappear before external deletion is acknowledged.                                                                                                                                                                                         | Fixed generation-bounded maximum 30 days; retries/repackaging cannot renew it. `conversation_export_object` records immutable per-upload keys, bucket/region, original cleanup eligibility, attempts and leases. Parent deletion queues cleanup without network I/O on the request path.         |
| Import request/source/notification graph                                                                             | Unpublished account-owned requests must be cancelled/drained/purged first. Once a conversation exists, erase requester attribution without pinning the account; completion can publish permitted project-owned data without sending a personal notification.                                                                                                                                                              | Recheck actor, organization, project, ownership, membership, capability and durable request before the import transaction commits. Completion rechecks the active parent under locks. Preserve independent source provenance with the conversation.                                              |
| Email update/review/test/delivery/recipient/attempt/action-token/SNS/report graph                                    | Own recipient/attempt/token/private email data is removed. Other recipients retain valid links through independent delivery/test evidence after sender IDs and sender test destinations are erased. In-flight test attempts are a blocker; do not erase provenance from a running send.                                                                                                                                   | Shared update scopes, accepted deliveries and valid recipient bindings are not owned by the sender account. Preserve active suppressions and SNS dedup effects; completed raw SNS bodies have separate cleanup.                                                                                  |
| Realtime outbox/topics/dispatch state                                                                                | Auth/account IDs and legacy source text are controlled copies, not retention roots for accounts. New statement changes carry only invalidation metadata; legacy text-bearing events are projected to metadata before replay/fanout.                                                                                                                                                                                       | Only a delivered prefix may be pruned, atomically with topics and the durable replay floor. No age holes or minimum-present-ID inference.                                                                                                                                                        |

## Non-FK and controlled copies

| Location                                                                                                                                    | Meaning and required handling                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analysis_input_snapshot.payload`                                                                                                           | Compressed indexed numeric matrix. Its canonical payload uses local indices, not account UUIDs or statement text. Preserve bytes/hash with retained checkpoints; never mutate it merely to unlink an account.                                                                                                               |
| `opinion_group_candidate.raw_output`, `opinion_group_opinion_stats.raw_repness`                                                             | Supporting model output uses numerical/local participant/group/opinion keys. Preserve result-owned numerical artifacts; keep account associations outside these blobs. Do not introduce account IDs in future serializers.                                                                                                  |
| `ranking_score.scores`, `participant_counts`, `user_weights_snapshot`, `pipeline_config`; MaxDiff `ranking`, `comparisons`, `candidate_set` | Preserve result-owned numerical choices/candidate sets and necessary calculation provenance with stable local participant keys. Remove account-keyed context and unnecessary private session/history data rather than relying on SQL FKs alone. The target does not promise identical reruns across engine/version changes. |
| `content_translation_work.survey_question_option_content_ids`                                                                               | An option-content ID array is a semantic reference. Cancel/delete work before removing referenced option versions; FK validity alone is insufficient.                                                                                                                                                                       |
| `realtime_event_outbox.payload`                                                                                                             | Legacy `opinion_updated` HTML must be scrubbed in the staged rollout backfill. Runtime projection never sends that old text. New statement events contain only keys/versions/timestamps. Auth events may contain account IDs and follow delivered-prefix retention.                                                         |
| `conversation_email_update.branding_snapshot`, body/reply-to snapshots, test/delivery/recipient destinations                                | Retained message snapshots are owned by their update/delivery/recipient purpose. Erase sender credential/test destination provenance independently. Do not retain a deleted sender account or credential just because another recipient's link is still valid. Own recipient destinations/tokens are account-owned.         |
| SNS `raw_payload`, import `csv_file_metadata`, retired ticket `provider_metadata`, external-source config/metadata, survey `constraints`    | Classify by actual containing root. SNS/import diagnostics and account-owned retired ticket metadata are private cleanup, not numerical history. Parent-owned external metadata/definitions survive only while their real root needs them.                                                                                  |
| Export CSV/ZIP and S3 objects                                                                                                               | Already completed hosted artifacts have their fixed expiry exception; new exports use current eligibility. Persist keys before PUT and keep immutable attempt-specific addresses through crashes/failures. Reconcile bucket versions, orphaned/multipart and late uploads before claiming physical completion.              |
| Valkey/import/vote payloads and in-flight providers                                                                                         | Ephemeral buffers are not identity ownership maps. Recheck durable current state at publication. Guest-merge pending-vote loss remains accepted; source-account actions cannot recreate contributions after retirement.                                                                                                     |
| App caches and paused frames                                                                                                                | SSE gaps/caps/failures trigger a content-free resync. Clear query caches, old event-ordering/catch-up state and paused live copies, then read the authoritative source projection. No full-page reload is needed. Previously downloaded/offline copies are not remotely erasable.                                           |

## Typed lifecycle and coordination

- `accountLifecycle.ts` distinguishes active, irreversible legacy/merge deletion,
  explicitly scheduled recovery and purging. Stored deadlines are not inferred
  from `deletedAt`. Stage 4 now supplies explicit, verified recovery for new requests;
  legacy and merged-away identities never receive a new window.
- `opinion.deletedAt` / `ranking_item.deletedAt` express irreversible source
  deletion; `accountHiddenAt` expresses account hiding. `conversation.deletedAt`
  distinguishes parent deletion from construction. Vote withdrawal and merge
  retirement have separate timestamps. Source attribution can disappear while
  exclusion remains explicit.
- `unlinkAccountRetainedContributions` and `unlinkAccountSharedProvenance` are
  transaction-required, bounded purge-phase contracts, not user-facing purge
  actions. They require a locked deleted/purging account and report blockers or
  progress. Call separate bounded phases/transactions and repeat until empty;
  preserve user -> organization/project -> conversation lock order when composing
  future worker handlers. A progress result is not an account-purge certificate.
- Ranking checkpoints LEFT JOIN only currently visible source content, including
  author eligibility independently of account-hiding backfill. Redacted DTOs retain
  item identity, scores, ranks, participant counts and lifecycle status but require
  null content and external URL. Unlinking a source never deletes its numerical row.
  Live comparison/QV/seed/translation readers and scoring inputs apply the same
  ownerless-seed versus personal-source distinction. The account scoring fence
  covers authors without ballots and retargets an unfinished close, without changing
  a finalized checkpoint.
- New import publication takes user -> ordered organizations -> project ->
  authorization -> durable import locks only after provider/bulk preparation.
  Source/control producers must finish or be fenced before the worker removes
  their foreign-key roots. The existing participant binding trigger remains the
  compatibility boundary for API, import and analysis writers; the Stage 3 update
  makes unlinking safe and forbids historical reattachment.
- `deletionRestoreJournal.ts` defines a parsed, content/credential-free journal
  interface. Its real implementation must be outside the database's point-in-time
  restore domain. Journal replay/retention and access controls are rollout gates;
  a table inside the restored database would not satisfy that contract.

## Replay/storage execution contracts

The future replay pruner must lock `realtime_event_dispatch_state` for update,
select a bounded contiguous delivered prefix above its stored floor, stop at the
first too-young/unknown delivery timestamp, remove topics/events and advance the
floor **in the same transaction**. Never delete pending/unassigned events for age.
Delivery timestamps use database assignment time, not transaction-start creation
time. The floor persists when history is empty and cannot move backwards. Replay
reads hold a shared boundary lock across all bounded pages and release it before
network I/O. Unsupported replay rows, exhausted caps and expired/future cursors
require a full authoritative resync. Stale bridges close connections so session
authorization is rechecked as well.

Account, parent and seed/QV source deletions also publish a content-free global
invalidation. Replay includes it even without conversation-topic subscriptions.
Clients clear retained ranking frames and open statement dialogs as well as query
caches; a paused checkpoint is not an exception to current source redaction.

Export cleanup first discovers durable work independently of newly expired
requests. Queue-only paths perform no storage operation. Executing paths claim
an object with a token/expiry, dispatch bounded S3 requests outside the transaction,
and acknowledge only a current lease. Delete failures and lost acknowledgments
retain exact addresses and original eligibility; a late uploader cannot attach
to a cancelled/expired/source-changed generation. Storage scheduling moves into
Stage 5; Stage 3 does not create or enable a deletion worker.

## Migration and external enablement gates

No `pnpm db:generate` or application-database migration was run for Stages 3/4.
The user generates the ordinary schema migration. Review populated-data compatibility,
composite FKs and staging script order before application:

1. The existing guest vote ownership repair must precede its generated FK.
2. Participant unlink function changes follow `V0111.1`; nullable attribution and
   composite FK expansion must be available before using the unlink contracts.
3. `prepare-deletion-intent-backfill.sql`, device retirement, ranking account-source
   fences and replay boundary
   scripts require their generated columns/tables first. Place staging sources in
   reviewed fractional Flyway migrations, not manual production cleanup commands.
4. Unknown active-parent null pointers stay unclassified and blocked. Discovery
   must not create a fresh recovery window or guess an old deletion date.
5. Drain old writers/clients and validate parity before enabling purge. Deploy the
   frontend resync handler with the backend's content-free event contract.
6. Verify S3 version/noncurrent/multipart/orphan policies and backup/PITR/WAL/all-copy
   expiry externally. Implement and exercise isolated restore plus external-journal
   replay before exposing restored data. These are explicit Stage 5 enablement gates.
7. Refresh the development API's OpenAPI document against the migrated schema and
   run `make generate` before deployment. In particular, the ranking result's
   `isDeleted` discriminated union must reach both generated clients. Application
   wrappers already parse the canonical DTO at the boundary. No generated client
   or OpenAPI document was hand-edited for this change. Stage 4 also adds recovery
   request flags, failure reasons and guest/passport routes. Its new wrappers use
   shared Zod DTOs over the configured Axios client pending generated operations;
   this is a temporary exception to generated-client-first wiring while the
   coordinated schema/API/client rollout remains deferred.
8. Deploy credential `reserved_for_recovery` columns and their expanded unique
   indexes, plus `user.contribution_revision`, before enabling Stage 4 writers.
   New reservations start only for active credentials at a new deletion request;
   do not reserve old deleted credentials retrospectively or grant legacy recovery.
   Drain old vote producers before enabling recovery on a mixed deployment.
9. Recovery/deletion confirmations and both long-form legal documents are localized
   in all 11 display languages. The legal draft describes the intended completed
   deletion lifecycle, not the status of automated purge engineering. All 49 focused
   legal-content tests pass; the [legal review/status note](participation-retention-legal-review.en.md)
   tracks translation verification and the separate legal-basis/operational gates.
10. Comparison rollout requires the nullable account link, irreversible marker,
    `ranking_input_*` tables, adapted ranking revision fences and
    `prepare-comparison-retention-contract.sql` before source retirement. Drain old
    writers before enabling any purge-phase caller. Validate populated legacy
    checkpoints explicitly; never fabricate their original inputs from today's
    session rows. The binding source is not an installed migration.

## Verification evidence (2026-10-31)

- Eight focused API suites, including PostgreSQL-backed lifecycle/ownership tests:
  **185 passed** (deletion contracts,
  finalization/live eligibility, seed statements, project deletion, analysis-frame
  reads, realtime delivery/outbox and export lifecycle). This exercises the actual
  canonical schema and staged participant/device/ranking functions, including
  private ranking-text erasure with unchanged checkpoint numbers.
- Import worker: **61 passed / 1 PostgreSQL-only skip** in its ordinary suite;
  the publication-fence suite separately passed **11/11 against PostgreSQL**, including
  real account-first lock contention and completion without the requester.
- Conversation Email Updates worker: **275 passed**; typecheck and full lint passed.
- Shared analysis: **338 passed / 11 skipped**; content translation: **54 passed**.
  Their typechecks and full lint passed.
- Scoring source eligibility: **7 passed**, covering deleted authors, independently
  hidden/deleted sources and retained ownerless seeds; full lint/typecheck passed.
- API and frontend full lint/typechecks passed. All **245** schema check/partial-index
  predicates were introspected and verified to contain no bind parameters; schema
  predicates inline only schema-owned literals through Drizzle helpers.
- The prior broader-suite blockers were resolved during Stage 4: both incomplete
  prioritization catalogs now cover every display language; scoring publication
  fixtures use canonical disposable DDL and adapted production trigger definitions.
  The historical V0112 upgrade regression still runs real historical migrations.
  Full frontend: **1683 passed**; full scoring: **121 passed**.
- Shared TypeScript, generated Python models, API SQL fixtures and the structural
  inventory were synchronized. No ordinary migration was generated or applied.

## Stage 4 recovery implementation and verification

- New account deletion takes the writer-side account/conversation locks, stores
  database-wall-time request/deadline markers exactly 15 days apart and preserves
  them on retries. It reserves only currently active credentials, hides personal
  sources, excludes voter inputs and revokes sessions in the same transaction.
- Email/phone OTP verification accepts `recoverAccount: true` only as an explicit
  cancellation action after proving the reserved credential. Ordinary verification
  returns `recovery_required`, never silently restores or registers over a reserved
  identity. Passport recovery reuses the provider verification path through
  `/user/recover/passport`. Guest recovery verifies the original signing key through
  `/user/recover/guest`, independently of an active session, and rejects every
  identity with any historical registered credential.
- Restoration locks the account, conversation scope and proof, requires a fresh
  unassigned/unretired DID, and checks `clock_timestamp()` strictly against the
  stored deadline after all lock waits. It restores only reserved credentials and
  otherwise eligible account-hidden sources, retires previous device keys and
  creates one fresh session. Independent deletions, withdrawals, moderation,
  legacy/merge deletion and begun purge remain irreversible. Global invalidation
  refreshes source projections without changing frozen numerical history.
- `beginScheduledAccountPurge` is a transaction-required lifecycle transition for
  the future worker, not a purge executor. It uses the same account lock and a
  database-time eligibility predicate, so restore and scheduled purge-start cannot
  both succeed. Task leases/external journal coordination remain Stage 5 work.
- `user.contribution_revision` advances at deletion and does not reset at recovery.
  Vote admission captures it with an active/unretired device; flush and pending-vote
  blockers reject older revisions. Flush locks accounts in UUID order before the
  conversation, preventing a stale voter read from racing deletion. Legacy buffer
  payloads mean revision zero, never an inferred current revision.
- `/recover/` reuses existing OTP/passport components with required explicit recovery
  props and waits for auth initialization before rotating keys. Guest deletion
  saves original CryptoKey handles in separate browser storage before ordinary
  logout cleanup; they cannot authorize ordinary access and expire for recovery
  after 15 days. Clearing browser storage still loses that ownership proof.
- Final focused API verification: **163 passed across eight suites**, including **22 recovery
  PostgreSQL cases**, account/session/state regressions, and real Valkey coverage of
  pre-deletion buffered actions rejected after recovery while new actions succeed.
  Frozen input bytes and finalized analysis generations remain unchanged. Deadline
  tests use the database clock (not the possibly skewed container-host clock), and
  a non-UTC PostgreSQL session cannot move the UTC recovery cutoff.
- A separate headless Chrome context verified explicit consent, guest proof surviving
  normal logout storage cleanup, a fresh DID, a real RSA recovery signature, guest
  request wiring, the email OTP recovery flag and unavailable-state UI, with no
  runtime errors. Provider/storage responses were intercepted; backend verification
  was exercised separately against PostgreSQL.
- Frontend lint/typecheck, **1683 tests** and the production-shaped development
  build passed. API lint/typecheck and the soft-delete policy passed. Email Updates:
  **275 passed**, lint/typecheck passed. Scoring: **121 passed**, Ruff/BasedPyright
  passed. Shared analysis: **338 passed / 11 skipped**; import: **61 passed / 1 skipped**;
  content translation: **54 passed**; Ruff/BasedPyright passed for each.
- Regenerated inventory: **140 tables / 256 FKs**. All **249** check/partial-index
  predicates are bind-free. Shared sources, Python models and API fixtures are
  synchronized. This is source verification, not applied migrations or production
  enablement; the release gates above remain in force.

## Targeted implementation audit (2026-11-04)

Reviewed the deletion/recovery implementation and its merge, buffered-vote,
retired-device, retained-source and export-cleanup boundaries. Unrelated staged
integration work was preserved. Findings below were fixed in source:

| Area                           | Finding and resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correctness                    | The automatic agreement producer in `comment.ts` omitted the contribution revision, silently dropping new statement self-votes after recovery. The statement transaction now returns the account revision with its counter update and carries it into the buffer.                                                                                                                                                                                                                                                                               |
| Correctness                    | Credential upgrades updated retained retired devices, conflicting with the retirement trigger. Upgrades and bulk revocation now touch only active, unretired sessions. Guest merge also leaves retired original keys behind, permitting a recovered guest to merge safely. Recovery tests now install the actual retirement trigger.                                                                                                                                                                                                            |
| Correctness / clean code       | Recovery kept terminated identifier-request gates mounted after changing email/phone from the OTP step. Identifier steps now own their composables and timers, unmount on advancement and get fresh gates when revisited. Guest-storage failures do not prevent credential recovery.                                                                                                                                                                                                                                                            |
| Type safety                    | New buffered actions must explicitly supply `contributionRevision`; only persisted legacy payload parsing defaults to zero. Credential-owner identity and deletion state are one required correlated object instead of independent optional inputs.                                                                                                                                                                                                                                                                                             |
| Security                       | Guest recovery's replacement DID was supplied only in an unsigned body. The original key now signs an action-specific UCAN fact naming that exact DID, checked after signature/replay verification. Missing, malformed and substituted facts are rejected. Recovery-key storage requires IndexedDB: JSON storage fallback cannot preserve CryptoKey handles.                                                                                                                                                                                    |
| Correctness / performance      | Export lifecycle comparisons, upload/deletion leases and cleanup timestamps now consistently use UTC wall time for timestamp-without-zone columns, independent of the session timezone. Retained-source/device cleanup markers use the same UTC convention.                                                                                                                                                                                                                                                                                     |
| Performance / eventual cleanup | Queue-only sweeps skip already queued objects, preventing a bounded sweep from repeatedly selecting the same first page. Execution prioritizes untouched/least-recently-attempted work so repeated early failures do not starve later objects. Guest eligibility uses one correlated query rather than five round trips; retirement uses insert-select instead of loading all old keys into JavaScript; scope membership uses UNION ALL without redundant intermediate deduplication. These are query-shape improvements, not benchmark claims. |
| Dead code                      | Removed both obsolete deletion-confirmation keys and their 22 translations, which still claimed immediate irreversible deletion. The active recovery catalog remains authoritative for confirmation UI. Removed the page's now-unused identifier orchestration.                                                                                                                                                                                                                                                                                 |

Verification: **256 API tests / 12 suites** passed, including **28 PostgreSQL
recovery cases**, export queue fairness/UTC tests, target-authorization negatives,
and merge/deletion/Valkey regressions. API lint/typecheck and soft-delete policy
passed. Frontend lint/typecheck and the full **1719-test suite** passed, including
four recovery-page regressions; its development production-shaped build passed.
Email Updates worker lint/typecheck and **275 tests** passed after shared sync.
Headless Chrome verified actual IndexedDB key
preservation across logout cleanup, a valid RSA signature containing the exact
replacement DID, matching guest-request facts/body, explicit consent and no runtime
errors; API responses were intercepted for that browser check. Existing
onboarding-route alias warnings were observed outside this audit's changed paths.

No migration generation/application, generated-client hand edits, commits or purge
enablement were performed in this audit. Existing migration files supplied by the
user were left untouched. The coordinated schema/API/generated-client rollout,
long-form legal translations and external storage/journal/backup restore exercises
remain release gates; test success does not satisfy those operational gates.
