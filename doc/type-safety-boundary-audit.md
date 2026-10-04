# Type-safety boundary audit

Date: 2026-10-04

## Implementation status

All eight audited findings have been addressed. The findings below describe the
pre-fix baseline; their line references refer to that baseline.

| Finding | Implemented correction |
| --- | --- |
| Error classification | Schema-derived transport/contract/unexpected union; unknown thrown values are classified safely; retry and mutation consumers no longer cast arbitrary exceptions to Axios errors. |
| Response ingress | The identified unparsed ranking, profile, vote, topic, mute, and account responses now parse at their API wrappers. Raw Axios response bodies are typed unknown; ranking cache/component contracts use canonical types. |
| Notification production | Canonical variant-derived inputs and explicit DTO projection; one source for persisted/SSE fields; required cancellation data; complete import operation inputs; removal of the unused replica-rereading import broadcaster. |
| Persistence | Atomic parent/detail inserts; schema-generated unique detail constraints and positive vote-count CHECK; deferred cross-table integrity triggers. |
| Conversation state | One authoritative readonly conversation-family config ref, read-only field projections, isolated complete draft snapshots, and Polis-only edit settings nested under the family discriminator. The common draft base no longer duplicates family fields. |
| Request builders | Schema-derived inputs for first-party builders and direct request construction; correlated pagination requests preserved from ingress through query page parameters. |
| Cache transformations | Typed field-change callbacks preserve full/display cache shapes; concrete ranking-update overloads; no redundant parsing of trusted internal updates. |
| Timestamps | Explicit Date, ISO, and bounded integer epoch-millisecond input representations; null, booleans, malformed strings, and invalid dates rejected before coercion. Import-worker database timestamps are normalized to UTC and serialized by its generated datetime contract; the queue ingress requires a timezone-qualified ISO value. |

Pagination typechecking also uncovered a previously flattened filter/cursor
contract. The HTTP boundary now parses the cursor against the requested filter
and returns a typed next request. Pagination and its cache always carry a
complete non-null request; `cursor: null` represents the initial page.

Database migrations `V0096__black_shooting_star.sql` and
`V0096.1__enforce_notification_detail_integrity.sql` have been applied to the
local development database. The handwritten migration contains PostgreSQL
functions/triggers, an explicitly permitted AGENTS.md exception; ordinary
schema constraints were generated from the canonical Drizzle schema.

## Summary

The conversation edit failure was a construction error in trusted application
code: a conditional spread introduced the obsolete top-level
`votingPresentation` field. TypeScript accepted the structurally compatible
object; the strict request schema rejected it before transport.

The broader issue is not a shortage of runtime checks. It is inconsistent
ownership of contracts between form state, request builders, generated transport
types, database writes, caches, and notification producers.

The frontend notification list already has a sound parsing boundary. Related
weaknesses are in notification production and database invariants, rather than
the list's frontend union type.

## Scope and evidence

Reviewed canonical shared DTO/Zod/SSE definitions; conversation create/edit and
draft state; frontend HTTP wrappers for notifications, ranking, surveys, content
translation, projects, organizations, email updates, auth, users, votes, topics,
accounts, and muted users; conversation cache mutation; notification producers,
fetching, schema definitions, migrations, and representative callers.

This is a source-level audit with focused compiler and schema probes, not a
claim that every endpoint, Python worker, or database state has been tested.
The probes did not write application data.

## Boundary model implied by AGENTS.md

1. **External input:** HTTP responses/requests, SSE JSON, stored drafts, raw SQL,
   and third-party results need parsing into canonical types.
2. **Editable form input:** field values may legitimately be invalid. Use an
   explicit form/input model, construct a schema-derived request input, and parse
   value constraints at the submission boundary.
3. **Trusted application code:** retain canonical discriminated unions through
   builders, mutations, services, and components. Avoid weakening them to
   independent flags, optional correlated fields, `unknown`, or unchecked
   transport types.
