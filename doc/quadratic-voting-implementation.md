# Quadratic voting: requirements and implementation plan

Status: implementation plan, updated with the follow-up product decisions and the creation-slice status below. Names for unimplemented stages remain proposed. Existing comparison/Solidago ranking and Polis mapping remain separate.

## Stage 3 clarifications — authoritative, 2026-11-12

- Close stops participant writes and queues durable work; it does not capture a
  ballot manifest. Python captures eligible saved responses and statements using
  one consistent database snapshot. An account deletion before capture may exclude
  that participant; retaining the exact close-time membership is not required.
- Retain the completed capture for calculation retries. The result and its
  participant count come from that capture and publish atomically. Never mix a
  captured tally with live counts. Once captured, ordinary account changes do not
  rewrite its numbers.
- Public QV activity statistics contain **only the participant count**. Python
  atomically updates one current statistics record and monotonic revision per
  conversation, independently of calculation/lifecycle state. No aggregate vote,
  credit, saved-ballot or allocation counters are needed.
- Use the existing PostgreSQL outbox/SSE path for live updates, not browser Web
  Push. Reconcile displayed caches by statistics revision; a counter event must
  never change open/closed state or result pointers.
- Keep one current calculation reference, not two permanent historical versions.
  Reopen hides it; re-close captures new inputs and atomically replaces the
  reference after computation. Previous and pending artifacts may coexist until
  separate cleanup; there is no strict two-physical-version guarantee.
- Ties use competition ranks: **1, 1, 3**. Deterministic display order does not
  break a mathematical tie.
- Transient failures recover automatically with capped backoff, retaining captured
  inputs and releasing worker slots between attempts. Do not exhaust a small retry
  budget during a shared outage or add a public calculation Retry button.

## Publication policy — authoritative, 2026-11-11

- Creator drafts remain frontend-local. Publishing creates the backend conversation; there is no backend draft state in this slice.
- Publication permanently fixes the conversation family and voting method: Polis, BWS, pairwise or QV. No published conversion is allowed, even with no responses, after Undo/withdrawal, or after close/reopen. This supersedes the earlier zero-effective-vote conversion policy in the comparison implementation.
- Ordinary settings/content edits remain method-specific and authorized. Polis presentation and adding seed statements remain supported. QV opposition/pricing stay fixed, and statement maintenance remains allowed only while open and before the first accepted participant Save.
- The shared typed configuration policy is checked under the existing conversation UPDATE lock before mutations. Configuration changes that are actually permitted retain optimistic-concurrency checks. Published catalog conversion, vote-buffer editability scans, the editability endpoint and frontend polling/cache machinery have been removed. No retained-configuration link, backend draft infrastructure or schema change was introduced.
- Regression coverage exercises every cross-method conversion, acknowledged/unacknowledged requests, atomic rejection, mutable Polis settings including concurrent editors, and both opposition configurations before/after QV Save, withdrawal and simulated closed/reopened states. These state fixtures do not implement the pending QV close/reopen API.
- Verification: **245 tests across six API regression suites, 241 frontend tests across 26 suites, and six shared policy/math tests pass**. API/frontend/load-testing typechecks, scoped ESLint, soft-delete policy and whitespace checks pass. Changed Fastify/Zod contracts and both generated clients were regenerated; no migration was generated or applied.
- The full API run is not green: 119 suites/1,633 tests pass, four suites fail (16 test failures, plus two setup failures; 45 tests skipped). `comparisonHistory.test.ts` uses a schema missing `user.contribution_revision`; `surveyOptionText.test.ts` encounters the historical `'ranking'` enum reference; `conversationEmailUpdateBranding.test.ts` violates the contact name/affiliation constraint; `seedSuggestionPrompt.test.ts` still expects the old `ranking` label. These remain outside this publication-policy change.

Historical status (2026-11-04): creation/statement maintenance and explicit saved-response participation were implemented first, including structured creator drafts, QV configuration, versioned statements, immutable saved response versions, sparse allocations, command receipts, owner-only participation snapshots and Save/replace/withdraw UI. The Python tally worker and real close/reopen/results have since been implemented in the closed-result slice below. **Do not run `pnpm db:generate` until the user explicitly instructs it.** Migration generation, upgrade/backfill validation and deployment remain pending that instruction.

Creation-slice review follow-up: edit authorization and preview reads use the writer; statement-set reads obtain the revision and items in one SQL snapshot. Rich-text normalization and bounded external language preparation happen before mutation locks. Maintenance carries validated item counts/positions forward, batches reordering, and leaves content/set revisions unchanged for no-op edits. A rejected stale editor keeps its local work and requires an explicit reload of current statements before saving again. These changes do not add participant endpoints or migrations.

Frontend UI follow-up (2026-11-04): the selected Figma QV frame (`24327:295364`, voting panel `24327:296428`) and `Agora — Working prototype.html` inform only the allocation controls, not the future redesigned application shell. QV uses the existing statement/analysis tabs in standalone, project and embed contexts. Positive support uses Figma Green/Base (`#23C16B`), Green/Darkest (`#198155`) and Green/Lightest (`#ECFCE5`), separate from purple agree/disagree sentiment. The editor includes signed +/− controls, squared credit costs/area, the fixed-budget meter, rich-text disclosure, support-only/closed/locked states, and explicit discard/navigation confirmation. It preserves dirty allocations when statement versions change until the participant discards, and resets local state on identity changes. **Save now uses the real explicit saved-response command; local editing alone never counts as participation.** The analysis tab does not fabricate results. The component-testing page remains a local-only QV preview with saving disabled. The Figma sample’s −6 votes / 32 credits is an arithmetic error: −6 costs 36 credits, leaving 15 when combined with +7 votes.

UI review follow-up: QV metadata props are schema-derived and method-specific. A keyed session isolates allocations and item snapshots across identity/conversation changes; transient fetch failures preserve edits, but authorization/not-found failures hide cached statement text. Unavailable or unreadable statement content cannot receive votes. A dedicated translated row keeps visible text and accessible control labels synchronized. Ballot validation runs once per allocation change and per-button affordability checks use constant-time credit deltas; inactive cached tabs do not refetch. Navigation remains protected after another guard cancels an accepted discard. Tests cover late responses from prior identities, snapshot/translation refresh, revoked access, sanitization, whole-budget limits and navigation races. No participant persistence or migrations were added.

Saved-response follow-up (2026-11-04): `qv_response` points to immutable `qv_response_version` inputs with sparse `qv_allocation` rows and accepted `qv_response_command` receipts. Composite FKs enforce participant/conversation, item/conversation, exact content/item and current-version ownership. POST `/prioritization/qv/{load,save,withdraw}` uses primary-side snapshots, normal admission, account/device/lifecycle locks, participant-local response serialization, fixed-budget validation and the transactional permanent first-save marker. Empty/duplicate/foreign/stale/over-budget or unsupported-negative inputs never lock statements. Revisions fence concurrent replacements; duplicate command delivery replays its accepted receipt without moving the current pointer. Closed rejects all commands, including retries, but owners can read saved responses. Neither reads nor local edits create response rows.

The UI now uses the authoritative QV snapshot, not the generic item listing. Save is enabled only for changed, nonempty valid allocations; explicit withdrawal is separate and confirmed. Local changes stay in memory, never autosave, and never alter the saved response. Dirty detection compares against the saved baseline, including when locally clearing a saved response. Accepted saves preserve edits made in flight. Uncertain transport outcomes retain the exact command/payload for retry; late snapshot/receipt responses cannot roll back known revisions. Navigation discard never cancels a command already explicitly sent. First-time guests cannot edit during their initial save/auth refresh, avoiding loss on the identity-scoped remount. Snapshot viewer IDs and expected command viewer IDs fence signing-key reassociation; anonymous commands can create a guest once or replay their own receipt, not start a new write after identity changes.

