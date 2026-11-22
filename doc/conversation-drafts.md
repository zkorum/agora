# Project conversation drafts

The authenticated `POST /api/v1/conversation/draft/{create,list,get,save,discard,publish}`
routes are facilitator-only. A draft belongs to a project, not to its creator.
A UUID is not a permission: every operation requires current `conversation_create`
access through an owning organization. Lists are scoped by the current project
slug; draft IDs remain valid across project renames. A deleted project is not
accessible through the draft API.

- `create` takes `projectSlug` and `conversationType`; `get` takes `draftId`.
  `list` takes `projectSlug` and an optional `limit` (default 50, max 100).
  Pass its `nextCursor` as `before` to load the next page.
- `save` replaces the draft's `content` and returns its new revision. Save,
  discard, and publish take `draftId` and `expectedRevision`. A stale revision
  returns `409`. The activity family cannot change; its configuration and seed
  content can be incomplete until publication.
- `publish` uses only the saved revision. Participation and language settings
  inherit from the project by default. Save override values only alongside
  their explicit `conversation_override` sources. If more than one owning
  organization is eligible for the publisher, the request must specify
  `postAsOrganization`.
- Publication runs the direct-create validation and writes the normal
  conversation graph. It records the result on the draft in the same database
  transaction. Retrying the published revision returns the same slug while
  that conversation remains available in the draft's project. Publishing and
  discarding clear the working payload; neither leaves an editable active draft.

Drafts do not create participation records or schedule publication work. A
future rehearsal can copy the configuration of a specific draft revision into a
separate session without involving participant-facing conversation tables.
There is no rehearsal API or frontend wiring yet. Vue can keep publishing its
local drafts through `/api/v1/conversation/create` unchanged.

V0116 creates `conversation_draft`. Apply the coordinated upgrade before using
these endpoints against a deployed database. No legacy data backfill is needed.