4. **Persistence:** enforce representable invariants in the database and write
   related rows atomically. Carry `.returning()` values forward.
5. **Serialization:** construct deliberate DTO projections. TypeScript's
   structural assignability does not prove that an object has exactly a strict
   schema's keys.

`unknown` is appropriate at an actual external boundary. An arbitrary generic
response type, manual interface duplication, or repeated parsing of trusted
internal transformations does not strengthen that boundary.

## Findings before implementation

### 1. Shared error conversion hides contract failures as network timeouts

**Confirmed; high priority.**

`services/agora/src/utils/api/common.ts:154-170` accepts `any`, suppresses lint,
and assumes properties on arbitrary thrown values. An error without all of
`message`, `code`, and `name`, including a ZodError, becomes `ECONNABORTED`.
Accessing `error.name` also fails if the thrown value is null or undefined.

That fabricated code is classified as a network error by
`isNetworkError()` and can suppress per-request feedback through
`handleAxiosErrorStatusCodes()`. Numerous wrappers call this converter from a
catch encompassing both network operations and response parsing.

**Direction:** accept `unknown`; narrow actual Axios failures; preserve contract
and unexpected failures separately. Do not manufacture transport codes for
application exceptions. A discriminated error model is preferable to expanding
an Axios-only model with more ad hoc fallback values.

### 2. Several network responses enter application state without parsing

**Confirmed; high priority.**

Examples:

- `services/agora/src/utils/api/maxdiff/maxdiff.ts:80-102,286-344`: ranking load,
  sync, and GitHub preview return generated response data directly.
- `services/agora/src/utils/api/maxdiff/useMaxDiffQueries.ts:103-127` and
  `services/agora/src/components/post/maxdiff/MaxDiffMeSection.vue:57`: the
  generated ranking-load type propagates into cache/component contracts.
- `services/agora/src/utils/api/user.ts:37-45`: user profile is manually rebuilt
  from an unparsed response, with manual date conversion and a ticket fallback.
- `services/agora/src/utils/api/vote.ts:76`: user votes are returned directly,
  with a fallback that can hide an absent payload.
- `services/agora/src/utils/api/topic.ts:32-35,61-64`: topic data is returned
  directly.
- `services/agora/src/utils/api/muteUser.ts:82-88`: muted users are manually
  converted without schema parsing.
- `services/agora/src/utils/api/account.ts:97,112`: account lookup results are
  returned directly.

Generated response annotations describe an expected wire shape; they do not
parse the received JSON. Supplying `api.post<T>()` is similarly not validation.

**Direction:** parse each external response once in its API wrapper, then expose
the canonical parsed type downstream. Use `unknown` for raw Axios data. Keep
generated client types within transport where they preserve useful simple
shapes; do not mechanically replace every flat generated request type.

### 3. Notification producers have the same structural-spread hole

**Confirmed construction weakness; high-priority integrity follow-up.**

`services/api/src/service/notification.ts:1051-1061,1177-1186` constructs
unannotated notification fragments using literal assertions. The fragments are
passed to typed functions and spread into complete notifications at
`1019-1024` and `1129-1134`.

An additional property on a fragment can survive both typed function calls and
the annotated final assignment. The strict notification parser can then reject
it at `1026` or `1136`, after the notification and detail rows have been written.
This is the same category as the edit regression, with later consequences.

Other producer contract weaknesses:

- `InsertNewVoteNotificationProps` carries `numVotes` and `isSeed` twice: once
  inside the notification and again as independent parameters. Persisted detail
  data and the SSE payload can disagree.
- `services/api/src/service/conversationExport/notifications.ts:25-36` makes
  cancellation/failure data independent of notification type. Cancellation text
  is synthesized at `110-111` when absent rather than required by the operation
  input.
- `services/api/src/service/conversationImport/notifications.ts:19-26` has a
  broad type plus nullable conversation data; completed notifications can omit
  navigation information even when a conversation ID is known.
