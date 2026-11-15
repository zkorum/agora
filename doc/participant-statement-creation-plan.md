# Participant-created statements: implementation plan

Status: implemented in the API and Vue application on 2026-11-13; focused verification is recorded in section 10. Migration generation/application and authenticated browser verification remain deferred. Preserve concurrent QV, comparisons, authorization and recovery/retention changes.

## 1. Product contract

| Family | Participant statement creation | Creation default | Facilitator toggle |
| --- | --- | --- | --- |
| Opinion mapping (`polis`) | Supported | ON | Yes |
| Comparisons (`bws`, `pairwise`, future comparison methods) | Supported | OFF | Yes |
| QV | Unsupported | Not a stored setting | Hidden |

- Put **Allow participants to add statements** on the existing statement-management screen, during creation and subsequent facilitator editing.
- Disabling creation prevents new participant statements only. It does not remove statements, erase answers, disable voting, or change existing statement-edit permissions.
- Facilitator seed maintenance and external-source synchronization remain separate authorized operations; the participant permission does not disable those operations.
- Published conversation family and voting method remain fixed. This permission is an ordinary mutable setting, not part of method identity or its publication lock.
- QV must not acquire a configurable permission in its database schema, request contract or frontend. Its existing first-accepted-Save statement lock remains unchanged.
- Enabling the permission never overrides closed, moderated/locked, importing, deleted, onboarding, survey or account-eligibility restrictions.

## 2. Pre-implementation baseline (historical)

The previous analysis used several paths and policies that have since changed:

- `services/shared/src/types/zod.ts` and the database `ranking_mode` enum now support **both `bws` and `pairwise`**. Pairwise is no longer merely a plan.
- Comparison participant code now lives in `services/agora/src/components/post/comparison/`, `services/agora/src/utils/api/comparison/` and `services/api/src/service/comparison*.ts`. Do not recreate deleted `maxdiff/*` frontend/services or use old cache keys.
- Current comparison API routes use `/prioritization/comparisons/*`; shared item fetching uses `/prioritization/items/fetch`, with some compatibility aliases.
- `canEditPublishedConversationTypeConfig` fixes published voting methods. Do not add this permission to `ConversationTypeConfig`, its projection/equality helpers, or `expectedConversationTypeConfig`.
- The comparison engine already reconciles changed item lists using `reconcileComparisonItems`. `ComparisonVotingTab.vue` waits for a safe boundary before replacing visible candidate content and preserves saved answers.
- `postEdit.ts` already takes a conversation UPDATE lock and re-reads configuration after obtaining it, explicitly avoiding joined-configuration reads taken before a lock wait.
- `conversation_settings_updated` already uses the transactional outbox; the frontend updates cached conversation metadata and invalidates comparison queries through this path.
- Opinion mapping has `POST /opinion/create` and `CommentComposer.vue`; its persistence currently rechecks closed/deleted state under a conversation SHARE lock, but does not yet enforce this permission or exclude other families there.
- Comparison item persistence exists in `rankingItem.ts`; facilitator appends in `conversationSeedOpinions.ts` maintain counts and lock scoring configuration. There is no participant comparison-statement creation operation yet.
- QV has structured creation/editing, explicit saved responses and a permanent first-Save statement lock. Unsaved participant edits do not lock statements; there is no persisted participant draft to integrate here.
- QV close/reopen, generation-fenced results and participant-only live statistics are now implemented in source, with a dedicated `credit-voting-worker`. The generic settings-event handler deliberately preserves QV lifecycle fields; extending it must not revert those protections or mix policy changes with QV counter/calculation events.
- `fetchCurrentConversationTypeSettings` in `services/api/src/service/conversationTypeConfig.ts` now provides a common settings projection used by close/reopen. Extend that read projection with the capability, while keeping the immutable `ConversationTypeConfig` unchanged.
- `fetchComparisonItems` in the frontend's `utils/api/comparison/comparison.ts` still calls `/ranking/bws/items/fetch`, which is replica-routed. `/prioritization/items/fetch` already uses the primary and the same shared response schema. Update the frontend item wrapper to that endpoint rather than adding a new primary fallback.
- Route authorization now uses `requireConversationCapabilityBySlug(..., capability: "conversation_edit")` in `index.ts`. `postEdit.ts` explicitly treats authorization as the route's responsibility. Preserve that boundary; do not reintroduce author-only or organization-membership checks inside the service. The toggle is a normal setting (`canEditNormalSettings`), not premium content editing or seed-addition permission.
- Comparison retained inputs now use the independent `ranking_input_*` graph. Participant-authored item additions affect current live inputs, not previously published retained evidence/results.
- `services/app` now contains Svelte product components and Storybook, but its README explicitly identifies them as fixture-only, not authenticated application routes. Implement the functional feature in `services/agora`; port presentation later if requested, not as a second backend integration in this task.
- `currentRankingItemSourceCondition` now respects `deletedAt`, `accountHiddenAt`, author eligibility and seed exemptions. Account contribution/recovery/merge infrastructure also covers ranking-item authorship; preserve this integration for new participant-authored rows.
- The feature is not implemented: no `allowParticipantStatements` or `participantStatements` contract exists in the reviewed source.
- Current QV/comparison plans explicitly defer migration generation until the user instructs it. Preserve that hold. Their source/schema tests do not prove that the eventual coordinated upgrade migration works.