Account-lifecycle reconciliation: the concurrently introduced recovery window takes precedence over irreversible unlinking at the deletion request. `accountHiddenAt` immediately excludes QV responses from live input selection and is cleared only on verified recovery. The current irreversible purge contract `retireQvAccountInputs` tombstones response/version/allocation/receipt copies before the existing participant unlink step; no physical deletion is implemented here. This preparation predates the harmonized retention decision below: adapt it to preserve result-owned frozen numerical inputs while retiring unnecessary private sources and removing account links. Open guest merge keeps the hard account's saved response, otherwise copies the guest's complete accepted response and retires the guest input non-destructively. Closed merge never changes numerical response pointers; saved aggregates remain a later-stage concern. The permanent statement lock is never cleared.

**Live participation slice (2026-11-13):** `services/credit-voting-worker` now publishes one participant-only `qv_live_stats` record/revision per conversation. Accepted Saves/withdrawals, account hiding/recovery, guest merge and survey changes append durable refresh signals without hot conversation counter updates. Python coalesces these in repeatable-read transactions, atomically publishes the projection/outbox event and marks visible signals processed; periodic reconciliation recovers absent wakeups. SQL-only work uses transaction locks/`SKIP LOCKED`, not computation leases. Source eligibility excludes detached/retired/deleted-account inputs and revalidates required surveys. Metadata, project totals and feed engagement consume that projection. The frontend shows only participants for QV, reconciles SSE/HTTP by revision, updates feed/detail/project caches and preserves local drafts/lifecycle fields. No migrations were generated/applied. The new worker is not deployed.

Live-slice verification: **121 focused API/codegen tests, 113 frontend tests and 11 disposable-PostgreSQL Python tests pass**. API, frontend and load-testing typechecks, worker-source strict typechecking, scoped ESLint/Ruff and whitespace checks pass. Shared artifacts, the OpenAPI spec and both clients were regenerated; the worker dependency lock was resolved offline without installing packages. Source-query tests retain constant Save/load query counts for one versus 100 allocations and verify one refresh insert/no conversation counter update per accepted Save. Worker tests cover atomic rollback after event creation, coalescing, concurrent claims, a late-committing signal, required/optional survey eligibility, source exclusions, reconciliation without wakeups and unchanged lifecycle fields. This is not a production-load or full browser end-to-end claim. The repository-wide soft-delete check remains blocked by unrelated generated `services/app/playwright-report/trace/assets/defaultSettingsView-GTWI-W_B.js:50` (`Unresolved dynamic SQL`).

**Closed-result slice (2026-11-13):** source now implements normal QV close/reopen,
generation-scoped PostgreSQL jobs, consistent worker-time capture, persisted retry
inputs, ordinary signed tallying, competition ranks and atomic fenced publication.
Frozen statements and snapshot-local numerical ballots have no dependency on private
response/version/account rows. One current pointer authorizes the public aggregate;
open and calculating/failed generations cannot expose an older result. The result
endpoint and analysis tab distinguish live activity counts from captured participants,
handle empty/failed states and never offer a public calculation Retry action.
Separate generation-aware SSE and frontend request epochs fence stale reads and
overlapping local lifecycle commands. Source retirement leaves frozen evidence intact.
No migrations, production backfills, hard deletion or deployment were performed.

Closed-slice verification: **172 focused API/codegen tests across seven suites,
130 frontend tests across fourteen suites and 25 Python tests pass**. API/frontend/
load-testing typechecks, strict worker-source typechecking, scoped ESLint/Ruff and
the repository soft-delete policy pass. The earlier generated Playwright trace
failure is no longer reported by the current policy check; this slice did not edit
that artifact. Coverage includes real close/reopen without buffer/manifest work,
writer-guarded result reads, captured/live count separation, deletion before/after
capture, exact-input reuse after retry, expired-token fencing, interrupted capture,
atomic publication rollback, signed/support-only tallying, competition ranks,
nonblocking reopen during capture, live-refresh coalescing, local command overlap,
reactive resync and late Save receipts across close/reopen without losing edits.
These scoped tests are not a full-repository or authenticated browser end-to-end claim.

Implementation detail: durable jobs are polled rather than depending on `NOTIFY`.
One calculation slot runs separately from live-statistics refreshes per process.
Capture/tally lock the work row continuously and renew leases at stage boundaries;
a standalone heartbeat would wait on that same row. Publication also checks its live
token/lease against database wall time after persisting result rows. This SQL-only
ownership pattern avoids extra heartbeat machinery without permitting lease theft
during an active stage. The worker README documents the transaction/cleanup boundary.

**Remaining gates:** migration generation/upgrade and backfill validation still need
explicit authorization. Production-scale sparse-capture/lock testing, a complete
authenticated browser walkthrough and rollout packaging remain unverified. Result
text uses the frozen original content; result-content translation integration and
the nine missing participant UI locales remain outstanding. BWS/pairwise evidence
and source-account decoupling are now implemented in source; their migration and
legacy-evidence rollout gates remain separate, as do legal approval/translation.

**Review fixes (2026-11-13):** statistics failures now persist a per-conversation
cooldown, leaving other conversations eligible; discovery runs at startup and
reconciliation cadence. Unchanged counts ACK signals without public revision/event
churn. Fatal calculation-slot failures propagate after stopping/cleaning up the
whole worker. Close/reopen settlement always invalidates guarded QV reads, including
transport errors under the production five-minute freshness policy; rollback is
fenced against newer cache objects. Project count refreshes target known affected
projects, falling back to visible pages for unknown off-page relationships.
QV Save resolves full credentials once under identity locks and carries that
snapshot into admission; narrow device observation preserves account-first locking.
Result polling locks the lifecycle row first, then joins calculation/capture
references in a fresh statement after any lock wait (two SELECTs while calculating,
three when ready). Lifecycle events use UPDATE RETURNING
settings plus same-transaction method settings; provisioning capability reads share
the provisioning transaction rather than rereading freshly written links on a replica.
Statistics `retry_after` is canonical schema preparation only; migration rollout
remains gated. None of these changes weaken consistent capture or frozen evidence.
Governance regressions now bootstrap the canonical schema and use typed Drizzle
row operations, not a parallel hand-written table model. The 20,000-row QV lookup
fixture also uses bounded typed inserts/UPDATE FROM and carries returned IDs forward.
Remaining SQL in those tests is limited to test reset, historical schema/backfill
execution and PostgreSQL planner instrumentation, which have no ORM equivalent.

Review-fix verification: **268 focused API/codegen tests across eleven suites,
121 frontend tests across ten suites and 30 worker tests pass**, including the
post-lock-wait result read, canonical-schema governance, fresh-cache lifecycle
failure, cooldown recovery and unchanged-publication regressions. API/frontend and
worker-source typechecks, scoped ESLint/Ruff and soft-delete policy checks pass.
The seven stale expectations subsequently found in `projectDeletion.test.ts` are
now reconciled: its disposable database uses the canonical schema and governance
triggers, fixture creation commits required relationships atomically, and all row
queries (including lock-wait instrumentation) use typed Drizzle. Revocation tests
reject new access resolutions without reauthorizing an already resolved target;
deleted resources/accounts still fail the transactional lifecycle checks. Ownership
transfer fixtures use the real organization-before-project lock order. All 27 tests
in that suite pass without skips. This remains focused verification, not a green
full-repository suite claim.

