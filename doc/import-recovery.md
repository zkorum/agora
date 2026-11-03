# Conversation import recovery

## Findings

The reported symptom has two independent parts:

1. The creation page used cached `hasActiveImport` data to disable submission
   even after switching to ordinary conversation creation. Disabling a TanStack
   query does not clear its cache. The regular creation API has no active-import
   admission check; the cross-mode lock was in the frontend.
2. An import could remain `processing` indefinitely, with its conversation hidden
   behind `is_importing`.

The importer and math worker had a circular dependency: import completion waited
for opinion-group analysis before clearing `is_importing`, while both the math
worker's claim and reconciliation paths explicitly required `is_importing=false`.
Fully saved imports therefore could not reach the analysis result they were
waiting for. The fix completes publication as soon as ingestion is finished, in
the final import transaction, and queues analysis only after that commit.

Database-backed regression tests also reproduced a notification failure:
the JSON Schema exporter retained Zod's ISO datetime string `pattern` alongside
`format: date-time`. Python code generation turned that into an `AwareDatetime`
field with a string regex constraint. Constructing a completion or timeout
notification then raised a `TypeError`: Pydantic tried to apply the string
constraint to an already-parsed datetime. Both completion and timeout cleanup
constructed events before committing, so those transactions rolled back and the
import stayed `processing`.

Additional lifecycle gaps amplified that failure:

- Stale cleanup excluded all imports with a linked conversation, although these
  imports still waited for analysis before becoming complete.
- Completion and cleanup could be starved by occupied worker slots or a busy
  queue. Maintenance also depended on successful queue polling.
- Imports with no eligible votes, including imports whose votes were all on
  moderated statements, created dirty analysis work but skipped its queue wakeup.
- Python events serialized absent optional fields as JSON `null`, which the API's
  Zod optional-field contract rejected. This broke realtime notification delivery
  independently of database status polling.
- Unconditional failure handling could overwrite an already-terminal state.

These are reproduced code defects. Confirming which path affected a specific
production import still requires that import's ID and its production logs/state.

## Recovery behavior

- Ordinary conversation creation is independent of active imports. A single
  active import still prevents another CSV or URL import.
- Successful ingestion atomically links the import, publishes the conversation,
  completes its status, and persists its completion notification. Opinion-group
  analysis runs in the background after publication, just as for an ordinary
  conversation. Missing or stale analysis work cannot block import completion.
- The worker recovers fully saved imports before stale cleanup, including old
  imports blocked by the circular dependency or notification bug. Linking the
  import to its conversation is the durable marker written after ingestion.
- Unlinked imports with stale ingestion heartbeats fail after the configured
  orphan threshold. Worker maintenance heartbeats protect live ingestion across
  worker instances. Imports still queued retain equal creation/update timestamps
  and use the absolute deadline, so a busy queue does not look like abandoned work.
- Queued or unfinished ingestion has a one-hour absolute deadline. Heartbeats
  do not extend it. Analysis has its own worker lifecycle and retry state.
- Normal API status polling and active-import checks stay read-only. Overdue
  candidates are expired on the writer, with follow-up reads in the same
  transaction, so a stale replica cannot reintroduce the lock or overwrite an
  already-terminal state. Admission also expires overdue imports on the writer.
- A timed-out import releases the user's import slot. It stays failed; late
  ingestion cannot publish it and late error handling cannot replace its reason.
  Partial conversation data remains hidden for diagnosis rather than being
  published as a successful import.
- Obsolete or duplicate deliveries are skipped. They cannot fail an already
  published import. A late ingestion result discards its own
  unpublished partial conversation if its conditional finalization fails.
- Failed at-most-once deliveries cannot be reconstructed from `conversation_import`:
  the row does not retain the CSV payload. Retrying such imports requires
  submitting the source again.

The deadline is `MAX_CONVERSATION_IMPORT_DURATION_MS` in the canonical shared
TypeScript source and is generated into Python. No schema migration is required.

## Rollout for existing stuck imports

Deploy **import-worker first**, then **api** and **agora**.

Let the fixed worker drain its ready-to-publish recovery batches before enabling
the API's expiry behavior. This gives old conversations whose data is fully saved
a chance to finish successfully, regardless of analysis state. Otherwise an API
poll can mark an overdue import failed first, which intentionally prevents its
later publication.

After rollout:

1. Existing ready imports complete and their conversations become accessible.
2. Existing overdue, incomplete imports become failed and release the import slot.
   A status poll or import admission performs this recovery even if the worker
   later goes offline.
3. Ordinary conversation creation is immediately usable with the updated frontend.

This is not a blanket publication of partial conversations. A failed import can
be retried, while its previous partial data remains hidden.

## Diagnosing the reported import

Obtain the import ID from the import-status URL or notification, and correlate it
with the deployed import-worker version and production logs. Useful markers are
`Processing`, `Published`, `Created imported conversation`, `Inserted imported participants`,
`Inserted imported statements`, `Inserted imported votes`,
`Finalized imported conversation row`, `Ready import completion failed`, and
`Stale import cleanup failed`.

The datetime defect appears as `Unable to apply constraint 'pattern'` for a
`datetime`. In older worker versions, a logged ingestion completion only meant
the rows were saved, while publication still waited for analysis. In the fixed
worker, `Published` is emitted after the publication transaction commits.

Inspect these fields through the ORM-backed import status/lifecycle paths:

- `conversation_import.status`, `failure_reason`, `conversation_id`, `created_at`,
  and `updated_at`;
- `conversation.is_importing` and its Polis config's `analysis_data_generation`;
- the latest opinion-group specs and their `analysis_work_state` completed,
  non-retryable, dirty, and lease state.

No linked conversation points to queue loss, ingestion failure, or interrupted
processing. In an older worker, a linked conversation with non-terminal analysis
matches the circular dependency; terminal analysis with a still-processing import
points to finalization. Both kinds of fully saved imports can be recovered by the
fixed worker without waiting for analysis.

## ORM and type-safety boundary

Application database operations use Drizzle in the API and generated SQLAlchemy
models in the worker. Lifecycle tests use those same models for row setup,
queries, updates, and test-only cleanup; only applying the existing schema
migrations/fixtures executes SQL text. PostgreSQL connection metadata is read
through a typed SQLAlchemy `current_setting` expression.

Queue request types derive from their Zod schemas; Python contracts are generated
from those schemas, including native UUID owner/actor fields. Queue JSON is parsed
into a typed JSON value before request parsing. Datetime code generation retains timezone-aware validation, and event
serialization preserves the distinction between required nullable and optional
fields. No type assertions or hand-written database model copies are needed.

## Focused review findings

1. **Correctness:** Completion and timeout use conditional state transitions;
   completed/failed imports cannot be overwritten by late error handling.
   Duplicate deliveries are harmless. Tests cover recovery of 24-hour-old ready
   imports, publication independent of analysis state, worker saturation, lost
   commit acknowledgements, and stale replicas. Ready recovery still requires the worker-first
   rollout described above: API timeout and worker completion deliberately use
   first-terminal-transition-wins semantics.
2. **Type safety:** Request interfaces derive from Zod rather than duplicating
   schema shapes. Native UUID parsing lets ownership checks happen in ORM
   predicates before heartbeat writes. The worker result is a success result,
   failure event, or skipped delivery, rather than two independent nullable
   fields. Ruff is configured to retain runtime-evaluated Pydantic type imports.
3. **Clean code:** Read-only lookups are separate from overdue recovery; admission
   avoids a nested transaction and duplicate expiry. Partial-ingestion discard
   logic is shared. The one-hour policy has one shared source.
4. **Security:** Worker start, heartbeat, and failure updates are owner-scoped.
   Cross-user polling and wrong-owner work cannot mutate another import. Queue
   validation logs contain error codes instead of imported text. Partial imports
   remain hidden.
5. **Performance:** Normal polling does not require a writer. Publication readiness
   uses the durable import link and content in one ORM query, with no analysis queries.
   Completion and cleanup each process at most 100 records per pass. Cleanup
   excludes ready imports waiting for a later completion batch. Completion
   locks one ready import at a time; expiry uses `SKIP LOCKED`. Heartbeats commit
   separately, preventing cross-worker heartbeat/expiry lock cycles. Regression
   tests cover bounded query counts and progress while another row is locked;
   these are functional/query-count checks, not a production load benchmark.
6. **Dead code:** Removed the unused optional success-event slot and replaced it
   with the required notification produced by publication. Removed unused request
   exports, duplicated request interfaces, analysis-readiness gating, and
   capacity/idle-only maintenance paths.