## 3. Database representation: mode-specific configuration

Edit only `services/shared-backend/src/schema.ts`:

- `polisConversationConfigTable`: add `allowParticipantStatements`, `NOT NULL DEFAULT true`.
- `rankingConversationConfigTable`: add `allowParticipantStatements`, `NOT NULL DEFAULT false`.
- `creditVotingConfigTable`: add nothing.
- `conversationTable`: add nothing for this setting.

The existing `conversation_subtype_config_check` requires QV to reference credit-voting configuration and forbids Polis/comparison configuration references. Combined with the absence of a field on credit-voting configuration, QV cannot persist an enabled setting. Do not replace this structural guarantee with a generic conversation boolean.

When migration generation is explicitly authorized, use the canonical schema/sync/API migration tooling against the coordinated baseline. Existing Polis configurations receive true and comparison configurations receive false; no data is removed. Verify null rejection and cross-family configuration constraints against the actual database. Update generated Python models and TypeScript copies through the existing generators only.

## 4. Shared contracts and API projection

### Reads

Define one canonical Zod capability schema and derive its TypeScript type:

```ts
type ParticipantStatements =
    | { supported: true; enabled: boolean }
    | { supported: false };
```

Expose `participantStatements` in participant metadata and facilitator edit responses. Correlate it with the existing metadata branches: Polis/comparisons require the supported shape; QV requires literal unsupported. Do not put an independent unrestricted capability on the metadata base that would permit QV plus `supported: true`.

Map the capability from the appropriate persisted configuration. A missing required configuration row is not a reason to invent a default boolean. Reuse selected columns in list/detail mappers instead of adding per-conversation queries/N+1 reads. Main integration points include `common.ts`, `postEdit.ts`, existing preview/project metadata projections where needed, and frontend cache helpers.

Add the two policy columns to the existing settings select in `conversationTypeConfig.ts`, and share a typed projection/parser with metadata mappers. `fetchCurrentConversationTypeSettings` returns policy alongside presentation; `fetchCurrentConversationTypeConfig` continues to return presentation only. Cached metadata application must preserve the family/capability correlation without treating a permission change as a method conversion.

Keep lifecycle/onboarding availability separate: `enabled: true` describes facilitator policy, not unconditional permission to submit right now.

### Creation

Extend only the Polis and comparisons branches of `Dto.createNewConversationRequest` with `allowParticipantStatements`, defaulting to true/false respectively. The strict QV branch has no field and rejects attempts to supply one, including false. Do not add the field to the unconditional creation base.