- `services/api/src/service/notification.ts:650-657` manually duplicates the
  import route-target shape instead of deriving it from the canonical type.
- Fetch and SSE producers build notification variants in several different
  places, increasing drift opportunities.

**Direction:** use variant-specific, canonical-type-derived operation inputs;
one source for persisted and broadcast fields; explicit typed DTO builders; and
construction before side effects. Retain parsing where data actually arrives
from external workers or stored JSON. Do not merely remove the existing parsers
while leaving producer contracts weak.

### 4. Notification persistence does not enforce its DTO invariants

**Confirmed schema/write-path gaps; high-priority integrity follow-up.**

`services/shared-backend/src/schema.ts:4083-4221` has foreign keys but does not
encode several notification invariants:

- `notification_opinion_vote.num_votes` is an unrestricted non-null integer;
  its DTO requires an integer of at least one.
- Detail-table `notificationId` fields are indexed, not unique, allowing
  multiple detail rows for one notification.
- The parent's notification type is not tied to the appropriate detail table.

The producers in `notification.ts`, `conversationExport/notifications.ts`, and
`conversationImport/notifications.ts` write parent and detail rows separately
without their own transaction. Representative callers in
`comment.ts:3679-3699` and `conversationExport/core.ts:897-907` invoke them outside
the preceding operation transaction. A detail-write failure can leave an
incomplete notification. Fetch code handles absent detail data by filtering it
out, which does not repair persisted state.

**Direction:** add expressible CHECK/UNIQUE constraints through canonical schema
and generated migrations after assessing existing data; write each notification
and its detail atomically. Cross-table type/detail invariants need deliberate
schema or transactional API design, not a fabricated TypeScript guarantee.

### 5. Conversation state weakens an existing discriminated union

**Confirmed; medium priority.**

`ConversationDraft` is correctly combined with `ConversationTypeConfig` in
`services/agora/src/composables/conversation/draft/conversationDraft.types.ts`.
However, `useConversationDraft.ts:63-65,144-154` exposes family,
`votingPresentation`, and optional `rankingMode` as independent refs. A ranking
family with missing ranking mode is representable. Store synchronization repairs
it using `?? "bws"` at `225-230`; the edit page independently reconstructs the
union with the same fallback in `getConversationTypeConfig()`.

The canonical update DTO at `services/shared/src/types/dto.ts:1820-1843` also
allows top-level Polis-only analysis fields alongside a ranking configuration.
A schema probe confirmed that combination is accepted. Whether those fields
should be rejected or intentionally ignored is a contract decision, but the
current type does not enforce family ownership.

**Direction:** keep one `Ref<ConversationTypeConfig>` authoritative and expose
derived controls as needed. Keep family-specific request settings correlated
with that discriminator, rather than introducing another parallel family flag.
Represent an intentionally incomplete form separately from a publishable draft.

### 6. Form-to-request builders defer shape errors to Zod

**Confirmed; medium priority.**

- `services/agora/src/composables/conversation/usePublishConversationDraft.ts`
  passes object literals directly to `.parse()` and spreads an inferred base
  object. Zod's `.parse()` accepts unknown input, so parsing itself does not
  enforce compile-time request construction.
- `services/agora/src/pages/settings/account/administrator/organization/organizationAdminForm.ts:70-82`
  declares a first-party normalization result as `unknown`.
- Multiple API wrappers construct request literals directly inside `.parse()`.

**Direction:** type first-party builders against schema-derived input types,
including fragments before spreading; parse value constraints at the form/API
boundary; then pass the parsed output downstream. A `satisfies` check on the
outer object alone does not reject extra properties introduced by a spread.
Typed explicit projections are especially useful for strict DTOs.

### 7. Trusted cache transformations are reparsed internally

**Confirmed architectural issue; medium priority.**

`services/agora/src/utils/api/post/useConversationQuery.ts:193-198,202-250`
parses outputs from typed internal cache updates. Its callback takes a union of
full and display conversation shapes and returns that same broad union; it does
not guarantee preservation of the concrete incoming shape.