Saved-response verification: 233 focused API tests (including 29 QV PostgreSQL tests), 151 focused frontend tests and 5 shared math tests pass. API/frontend typechecks, targeted lint/formatting and the soft-delete policy pass. The local browser harness checks the actual allocation editor with simulated saved-response transitions at desktop/mobile/narrow widths, plus RTL, French and keyboard/disclosure states; it is not a full authenticated browser-to-database test. QV’s unavailable community-counter widgets are hidden rather than displaying misleading zeroes. No migration files were created or modified by this slice.

Earlier review follow-up: merge publication uses typed Drizzle `UPDATE … FROM`, restricted to each batch's newly copied versions so historical versions cannot ambiguously join a destination. Merge/purge work uses bounded set-based batches; before the identity-read consolidation above, the 1/100-allocation service measurements were 24 first-Save, 18 replacement and 10 load queries, not full HTTP-request totals. PostgreSQL lookup plans are checked against 20,000 unrelated rows. QV translation refresh uses one session snapshot rather than automatic per-row polling. Definitive HTTP rejections settle pending commands, uncertain outcomes retain exact retries, and stale-identity recovery refreshes authoritative auth state. QV participant UI translations still cover only English/French; missing locales remain unresolved. Disposable canonical-schema tests do not resolve migration-dependent comparison deployment/upgrade tests.

Localization inventory: `QvStatements.i18n.ts` covers all 11 display locales. `QvVoting.i18n.ts` is missing Spanish, Simplified/Traditional Chinese, Japanese, Arabic, Persian, Hebrew, Kyrgyz and Russian; these use the component i18n helper's English fallback, not completed translations. The publication-policy error messages cover all 11 locales.

## Prioritization hierarchy

Rename the conversation type from `"ranking"` to **`"prioritizing"`**, with **`"comparisons"`** and **`"qv"`** underneath it. These values are settled; `prioritizationType` below is the proposed discriminator field name:

```text
Prioritization (conversationType: prioritizing)
├─ Comparisons (prioritizationType: comparisons)
│  ├─ Best / worst (comparisonMethod: bws)
│  └─ Pairwise (comparisonMethod: pairwise)
└─ QV / allocate credits (prioritizationType: qv)
   ├─ Quadratic pricing (creditPricing: quadratic)
   └─ Linear pricing (creditPricing: linear)

Aggregation is separate: ordinary now, optional plural later.
```

Use a shared discriminated DTO and corresponding DB checks: comparison settings exist only for `comparisons`, allocation settings only for `qv`. Migrate existing `ranking`/BWS activities to `prioritizing`/`comparisons`/BWS with a coordinated DB/API/client/worker rollout. Update canonical enum/Zod definitions, persisted-type readers, SQL filters/triggers, generated Python/TypeScript contracts and frontend dispatch together. Pairwise may reuse the comparison pipeline; its place in this hierarchy does not mean the current app already has a complete pairwise UI.

The internal `qv` subtype names the allocation branch; `creditPricing` distinguishes quadratic from linear pricing. Use accurate UI labels such as “Allocate credits · Linear” when quadratic pricing is disabled. Ordinary QV results already sum raw vote units. Linear credit voting uses the same ballot shape, snapshots and tally worker, but charges `abs(v)` rather than `v²`. A pricing switch is an activity configuration choice, not a reinterpretation of already-cast ballots: a linear-valid ballot may exceed a quadratic budget. Comparison judgments are never converted into invented credit allocations.

## Participant and facilitator behavior

- Every allocation activity gives each participant **100 credits**, fixed rather than facilitator-configurable. Define `CREDIT_VOTING_BUDGET = 100` once in canonical shared code, sync it to frontend/backend, and derive bounds from it. Remove the customizable-budget UI/DTO/helper contract. Snapshot the actual budget and rule version as provenance so future code changes cannot reinterpret saved inputs.
- Opposition remains an activity option, default on. The facilitator enables/disables it on the same creation page where they add seed statements. Positive votes support and negative votes oppose; support-only activities reject negatives. QV costs `v²`, so nonzero allocation magnitudes are 1–10. Linear pricing costs `abs(v)`, allowing 1–100. Unused credits are valid. The 100-credit budget does not mean 100 votes per proposal in QV.
- Use sparse `{ itemId, votes }` payloads: omit unallocated proposals, rather than put `undefined` entries in a JSON array. Controls may display zero; serialization removes zero entries. The canonical wire schema contains only nonzero integers. Validate bounded raw input and duplicate IDs before normalization could hide duplicates.
- **Unsaved participant edits stay in the frontend. There is no backend draft storage, draft-save endpoint or draft autosave.** Use the usual unsaved-changes/discard banner. An empty local editor is valid, but **saving an empty response is refused by the backend and disabled in the frontend**. Explicit Save atomically replaces the previous saved response, which continues counting while the participant edits locally. Retain saved-response revisions and command idempotency. **No response save or withdrawal while closed**; owners can still read their saved responses.
- Apply normal conversation onboarding, participation modes, survey gates, permissions and guest creation as supported by the current application. Check admission on the writer side inside the mutation's lifecycle boundary. Calculation uses the sealed accepted input set, not new worker-time onboarding checks that could change on a retry.
- Guest merge while open keeps the hard account's saved response if both accounts have one, otherwise transfers the guest's saved response if present. Never combine budgets or upload/merge unsaved frontend edits. Retire a duplicate guest response non-destructively and fence stale requests; clear or explicitly rebase local editor state when identity changes. Closed numerical snapshots are not rewritten by merging.
- Use only the normal **close/reopen** lifecycle, not an added preparation/publication workflow. Pricing/opposition settings remain fixed from creation. Authorized facilitators may edit statement titles/descriptions and soft-delete statements while the activity is open and has **never received an accepted saved response**. The first explicitly saved response permanently locks the statement list/content across reopenings; merely viewing or editing locally does not lock it. Discarding local edits, withdrawing responses, merging accounts or deleting participants must not unlock it. Generic edits/external synchronization cannot bypass this rule. Large batched creation must finish internal staging before exposing an activity to voters; staging is not another voting state.
- Closing stops writes and creates durable work; the worker then captures a consistent input set. **All viewers**, not just facilitators, see calculation state. The live participant count remains available independently, including while open. Statement scores appear only with a ready closed result. Aggregate APIs never expose private ballots.
- Reopening immediately hides the result in API/UI, preserves current ballots and obsoletes in-flight closing work. Re-close captures new eligible inputs and atomically replaces the current calculation after completion. There is **one current saved result set**, no continuous history, milestone checkpoints or historical browser, and no strict two-physical-version limit during separate cleanup. Future aggregation variants are views of that one input snapshot, not chronological checkpoints.
- Ordinary account deletion leaves the **sealed individual numerical inputs, result and counts unchanged**. Exclude the response from live input selection and remove its account association according to the account deletion lifecycle. Retain exact frozen allocations behind the one current saved result using distinct conversation-local participants, consistently with Polis/BWS/pairwise; unnecessary private sources, old save revisions and receipts remain cleanup candidates. The later deletion service is outside this implementation. Proposals are facilitator-created, so voter deletion does not remove them. Reopening never reactivates account-deleted or detached responses; re-close uses currently eligible saved responses.
- Ordinary results store support units, absolute opposition units, net units and supporting/opposing participant counts, plus zeroes for untouched proposals. Ties share a rank with deterministic display order. Nobody submitting yields an explicit empty result. Vote units are not credits or support percentages.

## Harmonized numerical-input retention — authoritative, 2026-11-11