In `post.ts`, carry the parsed value into the matching config insert. Review imports and direct config creators so imported Polis activities retain the normal ON default; do not introduce a default in frontend-only code.

### Facilitator updates

Add an optional named change object to the existing edit operation, provisionally:

```ts
participantStatementsChange?: {
    expectedEnabled: boolean;
    enabled: boolean;
}
```

- Omitted means preserve persisted policy. Send it only for an intentional change.
- Resolve authorization and family from persisted state. Any such change on QV is unsupported, even when requesting false.
- Read policy after taking the existing conversation UPDATE lock, not from a pre-lock joined-config snapshot.
- Compare expected/current enabled state and return a typed conflict for a stale intentional change. This is expected-value concurrency, not a claim of full edit-history/ABA detection.
- Update the correct config table and return the accepted capability from the transaction. Never rely on a lagging replica read to confirm the save.
- Include an actual permission change in `conversationSettingsChanged`, not `configChanged`/method equality or statement-content change detection.
- A permission-only change must not create content versions/checkpoints, change scoring revisions, or enqueue mathematical recomputation. Preserve existing edit permissions, moderation and closed-state settings behavior.

## 5. Authoritative participant write boundary

Keep the permission out of the generic participation gate: otherwise disabling statement creation could accidentally block voting, QV Save or survey completion.

### Opinion mapping

Extend `postNewOpinion` in `services/api/src/service/comment.ts` for non-seed writes:

1. Preserve content normalization and external language preparation outside long-held write locks where practical.
2. In the writer transaction, lock/check current conversation state and its Polis policy before inserting.
3. Recheck current participation requirements inside that admission boundary; the current pre-transaction participation result alone is insufficient if settings changed while preparing content.
4. Reject non-Polis families explicitly. `/opinion/create` must not bypass QV or create an opinion-table row in a comparison activity.
5. Return a typed creation-disabled rejection without partial statement/counter/event writes.
6. Preserve the separate internal seed-creation path and its existing caller authorization.

Follow the current account/device/conversation lock order used by comparable accepted-write operations. `qvResponses.ts` documents the current identity order as account, device, conversation, configuration and participant-local data. Audit opinion/profile and contribution-trigger writes when selecting account lock strength: take a write-compatible account lock up front if the operation will update that row, rather than introducing a later SHARE-to-write upgrade. Do not copy the conversation-before-account wording of the older plan into a new operation. Unknown-guest registration must occur inside the same rollback boundary as admission; a rejected write must not leave newly created guest/root rows behind.

### Comparisons

Add a family-scoped POST operation, provisionally `/prioritization/comparisons/statements/create`, implemented in a focused `comparisonStatements.ts` service and using shared parsed DTOs.

- Accept the current manual comparison statement format: bounded rich text mapped to ranking-item title, with no new participant-defined fields or QV editor reuse.
- Require the persisted comparisons family, not a BWS-only check. Pairwise and future comparison methods share the same policy and item operation.
- Under the writer transaction/lifecycle boundary, check current policy, participation and account eligibility. Acquire locks in the account/device/conversation/scoring-config order verified against current accepted-write/deletion operations. Read the policy in a separate statement after obtaining the conversation lock, avoiding stale joined configuration values captured before a lock wait.
- Reuse `createRankingItem` with participant author, `isSeed: false`, normal active lifecycle and existing versioned content/language handling. Do not manufacture a comparison response or automatic preference for the new item.
- Maintain current/total item counts and existing scoring invalidation semantics, following the facilitator append implementation. Preserve trigger-owned contribution revisions and account-source bookkeeping; test them rather than introducing a parallel author/counting mechanism.
- Schedule the established comparison-scoring dirty-set wakeup after commit. The policy toggle alone does not wake scoring; an actual new eligible item does.
- Return a ranking-item-shaped result/current source identity from accepted transaction values, never a Polis `opinionItem` response or vote-buffer agreement.
- Preserve normal soft-deletion, account-hidden filtering, guest merge and recovery behavior. Submission must fail if account deletion wins the race; it must not create an orphaned or incorrectly seed-exempt item.