This puts shape discrimination and runtime repair/checking inside cache mutation
rather than enforcing the transformation's contract. The generic cache access
type itself is not proof that every writer stores that shape.

**Direction:** establish typed cache ownership and callbacks preserving each
concrete cache variant. Parse external ingress first. Remove redundant internal
parsing only after the cache writers and transformation contracts enforce the
necessary invariants; keep migrations/parsing for genuinely persisted untyped
cache data if such a boundary exists.

### 8. Timestamp parsing accepts malformed external values

**Confirmed schema behavior; medium priority.**

`services/shared/src/types/zod.ts:27` defines the widely reused
`zodDateTimeFlexible` as `z.coerce.date()`. A probe confirmed that `null` parses
successfully as `1970-01-01T00:00:00.000Z`.

So even a correctly located response parser can silently normalize an invalid
timestamp. This matters for notification ordering and any DTO relying on this
shared timestamp schema.

**Direction:** enumerate legitimate input representations explicitly (for
example, valid Date objects and ISO timestamps), reject null/booleans, and
convert to Date. Audit legitimate numeric timestamp consumers before changing
the shared contract and regenerate/sync dependent artifacts as required.

## Notifications list: what is already correct

- `utils/api/notification/notification.ts:43` parses the HTTP response with
  `Dto.fetchNotificationsResponse`.
- `composables/useRealtimeSSE.ts:675-705` treats decoded JSON as unknown and
  parses notification events before passing them to the store.
- `stores/notification.ts` accepts canonical `RegularNotificationItem` values
  and stores `DisplayNotification[]`, whose transformation preserves the union.
- Sticky reminders use a separate `SecurityAddEmailNotification[]`. The
  canonical schema requires `isRead: false` and `isSticky: true` and excludes
  them from regular feed/SSE payloads.
- Existing tests explicitly cover sticky-channel boundaries and asynchronous
  refresh/list races.

The generated sticky type at `services/agora/src/api/api.ts:6730-6737` widens
those boolean literals to `boolean`. Compiler probes confirmed that it admits
`isRead: true` / `isSticky: false`, while the canonical type rejects both.
Because the wrapper parses and returns the canonical type, this widening does
not currently leak into the notification list.

Do not add notification-list reparsing or replace this preserved union with a
new parallel interface as a response to the producer weaknesses.

## Recommended implementation sequence

1. Keep the focused conversation edit repair: explicit canonical request fields
   and no duplicated top-level voting presentation.
2. Repair error classification and missing response-ingress parsing together,
   so genuine contract errors retain their identity and reach callers clearly.
3. Refactor notification producer inputs/builders and make their writes atomic;
   address DB constraints with existing-data assessment and generated migrations.
4. Preserve conversation-family unions through draft state and request
   construction; distinguish form input from parsed request output.
5. Fix concrete cache transformation contracts before reducing internal parsing.
6. Tighten timestamp input semantics with focused compatibility tests.

Use tests for boundary behavior and real invariants: invalid external responses,
correct notification variants/channels, failed detail writes rolling back,
canonical routing, and legitimate timestamp formats. Use compiler probes or
type checks for construction mistakes. Avoid tests that only mirror every
builder's object literal.

## Verification of the original implementation

- All 931 frontend tests passed after the final pagination refinement. Lint has
  zero errors and existing component-test warnings. Frontend typechecking passed
  during verification; the latest global check is blocked by a subsequent
  concurrent MaxDiff change: three save contexts in `MaxDiffVotingTab.vue` do not
  yet supply the newly required `MaxDiffSaveContext.isCurrent` callback.
- Before committing, the selectively staged frontend and API trees were
  typechecked independently against HEAD. Both passed, confirming the boundary
  fixes do not depend on the concurrent voting/auth work.
- API typechecking and lint; focused PostgreSQL notification-integrity,
  timestamp/variant/projection/import-event, and user-profile tests: 22 passed.
