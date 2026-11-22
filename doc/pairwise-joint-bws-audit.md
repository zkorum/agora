# Pairwise / joint-BWS implementation audit

Scope: the comparison foundation and its type-editing/conversion changes. The historical audit below predates the Pairwise content implementation, now documented in [the implementation status](pairwise-comparison-implementation.md#pairwise-content-design--2026-11-04). BWS interaction redesign and database migration generation/application remain deferred.

## Pairwise participant content — six-point audit, 2026-11-04

Scope of this follow-up: `PairwiseCandidateCard.vue`, the Pairwise branches in `ComparisonVotingTab.vue`, their translations/tests, method-aware save plumbing, binary selection helpers and the shared binary fallback. Existing BWS collection remains best-then-worst; the shared save fix below also protects BWS responses. No database migration was generated or applied.

1. **Correctness — fixed:** the initial two-card check could mask the zero/one-statement message, and accepted duplicate IDs. Empty catalogs now retain their normal message, while a typed distinct-pair guard rejects malformed tasks. A blank/pending translated card could still participate in a preference: both choices now remain disabled until both displayed cards are readable, including after a translation toggle. Delayed focus restoration is guarded by session generation and KeepAlive activity; failures keep focus on the original choice. A successful API save followed by a failed session refresh previously entered mutation rollback, contradicting the accepted server response. The accepted history now remains intact, uncertain-scope cache writes are skipped, and a translated warning explains that the choice was saved but the session needs refreshing. Added regressions cover these cases and retain one-action, Undo, completion, rejection and BWS behavior coverage.
2. **Type safety — tightened:** mutation payload fields derive from `ComparisonSaveRequest`; pair validation narrows to a distinct two-element tuple before selecting the other endpoint. Card readability/long-content events use an exported typed state contract rather than loosely correlated flags or DOM inspection. Test save mocks derive parameters from the real mutation contract. New code uses no casts, non-null assertions or lint suppressions.
3. **Clean code — simplified:** reuse `getComparisonCandidateSetSize` rather than duplicate method sizing. The card computes displayed plain text once and reports readability/layout state; its parent coordinates the pair. Candidate state is pruned on replacement. Replaced layout dependence on `:has()`/container queries with ordinary flex wrapping and an explicit content-driven stacked class: available container width, not device detection, determines wrapping. Native buttons and separate translation/details controls remain intact; no global polyfill or browser-floor change was introduced.
4. **Security — checked:** the new title/full-body surface continues through the existing sanitizer, with real-renderer regressions for scripts, event attributes, unsafe anchors, images and iframes. External source URLs are not rendered as navigation targets by the card; details resolve the candidate by ID and retain the existing dialog's HTTP(S) restriction. Participation checks and UCAN/backend admission remain authoritative. Added obsolete-session cache/focus checks; no new authorization path was introduced. This scoped frontend review does not replace migration-backed backend verification.
5. **Performance — improved:** `getCandidates(2)` now returns an unresolved matrix edge directly, avoiding maximal-clique enumeration and allocation of every unresolved pair for a two-item fallback. Its worst-case scan is quadratic with constant extra space; the underlying dense matrix remains quadratic, and normal adaptive server routing is unchanged. Readability and long-text checks share cached computed plain text. Layout uses CSS wrapping, not resize listeners or repeated DOM measurement. No throughput benchmark or old-device support certification is claimed.
6. **Dead code — removed/avoided:** removed the superseded `:has()`/container-query layout/focus rules and the now-unused long-card CSS marker; Pairwise no longer schedules BWS-only truncation measurement. BWS truncation/dialog/step code remains because it is still used. No method-revision machinery, duplicate save endpoint, handwritten compatibility shim or unrelated QV refactor was added.

**Verification:** 226 frontend tests across 17 affected suites and 26 load-testing unit tests pass. Frontend `vue-tsc`, full API typechecking, load-testing typechecking and scoped frontend/shared-engine ESLint pass. Shared engine artifacts were synchronized. Isolated Chromium checks using the real card/HTML renderer and sourced comparison styles pass for wide/narrow containers, wide long text, a 390px viewport, RTL, exact green selection, full-card clicks, Enter/Space and unavailable-counterpart blocking. Browser console/runtime error checks pass. These are component checks, not a production build, physical legacy-browser certification or a persisted end-to-end journey.

**Remaining:** BWS participant design/implementation; user-owned coordinated migrations (including data-preserving renames and affected SQL functions/triggers); migration-backed scoring/history/publication verification; full standalone/project/embed browser journeys including multi-tab edit/vote/Undo and reconnect/close/reopen; coordinated rollout. Native-speaker review of the new translations remains a human QA step.

## Naming

The persisted domain is a comparison response, not a particular learning algorithm. A participant has one response per conversation, containing an ordered history of answered tasks.

| Previous name | Canonical name | Meaning |
| --- | --- | --- |
| `maxdiff_result` | `comparison_response` | Participant's resumable response, including completion/session serialization |
| `maxdiff_comparison` | `comparison_answer` | One factual answered task, with displayed candidates and chosen endpoints |
| `maxdiff_user_entity_score` | `comparison_user_entity_score` | Derived personal entity scores for a response |
| `maxdiff_result_id` | `comparison_response_id` | Response ownership FK on answers and personal scores |
| `maxdiff.ts` service | `comparison.ts` | Comparison-family persistence, reads and publication helpers |
| `maxdiffHistory.ts` | `comparisonHistory.ts` | Incremental normalized answer synchronization |
| `maxdiffQueries.ts` | `comparisonQueries.ts` | Canonical answer appearance queries |

TypeScript table exports, Python generated models, dependent reads/writes, diagnostics, backfill tooling and fixtures follow the new names. Public save/load implementation functions are `saveComparisonResponse` / `loadComparisonResponse`. The statistical implementation remains `JointMaxDiffLearning`: that is the actual joint best/worst likelihood, including its binary special case. Existing `ranking_*` tables describe ranking outputs/configuration. DTO identifiers now use comparison/prioritization terminology while keeping existing wire shapes and compatibility routes unchanged.

### Follow-up identifier cleanup

- Answers use `ComparisonAnswer` / `zodComparisonAnswer`. DTOs use `ComparisonSaveRequest`, `ComparisonLoadResponse`, `ComparisonResultsResponse` and matching `Dto.comparison*` schemas.
- Items shared with QV use `PrioritizationItem` / `Dto.prioritizationItems*`; their lifecycle is `RankingItemLifecycleStatus`, consistent with the persisted `ranking_item` catalog.
- The former two `MaxDiffState` shapes are explicitly distinct: `ComparisonSessionState` contains serialized ranking/completion state, while `ComparisonEngineState` contains the catalog and answer history needed to restore the engine.
- Shared and server engine/routing helpers, frontend API/query helpers, cache keys, display/session utilities, component modules, mocks and tests now use comparison names. The existing voting component is only renamed/rewired; its participant interaction remains deferred.
- Booleans covering comparisons **and QV** use `isPrioritizingConversation` / `isPrioritizingDraft`, not comparison-only names. Worker observations and pipeline variables use comparison terminology, with MaxDiff retained at the actual joint likelihood implementation boundary.
- Removed the test-only, unused JSON result parser and the redundant `maxdiffLogic.ts` constant aliases. Feature access uses its existing canonical constants directly.
- Deliberately retained: historical migration/snapshot names, deployment environment keys, legacy stored-draft discriminators, the existing development route URL, and upstream attribution. These are compatibility/attribution boundaries rather than active domain identifiers.

Follow-up verification: **198 API tests, 181 frontend tests, 23 worker tests and 26 load-testing unit tests passed**. Frontend/load-testing typechecks, scoped API/frontend lint, worker basedpyright/Ruff and the soft-delete policy passed. The full API typecheck currently reports an unrelated Drizzle selection-alias error in the concurrently developed `services/api/src/service/accountRecovery.ts`; no errors were reported in the renamed comparison code. Shared artifacts were synchronized; wire shapes and generated endpoint method names did not change. No database migration was generated or applied.

### Final six-point review of the naming refactor

1. **Correctness:** aligned frontend answer equality with persistence: displayed candidate order is part of the factual answer, not an unordered set. Added tests for reordered/identical histories. The save wrapper now validates through the shared DTO and preserves an explicitly supplied method instead of silently dropping it; the legacy omitted-method default remains BWS. This is API plumbing, not the deferred participant interaction.
2. **Type safety:** removed the engine's public low-level ordering API, whose only callers were tests and which could export partial answers with an empty worst choice. `recordAnswer` validates/clones a complete answer before changing history or the matrix. Tests cover invalid endpoints, incomplete answers, duplicate candidates, no mutation on rejection and schema-valid exports.
3. **Clean code:** the wrapper derives its input from the shared save schema rather than duplicating request fields. Engine mutation has one complete-answer entry point; the separate selection/draft state remains outside persisted answer history. Unknown indexed items fail explicitly instead of relying on an invalid array index.
4. **Security:** the renamed paths retain their UCAN/authentication and authoritative backend participation boundaries. The wrapper still refuses a send after session invalidation, now with explicit regression coverage. Runtime answer validation prevents malformed state from being treated as valid; client validation is not a replacement for server validation. No new authorization bypass was found in this refactor review.
5. **Performance:** shared-engine item lookup uses a prebuilt map instead of repeated linear scans; the server matrix reuses its active-item set across answers. Exact history equality is linear in candidate count rather than repeated membership scans. Validation/cloning adds work proportional to each task's candidates and intentionally prevents shared mutable state. No throughput benchmark is claimed; dense matrices and the retained shared local clique-based fallback still have their existing scaling limits.
6. **Dead code:** removed the unused server clique implementation/group API and the unused four-item remaining-vote heuristic, along with tests exclusively targeting those dead paths. Active server routing, shared candidate selection, progress, replay and undo coverage remain. Historical/compatibility names are intentionally retained as listed above.

The later full API typecheck passes: the unrelated account-recovery blocker recorded during the previous verification is no longer present. Participant interaction design and migration-backed verification remain deferred.

Final rerun after these fixes: **194 API tests, 183 frontend tests, 23 worker tests and 26 load-testing unit tests passed**. API, frontend and load-testing typechecks pass, as do scoped lint, worker basedpyright/Ruff, soft-delete policy and scoped whitespace checks. Counts differ from the preceding run because tests solely for deleted dead code were removed; nine regression cases were added for invalid/aliased engine state and save-contract/session handling. No database migration was generated or applied.

FK/unique constraints have explicit bounded names where automatic concatenation would exceed PostgreSQL's 63-byte identifier limit. The unused response completion index was removed; the conversation index and participant/conversation uniqueness remain.

## Findings and changes

### 1. Correctness

- **Admission race:** participation requirements were read before taking the comparison/Polis write boundary. A competing settings edit could therefore win while a vote still used obsolete requirements. Both paths now resolve participation inside the writer transaction, after locking the conversation.
- **History race:** comparison validation read the participant history before locking the response. The response is now claimed/locked first, and its returned predecessor is used for validation before updating serialized and normalized history together.
- **Displayed-order loss:** answer equality treated candidate sets as unordered. Changing the displayed order could leave normalized history inconsistent with the serialized response. Equality now compares the exact candidate sequence; replacements retain the prior row as a tombstone.
- **Canonical counts:** routing appearances and cache-miss participation checks now read active normalized answers instead of the JSON backup. A stale backup cannot affect these counts, and withdrawn answers are excluded.
- **Source eligibility:** catalog conversion uses the shared current-source predicates, including author/account visibility.

### 2. Type safety

- The save service consumes the parsed shared request DTO instead of duplicating its fields in a parallel service interface.
- Success and participation-rejection outcomes are discriminated; the route branches on `success` before using routing data.
- `ConversationTypeEditing` is derived once from its Zod schema and reused by API/editor cache code.
- Answer synchronization uses the canonical `PostgresTransaction` type.
- Predecessor lookup uses `.at()` to represent an absent answer explicitly. Configuration equality compares typed discriminated fields rather than serialized JSON.

### 3. Clean code

- Method-neutral persistence/service names distinguish participant response state, answered tasks and derived scores.
- Removed unused joins/projections from the conversation-lock reads. Settings are read after the lock, avoiding stale joined values when a lock wait spans an edit.
- Separated eligible-item lookup from uncertainty aggregation: save validation does not need score reads or an aggregate.
- Privacy-aware structured error logging replaces interpolated cache-miss error messages in the touched service.

### 4. Security

- **Moderation bypass:** converting a hidden Polis statement into a ranking item would lose its moderation state because ranking items cannot represent that moderation. Such conversions now fail atomically with the typed content-incompatibility result; hidden content is neither published nor silently discarded.
- Admission changes are authoritative at the accepted-write boundary, including authentication/verification, survey, closed and moderation requirements.
- Malformed external vote-buffer payloads make type editing unavailable rather than being ignored and potentially allowing a destructive configuration transition over an accepted vote.
- Database checks protect nonnegative answer positions, distinct selected endpoints, supported candidate cardinality and endpoint membership. API parsing additionally rejects duplicate candidates.
- The existing account-scoped editor-cache protection remains in place for late responses after sign-out/cache clearing.

### 5. Performance

- SQL aggregates expand the normalized `candidate_set` arrays instead of repeatedly parsing response JSON histories.
- Comparison saves no longer load personal score rows or compute uncertainty before validation; uncertainty is computed for the committed response's routing result.
- Pending-buffer reads and source-ID queries are batched; source IDs are deduplicated before SQL parameter construction.
- Joint choice-design matrices are bounded-cached for the supported 2/3/4-item tasks and made read-only. This avoids repeatedly allocating the same matrices during loss/gradient/Hessian evaluation.
- Typed configuration equality avoids JSON projections/string allocations.

These are structural hot-path improvements, not a throughput benchmark claim. The joint learner still uses a dense posterior Hessian over a participant's observed entities.

### 6. Dead code / obsolete paths

- Removed the old service/history/query files through renames and updated their imports; no compatibility implementation aliases were added.
- Removed the redundant response completion index, unused lock-read fields/joins and obsolete pre-lock admission path.
- The sequential learner remains removed. Joint learning feeds the existing Solidago aggregation; the separately used graded-pairwise pipeline is not the binary participant API.
- Historical migration files/snapshots are historical inputs, not dead runtime code. They retain their original identifiers.

## Migration integration gate

Canonical schema and generated artifacts describe the new names. They do **not** migrate an existing database.

The later coordinated migration must preserve rows when renaming the three tables and the response-ID columns, update relevant indexes/constraints, validate existing answers before adding checks, and replace PostgreSQL function/trigger bodies that reference the old identifiers or old `conversation_type = 'ranking'` hierarchy. Retained histories and personal-score tombstones must survive these renames. Reviewed staging SQL sources and the deletion dependency inventory use the current names.

Migration-backed history/publication tests remain a gate for that migration. Canonical-DDL integration tests verify the current application/schema contract separately. Participant browser journeys remain pending the interaction designs.

## Verification of this review pass

- **185 API tests passed** across the seed/type-editing, finalization, routing, diagnostics, email-participation pagination and project-document suites. New coverage exercises the requirements-edit race, canonical counts despite a mismatched JSON backup, exact displayed candidate order, buffered-data parsing failure, Polis buffer admission and hidden-statement conversion rollback.
- **64 frontend tests passed** across editor publishing and conversation mutation/cache coverage; `vue-tsc --noEmit` passed.
- **24 scoring-worker tests passed** across the joint learner, scoring, observations and publication-locking coverage. Basedpyright reported zero errors/warnings; scoped Ruff passed.
- API typechecking, scoped API/frontend ESLint, soft-delete policy and scoped whitespace checks passed.
- Shared TypeScript copies, Python models, canonical-DDL fixtures and the deletion dependency inventory were regenerated. No database migration was generated or applied.
- Verification also caught a source-invalidation call-signature mismatch and incomplete outbox-topic cleanup between finalization tests; both were corrected.
