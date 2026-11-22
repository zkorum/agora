# Project API boundary

## Keep / replace / delete

- **Keep:** `ProjectsApi`, feature input/result types, form validation, reactive
  workspace state and UI. The interface describes facilitator operations,
  including project settings and conversation drafts, not HTTP, storage or
  SvelteKit.
- **Replace:** the implementation selected in `create-projects-api.ts`. The first
  implementation is a disposable, browser-local mock. There is intentionally no
  fake "real adapter" that silently falls back to mock writes.
- **Delete later:** `mock/`, its fixtures/session-storage key, the mock-mode
  bootstrap branch and the mock reset/banner. These are not application auth.
- **Real transport:** introduce a small adapter over the supported/generated
  backend client and request authorization. Parse external responses there.
  The form and project compositions should not need to change.

This is not a generic repository/DI framework. A workspace-scoped Svelte context
shares the selected adapter through feature state. The project page uses
workspace operations, not mock imports or raw transport. The reusable
`api/mock-response.ts` wrapper adds configurable latency to mock operations
without injecting failures. Direct mock tests are instant by default.
Workspace bootstrap loads projects and drafts in one snapshot. A settings
write takes only editable fields, not the resolved project read model. Title
and description edits retain the existing project slug. Directory visibility is
a separate action so a settings save cannot change it.

The browser mock provisions a demo personal organisation and one unlisted
project on first load, including for existing demo tabs. Reset restores that
baseline. The project uses the ordinary list, settings and Share panel. This
does not implement sign-in or server-side workspace provisioning.

The header background is a project setting for the participant-facing project
and its activity pages, not facilitator-page artwork. Settings can leave it
unchanged, upload a file, or reset it to the default. The mock stores a small
raster image in the current tab; production upload/storage and participant
rendering are not wired here.

## Existing backend contract and gaps

Source: `services/shared/src/types/dto.ts`, `Dto.createProjectRequest` and
`Dto.createProjectResponse`; route `POST /api/v1/administrator/project/create`.
The historical `administrator` URL does not mean only site administrators can
create projects: the route also checks organization-level creation permission.

- Existing request fields include `projectSlug`, `projectTitle`, `body`,
  `ownerOrganizationSlugs` (one or more), optional branding and localization.
- The current response returns the ID/slug or an explicit failure reason. A
  real adapter can construct the immediate project summary from these returned
  values plus the accepted request/options, without a stale read-after-write.
- Project titles are plain text. Original and localized descriptions use the
  activity-body HTML allowlist and limits. A real adapter should send the
  normalized body and still rely on server-side validation and sanitization.
  V3 mock records without a `bodyFormat` marker are migrated from literal text.
- The language section uses the existing project policy: automatically detected
  original language, up to two additional target languages, dynamic translation,
  and manual project translations. When dynamic translation is off, each target
  requires a localized title and, if the original has one, a description. Manual
  content supplied with dynamic translation on has the same completeness rules.
  Backend language codes (including `zh-Hans` and `zh-Hant`) are not URL locales.
- `emailUpdates: "ask" | "off"` is organizer form wording for the existing project
  enabled/disabled default, not individual consent. The future adapter must map
  it through `getProjectEmailUpdateDefaultEnabled()`. Conversations can override
  that default. An enabled default requires a monitored organizer-side contact;
  the form saves a project-specific contact, independently of ownership.
  An email alone is enough; optional fields include first/last name, role,
  organization affiliation, website and image URL. A website-only contact needs
  a name or affiliation, matching the backend. Asking about updates still
  requires an email, because replies use that address. Contact reuse is deferred.
- Choosing **Ask participants** in the Svelte forms switches the draft to email
  verification when necessary. Explicitly choosing another authentication mode
  switches the draft back to **Don't ask**. Loading existing projects does not
  rewrite their settings. Verified email, individual consent and delivery
  eligibility remain separate requirements.
- Backend source now accepts optional project `participationMode` defaults;
  the form's authentication values use that same shared enum. Conversations can
  explicitly select `project_inherited` or `conversation_override` through
  `participationModeSettingsSource`. Inheritance is live; existing conversations
  remain overrides, and unchanged legacy Vue edits preserve inheritance.
  Source-less legacy edits compare the submitted mode with the current effective
  mode. If a project default changed while an editor was open, the server cannot
  distinguish the stale value from an intentional override. New adapters must
  submit the source explicitly rather than rely on this compatibility heuristic.
  These schema changes require the deferred migration before deployment.
  Refresh the OpenAPI document and generated clients before wiring these new
  fields; the current generated artifacts do not yet expose this contract.
- Email-update defaults still use separate configuration rather than the
  create-project request and need atomic creation integration. Never silently
  drop selections or report success after only part of the project is saved.
- No entitlement gates are added to this UI preparation. Removing existing
  backend-wide entitlement restrictions is separate work and does not remove
  ownership/authorization, participant consent or operational safety checks.
- Managing organizations determine project administration and never change
  the individual user's account identity. The real API remains responsible for
  authorization. Creation uses the default administrative owner supplied by
  workspace context; facilitators edit owners and public credits in project
  settings. The creation form requests only a public contact email, and only
  when asking about email updates. The same contact can be edited later.