For both families, disabling uses the same conversation-lock boundary as submission: a submission admitted before disabling may commit first; after disabling commits, a newly admitted submission sees OFF. Test both orders, and close-versus-create too.

Do not expand this feature into a new participant statement edit/delete subsystem. Existing editing/deletion rules remain separate.

## 6. Creator drafts and facilitator UI

Primary files:

- `services/agora/src/composables/conversation/draft/conversationDraft.{types,schema,utils}.ts`
- `services/agora/src/composables/conversation/draft/useConversationDraft.ts`
- `services/agora/src/stores/{newConversationDrafts,editConversation}.ts`
- `services/agora/src/composables/conversation/usePublishConversationDraft.ts`
- `services/agora/src/pages/conversation/new/seed/index.vue`
- `services/agora/src/pages/conversation/[conversationSlugId]/edit/seed/index.vue`

Use the canonical capability shape for UI state, with correlation to family maintained at draft parsing/conversion boundaries. Avoid an unrestricted QV boolean or separate component-level capability interfaces.

- Add one small reusable translated toggle with required typed props. Render only the supported branch.
- Keep it beside the statement editors on create/edit pages, not in the type picker or unrelated advanced settings. Leave QV opposition controls and first-Save lock messaging untouched.
- Persist explicit choices across reload/back navigation and include them in reset, snapshots, dirty-state detection and publication.
- Legacy persisted drafts missing the setting receive family defaults after existing legacy type normalization.
- Creation-time transitions between Polis/comparisons use the destination default; a BWS/pairwise switch preserves the comparisons setting. QV drops configurable capability. Do not modify the published method-selection policy.
- Load the accepted capability into the edit session. Send a policy change only when modified, with expected-original value. Preserve local work on conflict, offer refresh/retry, and update from the accepted response.
- Do not couple toggle visibility/editability to `canAddSeedOpinions`, which means facilitator seed-management permission, not participant policy.
- Use `editPermissions.canEditNormalSettings` plus moderation/import restrictions, not `canEditConversationContent`; an expired premium content-editing window must not accidentally hide an otherwise editable normal setting.

### Source-managed comparisons

The requirement covers all comparison methods, not just manually seeded activities. Do not silently introduce a GitHub-only exclusion inherited from the facilitator seed editor. Proposed behavior: permit the toggle for source-linked comparisons too; participant items are local non-source items and GitHub sync only mutates its own linked items. Verify this coexistence before implementation, including source removal/resync. If source exclusivity is desired instead, settle that separate product restriction explicitly.

## 7. Participant UI, caches and realtime

