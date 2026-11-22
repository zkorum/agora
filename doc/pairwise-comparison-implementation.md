# Pairwise and joint BWS — revised scope

## Latest product direction — authoritative

### Publication boundary — 2026-11-11

Publication now fixes the conversation type and voting method (Polis, BWS, pairwise, QV), regardless of effective vote count. Undo, withdrawal and close/reopen do not unlock method changes. Creator drafts remain frontend-local and freely configurable; backend drafts are deferred. Ordinary method-specific settings and statement edits retain their separate authorization rules. This replaces the earlier zero-effective-vote conversion policy and its implementation/verification claims below; historical live-switch proposals are not current requirements.

### Account-unlinked numerical inputs — 2026-11-11

Retain the individual comparison choices and candidate sets behind retained results, with removable account links, consistently with Polis matrices and QV allocations. Account deletion excludes future live participation but never rewrites sealed numerical inputs/results. Do not retain every session/revision or credential, expose private inputs, or treat unlinking as guaranteed anonymization. The [shared retention handoff](deletion-dependency-contracts.md#updated-retention-decision--2026-11-11) records the target; participant-aware frozen comparison storage/cleanup is not yet verified. Hard-delete implementation remains deferred; no schema/migration work is part of this decision.

Source follow-up (2026-11-13): `ranking_input_*` now retains participant-indexed
original/effective tasks and pipeline provenance behind existing statistics and
checkpoint publications, including empty results. Resumable comparison sources
can detach their private account link only after bounded purge-phase retirement;
retained legacy results without captured evidence and unfinished closes block that
handoff. The independent frozen graph cannot become live ballots or reattach to a
registration. This supersedes the earlier storage-pending status above, not its
rollout gates: schema source/codegen are prepared, but migrations, historical-data
compatibility, deployment and the separate hard-deletion worker remain gated.

Updated 2026-11-04. The comparison foundation and design-backed Pairwise participant content are implemented. The BWS interaction redesign still awaits its design/instructions. Database migrations remain the user's responsibility.

### Pairwise content design — 2026-11-04

- Reviewed selected Figma frame `24275:131796`, comparison content `24276:133591`, selected state `24302:238150`, and `/Users/nicobao/Downloads/Agora — Working prototype.html`.
- Preserve the surrounding comment/analysis layout, progress and Undo toolbar. Do not copy the prototype's broader navigation, fixed pair totals or next/previous pager: routing is adaptive, so a predetermined total would be misleading.
- Two native-button card targets show full statement/body content with a separate details action for external sources. Choosing either statement saves one complete binary answer and advances; no best/worst second step. Translation controls do not cast votes. Keyboard focus follows the next pair or completion message.
- Selected cards use the existing Figma green palette (`$green-darkest`, `$green-lightest`) and a checkmark; the other card remains neutral. No purple/yellow preference pairing.
- **Available width, not device detection:** flex wrapping stacks the cards when the comparison container cannot fit two readable cards (approximately `36rem`). It also stacks at any width when either displayed statement exceeds 280 plain-text characters or contains body details. The content check follows the displayed translation. Full content wraps rather than being four-line-clipped. This no longer depends on container queries or `:has()` support.
- The save mutation explicitly carries the current method for voting, Undo and reset; local fallback candidates use two items for Pairwise. Invalid/non-binary tasks show a recoverable error rather than voting with the wrong set.
- The follow-up [six-point UI audit](pairwise-joint-bws-audit.md#pairwise-participant-content--six-point-audit-2026-11-04) also fixes unreadable-card voting, empty/duplicate task handling, stale focus and rollback after an already-accepted save whose session refresh fails. Binary local fallback no longer enumerates maximal cliques.
- Verification after the audit: **226 frontend tests across 17 affected suites and 26 load-testing unit tests pass**, as do frontend/API/load-testing typechecks and scoped ESLint. Isolated Chromium checks using the real card/HTML renderer and sourced comparison styles cover wide short text, a narrow desktop container, a 390px viewport, wide long text, RTL, green selection, full-card clicks, Enter/Space and unavailable-counterpart blocking. This is component verification, not a migration-backed end-to-end journey or a physical legacy-browser support claim. No database migration was generated or applied.

### Implementation status

- Follow-up review/refactor: method-neutral comparison storage names, transactional admission/history validation, moderation-preserving conversion rejection, canonical answer counts and bounded hot-path allocations are documented in [the implementation audit](pairwise-joint-bws-audit.md).
- Canonical contracts/schema now allow `bws | pairwise`, with method-aware routing and comparison API aliases. No `comparisonMethodRevision` was added.
- The API rejects published type/method changes under the conversation write lock before mutations. Permitted configuration changes (Polis presentation) retain expected-original-config checks. No effective-vote queries or buffered-Undo overlays determine type editability.
- Published conversion/catalog-copying code and the dynamic editability endpoint/polling/cache machinery have been removed. No schema/history-link changes are needed. QV now has explicit saved responses; its permanent first-Save statement lock is independent of publication-fixed methods.
- The worker uses `JointMaxDiffLearning`, normalizing all distinct ordered best/worst choices with `choice_scale=0.5`. Two-item tasks reduce exactly to one binary logistic observation; scores/uncertainties continue through the existing Solidago aggregation.
- Facilitators select the method in creator drafts, not published edits. The existing type label is read-only after publication; Polis presentation and other ordinary settings remain available. Pairwise participant content is implemented as described above; BWS interaction is unchanged.
- Shared/Python models, SQL test fixtures, OpenAPI and generated clients are regenerated. OpenAPI was generated against a disposable database using canonical DDL, not by changing the development database.
- The user explicitly elected to generate the database migration later. No new migration is generated or applied by this work. The coordinated hierarchy/enum migration must also update historical scoring/lifecycle SQL functions that still filter the old `ranking` conversation type.

### Verification and remaining integration gates

- Earlier foundation implementation checks are recorded below; the final naming audit and current Pairwise UI checks are recorded in [the audit](pairwise-joint-bws-audit.md). These test counts describe different verification passes, not one combined current run.
- API: seed/type-change and routing coverage passed (92 tests); finalization coverage passed (43 tests). Race coverage includes both edit/vote lock orders, vote/Undo editability, buffered Polis overrides and cross-family content round trips.
- Frontend: the earlier four targeted suites passed (72 tests). The final editor/cache pass reran the seed-edit and conversation-mutation suites with two additional account/cache regression cases (64 tests across those two suites).
- Scoring worker: joint model/scoring/observations coverage passed (23 tests), plus the publication-locking test (1 test). Joint-model checks include binary logistic equivalence and numerical derivatives.
- API typechecking, frontend `vue-tsc --noEmit`, worker basedpyright, scoped ESLint/Ruff, soft-delete policy and scoped whitespace checks passed. The final generated-client/cache edits also passed frontend ESLint and both TypeScript checks.
- Still pending: the user's coordinated database migration, migration-backed integration/publication verification, and browser journeys after the participant designs are implemented. Canonical-DDL fixtures do not validate the eventual migration path.

### Confirmed scope

- Add binary pairwise voting. The supplied Figma/prototype design has now been reviewed and the content interaction implemented as described above.
- Replace sequential best-first/worst-second BWS preference learning with **joint BWS** for the new interaction.
- Allow type/method selection in frontend creator drafts only. Backend creation is publication and fixes the method, regardless of votes or lifecycle reopening.
- Enforce the publication policy server-side before applying edits, without vote-dependent editability checks or post-publication conversion paths.
- Ordinary settings and statement maintenance have separate method-specific policies. QV participant edits are in-memory until explicit Save, not persisted private drafts.
- Historical prioritization compatibility is low priority. Do not build mixed sequential/joint historical learning or a detailed provenance migration by default; decide any minimal data handling from the actual deployment needs.
- Pairwise design review is complete. Keep the **BWS interaction redesign** on hold until its design and instructions are reviewed; the existing best-then-worst UI remains unchanged.

### Simplifications to the implementation proposal

- Drop live post-vote BWS/pairwise switching and the dedicated `comparisonMethodRevision` mechanism proposed for it.
- Drop cross-method Undo restoration and in-flight post-vote presentation-switch machinery.
- Drop the planned mixed historical sequential/joint learner unless an actual deployment requirement emerges.
- Keep ordinary settings/cache updates for permitted method-specific edits. No published method-switch revisions, retained QV configuration links, effective-vote scans or editability polling are needed.
- Reassess the earlier API alias/versioning proposal after reviewing the design; it is not a prerequisite established by this revised scope.

**Everything below is archived analysis of the previous live-switching proposal. It is superseded wherever it conflicts with the direction above and is not the current implementation checklist.**

---

Status: implementation plan, concretely reassessed 2026-10-30. Planning only; application behavior has not been changed. Coordinate implementation with the ongoing QV/type-hierarchy refactor described in [quadratic-voting-implementation.md](quadratic-voting-implementation.md).

## New BWS interaction requirement: resolve the observation model

The facilitator/product direction now also removes the forced best-first, then-worst interaction: participants select best and worst as one round, without a required selection order. This supersedes earlier instructions in this document to preserve the existing BWS two-stage interaction.

The current learner is explicitly sequential: it models selecting best from the full set, then worst from the remaining items. Merely allowing the two UI selections in either order does not mathematically force a new learner, but retaining that learner would retain its best-first behavioral assumption. If the intended task is a genuinely joint best/worst choice, evaluate and select a joint MaxDiff likelihood explicitly before implementing the worker slice. The earlier recommendation of no preference-learning changes applies to adding binary pairwise alone, not automatically to redesigning BWS collection.

A candidate joint likelihood assigns probability to each distinct best/worst pair proportional to `exp(scale * (score_best - score_worst))`, normalized over every distinct ordered pair in the shown set. Its loss/gradient/Hessian differ from the current sequential learner. Pairwise and BWS utility/noise scales must be chosen consistently: the unscaled joint formula on two items gives `sigmoid(2 * score_difference)`, whereas the current binary-choice likelihood gives `sigmoid(score_difference)`. Set and test an explicit scale convention rather than accidentally changing the pairwise score-difference scale.

If both observation models coexist, preserve a model/version discriminator on saved tasks: historical sequential BWS, new joint BWS, and binary pairwise must remain distinguishable. Backfill only provenance established by the old collection contract. A mixed learner evaluates each task under its recorded model on a common calibrated utility scale; the conversation's current method must not reinterpret history. Existing stored `{best, worst, set}` values remain useful, but cease to be sufficient provenance by themselves. Candidate routing, resolved-pair progress and downstream Solidago aggregation can largely remain shared.

`comparisonMethodRevision` serves a separate purpose: optimistic concurrency and presentation freshness during live BWS/pairwise switches. It is not a vote count, scoring revision, or observation-model version.

## Current assessment and execution plan

Rechecked against HEAD `28634e63` and the current uncommitted QV/refactor changes. **Pairwise and live method switching have not been implemented.** The sections below are design/analysis, not completed work.

| Area                        | Current state                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prioritization hierarchy    | Shared contracts and creation/page dispatch distinguish comparisons from QV. Reuse this work.                                                                                                    |
| Comparison method           | Canonical Zod and DB enums still contain BWS only; no method revision exists.                                                                                                                    |
| Creation                    | Drafts/publishing/DB insertion already carry `comparisonMethod`; the picker offers BWS/QV only.                                                                                                  |
| Existing-conversation edits | The backend rejects comparisons/QV family changes, but does not persist comparison-method changes.                                                                                               |
| Voting                      | The component still requires best then worst; no binary one-click branch exists.                                                                                                                 |
| Live updates                | SSE updates common settings but ignores comparison-method changes; Undo/rollback restore unversioned candidate sets.                                                                             |
| Scoring                     | Current sequential-choice scoring can consume two-item and larger tasks. Latest HEAD removes plural BWS weighting; use its current aggregation unchanged. Reconciliation still filters BWS only. |
| Migration baseline          | Canonical hierarchy/QV changes are ahead of the inspected Flyway baseline. Reconcile migration ownership before generation.                                                                      |

### Implementation packages, in order

These are implementation/verification checkpoints for one end-to-end feature. Expose Pairwise after the full flow works.

1. **Shared contracts and schema**
   - Extend `zodRankingMode` and `rankingModeEnum` with `pairwise`; add `comparisonMethodRevision` to the comparison config with a nonnegative check and default zero.
   - Add revision-bearing persisted presentation outputs and expected-revision comparison edits, keeping server revisions out of creation drafts.
   - Reconcile the hierarchy migration with the QV work, then use canonical sync/migration/codegen tooling. Pure helpers and frontend session work can proceed while that baseline is being finalized; database integration requires the settled migration.
   - **Done when:** old BWS rows survive migration, pairwise config round-trips, and invalid comparison/QV configurations are rejected.
2. **Transactional comparison backend**
   - Extend `postEdit.ts` with revision checking, method persistence, settings-change detection and accepted-presentation responses. Preserve its existing comparisons/QV conversion rejection.
   - Refactor comparison saves so writer-side admission/open-state checks and persistence share one conversation-locked transaction; load mutable session state consistently from the writer.
   - Read comparison settings inside close/reopen transactions before queuing their events.
   - **Done when:** repeated switching works before/after participation and while closed; stale edits conflict; a switch changes neither scoring revisions nor saved results; close/save races have deterministic accepted/rejected outcomes.
3. **Method-aware API/routing and worker integration**
   - Reuse `generateCandidateSets` with a shared method-to-size helper: BWS four, pairwise two. Preserve mixed history in all loads/saves.
   - Add `/prioritization/comparisons/*` contracts around the shared services and retain legacy route response projections; use the already shared `/prioritization/items/fetch` for items.
   - Extend comparison/checkpoint, worker reconciliation and GitHub sync guards to both comparison methods. Keep the current sequential-choice scoring/aggregation.
   - **Done when:** pairwise always receives two unresolved candidates, mixed histories continue to completion, the worker recovers pairwise jobs, and legacy save responses retain their strict wire shape.
4. **Revision-aware frontend state**
   - Share one presentation merge across SSE, conversation HTTP reads, facilitator-edit responses and comparison session queries.
   - Keep presentation freshness separate from saved-answer/session validity. Queue a switch received during a pending save, retain the accepted answer, then refresh the round.
   - Make rollback, Undo, redo, item reconciliation and reactivation/reconnect recovery respect the current presentation.
   - **Done when:** delayed responses/events cannot restore an older method, and switching never loses an accepted answer or restores four cards into pairwise.
5. **Creator/facilitator controls and one-click UI**
   - Add Pairwise to the creation picker and correct method labels. Add a comparison-only edit selector, retaining QV as a fixed family after creation.
   - Add the one-click pairwise branch to the existing voting component, with a separate details affordance, keyboard interaction and translated method-specific prompts/help.
   - **Done when:** either card casts exactly one complete task in one activation, drafts retain the selected method, and authorized editors can switch in either direction without content loss.
6. **Integration gate and rollout**
   - Verify migration, typed DTO/client consistency, permissions/family immutability, mixed history/math, close/save and edit/edit races, live-switch save/undo/rollback, GitHub eligibility and closed/reopen behavior.
   - Browser journey: create Pairwise → vote → another tab switches to BWS → vote → Undo across the switch → switch back → close → edit method → reopen. Cover standalone/project/embed views and long statements.
   - Run affected service checks and the soft-delete policy check. Roll out schema, compatible API/worker, then frontend.

**Validation status:** routing/math checks recorded in section 9.11 were performed during the previous analysis; they are evidence for reuse, not proof that this unimplemented feature works. This reassessment inspected current code and corrected the survey-edit finding; it did not rerun those tests or change application code.

## 1. Product contract

Confirmed requirements:

- Add pairwise alongside BWS under the comparisons branch of prioritization.
- Pairwise shows two statements. One click on either statement records that statement as preferred and advances the round. There is no preference-strength control or second selection/confirmation step.
- Authorized facilitators can switch an existing conversation from BWS to pairwise and back repeatedly, including after participation starts.
- An existing comparison conversation cannot switch to QV. Keep the comparison/QV family fixed after creation; reject QV-to-comparisons conversion too.

Use the hierarchy already being introduced by the QV work:

```text
conversationType: prioritizing
├─ prioritizationType: comparisons
│  └─ comparisonMethod: bws | pairwise
└─ prioritizationType: qv
   └─ allocation settings managed by the QV implementation
```

Planned switching behavior:

- The selected comparison method controls future rounds, not how saved answers are interpreted.
- Preserve all statements, accepted answers, personal progress/completion, participant identities, community results and checkpoints. Participants continue from their existing knowledge rather than start over.
- A method-only edit does not change scoring inputs or require recomputation. Scores can change when new answers arrive, as usual.
- Permit a method-only edit while closed as well as open, subject to normal facilitator permission, moderation and deletion rules. It does not reopen voting, accept closed writes or alter closed results; it selects the presentation used after reopening.
- Changing the comparison method does not relax statement-editing rules. QV's first-participation statement lock remains specific to QV.
- BWS remains the default for existing comparison conversations and legacy creation drafts.

## 2. Findings from the current checkout

The checkout is mid-refactor. Canonical shared contracts, frontend draft persistence/publishing, standalone/project page dispatch and worker reconciliation now use `prioritizing/comparisons/comparisonMethod`. Storage still deliberately uses `rankingMode`; remaining BWS-only checks and incomplete settings handling need extending. Recheck the moving baseline before implementation.

Relevant existing pieces:

- `services/shared/src/types/zod.ts`: `zodRankingMode` currently allows only `bws`; the new comparisons/QV discriminated hierarchy already exists. `zodMaxdiffComparison` already accepts candidate sets of two or more distinct items.
- `services/shared-backend/src/schema.ts`: the `ranking_mode` enum currently contains only `bws`. Comparisons use `ranking_conversation_config`, `maxdiff_result` and normalized `maxdiff_comparison` rows.
- `services/api/src/service/maxdiffRouting.ts`: `generateCandidateSets` already accepts `candidateSetSize`, defaulting to four.
- `services/shared/src/utils/maxdiff.ts`: the adaptive engine accepts a candidate limit and replays histories of varying set sizes. Its default is four, and its remaining-round heuristic assumes four-item BWS rounds.
- `services/api/src/service/maxdiff.ts`: save validation and checkpoint access still explicitly require BWS.
- `services/api/src/index.ts`: current comparison routes are named `/ranking/bws/*`, and load/save routing does not pass a method-specific candidate size.
- `services/api/src/service/postEdit.ts`: the in-progress family guard rejects subtype conversion, but comparison method persistence/change detection still needs to be implemented.
- `services/agora/src/components/post/maxdiff/MaxDiffVotingTab.vue`: voting currently requires separate best and worst clicks. Local candidate fallbacks default to four, and Undo restores the removed answer's original set.
- `services/scoring-worker/src/scoring_worker/maxdiff_sequential.py`: the production sequential-choice likelihood accepts two-item tasks. Its worst-selection stage contributes zero when only one item remains, so a two-item task contributes one binary preference observation.
- `services/scoring-worker/src/scoring_worker/scoring.py`: a separate graded-pairwise pipeline exists, but the current worker dispatches saved comparison history through the sequential BWS model. Worker reconciliation still has BWS-only filters.
- `services/shared/src/types/sse.ts` and API `realtimeEventOutbox.ts`: a conversation-settings event already carries the presentation config. Extend/reuse this path for live switching.

## 3. One answer history; observation model depends on BWS design

Reuse the existing factual choice-task representation:

```ts
{
    best: chosenStatementId,
    worst: otherStatementId,
    set: [firstDisplayedStatementId, secondDisplayedStatementId],
}
```

Persist the displayed order. A mixed history can contain four-, three- and two-item BWS tasks and new two-item pairwise tasks. Keep each task's exact candidate set and selected endpoints.

For adding binary pairwise while retaining the old BWS collection design, the sequential-choice preference learner can process the entire mixed history, followed by the existing Solidago aggregation/scaling pipeline. For a two-item task it reduces to the ordinary binary-choice logistic likelihood. The new order-independent BWS interaction requires the observation-model decision described above; a joint model would replace this sequential-only recommendation for new BWS tasks and require explicit historical task provenance. Add numerical tests for loss, gradient, Hessian and cross-method scale consistency.

Do not dispatch scoring by the conversation's currently selected UI method: switching that setting must not reinterpret old tasks. Do not expand one BWS answer into multiple independent pairwise observations, score inferred transitive relations as votes, or switch an entire mixed history to the separate graded-pairwise pipeline. The existing graded `PairwiseComparison` schema is not the participant payload for this feature.

No new ballot table or data conversion is needed for binary pairwise answers. Historical two-item BWS tasks are statistically equivalent evidence; do not retrospectively claim their UI was pairwise. Any exports describe the saved task and candidate set rather than infer original presentation from the conversation's current setting.

## 4. Contracts, schema and method editing

1. Extend the canonical comparison-method Zod/DB enums to `bws | pairwise`. Reuse the QV agent's discriminated hierarchy and naming. Preserve existing storage/table names unless that coordinated refactor already changes them.
2. Add a comparison-presentation revision to the comparison config, separate from scoring input/invalidation revisions. Increment it only on an actual method change. Use it to prevent stale edit tabs and late routing responses from restoring an older presentation, including BWS → pairwise → BWS sequences.
3. Carry the method/revision in authoritative edit reads and comparison load/save routing responses, and include the revision in settings events/cache projections. Supply the expected presentation revision when editing a comparison config; return a typed conflict on a stale edit rather than silently resetting a method changed elsewhere.
4. In the existing conversation-edit transaction, validate the persisted family, authorization and expected revision, update the method/revision, include it in settings-change detection, and enqueue the existing settings outbox event. Return accepted configuration from the transaction/`.returning()`.
5. Reject all persisted comparisons ↔ QV changes server-side, regardless of participant count or whether voting has started. Creation-time draft mode selection remains the creation flow's responsibility.
6. A method-only edit must not advance scoring revisions, clear score pointers, reset counters, change closing targets or enqueue scoring. Audit existing database triggers to verify this property, including edits made while closed/finalizing.
7. Generalize BWS-only guards to the comparisons family where the behavior is shared: save/load, results, items, checkpoints, lifecycle, survey refresh, external-source synchronization, exports and worker reconciliation. Keep QV excluded explicitly.

Edit canonical sources, sync shared artifacts and use API migration/codegen tooling. Generate migrations only after reconciling the other agent's schema/migration work. Keep enum-addition ordering valid before any new value is used. PostgreSQL function/trigger adjustments, if needed, belong in new migrations rather than edits to historical migrations.

For API naming, the updated recommendation is `/prioritization/comparisons/*`, building on the QV refactor's new `/prioritization/items/fetch` endpoint. Keep `/ranking/bws/*` compatibility routes sharing the same service functions, with response projections that retain the legacy wire contract. In particular, the existing save-success parser is strict: simply adding fields to its response would break older clients. Regenerate the OpenAPI client for the new contracts.

## 5. Candidate routing and save behavior

- Derive routing from the authoritative persisted method: pairwise requests exactly two candidates; BWS retains its current size-four behavior, with smaller sets when appropriate.
- Use the same method-to-size rule for server load/save and every local fallback/recovery path. Pairwise must never accidentally fall back to four candidates.
- For pairwise, choose an unresolved pair, not merely two items that each have some unresolved relations. Existing greedy routing must be verified/adapted so global uncertainty cannot cause it to emit an already-resolved pair.
- Rebuild known relations from the entire mixed history. Retain transitive completion and existing item eligibility/lifecycle behavior.
- Validate submitted IDs and task structure within the comparisons family. Do not require every historical task to have the current method's candidate count: mixed histories and an in-flight old round are valid.
- A complete answer from a round displayed before a method switch remains acceptable while voting is open. The save response carries the current authoritative method/revision and next candidates. This avoids discarding a participant's valid completed choice during a facilitator edit.
- Continue enforcing admission, ownership, eligibility and open/closed lifecycle at the write boundary. Method switching must not create a new path around these checks; cover a close racing an in-flight comparison save.

## 6. Frontend creation, editing and one-click voting

### Creation and facilitator editing

- Extend the prioritization/comparison picker being built by the QV agent with BWS and Pairwise. Store `comparisonMethod` in the existing persisted creator draft and publish adapter.
- Migrate legacy drafts as BWS without losing content, and include the method in dirty-state/reset/load behavior.
- On existing comparison conversations, expose only the BWS/Pairwise method selector. Keep QV outside the post-creation selector and show it as the existing fixed family for QV conversations.
- Save through the existing edit flow, with presentation-revision conflict handling and cache updates. Explain that switching keeps previous answers and results.

### Participant interaction

- Reuse common session, admission, candidate display, results, undo and optimistic-save logic. Keep method-specific selection/rendering small and explicit rather than duplicate the entire voting component.
- Pairwise: show two statement cards with a single prompt such as “Which statement has higher priority?” One card activation immediately creates the full task, records it optimistically and saves. Keyboard activation must work equivalently. Disable duplicate activation while the action is pending.
- Keep long statement content readable while preserving the one-click voting contract. The pairwise vote action must not first open the current truncation dialog and require another vote click. Offer a distinct details affordance with propagation handled so opening details does not cast a vote.
- BWS keeps its two-stage best/worst interaction. Shared results and “my ranking” show accumulated evidence from both methods.
- Keep resolved-pair percentage/completion; remove or adapt BWS-specific remaining-round estimates in pairwise/mixed sessions. Update labels, help text, translations, accessibility and RTL layout.

### Receiving a switch during a session

- Apply the existing settings event and refetch on reconnect/reactivation to recover missed events. Treat load/save responses as authoritative routing state too.
- Fence asynchronous routing/cache updates with the presentation revision and the existing session/action guards. An older response/event cannot reinstall a stale method or candidate set.
- On observing a newer method, clear an unsubmitted partial best/worst selection, retire old buffered candidates and request a fresh round under the new method. Preserve saved history/progress and reconcile any save already in flight from the server before resuming; do not overwrite an accepted save with a local pre-switch snapshot.
- Undo removes the latest accepted task from the mixed history. Restore its original candidate arrangement only when compatible with the current presentation; otherwise route a fresh round using the current method. In particular, undoing a four-item BWS answer while in pairwise must not display four pairwise cards.
- Redo/reset, item-list changes, save rollback and candidate-fetch retry must also regenerate candidates according to the current method.

## 7. Coordination and implementation order

The active QV work overlaps canonical `schema.ts`, shared Zod/DTOs, `post.ts`, `postEdit.ts`, type mappers, generated models/client and creation UI. Re-read its latest state before each shared slice; establish ownership and serialize migration generation, shared syncing and OpenAPI generation. Avoid an independent competing `ranking` → `prioritizing` migration or broad rename.

Suggested work packages:

1. **Settle integration baseline:** agree on the comparisons/QV contract, route names, creation picker and canonical migration ownership with the ongoing refactor.
2. **Canonical contracts/schema:** add pairwise, presentation revision and typed editing/routing/event contracts; generate and review migration/artifacts.
3. **Backend:** implement transactional method edits and family immutability; generalize comparison handlers/guards; apply method-aware routing and current-method responses.
4. **Scoring integration:** widen comparisons eligibility/reconciliation filters and document/test mixed sequential-choice scoring. Preserve the current aggregation and saved results.
5. **Frontend:** integrate creation/edit selection, one-click pairwise interaction, live switching, mixed-history undo/recovery and method-aware copy.
6. **Verification and rollout:** regenerate API/shared/Python artifacts from the settled baseline, run the focused checks below, and verify existing BWS plus the new switching journey. Deploy schema first, then compatible API/scoring worker, then the frontend exposing pairwise.

## 8. Acceptance checks

- Existing BWS conversations/data/drafts still load unchanged; pairwise creation round-trips through project, language, visibility and participation settings.
- One click on either of two cards saves exactly one preference task. Double activation does not create a second task; network failure restores the choice safely.
- BWS → pairwise → BWS after several answers preserves the mixed history, progress, completion, personal/community scores and counts. A method-only edit itself does not change numerical results or scoring revisions.
- Pairwise routing always returns an unresolved pair with two distinct eligible items, including uncertainty-skewed cases and local fallback paths. BWS continues producing its normal sets.
- Mixed-history replay/routing/completion works for partial and complete rankings, item addition/removal and guest/account flows.
- Switching while closed keeps voting closed and saved results fixed; reopening uses the chosen method. Switching during finalization does not disturb closing targets/publication.
- Unauthorized switches and all comparisons ↔ QV edits fail server-side, including attempts before the first vote.
- Stale facilitator tabs, missed/replayed settings events, delayed loads/saves, partial BWS selections and a save racing a method switch do not lose accepted answers or restore stale UI.
- Undo across both kinds of answer, redo, retry and save rollback respect the current method.
- A two-item sequential task contributes one binary-choice likelihood; mixed scoring retains original BWS task structure rather than pairwise-expanding or double-counting it. Worker reconciliation picks up both methods and excludes QV.
- Verify affected shared/API/frontend suites and scoring-worker tests/lint/typechecks after codegen, generated-contract consistency and `make check-soft-deletes`. Extend meaningful existing suites for routing, history, editing, publication and sessions.
- Browser journey: create pairwise → vote → switch to BWS from another tab → vote → undo across the switch → switch back → close → edit method → reopen. Exercise standalone/project/embed dispatch, mobile/keyboard use and long statements.

Expected deployed services: `agora`, `api`, `scoring-worker`; include other generated-schema consumers only as required by the coordinated QV/refactor rollout.

## 9. Concrete implementation analysis against the updated checkout

Names below are proposed implementation names. This section refines the earlier plan using the actual call paths and focused runtime checks.

### 9.1 What the concurrent work already supplies

- `conversationDraft.schema.ts` extends the canonical comparison config and migrates legacy `ranking`/`maxdiff` drafts to BWS. `useConversationDraft.ts` projects and persists the complete config; `usePublishConversationDraft.ts` already forwards `comparisonMethod`. Adding the enum member should flow through these paths without another draft format migration.
- `PostTypeDialog.vue` now has the prioritization sub-picker, currently BWS/QV. Add Pairwise there and derive the selected comparison method from the actual config instead of returning `bws` for every comparison activity.
- Standalone/project voting and analysis pages now branch on `prioritizationType`. Both comparison methods can keep using the existing comparison components. QV currently uses an activity preview and has separate statement maintenance; its ballot/tally implementation is not a prerequisite for pairwise.
- `post.ts` already creates comparison configuration using `request.comparisonMethod`. It needs the extended enum, not a second creation implementation.
- Worker reconciliation now filters `prioritizing/comparisons`, but still additionally requires `ranking_mode == "bws"`.
- `/prioritization/items/fetch` already shares its implementation with the legacy BWS item-fetch route. Reuse this endpoint for comparison item content.

The visible migration baseline still defines the old `ranking` conversation type, while canonical code now uses `prioritizing` and QV configuration. A generated hierarchy/QV migration was not present in the inspected Flyway files. Resolve that baseline with the other agent before generating pairwise migrations or running migration-backed integration tests. Do not treat generated TypeScript/Python copies as evidence that a database migration has shipped.

### 9.2 Concrete contract changes

Keep creation configuration and persisted presentation state separate:

| Location                                          | Proposed change                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical `zodRankingMode` and DB `ranking_mode`  | Add `pairwise`; retain existing names/storage.                                                                                             |
| `ranking_conversation_config`                     | Add nonnegative `comparison_method_revision`, default `0`; increment on actual switches only.                                              |
| Shared comparison presentation schema             | `{ comparisonMethod, comparisonMethodRevision }`; combine with the existing family discriminators for full persisted presentation outputs. |
| Conversation metadata, including metadata-with-ID | Include `comparisonMethodRevision` only on the comparisons branch.                                                                         |
| Edit-read comparison config                       | Return method and revision from the writer.                                                                                                |
| Update-request comparisons branch                 | Require `expectedComparisonMethodRevision` alongside the requested method. Creation has no caller-supplied revision.                       |
| Update success                                    | Return the accepted persisted presentation; seed the editor/view caches from it.                                                           |
| New comparison load/save response                 | Include the authoritative method/revision with the routed candidates. Keep the existing answer-history shape.                              |
| Settings SSE comparison presentation              | Include method/revision; Polis and QV preserve their own branch shapes.                                                                    |

Use a separate output schema such as `zodConversationPresentation` for revision-bearing persisted state. Do not add a required server-owned revision to `zodConversationTypeConfig`, which is reused in creation and local drafts. Reuse its branch shapes when constructing the output schema rather than defining competing method enums/interfaces.

Extend `parseStoredConversationTypeConfig` to accept the shared `RankingMode` type instead of its current hardcoded `"bws" | null`. Add a persisted-presentation mapper for outputs; retain `projectConversationTypeConfig` to strip output-only fields when building a creation/draft config.

`services/api/src/service/common.ts` needs the config revision in its database selection and both metadata mappers. `getConversationForEdit` and close/open settings selections need it too. Avoid silently defaulting a missing joined config/revision: the database migration supplies real zeroes for existing comparison rows.

### 9.3 Editing transaction: extend the current path

`updateConversation` already locks project scope before taking `FOR UPDATE OF conversation`. Keep that lock order and its capability/moderation/deletion checks.

For a comparisons edit:

1. After obtaining the conversation lock, read/lock the comparison config in a separate query. The existing joined query can have evaluated joined fields before waiting for the conversation lock; do not use that earlier joined revision as the final concurrent-edit check.
2. Narrow the persisted/requested families and reject family conversion. Validate the expected method revision before any content, seed, survey or settings writes.
3. If the revision is stale, return a typed `comparison_method_conflict` failure carrying current presentation. Reject the whole edit, preserving local unsaved edits for the facilitator to reconcile.
4. If the requested method differs, update only `rankingMode`, `comparisonMethodRevision` and `updatedAt` on the config, using `.returning()`. A no-op leaves the revision unchanged.
5. Add `comparisonMethodChanged` to `conversationSettingsChanged`; build the outbox payload and response from the accepted transaction values.

The current service has no comparison-config UPDATE at all, and its settings-change expression does not compare the method. Both additions are necessary: changing only the returned config would produce an apparently successful edit that disappears on reload.

Validate the revision on every comparison edit, not just when request-versus-database methods differ. Otherwise a stale editor can silently restore an older selection while saving an unrelated title change.

Keep method-only edits free of incidental scoring writes. Reinspection confirms that `buildEditConversationRequest` already omits `surveyConfig`; the dedicated survey flow supplies it separately. Preserve this behavior when adding method editing. The API invokes `setSurveyConfigForConversation` whenever that field is present, so a method switch should continue omitting it. The earlier claim that ordinary edits always submitted the full survey was incorrect.

The inspected scoring triggers react to comparisons, item/eligibility changes and lifecycle changes, not arbitrary `ranking_mode`/presentation-revision updates. Preserve that distinction and assert it in a database test.

### 9.4 Comparison save/load and the real close boundary

The current route checks participation before calling `saveMaxdiffResult`. That service checks the comparison family through ordinary reads, then opens a separate transaction for the result upsert. It does not lock/recheck `isClosed` inside that write transaction. A close can therefore race the preflight check; the current implementation does not yet establish the boundary assumed in section 5.

Implement an API service entry point around the existing persistence code, for example `saveComparisonSession`:

1. Authenticate the request through the existing UCAN route plumbing.
2. Start a primary-database transaction and take `FOR SHARE` on the conversation row before participant/result/config locks. Read open/deleted/importing state and the fixed comparison family there.
3. Run authoritative participation/admission checks using that transaction, including survey/moderation eligibility. Preserve the existing guest identity resolution. This must use the same accepted-write transaction, not a replica-routed preflight result.
4. Upsert the participant's `maxdiff_result`, diff/sync the normalized comparison history, and read current presentation/items/uncertainty in the same transaction. Refactor `saveMaxdiffResult` into a transaction-aware internal helper rather than create nested independent write transactions.
5. After commit, route next candidates from the returned values and wake the existing scoring dirty set. The response identifies the presentation revision used for routing.

`FOR SHARE` allows concurrent voters and conflicts with close's non-key lifecycle update. `FOR KEY SHARE` would not provide that boundary. Preserve conversation-before-config ordering, which the scoring worker explicitly follows in `_persist_scoring_conversation`.

Do not take a shared config lock and later upgrade it: the history triggers update that config and competing voters could deadlock on upgrades. The conversation lock serializes method edits/closing against accepted writes; ordinary config reading does not need another preliminary shared lock.

Treat the displayed method as presentation, not a historical-ballot validity rule. An old complete BWS task may commit after a method switch if the conversation remains open. A close that commits first rejects that write. Retained tasks involving subsequently removed items stay in history under existing filtering rules; validate newly added/changed tasks without blanket-rejecting legitimate unchanged history against the current active catalog.

For load, return method/revision and personal history from a writer-consistent read transaction. This is a small mutable-session read, separate from replica-friendly immutable results. It avoids refetching a pre-save history or an old mode immediately after a switch. Keep historical results/checkpoints on their existing snapshot-based read paths.

### 9.5 Fix close/open event construction alongside switching

`closeConversation` and `openConversation` currently read presentation outside the lifecycle transaction and reuse that object for the settings event. Example: close reads BWS; a facilitator changes to pairwise; close then commits and broadcasts the earlier BWS config with a later timestamp.

After acquiring the lifecycle write lock, build comparison presentation from the config inside that transaction. Include its real method revision in the outbox event. Continue carrying the revision independently of scoring/closing generations; a method edit cannot change `closingTargetRevision` or force a new closed snapshot.

### 9.6 Candidate selection: reuse verified behavior

Add a small canonical utility, for example `services/shared/src/utils/comparisonPresentation.ts`, exposing `getComparisonCandidateSetSize(comparisonMethod): 2 | 4`. Use it in API load/save and frontend recovery.

The runtime inspection does not justify replacing the server router. Its coverage weighting already prioritizes an unresolved pair when called with size two. Keep `generateCandidateSets`, pass the derived size explicitly and add pairwise/mixed-history regression coverage.

For the browser's local pairwise fallback, use an actual pair from `instance.getUnorderedPairs()` rather than computing maximal cliques only to slice one down to two items. Keep BWS's existing candidate behavior. Preserve the existing randomized displayed order where routing supplies it.

### 9.7 Participant state: separate answer validity from presentation validity

Keep `MaxDiffVotingTab.vue` and existing session/engine names for this implementation; broad renaming would increase overlap without changing behavior. Introduce a small typed round/presentation helper rather than a second copy of the voting component.

Represent a pairwise round with an exact two-item tuple at the UI boundary. Narrow/construct it from validated routing data without assertions. In `selectCandidate`, a pairwise click builds a complete `MaxDiffSelection` with `best = clicked` and `worst = other`, then immediately uses `recordVote`. BWS keeps the existing partial-selection states. Hide the BWS step indicator in pairwise mode.

`handleCandidateAction` currently opens `MaxDiffStatementDialog` before accepting a choice whenever the card has a body, external URL or truncation. Pairwise card activation must bypass that detour. Place a separate details action beside the vote surface and stop pointer/keyboard propagation; keep translation controls non-voting too. Do not nest interactive controls inside a native vote button.

For live switching, use two distinct validity concepts:

- **Session identity:** route/auth identity and the existing action guard. A save still belongs to this session when only its method changes.
- **Presentation identity:** latest accepted `comparisonMethodRevision`. Candidate responses/dialogs/partial choices belong to a particular presentation revision.

When a method event arrives during a save, record the newer desired presentation and defer rerouting until that action settles. Do not call `actionGuard.invalidate()` just because the method changed: its current implementation clears pending state, and mutation success would then be ignored even if the server accepted the answer.

After save success, always retain accepted answer history/count updates for the current session. Apply returned candidates only if their presentation revision is current; otherwise fetch a fresh round from the writer. On failure restore previous answer history, but restore previous candidates only if their presentation is still current; otherwise reroute. Extend `MaxDiffSaveContext` with the captured presentation revision for this decision.

Undo follows the same rule: remove the latest task, save that history, then restore its displayed candidates only when compatible with the active method. A four-item undone task cannot become a pairwise round. Redo, item reconciliation and retry use the common method-aware fallback.

`onActivated` currently only re-registers pull-to-refresh. Add method/session recovery on reactivation and SSE reconnect, preserving cached results/progress while checking current presentation. A newer presentation should cause a targeted round refresh, not full page navigation or a scoring/results reset.

### 9.8 SSE and HTTP caches need the same revision merge

`useRealtimeSSE.ts` currently applies `votingPresentation` only for Polis; its other branch ignores comparison presentation entirely. It also gates settings events by application timestamps. Add a shared comparison-presentation merge that uses the persisted revision, including when a timestamp gate would otherwise drop a newer method revision.

Apply that merge in all four entry points:

1. Comparison settings SSE.
2. Accepted facilitator-edit responses in `useConversationMutations.ts`.
3. Comparison load/save cache writes in `useMaxDiffQueries.ts`.
4. Conversation HTTP fetch reconciliation in `useConversationQuery.ts`.

The last path matters because `preserveNewerSnapshotMetadata` protects newer score snapshots but does not protect the method; snapshot IDs can remain identical across multiple method switches. Merge presentation freshness independently from numerical snapshot freshness, including its early-return paths.

Lower presentation revisions may still accompany valid history acknowledgements or lifecycle information. Ignore only the stale presentation/candidates, not an entire successful vote or a close event. Keep method-only settings events from invalidating results/checkpoints or modifying counts. Retain the known presentation revision across relevant query refreshes so a stale response cannot regress it.

### 9.9 Exact frontend creation/edit touchpoints

- `PostTypeDialog.vue`: add Pairwise creation option/config; return actual `comparisonMethod` for selection highlighting.
- `NewConversationControlBar.vue`: replace the `rankingMode === "bws" ? "BWS" : "QV"` label, which would mislabel pairwise as QV. Add a comparison-only method control in edit mode; its existing top-level post-type control is deliberately hidden during edits.
- Prefer a small reusable `ComparisonMethodDialog.vue` with a required `RankingMode` model for the comparison-only selector. The edit selector must not use the creation handler: `handleModeChangeRequest` auto-opens the GitHub source picker for comparison selections.
- `stores/editConversation.ts`: source expected revision from `session.original`, not the mutable form. Include it in the comparisons update branch; existing dirty-state comparison already detects config changes. Preserve QV statements and all unrelated draft fields.
- `useConversationMutations.ts`: install the returned committed presentation rather than optimistically invent a new server revision. On failed generic-edit rollback, preserve a presentation learned from a newer SSE event instead of restoring the entire old method snapshot.
- `edit/seed/index.vue`: handle the typed method-conflict response, preserve unsaved input, and refresh the presentation baseline for an explicit retry. Follow existing QV conflict UI patterns without reusing QV's statement-lock rules.
- `MaxDiffVotingTab.i18n.ts` and control/dialog translations: add pairwise-specific prompt/help/method labels. The actual toolbar uses resolved-pair percentage, so its core progress calculation needs no replacement; the shared remaining-round estimate can stay unused unless another consumer needs it.

### 9.10 Small worker/integration surface

The scoring algorithm needs no dispatch change. Keep `score_comparisons` consuming the mixed task history through `SequentialMaxDiffJudgments`.

Extend the BWS-only conditions in:

- `services/api/src/service/maxdiff.ts` save/checkpoint guards.
- `services/api/src/service/externalSource/github.ts` webhook filtering and manual sync guard, so switching a GitHub-backed conversation does not disable synchronization.
- `services/scoring-worker/src/scoring_worker/db.py` reconciliation.

Existing family filters should be sufficient where configuration constraints guarantee a comparison method; use the shared enum/type when a method check remains useful. Regenerate `generated_models.py` from canonical schema. Maintain one saved-task count per pairwise answer and the existing distinct-participant counting semantics.

### 9.11 Verification already performed and implementation gates

Analysis-time checks, without application edits:

- `pnpm exec vitest run src/service/maxdiffRouting.test.ts src/service/maxdiffEngine.test.ts`: one matching suite, **34 routing tests passed**. There is no separate matching engine test suite in this checkout.
- `uv run --no-sync --extra dev pytest -q -p no:cacheprovider tests/test_maxdiff_sequential.py`: **6 tests passed**, including finite-difference derivatives over mixed task sizes.
- In-memory routing experiment: **200 mixed histories, 5,575 pairwise candidate sets**, all two distinct unresolved items, using nonuniform uncertainty and five buffered candidates per request.
- Independent binary-logistic calculation at nonzero scores: the existing two-item task's loss, gradient and Hessian all match one binary observation to numerical tolerance.

These checks establish reuse of current routing/math, not end-to-end pairwise support. Implement and verify in this order:

1. Settle the QV migration baseline; add enum/revision and canonical wire contracts, then generate artifacts.
2. Implement method persistence/conflicts and primary-side session load/save boundaries. Add database tests for no scoring revision on switches, edit/edit conflicts and close/save ordering.
3. Update close/open event construction, method-aware routing, worker reconciliation and GitHub guards. Add route response compatibility checks for the strict legacy save parser.
4. Implement one shared frontend presentation merge and its stale HTTP/SSE/rollback tests, then integrate creation/edit controls.
5. Add one-click pairwise and pending-save/method-change/undo recovery tests to the existing session/query suites, plus the full browser journey from section 8.

Migration-backed tests must first see a consistent hierarchy schema. Pure routing/math tests already pass on the current working tree; broad lint/typecheck runs during this analysis would mix unrelated in-progress work into this feature's findings.