- Conversation Email Update worker typechecking, lint, and 272 tests passed.
- Import worker: typechecking and lint clean; 43 tests passed after regenerating
  its models and queue contract.
- Load-testing client typechecking passed after OpenAPI regeneration.
- Shared TypeScript/Python artifacts and OpenAPI clients regenerated using the
  repository commands.
- Local migration preflight found no duplicate detail rows, non-positive vote
  counts, or incomplete notifications; both migrations applied successfully.

The full API run had 946 passing tests and six failures, plus a node:test script
that Vitest incorrectly collected. The failures were four existing email-review
image-origin assertions, an existing historical notification-backfill fixture
that recreates an enum already in its current generated fixture, and a merge
test timeout under parallel load. The unchanged merge suite passed all 16 tests
when rerun independently. The affected feature checks passed; the broader API
suite is not reported as clean.

## Follow-up review — 2026-10-05

Scope: commit `d7b6c6dc`, its callers, and the contracts it changed. Concurrent
voting/auth development was inspected only where it overlapped those contracts.

| Area | Finding and correction |
| --- | --- |
| Correctness | Config assignment still retained a caller-owned mutable object; survey restoration and survey/language snapshots also shared nested state. Copy incoming family configs through the owned setter and reuse the existing survey/language clone helpers at data-transfer boundaries. Regression tests cover mutation before and after restoration. |
| Type safety | Family and pagination schemas depended on discriminated-union option indexes. Expose/reuse named canonical schemas instead. Keep the complete filter/cursor request union through request construction. Replace the validation-field assertion with explicit typed field updates. |
| Clean code | Fetching notifications constructed complete DTOs and then projected them again. Build variant content once and apply the shared projection directly to the selected record. Reuse `NotificationContent` for producer contracts; specialize the API import producer to the start event it actually owns. |
| Security | `String(error)` could invoke arbitrary conversion hooks and throw while handling an opaque exception. Preserve real Error/string messages and use a fixed fallback for other thrown values. Tests include a null-prototype object and a throwing conversion hook. No additional authorization or injection regression was identified in the reviewed changes; this is a source review, not a penetration test. |
| Performance | The deferred trigger checked all four detail tables twice for ordinary parent updates, including mark-read operations. V0096.2 skips metadata-only parent updates and checks shared old/new IDs only once. A PostgreSQL probe asserts that marking a regular notification read never calls the detail checker; variant and detail-reason updates still fail when invalid. Pagination response schemas are now created once rather than per response. |
| Dead code | Remove the unused `AxiosErrorCode` union, unused draft ranking-mode projection, unused internal producer return values, unused API completion/failure input branches, and redundant caller catches around the start-notification helper's existing failure handling. |

`V0096.2__avoid_redundant_notification_integrity_checks.sql` replaces a PostgreSQL
trigger function, using the same permitted handwritten-function migration rule
as V0096.1. The already-applied V0096.1 migration remains immutable. The follow-up
migration was verified in a disposable PostgreSQL test container; it has not been
applied to the local development database.

Verification of the review changes:

- Frontend: 9 focused files, **41 tests passed**, covering draft state/schema,
  family controls, pagination, error classification, created-statement caches,
  ranking ingress, and retained ranking updates.
- API: **24 tests passed** across notification integrity, boundary contracts,
  and user-profile serialization; the test command also passes API typechecking.
- Before committing, the selectively staged frontend and API trees were
  independently typechecked against HEAD. Both pass without relying on concurrent
  uncommitted work.
- Frontend typechecking passes with the concurrent, uncommitted
  `utils/api/vote/voteCache.test.ts` excluded. The full workspace check remains
  blocked by that file's old fixtures: pages omit `nextRequest` and page parameters
  are still `null` instead of complete requests. The temporary checking config was
  removed afterward.
- Affected frontend/API production files pass ESLint; shared sources were synced
  with `make sync-all`; `git diff --check` passes.