- Gate new opinion-mapping composition using the capability plus existing admission/lifecycle state across standalone, project, embed and `PostDetails.vue` surfaces.
- `CommentComposer.vue` currently handles both creation and existing-statement editing. Disabling creation must not hide an active allowed edit or erase unsent creation text. Separate creation availability from existing edit availability; preserve drafts when hiding/collapsing creation controls.
- Add a comparison-specific Add a statement action/dialog, using existing rich-text editor and participation/onboarding patterns, a typed API wrapper and mutation under `utils/api/comparison/`.
- Allow additions from comparison completion/too-few-items states as well as active rounds. New unresolved relations can make a previously complete ranking incomplete; that is normal, not a loss of saved answers.
- Never expose a creation action for QV, and do not route QV into either composer.
- If disabling occurs while composing, retain text, stop submission and explain the policy change. Re-enabling makes the draft usable again. The server remains authoritative for missed events/stale tabs.
- Extend the existing `conversation_settings_updated` schema/outbox/cache handling with `participantStatements`; update all event producers, including lifecycle events through `fetchCurrentConversationTypeSettings`. Reuse existing ordering/replay safeguards and refresh on reactivation/reconnect. Preserve QV's separate generation-aware calculation state, statistics revisions, cached result pointers and protection against generic settings events changing lifecycle state.
- Use a small durable comparison-item-list invalidation signal (provisionally `comparison_items_updated`), separate from score snapshots, for accepted item mutations. It contains conversation/item identity, not fabricated scores or aggregate counts. Wire its schema, outbox dispatch/replay and frontend invalidation through current infrastructure.
- Invalidate current `comparison-items` and applicable comparison session queries after local creation and remote item events. Change `fetchComparisonItems` to the existing primary-backed `/prioritization/items/fetch` operation; keep the same parsed `PrioritizationItemsFetchResponse` and translation preferences. Do not add a new primary fallback. Seed the submitting client's accepted item from returned data where its display contract permits, and do not blindly reinstall a stale pre-submission item list.
- Reuse `reconcileComparisonItems` and current safe-refresh guards. Never replace cards halfway through a BWS choice, overwrite an in-flight answer/Undo, or discard saved history. Test pairwise candidate size and completed-session reopening.
- Use the same item-mutation signal for facilitator appends and source additions where practical so discovery does not depend on the scoring worker publishing a new counter snapshot. Do not reuse Polis `new_opinion` payloads with ranking-item IDs.

## 8. Work packages and parallel-work boundaries

1. **Contract/schema slice:** two config columns, canonical capability/request schemas, read projections and focused contract tests. Coordinate with the current schema owner. No migration generation until explicitly authorized.
2. **Backend policy slice:** config creation/update, accepted response projection, settings event propagation, opinion-create enforcement and race tests.
3. **Comparison creation slice:** participant POST/service, counters/scoring/account integration and durable item invalidation. Reuse current comparison names and joint-scoring pipeline; no scoring algorithm change.
4. **Frontend slice:** persisted drafts, shared toggle, edit-session changes, mapping composer gating and comparison creation UI. Regenerate the client only after routes/contracts settle.
5. **Integration gate:** source-linked coexistence, current account-recovery/merge/deletion contracts, realtime/session races and all route contexts. Upgrade verification waits for the authorized coordinated migration.

Before each slice, recheck worktree changes. Highest-overlap files are canonical schema/Zod/DTO/SSE, `post.ts`, `postEdit.ts`, `comment.ts`, `index.ts`, `common.ts`, realtime services, draft/edit stores and route wrappers. Serialize shared syncing, Python generation and OpenAPI/client generation; never edit generated copies or replace concurrent work. Do not independently regenerate the hierarchy/enum migration or hard-code a future migration number.

## 9. Acceptance checks

- Fresh/existing/imported Polis defaults ON; fresh/existing BWS and pairwise defaults OFF. Both supported families round-trip explicit overrides.
- QV has no permission column/config association, rejects the creation field and any update command, returns unsupported capability, and has no toggle/composer. Its first-Save maintenance boundary still works.
- The shared frontend/API types cannot represent QV plus supported capability; strict boundary parsing rejects malformed capability/config combinations.
- Authorized facilitators change policy after publication without changing method, content versions or scoring revisions. Unrelated stale edits preserve current policy; stale intentional changes return typed conflicts.
- Direct participant API calls fail while OFF and cannot cross family boundaries. All existing participation/lifecycle restrictions still apply.
- Disable/create and close/create races produce a valid serialized outcome without partial rows/counters/events. Account deletion/recovery/merge races follow current eligibility and lock order.
- Comparison creation writes a non-seed participant item, correct content/author, counts and source bookkeeping; scoring notices it without fabricated preference evidence.
- New items appear for other viewers before score publication. Existing answers, in-flight rounds, Undo, candidate sizing and previously completed sessions reconcile correctly in BWS and pairwise.
- Turning OFF preserves existing statements/answers, normal voting, valid existing-statement edits and unsent drafts. Turning ON restores submission without reload.
- Standalone/project/embed/mobile/keyboard/RTL flows work. Translations cover supported display locales.
- Source-linked sync never rewrites/removes participant-local items or enables QV synchronization.

