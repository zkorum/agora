# Gathering backend

Gathering is a separate conversation family. This implementation does not add a
frontend flow, generic linked activities, generation, voting or numerical analysis.

## Creation

Use `POST /api/v1/conversation/create` with existing conversation/project metadata,
`conversationType: "gathering"` and a `gathering` object:

- **New collection:** `gatheringMode: "new"`, `responseVisibility`,
  `responseFormat`, optional `allowNewResponses` (defaults true), and optional
  `seedGatheringResponses`.
- **Amendment:** `gatheringMode: "amend"`, `responseVisibility`,
  `sourceConversationSlugId`, `selectedResponses`, optional `allowNewResponses`
  (defaults false), and optional `seedGatheringResponses`.

Each field supplies a UUID `fieldId`, `label`, `required` and `characterLimit`.
There are one to six fields; labels need not be unique. Creation assigns
independent published field identities. Load the target format before submitting
later responses. Fields, their order and validation rules are not editable after
publication or reopening.

Each selected source identifies `responseSlugId` and exact `sourceVersion`.
The backend requires source management permission and resolves text itself.
It copies the format, authorship and seed status, pins a target-owned baseline,
and stores minimal nullable provenance. Source changes/deletion do not synchronize
into the target. Private source responses cannot be copied into an everyone-visible
round. New amendment seeds use source field IDs in the creation request; the server
maps them to published target fields.

`seedOpinionList` must be empty. Gathering does not accept surveys, comparison/QV
configuration or participant statements.

## Endpoints

All endpoints use POST bodies and responses use `Cache-Control: no-store`.
Except creation, paths below are relative to `/api/v1/gathering`.