- Shared principle across Polis, BWS, pairwise and QV: retain the individual numerical inputs behind retained results with separately removable account links. This includes Polis vote matrices, BWS/pairwise choices and candidate sets, and QV allocations, not just final aggregates. It does not retain every session/save revision, personal score, operational receipt or credential. See the [shared retention handoff](deletion-dependency-contracts.md#updated-retention-decision--2026-11-11). This decision supersedes earlier QV plans to erase frozen individual allocations on ordinary account deletion.
- QV has one current sealed input/result set, not a results history. Worker capture fixes its numerical membership; deletion before that snapshot may exclude a participant. Ordinary deletion or unlinking after capture never changes the captured totals/counts. Reopen hides it; re-close replaces it using currently eligible saved responses, excluding account-deleted responses unless otherwise eligible again after verified recovery.
- Account links remain private during the existing recovery window and become removable at irreversible cleanup. Stable conversation-local participants remain distinct after unlinking; do not retain a deleted-account lookup or attach detached participants to a later registration.
- Account-unlinked does not mean guaranteed anonymous. Private QV allocations remain owner-only in the current API; aggregate availability does not authorize individual-ballot exports. The privacy policy needs an explicit QV explanation before rollout, rather than assuming its Polis/checkpoint wording covers every method identically.
- Hard deletion is deferred to the later deletion service, not part of this QV implementation. Its brief handoff: preserve result-owned numerical inputs/results, remove account links and unnecessary private/operational copies, coordinate with unfinished sealed work, and remove the owned retained graph on parent deletion. Current QV tombstone/unlink contracts must be reconciled before purge is enabled; they do not yet implement this complete target. Retention is purpose-bound and subject to applicable rights, not a claim of guaranteed anonymity or unlimited retention.

## Architectural boundaries

1. **Ballot collection:** API + PostgreSQL; short transactions validate the complete bounded ballot, lock one participant's state, check revisions and open lifecycle, then write. No hot conversation/proposal counter UPDATE on each save. A submission either commits before close and is eligible for subsequent worker capture, or loses the lifecycle lock and is rejected. Close-time membership need not survive an account deletion before capture.
2. **Calculation:** the dedicated **Python** worker `services/credit-voting-worker` (`credit_voting_worker`) handles QV separately from Solidago and the Polis buffer. The TypeScript API validates and persists explicitly saved responses, manages close/reopen and schedules work; Python owns frozen-input capture and result calculation. Close atomically sets `isClosed`, advances generation and inserts durable work. Poll at startup/periodically; optional wakeups are not correctness dependencies. Claim with `FOR UPDATE SKIP LOCKED`, leases/tokens and bounded concurrency. Use generated SQLAlchemy models and typed aggregate queries over the primary; never construct an API-side voter-by-proposal matrix. Python budget/rule/algorithm constants are generated from canonical shared sources. Linear pricing remains unexposed/unimplemented, not an accepted quadratic ballot reinterpreted after capture.
3. **Publication:** the Python worker atomically persists the frozen input reference, complete results/counters, current-result pointer and outbox event only while closed on the expected generation and current claim/run token. The API reads/serves the saved output; it does not recalculate it on requests. As with existing analysis workers, publish directly to PostgreSQL rather than add a worker-to-API HTTP callback. Reopen advances generation, revokes public access and obsoletes work. Old workers cannot publish into a new lifecycle. No extra mathematical invalidation generation is needed for ordinary deletion/merge while closed.
4. **Reading:** authoritative writer-side lifecycle/provenance checks guard calculation availability. No stale result or result-specific counts via metadata, previews, exports, caches or SSE while open; live participant statistics remain independent. If reading a result body from a replica, it must match the writer-authorized reference. Frontend handles standalone/project/embed routes and rejects old in-flight results after reopening.
5. **Schema/codegen:** when explicitly authorized, edit canonical `services/shared-backend/src/schema.ts` and `services/shared/src/types/{zod,dto,sse}.ts`, sync, generate migrations with API `pnpm db:generate`, and regenerate the OpenAPI client with `make generate`. Use database ownership/state/provenance constraints plus transactional whole-ballot budget validation. Ordinary ballot replacement/withdrawal uses non-destructive pointer changes; account deletion excludes live responses and removes account associations without erasing retained sealed numerical inputs. Future physical cleanup belongs to the deletion service. Keep allocation work/results separate from Solidago.

## Frozen inputs, participant counts and snapshot reuse

- Reuse the **snapshot pattern**, not BWS's score schema: `ranking_conversation_stats_item` constrains scores to 0–1 and assumes Solidago provenance. Allocation input/result/item-total tables need their own typed fields.
- A current response header points to an immutable saved version. Explicit replacement creates a version and moves only that participant's pointer; withdrawal clears the active pointer. Retain exact numerical inputs through the frozen snapshot independently of removable account associations and unnecessary source versions. Unsaved editor state is never stored in PostgreSQL.
- Use opaque conversation-local participants with separately removable account association. `checkConversationParticipation` currently returns an account ID, not `conversation_participant.id`; resolve explicitly and enforce same-conversation FKs. Frozen numerical rows contain no credential/DID/email/account IDs. Removing links permits unlinking; it does not certify ballots as anonymous.
- The worker seals the eligible participant/submission set using one consistent database snapshot, including proposal/content versions and budget/pricing/opposition/algorithm provenance. Close itself captures neither a manifest nor allocations. Eligibility changes before capture may affect inclusion; after capture, ordinary account deletion/unlinking never rewrites those numerical inputs. Preserve captured input through reopen; abandoned partial capture stays inaccessible. Distinguish result-owned evidence from unnecessary private source records so removing account links does not retain the account graph or erase the frozen allocations.
- Compute/save result `participantCount` once from frozen input: one nonempty eligible saved response per participant; no unsaved edits or withdrawals. Retain sparse allocations and per-item support/opposition/net units needed for calculation, not extra event-wide counters.
- Publish the result and its participant count together. Result reads use those saved values, not mutable ballots or delayed live statistics. Activity metadata/project totals instead read the Python-owned live participant projection, with its own revision. The owner's private saved response is independently available.
- Keep the previous frozen input/result internally while open, but deny public access. Re-close calculates from currently eligible saved responses and atomically replaces the one current saved input/result set; no history API. Any later reuse optimization must compare complete input manifests, not participant counts. Ordinary account unlinking preserves frozen evidence/results; superseded/unreferenced artifacts follow the deletion lifecycle. Separately applicable erasure requests must not silently change an input while claiming original reproducibility.

### Why preserve individual inputs if there is only one result?

For example, the closed input could be:

| Snapshot-local participant | Proposal A | Proposal B |
| -------------------------- | ---------- | ---------- |
| p7                         | +3         | +1         |
| p9                         | +1         | +3         |
| Ordinary total             | 4          | 4          |

Saving only `A: 4, B: 4` loses the individual allocations. Two participants both allocating `A: 2, B: 2` would produce exactly the same totals. A future plural calculation can treat these inputs differently; totals alone cannot recover which input was actually cast. The harmonized policy retains exact numerical participant rows behind the one saved result, with removable account links and the provenance needed by the selected calculation. Ordinary account deletion preserves these frozen rows, while excluding that account from future live inputs. Retaining allocations does not invent missing social inputs for plural.

If voting reopens and p7 changes their ballot, those edits belong to the current editable ballot. They must not overwrite the saved closed input. On the next close, replace the one current saved input/result set. This is **one saved calculation plus its numerical evidence**, not a continuous results history or a permanent archive of draft edits. Ordinary account deletion removes eligibility/account association, not retained frozen numerical evidence; parent deletion and separately applicable rights remain separate concerns.

## Ordinary QV algorithm and remaining choices

The ordinary algorithm is settled, not a configurable scoring model:

- For integer signed votes `v[p,i]`, each participant's ballot must satisfy `sum_i(v[p,i] ** 2) <= 100`. Support-only activities reject negatives. Moving from `a` to `b` votes changes the cost by `b ** 2 - a ** 2`; decreasing magnitude refunds credits.
- Each statement's score is `sum_p(v[p,i])` over the sealed latest active submitted ballots. Credits spent are not the score. Preserve support units, absolute opposition units, net units and supporting/opposing participant counts separately.
- Sort descending by net score; preserve equal-score ties and include untouched statements with zero totals. No percentage normalization, participation threshold or additional weighting changes the score. A no-submission event has an explicit empty-result state.
- **Approved ordinary-QV display:** competition ranks (`1, 1, 3`). Deterministic presentation within a tie does not give participants different mathematical ranks; do not use credits spent as a hidden tie-breaker.
- **Deferred algorithm choice:** specify the exact plural-voting formula, social/group sources and their versions before implementing plural. Quadratic-funding code is not automatically a plural-voting algorithm. This does not block ordinary QV creation/collection.

### Reviewed upstream reference

On 2026-10-29, the clean sibling checkout `/Users/nicobao/github/nicobao/quadratic-voting` was fast-forwarded from `047a3bf` to canonical RadicalxChange upstream `efe2fcc` (three commits). The fork's `origin/main` remains at the older commit; no remote was pushed or reconfigured. This is an older Next.js application, not a maintained algorithm package, and its code has a CC BY-NC 2.0 license. Use it to cross-check behavior/math, not as copied production implementation.

Confirmed pitfalls in the updated reference to avoid:

- `pages/api/events/vote.js` checks name/privacy and event dates but does not validate the full credit budget, integer bounds or exact allocation shape before persistence. Agora must enforce these server-side.
- Ballots are positional arrays copied by index. Agora uses stable item IDs with same-conversation ownership and content/set revisions.
- `generateStatistics` calculates participation as `voters.length / numberVoters`, which can exceed 100%; `calculateLinear` divides by zero when no credits were spent. Keep explicit counts/empty states and well-defined denominators.
- Chart ordering uses credits spent to break equal QV totals. Agora retains true ties and uses deterministic presentation order only.
- The reference's `calculateQV` correctly sums signed vote units. Preserve that formula while testing it independently in the shared validator and future Python calculation code, including budget exhaustion/refunds, opposition, empty input and ties.

## Retry and event delivery

- Transient failures retry automatically with capped backoff and released worker slots; captured inputs survive retries. Permanent failures remain diagnosable without an automatic busy loop. No public calculation Retry endpoint/button or two-attempt budget.
- Deduplicate jobs by closure/method identity, execution/publication by claim token and generation, and outbox insertion by transition identity. Repeated wakeups do not create jobs. Calculation SSE is a lightweight invalidation signal containing generation + state revision/event identity, not ballots; clients refetch the guarded result endpoint. Live-statistics SSE carries only participant count and statistics revision, with no lifecycle fields. Do not assume exactly-once transport.
- An old `ready` signal may arrive after reopen or in reconnect replay. It must not reinstall old results/counts: ignore old generations/revisions, clear/abort stale queries and reject late HTTP responses. A refetch always checks authoritative lifecycle state. Keep existing outbox delivery/replay guarantees while extending event contracts.

### Two separate signal problems, in plain terms

1. **Repeated wakeup:** several workers notice the same queued calculation. A conditional database claim accepts it once. Duplicate delivery never creates several calculations.
2. **Old message:** close #1 starts a calculation, then the facilitator reopens. A delayed “close #1 is ready” message arrives. It belongs to an old lifecycle and cannot make results visible again. The same applies if close #2 is already running: a result from close #1 cannot replace it.

Give each close/reopen transition a generation number. Messages identify that generation and tell the browser to check the current state; they do not carry a result to install blindly. The API checks its authoritative open/closed state before serving results, and both worker publication and browser responses must match the current generation. The generation changes on lifecycle transitions, **not on every vote**. Deduplication solves the first problem; freshness checks solve the second. Both are necessary even with one saved result.

## Plural later

Plural is **not a ballot method**. It is another result over the same frozen ballots and selected social-information sources. Ordinary/raw and plural outputs remain separately addressable within the **one current input snapshot**, not a chronological history. Defer exact formula/source UI; do not replace ordinary totals.

Keep exact frozen individual values, not only totals/revision numbers: current-ballot edits after reopen must not overwrite the input behind the closed result. A pointer to overwritten allocations cannot reproduce the old calculation. Ordinary account deletion preserves the account-unlinked frozen numerical inputs. A separately applicable erasure request is distinct; if required inputs are erased, do not present remaining ballots as a complete rerun of the original input. Raw totals already sum QV vote units; another aggregation can reuse complete available inputs but cannot reconstruct an uncast ballot under different pricing/one-person-one-choice rules.

Keep snapshot-local participants distinct after account unlinking. If plural uses selected group/connection sources, retain their version and minimal numerical participant association as calculation input. Without it, anonymous ballots cannot later be joined magically to new account-linked groups. Do not fabricate absent social inputs or implicitly retain identities. The experimental Solidago COCM-adapted voting rights have been removed; they were not equivalent to the paper's plural-QV formula. Design source/provenance infrastructure for the selected QV formula; avoid requiring a dense `N × N` friend matrix.

## Performance and verification

- `FOR SHARE` permits concurrent holders, but row-lock/MultiXact overhead is not free. Keep the transaction short and measure bursts. Close's lifecycle update conflicts with it. Do not substitute `FOR KEY SHARE`: an ordinary non-key `isClosed` update does not conflict with that lock. Audit onboarding/merge/deletion/survey lock ordering. Never add conversation counter, scoring revision, proposal-total or `lastReactedAt` updates to every save, which would recreate exclusive contention.
- POST itself adds no significant computation relative to another HTTP verb. Request frequency/work matters: edits and increments remain frontend-local, explicit Save sends one complete response, and unchanged responses need no new save. Cache own saved-response reads and batch/paginate proposals. There are no draft-autosave requests or requests per increment/item.
- Typical use is tens of proposals/hundreds of voters; measure thousands of proposals and hundreds of thousands of voters before claiming support. At most 100 nonzero allocations per normalized ballot means up to 10 million current allocation rows for 100,000 participants, before version/snapshot overhead. Measure SQL plans, WAL/storage, snapshot capture, lock/MultiXact pressure and close-to-publication time. Close must remain short; bulk capture happens in the worker.
- Test fixed-budget quadratic/linear math and signed/support-only modes; empty-save rejection; local edits versus saved-response separation and discard behavior; command/revision deduplication; close/write races; immutable inputs; frozen deletion/merge counts; stale worker/HTTP/SSE results; automatic retry recovery after shared outages; large sparse input and simultaneous jobs.
- Roll out in stages: canonical schema/contracts and migrations; API ballot and lifecycle behavior; dedicated PostgreSQL-only allocation worker; creation/voting/results UI and API codegen; integration/load tests and end-to-end verification. Reassess chunk sizes, SQL query plans, and DB lock waits under burst load.

## Development sequence

These stages are implementation order, not separate deployed user features. Keep existing BWS working; expose allocation creation only after the full path works. Inspect/reconcile concurrent canonical schema, account/merge, DTO, generated-client and migration work before editing/syncing. Never overwrite it or hand-edit generated copies.

### Initial delivery focus — backend, then creation UI

1. **Backend creation path first:** extend the canonical schema and discriminated creation DTO to persist QV configuration and structured statements through the existing conversation-creation POST endpoint. Reuse ranking-item identity and versioned content: each QV statement has a stable item ID, a **mandatory non-empty title** and an optional rich-text description. Reject missing, empty or whitespace-only titles; an ID or description alone is not valid statement content. Preserve existing project, language, visibility and participation settings. Store configuration and statements atomically, completing any internal batch staging before exposure. Regenerate shared artifacts and the OpenAPI client; verify QV creation and existing BWS compatibility.
2. **Creation UI second:** the mode-pill flow is **New prioritization → BWS / Quadratic voting**, backed by the comparisons/QV hierarchy. On the existing seed-statement page, provide the structured statement-list editor and the **Allow opposition** toggle, enabled by default. Each statement editor requires a title and offers an optional description, with add/edit/remove/reorder and preview. Keep the toggle and structured statements in the frontend-persisted creation draft; surface per-statement validation and reject title-less items before creation. Show the fixed 100-credit rule without a customizable budget. After creation, support authorized statement editing and ordinary soft deletion until the first saved response, using backend-provided editability and handling concurrent lock rejection. Settings stay fixed from creation.

**Post-creation statement maintenance:** use versioned content updates and the existing soft-delete pattern through authorized POST operations. Persist a monotonic participation-start marker rather than infer editability from currently active saved responses. Serialize statement mutation against the first explicitly saved response in the database so they cannot both succeed against incompatible content. Carry a statement-set/content revision in the response contract and reject saves based on stale content, including when an edit wins before the first save. Set the lock marker only on the first accepted response save, not on page reads, local edits or rejected saves; avoid a hot conversation UPDATE on subsequent saves. Apply the same lock boundary to any list mutation, including add/reorder if exposed after creation. Soft-deleted statements disappear from active lists and cannot receive allocations. Test edit/delete versus first-save races and verify that discarding edits, withdrawal, account cleanup and reopen never reset the lock.

The initial statement format is fixed: required title and optional description. Custom formats, facilitator-defined fields and a configurable statement-schema editor are deferred nice-to-haves; do not build their infrastructure in this implementation. Ballot collection, calculation and results follow this initial creation-focused work in the stages below.

### Concrete work packages for the initial delivery

Implement packages A–C on the backend before packages D–E in the frontend. Package F verifies the assembled slice. These packages refine the creation/maintenance work; the numbered stages afterward cover the full voting feature.

#### A — canonical contracts and migration

- Primary files: `services/shared/src/types/{zod,dto}.ts`, `services/shared-backend/src/schema.ts` and the shared credit-voting utility/constants.
- Use `prioritizationType` as the proposed subtype field. Model comparisons and QV as discriminated branches, with corresponding database checks; persist only the settings belonging to the selected branch. The initial creation UI exposes BWS and quadratic QV, leaving pairwise/linear UI for later.
- Move seed content out of the unconditional string-only base request where necessary: Polis and existing BWS keep their current content semantics; the QV branch accepts structured `{ title, description? }` statements. Map description to existing ranking-item body storage rather than create another content table. Reuse existing rich-text normalization and enforce meaningful title text after sanitization, not only a non-empty HTML string.
- Add QV configuration with opposition defaulting to enabled, server-owned 100-credit budget/rule provenance, a statement-set revision and a nullable, monotonic statement-lock marker. Add stable facilitator ordering using the existing representation if available, or an explicit persisted position if necessary; do not assume database row order is presentation order.
- Generate schema migrations through the API tooling. Backfill existing BWS activities into `prioritizing/comparisons/bws`; coordinate readers, enum consumers, generated Python models and comparison-only SQL triggers. QV must never enqueue Solidago work because a broad `ranking`/`prioritizing` check matched it. Reconcile the currently modified canonical schema and account/merge work before syncing or generating.
- Migration follow-up once explicitly authorized: verify that the generated enum conversion maps existing `ranking` values before casting to `prioritizing`, backfill the comparisons discriminator before its constraint is enforced, and replace active scoring functions that still compare against the old enum literal. In particular, review `mark_ranking_scoring_input_dirty` and `mark_ranking_scoring_input_dirty_from_deleted_user`; their comparison-only guards must use the new subtype. Add new data-backfill/function migrations as permitted by repository guidance; do not edit historical migrations. Fresh generated test schemas do not by themselves verify this upgrade path.
- **Acceptance:** invalid cross-method settings are rejected, existing BWS data is preserved, structured QV content round-trips, and the shared budget is not caller-configurable.

#### B — creation and authoritative edit reads

- Primary files: `services/api/src/index.ts`, `services/api/src/service/{post,postEdit,rankingItem,conversationSeedOpinions,conversationEditLanguagePreparation}.ts` and relevant display/translation mappers.
- Extend the existing creation POST route and `createNewPost` with explicit QV dispatch. Normalize titles/descriptions and prepare language metadata before the short persistence transaction where practical; create configuration, item identities, content versions and initial ordering in the same transaction. Do not pass QV through the Polis fallback or initialize comparison scoring.
- Extend the existing edit read with method-specific structured statements, content source versions, statement-set revision and a typed statement-mutation availability result. Compute availability from authorization, open lifecycle and the persisted lock marker on the writer; do not expose private ballots or rely on cached participant counts.
- Preserve project/language/organization/participation behavior and return accepted state from transaction values or `.returning()`. Reuse title/body translations and source-version handling.
- **Acceptance:** creation rollback leaves no partial activity; authorized edit reads preserve both title and description; default/support-only settings and language/project settings survive reload.

#### C — statement edit and soft-delete boundary

- Primary files: `services/api/src/service/{postEdit,conversationSeedOpinions,conversationSeedOpinionChanges,seedOpinionEditability,rankingItem}.ts` plus shared update DTOs. Prefer extending the existing conversation-edit POST flow with typed QV changes rather than creating an unrelated CRUD API.
- Add structured QV changes carrying item ID, expected content source version and the expected statement-set revision. Editing creates a new content version; soft deletion sets `deletedAt` and clears `currentContentId`, retaining identity/content rows. Update active item metadata/order and the statement-set revision transactionally. Do not represent deletion by the comparison lifecycle status `canceled`.
- An optional reorder list contains every surviving existing item exactly once. New items append in change-request order. A normalized no-op edit/reorder does not advance the statement-set or content version.
- Share a QV-specific guard across add/edit/delete/reorder and generic item/lifecycle entry points. It requires permission, an open activity and no previously accepted saved response anywhere in that activity. Existing BWS per-item eligible-vote checks do not implement this rule; a statement with zero allocations is still locked after somebody saves a QV response. Merely starting to edit locally does not lock anything.
- Define one database lock order for statement mutation, first participation and close. Serialize statement mutation and the first accepted participant write on QV configuration; only the transition into started participation needs the exclusive configuration path. Once locked, normal participant saves retain the concurrent shared lifecycle/participant-local pattern. Avoid shared-to-exclusive lock upgrades and a conversation-wide UPDATE on every save.
- First-save integration checks the statement-set revision after acquiring the relevant locks, then records the lock marker in the same transaction as the accepted, nonempty saved response. Viewing, unsaved browser edits and rejected saves do not lock statements. No account, merge, withdrawal, cleanup or reopen path clears the marker. Add the guard/marker foundation now and wire the explicit response-save command when Stage 2 is implemented; a creation-only backend must not expose a temporary unguarded response-save path.
- Return typed stale-content, participation-started and not-editable failures for UI handling. A stale facilitator tab must not overwrite content or delete after participation starts.
- **Acceptance:** edit/delete wins before first save and the stale save is rejected, or first save wins and edit/delete is rejected. A failed transaction does not set the marker. Updates cannot strip a description unintentionally, and soft-deleted items are absent from active lists.

#### D — persisted creator draft and publishing adapter

- Primary files: `services/agora/src/composables/conversation/draft/conversationDraft.{types,schema,utils}.ts`, `useConversationDraft.ts`, `services/agora/src/stores/newConversationDrafts.ts` and `services/agora/src/composables/conversation/usePublishConversationDraft.ts`.
- Add method-specific structured statement drafts with stable local editor keys and opposition configuration. Creator-local draft keys are distinct from server item IDs. Incomplete titles are allowed while composing; publish validation requires meaningful titles for every included statement.
- Migrate existing local `ranking`/legacy `maxdiff` drafts into the comparisons branch without losing their content. Include QV statements/settings in persistence, modified-state checks, reset/load/export helpers and publish payload construction. Parse through the shared DTO at the publication boundary.
- Make BWS/QV mode conversion explicit; preserve compatible content and use the existing confirmation flow if a switch would discard descriptions or other incompatible content. Never silently flatten a structured statement into a string.
- **Acceptance:** back navigation and reload preserve statement titles, descriptions, order and opposition; old BWS drafts still load; invalid structured items are identified before sending the request.

#### E — mode pill, seed page and existing edit page

- Primary files: `services/agora/src/components/newConversation/{NewConversationControlBar.vue,dialog/PostTypeDialog.vue}`, `services/agora/src/pages/conversation/new/{create,seed,review}/index.vue` where used, and `services/agora/src/pages/conversation/[conversationSlugId]/edit/{index,seed/index}.vue`.
- Extend the pill/bottom-sheet flow to **New prioritization → BWS / Quadratic voting**. Adapt existing access checks deliberately for the prioritization family instead of accidentally inheriting a MaxDiff-only check. Keep the current BWS and Polis paths functional.
- Add a dedicated structured statement-list editor reused for QV creation and authorized editing. Require a title, offer an optional rich-text description, and support preview/add/edit/remove/reorder. Keep routes thin and content editing in components with explicit typed props. Custom field/format configuration is deferred.
- Put **Allow opposition** on `/conversation/new/seed/`, beside the statement list, enabled by default. Display the fixed 100-credit/quadratic-cost explanation there. Preserve settings when navigating backward or forward; show the setting read-only after creation under the existing fixed-settings rule.
- On the existing edit seed page, render the structured items and enable statement mutation only from backend-provided availability. Handle the first participant saving while the facilitator is editing by preserving local edits, refreshing availability and showing the typed rejection; do not claim the edit was saved.
- Use existing components, translations, accessibility, RTL conventions and SPA navigation. Regenerate the API client after backend route contracts are ready, then use typed wrappers from the UI.
- **Acceptance:** a facilitator can select QV, compose structured statements, toggle opposition, publish, reopen the editor and edit/soft-delete before participation. The same editor becomes read-only once any explicitly saved response has been accepted.

#### F — verification and integration gate

- Backend checks: DTO branch invariants; missing/whitespace/markup-only titles; description sanitization and preservation; transactional creation; cross-conversation IDs; authorization; stale content versions/revisions; soft-delete filtering; item ordering; first-save versus edit/delete races; failed-first-save rollback; and irreversible locking after clearing, withdrawal, account deletion/merge or reopen. Exercise actual Stage 2 participant commands once implemented, not only a manually seeded marker.
- Frontend checks: legacy persisted-draft migration, structured draft round-trip/reset/modified detection, mode-change content preservation, creation payload construction, seed-page opposition placement/default, and editability/conflict behavior. Extend meaningful existing suites rather than adding tests that only mirror component markup.
- Run affected shared/API/frontend type/lint/test commands, generated-contract checks and the repository soft-delete policy check. Run a browser walkthrough of BWS creation plus QV create → reload → edit title/description → soft-delete → edit response locally without locking statements → explicitly save response → edit/delete rejected, including a stale facilitator tab.
- Creation/maintenance can be developed and exercised internally before participant voting is finished. Publicly expose QV creation only when collection, close/reopen, tally and results are usable; the creation slice must not route users into existing Polis/BWS screens by default.

### Stage 1 — contracts and database foundation

1. Rename canonical/persisted `conversationType: "ranking"` to `"prioritizing"`, introduce the `comparisons`/`qv` discriminator and migrate existing BWS configuration to the comparisons branch. Coordinate DB/API/generated-client/Python-worker compatibility and replace old type filters/dispatch. Reuse ranking items/content/language/project plumbing. QV allocation activities reject GitHub/external synchronization and comparison-only fields.
2. Add allocation configuration with fixed-budget provenance, opposition policy, statement-set revision, monotonic statement-lock marker, lifecycle generation and current-result reference, separate from Solidago pointers/revisions. Replace the helper's configurable budget with one canonical shared constant and quadratic/linear derived limits. Local editor validation allows empty input; the explicit backend save command does not. No caller-supplied budget or backend draft schema.
3. Add conversation-local identity resolution, response headers, immutable saved versions and sparse allocations with same-conversation ownership FKs/uniqueness. Use non-destructive pointer changes and explicit live exclusion. Add frozen input manifests with exact numerical values/version ownership and independently removable account links. Distinguish retained result-owned evidence from unnecessary private source versions/receipts in the cleanup inventory. Do not implement the future deletion service here or let account/source FKs force deletion of frozen inputs/results.
4. Add durable work unique per closure/method with pending/claimed/retry/failed/completed/obsolete state, lease token/expiry, run epoch and attempts. Add input-rooted results/item totals and frozen counters. Index lookup/aggregation/claiming/current-result access and constrain state/provenance. Validate the cross-row budget in the transaction. Retain one current result set, no checkpoint series.
5. Edit only `services/shared-backend/src/schema.ts` for schema definitions. Run `make sync-ts-backend` and the API's `pnpm db:generate` on a stable migration baseline, review generated Drizzle/Flyway SQL, then migrate a test DB. Add QV DTOs to canonical `services/shared/src/types/` and regenerate the OpenAPI client with `make generate` when routes are available. Do not manually edit generated schema, client or migration files.

**Gate:** contracts/schema represent both prioritization families, fixed-budget sparse responses, versioned saved responses, retained exact inputs and one current result set with deduplicated work, independent of Solidago. Unsaved frontend state has no backend representation.

### Stage 2 — ballot API and privacy boundary

- Add method-scoped POST endpoints for fetching **my saved response**, explicitly saving/replacing a complete response and withdrawal. There are no backend draft reads, writes or autosaves. Reuse ordinary onboarding, resolve account to conversation-local participant, and load fixed-budget rule/pricing/opposition/items on the primary. Parse DTOs at the boundary, bound sparse payloads and reject empty saves, invalid/cross-conversation items and duplicates.
- Use expected saved-response revisions and command idempotency; return accepted state from the write transaction. Implement saved-response guest merge rules, live-input exclusion and account unlinking, with a brief future cleanup contract separating retained frozen evidence from unnecessary private sources. Unsaved frontend edits never enter account merge. Ordinary deletion/merging cannot change sealed numerical inputs, aggregate results or counts.
- Use a participant-row lock for revisions and replacement. Within the same transaction acquire a **shared lock on the conversation row** and check that it is still open and uses credit allocation; closing takes a conflicting update lock. Shared locks let different participants save concurrently. Lock order and row creation for first-time voters must be consistent to avoid deadlocks. Do not update a hot per-conversation counter on every save. Return accepted saved-response state from the write transaction rather than rereading via a potentially lagging replica.
- On the not-yet-started path, serialize the first explicitly saved response with statement maintenance using the QV configuration lock, validate the presented statement-set revision and set the permanent statement-lock marker in the same successful transaction. Later saves do not repeat the conversation-wide write. Local edits and rejected commands do not lock statements. Follow the lock order defined in package C, without shared-to-exclusive upgrades.
- Save sends the exact reviewed allocations. Prevent overlapping explicit saves and fence stale responses by saved-response revision; successful saves update the baseline only for the sent edit generation so newer local edits are not lost. Local changes never alter the counted saved response. Apply the usual discard confirmation to dirty editor navigation; discarding makes no backend request.
- Only the owner can fetch private saved allocations. Closed rejects **all** response-save/withdrawal writes. Open APIs/metadata expose the live participant count, but no statement scores, extra aggregate counters or older result. Use internal bounded/batched proposal staging beyond the current 50-seed DTO cap, completing it before making an activity available; no extra voting lifecycle state.

**Gate:** PostgreSQL integration tests cover fixed limits, empty-save refusal, normal onboarding, stale/duplicate requests, concurrent first saves, all closed writes, saved-response guest merge, snapshot-preserving deletion/merge and many simultaneous voters. Frontend tests verify that unsaved edits/discard send no draft writes and never alter the counted saved response.

### Stage 3 — close, reopen and worker

- Route creation/close/reopen by ballot family; comparisons keep Solidago behavior. Close stops writes and queues generation-scoped work, without a ballot manifest; Python later captures a consistent input snapshot. Reopen revokes public result access and obsoletes work. Keep live-statistics refresh independent. Add explicit dispatch to `post.ts`, `conversationFinalization.ts`, survey refresh/wakeups, metadata/counts/feed, item edits/synchronization, exports and worker reconciliation. Review Flyway scoring-input/lifecycle/retarget triggers too, not only TypeScript conditionals.
- Build the dedicated **Python** allocation worker using generated SQLAlchemy models/constants from the canonical schema/shared rules, and reuse the existing Python worker connection, notification, lease, logging and shutdown patterns where applicable. Extend Python schema-codegen service tags/targets and Make/dev-log, Docker/build/deployment configuration; do not sync a TypeScript backend subset into this worker. SQL capture/aggregation stays outside the short close transaction and never constructs an in-memory voter-by-item matrix. The worker publishes saved results directly to PostgreSQL; TypeScript API code collects inputs, schedules work and serves the saved snapshots.
- Implement polling, leases/heartbeat, automatic transient retry with capped backoff and released slots, immutable input capture, publication fences and graceful shutdown. Reuse the persisted capture on retries; a new close atomically replaces the current calculation after completion. Preserve frozen math/counts on ordinary deletion/merge. No public calculation Retry flow or fixed attempt budget.
- Guard result visibility against replica lag and delayed worker/HTTP/SSE delivery. Events contain invalidations, not private inputs or totals. Aggregate-result availability does not implicitly enable private ballot exports.

**Gate:** close stays short; no writes after it commits. Duplicate/lost wakeups, restart/lease expiry, shared-outage recovery, exact-input retention and close/reopen/re-close work across multiple API/worker instances. Stale work cannot publish; all viewers receive one complete authorized result state, independently of live-count refreshes.

### Stage 4 — UI and product integration

- Add the hierarchy picker and structured seed-statement editor described above: mandatory title, optional description, and the opposition toggle (default on) on the same seed-statement page. Provide authorized post-creation statement editing/soft deletion only while open and before the first explicitly saved response, with backend-provided editability and clear handling of stale content or concurrent participation. Add the allocation editor with fixed **100 credits** and no budget setting. Keep quadratic/linear pricing separate from aggregation. Use **Support**/**Oppose** labels; support-only hides opposition controls. Fix non-BWS fallthrough into Polis in standalone/project/embed voting, analysis and parent routes.
- Add a budget meter, sparse controls, local-unsaved-versus-saved state, explicit Save/update/withdraw, empty-save disabling and closed-state disabling. Use the usual unsaved-changes/discard banner, prevent duplicate saves and surface conflicts/failures. No backend draft autosave. Paginate/virtualize without losing local allocations; include a compact nonzero-allocation review.
- Add guarded result projections, result-specific participant counts, competition ranks and an explicit empty result. The independent live participant count remains available. No timeline or public calculation Retry. Clear/abort stale result requests/caches on lifecycle change and deduplicate generation-aware signals. Include SPA navigation, accessibility, translations and RTL.

**Gate:** browser walkthrough: create → edit locally with no backend write → discard or explicitly save → edit locally without changing the saved response → close/reject late explicit save → all viewers get result → deletion/merge leaves frozen counts → reopen/hide → explicitly update response → re-close/replace. Verify saved-response revisions across two devices, empty input, support-only QV, linear if exposed, normal onboarding blocks and automatic transient-failure recovery.

### Stage 5 — correctness and scale

- Run relevant API/worker/frontend lint/typecheck/tests after codegen. Cover snapshot consistency, input retention/account unlinking, frozen counts, lock boundaries, idempotency, lease/retry limits and stale publication/HTTP/SSE replay under replica lag. Run allocation activities alongside active BWS/Polis conversations.
- Profile close-to-publication time and SQL plans with hundreds of simultaneous voters, thousands of proposal IDs and large sparse ballot sets (including hundreds of thousands of participants). Measure explicit-save transaction latency, DB lock waits and worker claim/retry behavior. Verify local editing emits no backend writes. Set worker concurrency and SQL batch/query limits from these measurements. Record an explicit supported scale envelope instead of assuming that a simple formula alone guarantees one.
- Roll out schema before API/worker/frontend. Expose allocation creation only after the end-to-end path is ready; verify polling by restarting across close. Observe pending age, failures/attempts, lease recovery, deduplicated retries and publication latency using existing privacy-aware logs.

## Remaining implementation choices

- Final subtype discriminator field name and compatibility migration. Values are settled: `conversationType: "prioritizing"`, with `"comparisons"`/`"qv"` subtypes and BWS/pairwise below comparisons.
- Confirm the proposed retry default (one automatic retry, then viewer-triggered bounded cycles), backoff/rate limits and transient/permanent error classification.
- Tie rank-number convention: competition ranks (`1, 1, 3`) are recommended; dense ranks (`1, 1, 2`) remain an alternative pending the product decision. Deterministic display order must not secretly break a tied rank.
- Future plural formula and source/version retention. Missing social inputs are not solved by retaining raw account identities.

## Sources

- Follow-up user decisions: rename conversation type to `prioritizing`, with `comparisons`/`qv` subtypes and BWS/pairwise below comparisons; fixed 100 credits; frontend-local unsaved participant edits with the usual discard banner, no backend draft storage/autosave, explicit response saving and rejection of empty saves; harmonize Polis/BWS/pairwise/QV by retaining frozen individual numerical inputs and results with removable account links, while excluding account-deleted responses from future input selection; cleanup of identity/private operational sources belongs to a later deletion service; proposals are facilitator-created; one current QV input/result set/no history; retry visibility/deduplicated signals for all viewers. The harmonized retention decision supersedes earlier ordinary-deletion proposals to erase frozen QV allocations. The frontend-local clarification supersedes the earlier server-draft and draft-merge proposals.
- Earlier UI: `/Users/nicobao/Downloads/agora-builder-11.html` and `/Users/nicobao/Downloads/agora_dashboard_crypto.html` (predate the fixed-budget/hierarchy clarifications; earlier builders mistakenly present plural as a ballot method).
- QV reference: `/Users/nicobao/github/nicobao/quadratic-voting`, especially `pages/vote.js` and `pages/api/events/details.js`. Its ballot UX and integer math are useful; its write validation, positional items, and read-time aggregation are not Agora backend patterns.
- Latest architecture clarification: Python owns QV calculation/publication, following the other analysis workers; the TypeScript API owns input persistence, validation, scheduling and serving saved results. Migration generation is on hold until an explicit user instruction; this is not automatic permission to run it at the end of the implementation pass.
- [RadicalxChange: Quadratic Voting](https://www.radicalxchange.org/wiki/quadratic-voting/); Miller, Weyl & Erichsen, _Beyond Collusion Resistance_, §1.4 (`external/ssrn-4311507.pdf`); `external/plural-qf/` and `external/COQF/` for later plural research.