Extend current shared policy tests, API create/seed/admission/comparison/realtime/account integration suites and frontend draft/edit/mutation/session/route suites. Run affected type/lint/tests, generated-contract checks and the soft-delete policy. Record unrelated baseline failures separately; existing full-suite failures and pending migration validation are not evidence of a successful deployment test.

Additional current-baseline regressions: policy events and metadata application must preserve QV generation/results/live-statistics revisions; comparison additions and author hiding/recovery must not mutate already retained `ranking_input_*` evidence; normal-setting access must work independently of premium content-editing restrictions. This is a planning review, not a new run of the test counts reported in other implementation documents.

For the later UI implementation, follow the available Storybook instruction/preview workflow before/after component changes and add relevant previews where the active frontend's tooling supports them. The current Svelte Storybook is not proof that a Vue API integration works; validate the real authenticated Vue routes separately. Do not expand this feature into a Svelte migration.

Expected application deployment: `api`, `agora`, plus the coordinated migration. Generated-schema consumers must be checked and deployed as required by the surrounding refactor; this feature itself does not require a new worker or scoring model.

## 10. Implementation and verification (2026-11-13)

Implemented:

- Mode-specific non-null policy columns and family-correlated metadata capability; strict QV creation rejection and unsupported edit commands.
- Transactional expected-value facilitator updates, omission-preserves semantics, settings outbox propagation and accepted-response cache updates.
- Shared account/device/conversation admission boundary, current participation checks, disabled/cross-family rejection and rollback of rejected guest registration.
- Comparison-specific participant submission using non-seed ranking items, existing item counters/scoring wakeup and durable `comparison_items_updated` dispatch/replay. Facilitator appends and GitHub mutations emit the same invalidation; source-linked participant additions remain local items.
- Vue-only creation/edit setting, translated labels, family defaults, persisted draft choices, intentional-change payloads and policy-conflict reload without discarding statement drafts.
- Mapping creation gating independent of existing-statement editing, plus comparison composition with draft preservation, stale-session fencing and item-query refresh. Mapping drafts remain visible when creation is OFF, including before the rich-text editor initializes its plain-text model.
- Canonical shared sources synced, generated Python models/test-schema fixtures refreshed, and full OpenAPI plus both TypeScript clients generated using an isolated disposable database. No application migration was generated or applied.

Initial implementation checks (superseded by the review results below):

- API TypeScript check and Vue `vue-tsc --noEmit`: passed.
- Eight API suites: **102 tests passed**, including database policy defaults, both comparison methods, QV rejection, expected-value conflicts, omission preservation, disable/admission ordering, guest rollback, real opinion-service rejection/success and item-invalidation parsing.
- Twelve Vue suites: **208 tests passed, one existing assertion failed**. The failure is `blocks editing voted statements while allowing draft deletion and undo` in `services/agora/src/pages/conversation/[conversationSlugId]/edit/seed/index.test.ts`: the concurrently changed seed editor no longer renders the expected voted-statement explanation. It is not a participant-policy failure; left unchanged.
- Scoped Vue ESLint: no errors. Scoped API ESLint has only the existing unused `userId` in `deleteOpinionBySlugId` in `services/api/src/service/comment.ts`; left unchanged.
- `make check-soft-deletes`: passed.

Remaining verification boundaries:

- Tests use fresh disposable schemas, not a coordinated upgrade migration. Database triggers and production migration/backfill compatibility still need the broader migration gate; these counts do not prove deployment readiness.
- The shared browser tool reports its profile is already in use, and no Vue dev server is listening on port 3200. No authenticated browser result is claimed.
- Storybook discovery found no stories for the edited Vue components; the connected Storybook is the separate Svelte app. The required preview call returned no URLs. No dependencies were installed and no Svelte components/stories were modified to manufacture coverage.
- Full account recovery/merge/deletion races, source synchronization coexistence and retained-evidence integration were preserved by reusing current infrastructure, but are not claimed as newly end-to-end verified by the focused policy suites.