| Endpoint              | Purpose                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/load`               | Frozen format, mode, visibility, admission setting and closure state.                                                 |
| `/responses/list`     | Cursor-paginated `active`, `own` or `moderation` view, with viewer-scoped accessible and participant-response counts. |
| `/responses/read`     | One accessible response, including its copied baseline if any.                                                        |
| `/responses/history`  | Accessible saved versions; paginate with the last `sourceVersion` as `beforeSourceVersion`.                           |
| `/responses/save`     | `change.action`: `submit`, `seed` or `edit`.                                                                          |
| `/responses/delete`   | Explicit soft deletion and immediate exclusion of every saved version.                                                |
| `/responses/moderate` | Capability-authorized `hide`, `move` or `restore`, with a recorded reason.                                            |
| `/settings/update`    | Change `allowNewResponses` after publication. Closure still overrides participation.                                  |

Read-only endpoints permit optional authentication; identity is necessary for
own/private access. Mutations verify UCAN signing identity. Participant saves reuse
existing account/verification and conversation-lock participation checks,
including guest registration. Seed management requires `conversation_edit`,
independently of participant admission. Moderation uses `conversation_moderate`
or site moderation. Hidden content remains restricted to site moderators; private
audience restrictions still apply.

Answers are `{ fieldId, value }` pairs. The backend rejects duplicate/unknown field
references, missing or blank required text, and values above frozen field limits.
Optional missing answers are saved as empty strings. Limits count Unicode code
points, matching PostgreSQL `char_length`. Values are plain text, not sanitized
HTML; future clients must render them as text. NUL and malformed Unicode are
rejected before persistence instead of failing or changing text in the driver.

Changed edits require the current `sourceVersion`, save a complete immutable
version, and advance the root pointer. Stale saves return conflict; no-change saves
return the existing version. Participant content is author-editable only, even
when its author is also a facilitator. Editing does not clear moderation.

## Participation and lifecycle

- One participant root per global user per conversation, enforced by SQL.
  Copied participant responses reserve that slot even before an amendment.
- Seeds have no personal author, do not consume participant slots and are excluded
  from participant-response counts. Multiple seeds are supported in both modes.
  Creation accepts up to 1,000 seeds per request, subject to the normal request-size
  limit; this is not a total seed limit for the conversation.
- With admission enabled, unselected source authors and newcomers can each submit
  one response if they satisfy target participation requirements.
- Turning admission off blocks new participant responses, not existing edits or
  authorized seeding. Closure blocks submissions and edits, including seed edits.
- Moderation and explicit deletion remain possible after closure. No mathematical
  worker or numerical finalization is required.
- Explicit deletion leaves the stable root reserved; replacement/re-submission
  after deletion is not implemented. Account recovery cannot restore deleted text.
- Account deletion hides all personally authored copies, including private
  responses, from lists, history, counts and source selection. Recovery restores
  only otherwise eligible account-hidden roots. Gathering has no historical-display
  retention exception or numerical tombstones.
- Organizer seeds follow project/organization ownership, not the administering
  user's account lifecycle.

Readers batch content, answers, baselines and author projection. Freshness-sensitive
permissions, mutations and protected Gathering counts use the primary. Conversation
locks serialize saves, closure and account-lifecycle transitions; read-only requests
use mutually compatible shared locks. Amendment creation
locks selected authors before project/conversation locks so account deletion or
guest merge cannot miss newly copied roots.
Protected display counts check the current parent/project association, role grants
and response visibility in one SQL statement. They do not reuse a facilitator
decision from an earlier query, including after project reassignment or membership
revocation. Restricted accounts do not gain private access through role grants.

Creation batches roots, versions and answers: four persistence statements for
seeds, five when copied baselines/provenance are included. Source selection and
answer loading are batched too. Scoped lists/counts use the existing
`(config_id, id)` index; they do not require a new pagination-index migration.
Creation compiles the frozen answer format once per batch. Access/locking policy
and creation/copy preparation live in `gatheringAccess.ts` and
`gatheringCreation.ts`; `gathering.ts` contains response reads and mutations.

Conversation metadata uses `responseCount` for Gathering responses; legacy
opinion/vote counts remain zero. Participant counts represent accessible current
non-seed roots, not a saved closure total. Public project aggregates never disclose
private response counts. An unchanged copied baseline is not treated as affirmative
participation for email-update eligibility.
Gathering metadata and feed selection do not require numerical display snapshots.
Admission-setting events include `settings.gathering.allowNewResponses`.

## Rollout and remaining boundaries

Gathering schema changes are included in the
[coordinated V0116 upgrade](../services/api/database/flyway/COORDINATED_UPGRADE.md).
The base phase creates the configuration, response, history, and translation
tables and commits the new conversation and translation-source enum values.
Later phases can then build the indexes and enforce the subtype and translation
constraints. No historical responses are fabricated or backfilled.

No application-database migration or deployment was performed. Deploy the schema
before the new API. Shared copies, Python models, API fixtures, OpenAPI and clients
must remain generated from canonical sources.

Gathering text is never registered as a Polis opinion or a legacy CSV export source.
Legacy export endpoints reject Gathering rather than returning partial Polis data.
Gathering exports, frontend views and notifications carrying response text remain
unimplemented.

### Dynamic translation

Frozen field labels and immutable response-content versions use the shared
translation work/lease pipeline. A field UUID identifies its immutable label
source: label editing would require introducing revisioning, not updating that
source in place. Response translations are keyed by exact content version and
field identity; each answer is translated independently as plain text, preserving
blank answers and field order. Complete bundles publish atomically.

Read DTOs provide backend-selected `displayContent`; original labels/answers remain
separate for validation, editing and amendment copying. Translated display values
are not subject to original input-length limits.

Only everyone-visible, non-hidden, otherwise eligible responses may be sent to a
translation provider. Private responses remain original-only pending explicit
provider/privacy-policy approval. Translation reads/requests reuse current
Gathering access rules for current versions, history and target-owned baselines.
The worker rechecks source eligibility before publication.
It acquires author/conversation lifecycle locks before the work lease, then reads
eligibility in a fresh statement after any lock wait. Rebound/restricted authors
and revoked translation targets are rejected. Rate-limit and Valkey I/O run outside
API lifecycle-lock transactions; access is rechecked before durable work is written.

Gathering response identities/status are not broadcast on conversation-wide SSE
topics. Clients must recover through authorized reads/polling and viewer-scoped
caches. Translation is scheduled on creation, response saves and conversation
language-setting changes; durable SQL rows remain sufficient without a Valkey
wakeup.
Scheduling reads only identities and translation coverage, in 500-response pages;
it does not load response text to decide which work is missing. Display assembly,
scheduling and interactive requests live in separate translation modules.

V0116 includes the translation schema. Enum values are committed in the base
phase before the concurrent translation indexes and validated constraints use
them. No application database was migrated.

Permanent purge, backup erasure, private-data retention periods and exceptional
cross-copy erasure are deletion-service/privacy-policy gates, not permission to
retain private text indefinitely. See `deletion-dependency-contracts.md`.

## Verification

The first review regression run passed 366 API tests and 53 frontend compatibility
tests. The second review passed 35 focused Gathering contract/database tests,
including single-statement authorization/counting, project reassignment,
membership revocation, restricted facilitators and reusable frozen-format parsing.
Its API/frontend/email-worker typechecks, scoped lint and soft-delete checks passed.
The broader rerun encountered stale generated fixtures missing the unrelated
`automatic_post_closure_cleanup_enabled` conversation column; that mismatch is
outside the Gathering changes and was not hand-patched.

Coverage includes versions/conflicts, concurrent admission, closure,
private readers/counts, seeds, amendment baselines, account hiding/recovery,
moderation, source-content purge FKs and generated migration execution on disposable
PostgreSQL. Review coverage also includes snapshot-independent feed/metadata reads,
history cursor ownership, batched seed persistence, admission-setting events,
guest-merge conflicts, copied-response email eligibility, and both orderings of
copying versus account deletion. This is not a production migration or a
permanent-purge implementation.