- Public Project Owner / Partner / Sponsor credits use the backend's canonical
  `attributions` roles and existing/external source distinction. They grant no
  management permissions. External profiles accept name, description, website,
  logo URL and original language. Their additional localization editor is not
  implemented; the form contract accepts only an empty `additionalLocalizations`
  array rather than accepting translations it cannot edit or display.
  Images use HTTPS URLs (`imagePath`, `isFullImagePath: true`); this does not
  implement uploads or backend image-storage paths.
- Figma's create dialog
  (`24010:152257`) shows an organization selector and Add more, without contact
  fields. The HTML prototype's Add more creates Partner/Sponsor attribution
  rows, not extra administrative owners. The settings editor keeps management,
  public credits, and contact separate.

### Sharing, directory visibility, and draft handoff

- The Share panel's Publish tab changes mock `directoryVisibility` only.
  It does not expose a public URL, add an Explore entry, or change participant
  access or individual activity availability. Participant links and their
  actions are unavailable until the live route and adapter are wired.
  Earlier mock `isPublished` values are read as directory visibility.
- Choosing one of the activity types below the draft list, or confirming the
  picker, saves a `conversationDraft` with the project slug and type before
  navigation. `createConversationDraft` starts the draft; edits on its page do
  not update browser storage until `publishConversationDraft` validates the
  type-specific setup and replaces that draft with a created conversation in
  one mock storage write. The mock reuses the draft ID so existing workspace
  links keep working. Neither operation contacts the backend.
- Browser storage only demonstrates the lifecycle in one tab. A real adapter
  needs a backend draft contract scoped to project permissions so other
  authorized facilitators can resume the draft.

`logic/agora/project-creation.ts` is a validated **form/use-case contract**, not a
replacement wire DTO or database model. Canonical shared limits are reused.
Do not import the large static DTO class merely to validate an unrelated UI
field; use the supported shared/client contracts at the real adapter boundary.
The form reuses the canonical language codes and email parser, but keeps its
small language-policy validation local: the aggregate backend Zod module also
imports server-side rich-text sanitization and is not a frontend dependency.

## Mock lifecycle

The mock starts with **zero projects**, plus deterministic permitted organization
options. It does not log anyone in, send mail, enforce participant access or
create backend records.

- Development enables it automatically.
- A staging build must set both `VITE_STAGING=true` and
  `VITE_PROJECTS_MOCK=true`.
- Normal production refuses mock mode even if `VITE_PROJECTS_MOCK=true`.
- Bootstrap runs after hydration. SSR never reads `sessionStorage`, serializes
  a demo identity or keeps a process-global collection of user projects.
- The versioned storage key is `agora:mock-projects:v3`. Existing v3 records
  without publication or drafts read as unpublished with an empty draft list.
  It survives refreshes in
  the current tab. Browsers can initially copy session storage into a new tab
  opened with an opener; subsequent changes are independent.
- Older `v1` and `v2` demo data is left untouched under its old keys. Neither
  single-language fields nor historical authentication aliases are silently
  reinterpreted.
- Saved data is parsed, not cast. Corrupt, blocked or full storage is an explicit
  error, not silent data loss or an apparently successful creation.
- Reset removes only this mock key. It never clears unrelated application data.
- Reset is unavailable during pending loads/creates; accepted creation responses
  upsert cached identities rather than duplicating list/sidebar entries.
- Organization logos are parsed image sources (local assets, embedded images or
  credential-free HTTPS), including optional compact artwork. Presentation never
  assigns branding based on a fixture slug.

Do not add `if (mock)` to individual screens or put fixtures in presentation
components. Tests may inject a `ProjectsApi` to exercise delay/failure paths.

## Why not MSW for the first slice?

[MSW](https://mswjs.io/docs/) is useful for network-level integration tests, and
has a [SvelteKit integration](https://github.com/mswjs/sveltekit). It is not needed
to make this UI independent of its data source. A small typed adapter avoids a
service-worker lifecycle and separate browser/SSR in-memory databases while the
new project defaults do not yet have a complete real HTTP contract. We can add
network interception around the real adapter later without changing the form.

## Rendering

The landing/resources pages are prerendered to static files at **build time** and
served by the CDN; they do not need a backend render on every visit.

Product routes explicitly retain `ssr=true`, `csr=true`, `prerender=false`.
SvelteKit server-renders the initial shell, hydrates it and uses SPA navigation
afterward. Browser-bound mock data loads after hydration; this temporary
limitation does not justify disabling SSR for the whole product.

Later, public project data can load through route `load({ fetch })` and be
included in SSR. Private SSR data requires a deliberate server-readable
authentication/delegation contract; browser-held UCAN keys must not be copied
to the server just to implement SSR. No experimental remote functions, new
SvelteKit proxy API, second auth system or shared server mock database is added.

References: SvelteKit [page options](https://svelte.dev/docs/kit/page-options),
[loading data](https://svelte.dev/docs/kit/load),
[state management](https://svelte.dev/docs/kit/state-management) and
[form actions](https://svelte.dev/docs/kit/form-actions).