## 11. Focused review and accepted-write identity design

The review covers the participant-statement implementation above, plus the explicitly approved extension to QV Save/Withdraw authentication handling. It does not migrate unrelated voting/survey endpoints or change QV statement-creation policy.

1. **Correctness:** family/policy state now changes atomically in creator drafts, including synchronous persistence watchers. Conflict-refresh state belongs to its edit session and survives returning between edit steps. Failed edit rollback preserves a newer realtime participant policy. Comparison creation ignores responses after unmount, deactivation, viewer changes or conversation navigation. Optional opinion-notification failure cannot turn a committed statement into a failed submission.
2. **Type safety:** the shared `ConversationStatementSettings` discriminated union correlates supported capability with Polis/comparisons and excludes it from QV. Publication no longer invents fallback enabled values for invalid combinations. Realtime schemas reject mismatched family/capability pairs while retaining compatibility with older events that omit policy. Public accepted identities use the strict canonical known-device schema; trusted internal seed results remain separate from public participant responses.
3. **Clean code:** a single admission boundary owns participant locking and authoritative checks. Public opinion persistence no longer repeats that boundary. Cached policy/presentation application is typesafe without repeatedly parsing the whole metadata object. Guest authentication installation is shared by statement creation and QV rather than implemented inside composers.
4. **Security:** read-only preflight rejects disabled, unsupported and participation-ineligible requests before external language-provider work, without creating a guest. Transactional admission still rechecks after preparation. Existing devices attached to deleted accounts cannot be re-registered. Identity application is bound to the actual signing DID and initiating viewer lifetime. Auth-status requests carry a local revision guard so older responses cannot overwrite a newer accepted identity. Public projections exclude internal session expiry; QV command receipts remain identity/credential-free.
5. **Performance/UX:** accepted opinion/comparison creation and QV Save/Withdraw responses now include the auth state captured at their transaction boundary. The frontend installs that snapshot without another auth HTTP request; profile/notification/language enrichment runs in the background and cannot fail the accepted write. QV seeds the authoritative ballot under the returned viewer scope before the first guest remount. Language detection remains outside write locks; duplicate opinion locks/settings reads and username rereads were removed.
6. **Dead code:** removed obsolete internal seed metadata fields, unused seed-author lookups and DID plumbing, impossible published-family conversion branches, duplicated default-policy logic, and the newly proposed `sessionRefreshFailed` workaround. Explicit recovery UI remains for actual identity/access conflicts and exceptional local-state failures.

Latest verification:

- Nine API suites: **210 passed**, including QV idempotency/revision rules, seed maintenance and account-recovery regressions.
- Sixteen Vue suites: **206 passed, one pre-existing voted-statement explanation assertion failed** as described above. New identity-installation, stale-key/late-response, background-profile failure, first-guest QV cache and atomic-draft tests pass.
- API TypeScript check: passed. Vue typechecking is blocked only by the unrelated `services/agora/src/pages/legal/participationRetention.test.ts:31` (`string` versus `never`) error in concurrent legal work.
- Scoped Vue ESLint: passed. Scoped API ESLint reports only the pre-existing unused `userId` in `deleteOpinionBySlugId`; no new lint errors remain.
- Shared/generated artifacts and both OpenAPI clients regenerated; all four affected public endpoints expose `loginStatus`. `make check-soft-deletes` and `git diff --check`: passed.
- Vue browser verification remains unclaimed; the connected Svelte Storybook has no stories for these Vue components and returned no preview URLs.

Deploy API/frontend contracts together. Database migration generation/application remains explicitly deferred. Returning identity removes the extra post-write authentication request, not the fundamental uncertainty of a lost write response: QV retains its existing command-id retries, while adding idempotency to statement creation remains separate work requiring an approved design/migration.
