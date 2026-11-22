# Remove Zupass support

**Date:** 2026-10-29. **Status:** implemented in this checkout; the data migration is tested against an isolated database and has not been applied to deployed databases.

**Approved implementation decision:** permanently purge the retired `event_ticket` premium entitlement records. This approval is specific to those entitlement rows; stored ticket/nullifier records use non-destructive retirement. Add an exact, hash-pinned feature-retirement migration exception to the deletion policy rather than treating this new purge as historical SQL.

### Implemented release strategy

This checkout implements the final ticket-free API/frontend contracts in one coordinated release, rather than shipping the optional multi-release wire bridge below. Stop old API/import writers and run the normal Flyway migration: `V0115.1__retire_zupass.sql` follows V0115 and precedes V0116. Then deploy the rebuilt API/frontend/import worker together. Existing open tabs need to load the new bundle at cutover; do not run old strict-SSE clients against the final settings contract. Old ticket URLs retain SPA redirects; queued imports discard only the retired setting. No database tables or ticket/nullifier rows are hard-deleted. The database's legacy enums/columns remain storage-only, so Zupass retirement itself requires no schema-removal migration.

## 1. Intended behavior

Remove Zupass completely from the product. Existing conversations that required a Zupass ticket should behave like otherwise identical conversations that never required one.

| Area | Result |
| --- | --- |
| Existing conversation | Same URL, project, content, authors, statements, votes, survey responses, and analysis |
| Participation | Apply the existing participation mode and survey requirements, without any ticket check |
| Visibility and moderation | Preserve indexing/privacy settings, closure state, and moderation locks |
| Conversation UI | No ticket banner, badge, requirement, verification step, or retired-feature notice |
| Creating, editing, and importing | No event-ticket setting or premium entitlement requirement |
| Existing ticket holders | No special privileges or restrictions based on their old ticket |
| Existing users and devices | Preserve IDs, device associations, sessions, and contribution ownership |
| Old ticket-verification links | Resolve through ordinary onboarding, then return to the conversation |

In particular, **do not change all affected conversations to guest participation**. Removing the ticket requirement is independent of `participationMode`: account, email, identity verification, and survey requirements still apply where configured.

This is a settings/access migration. It does not reconstruct hypothetical votes or participation that might have happened without the original restriction, or rewrite user-authored conversation text mentioning Zupass.

## 2. Original integration inventory

### Database

Canonical source: `services/shared-backend/src/schema.ts`.

- `conversation.requires_event_ticket` uses the `event_slug` enum, currently containing only `devconnect-2025`.
- `event_ticket` stores the user association, provider, event-specific nullifier, verification timestamps, deletion state, and optional provider metadata. `ticket_provider` currently contains only `zupass`.
- `premium_feature` includes `event_ticket`; corresponding grants live in `premium_feature_entitlement`.

### Backend

- `services/api/src/service/participationGate.ts` checks tickets after resolving identity and before checking the survey. Removing just the frontend would leave voting and statement submission blocked.
- `services/api/src/service/zupass.ts` also implements guest registration, new-device login, and account merges. It is not just a ticket validator.
- `getDeviceStatus()` in `services/api/src/service/authUtil.ts` already determines registration from phone, Rarimo, or email, without consulting tickets. Zupass-only users are already guests.
- `services/api/src/index.ts` exposes both `/api/v1/auth/ticket/verify` and `/api/v1/conversation/onboarding/ticket/verify`.
- Tickets also appear in profile responses, account deletion, guest merges, conversation reads/writes, premium permissions, and import requests.

### Frontend and shared contracts

- `services/agora/src/App.vue` initializes a global Zupass iframe container.
- Verification components/composables live under `src/components/zupass/` and `src/composables/zupass/`; the API wrapper is `src/utils/api/zupass.ts`.
- Ticket settings span the create/edit/import forms, draft schemas, publishing, banners, user store, participation query keys, and onboarding routes.
- Canonical shared contracts in `services/shared/src/types/{dto,zod,sse}.ts` include ticket requirements, verified tickets, premium features, edit permissions, participation rejection reasons, and the `ticket` onboarding step.
- Realtime settings payloads are strict and persisted in `realtime_event_outbox`. Old payloads need migration or boundary normalization when the field disappears.
- The import queue contract is strict; Python contracts/models are generated from TypeScript sources.

### Dependencies and compatibility workarounds

- Frontend: `@parcnet-js/app-connector`, `@parcnet-js/podspec`, `@parcnet-js/ticket-spec`, and `@pcd/gpc`.
- API: `@pcd/gpc`, `@pcd/pod`, and `@pcd/proto-pod-gpc-artifacts`.
- `services/api/esm-loader-lodash-fix.mjs` exists for PCD-related module issues and is referenced by the API start script, Dockerfile, and ESLint configuration.
- `services/agora/quasar.config.ts` aliases Node modules to browser stubs specifically for this integration; its dev-port comment also references Zupass.
- API configuration includes `ZUPASS_PUBLIC_KEY`.

The working tree already contains substantial changes, including conversation drafts, shared schemas, and Zupass authentication. Implement against the current state and review overlapping edits before changing these files.

## 3. Implementation sequence

### Phase A — retire behavior while retaining a short-lived wire bridge

1. Remove the ticket gate from participation resolution and stop producing `event_ticket_required` / `nextStep.kind = "ticket"` responses.
2. Disable ticket verification, registration, and login endpoints so no new proofs or ticket records can be accepted. Do not manufacture a successful verification response.
3. Make create/edit/import paths incapable of setting a ticket requirement, including queued imports. During the bridge release, parse and discard a legacy ticket setting rather than persisting it.
4. Stop querying ticket records for profiles and stop including tickets in premium access decisions. Ignore the retired entitlement feature in every listing, permission calculation, grant/update path, and DTO mapper.
5. For old clients during this release only, retain existing response/SSE shapes with neutral values: omitted/undefined conversation requirement, `requiresEventTicket: null` in the old SSE shape, `verifiedEventTickets: []`, and false ticket-edit permissions.
6. Deploy this API release before the ticket-free frontend. The bridge ends with Phase C; it is not permanent Zupass support.

**Why this phase:** old backend instances can otherwise recreate restrictions after a backfill, and old frontend bundles expect fields that the final contracts will remove.

### Phase B — normalize persisted data and remove frontend integration

#### Data backfill

Add a new, idempotent Flyway **data-only** migration:

- Set every non-null `conversation.requires_event_ticket` to SQL `NULL`, including closed and soft-deleted conversations. Change no other conversation setting.
- Permanently delete all retired `event_ticket` premium entitlement rows, including already-revoked grants, as explicitly approved. Keep the deletion scoped to that feature and pinned by the deletion-policy checker.
- Soft-retire active `event_ticket` records using their existing `is_deleted` flag. Preserve user and device records.
- Normalize replayable `conversation_settings_updated` outbox payloads so the legacy requirement is neutral during the bridge. Account for any other persisted settings documents found during implementation.

Use the migration/database timestamp for updates. Capture aggregate affected-row counts and verify that conversation/content/contribution rows and IDs remain intact.

After normalization, invalidate conversation, profile, edit-permission, and participation caches through the existing application mechanisms. Publish current settings for affected live conversations so an already-open page does not retain a ticket restriction. Replayed older settings must not restore it.

#### Frontend removal

- Remove Zupass components, composables, API wrapper, the global iframe container, and the Zupass-specific auth-state reset.
- Remove `EventTicketRequirementBanner.vue` and its translations; simplify generic requirement banners to retain survey/auth behavior.
- Remove ticket requirement/selection dialogs and their control-bar actions, descriptions, and indicators.
- Remove ticket fields throughout draft schemas/types/defaults, create/edit/import forms, serializers, stores, publishing, and optimistic cache updates.
- Remove verified-ticket data, transient verification states, helpers, and participation-query key inputs from the user store/query layer.
- Remove `needsTicket`, ticket-related error branches, onboarding step handling, and SSE cache mutations.
- Remove ticket options and labels from premium-entitlement administration.
- Update all supported translations and current privacy/terms disclosures that describe an active Zupass integration.

Keep this frontend release wire-compatible with the bridge API: the obsolete fields may still be accepted and discarded at response boundaries, but cannot influence UI or participation. Switch the strict final contracts together in Phase C; deleting a required SSE key from only one side would break live updates.

**Persisted drafts:** parse old drafts through the updated schema so the obsolete field is discarded while the rest of the draft survives. Do not clear all drafts/local storage or change their participation mode. Verify both new-conversation drafts and edit drafts.

**Old routes:** replace ticket verification pages with lightweight router redirects to ordinary onboarding resolution. Cover normal, project, and embed URLs via `onboardingAliases.ts`, route guards, and route-context helpers. Use SPA replacement navigation, preserve context and valid return targets, and avoid a Back-button loop. No verification screen or provider code should remain behind these redirects.

**Already-loaded clients:** refresh cached participation state and account for tabs already sitting on the old verification screen. Backend changes cannot rewrite loaded JavaScript. At final contract cutover, require a one-time application update for stale bundles using an explicit deployment/update mechanism; ordinary conversation navigation remains SPA-based.

### Phase C — delete backend code, contracts, and dependencies

After Phase B data checks pass and clients have transitioned:

1. Delete `zupass.ts`, `zupassConfig.ts`, ticket endpoint registrations, and ticket onboarding service functions.
2. Remove ticket reads/writes from `user.ts`, `account.ts`, and `merge.ts`; preserve all remaining account deletion and merge behavior.
3. Remove ticket fields from conversation services, metadata, edit preparation/permissions, seed-opinion publication, import services, and queue payload producers/consumers.
4. Remove the `zupass` auth method. Since all remaining methods are currently classified as hard credentials, simplify soft-credential-only branches/types after checking callers. Keep regression coverage for guest-to-registered merges and expired-device handling.
5. Remove canonical shared DTOs/types for ticket verification, `EventSlug` where unused, ticket requirements, ticket edit permissions, verified tickets, the ticket rejection reason/onboarding variant, and the public `event_ticket` premium feature.
6. Delete `services/shared/src/zupass/`. Run the shared sync so deleted files disappear from generated TypeScript consumers too.
7. Remove the ticket field from the strict SSE settings contract. Before switching parsers, strip that key from persisted replayable settings payloads with a data migration, or use a narrowly scoped legacy-payload normalizer. Do not loosen every SSE schema to accept unknown keys.
8. Remove the import ticket field and regenerate Python import contracts. Drain old import messages before switching the strict contract, or normalize old messages at the consumer boundary during the transition. Account for in-flight jobs as well as the list backlog; do not silently lose jobs in this at-most-once queue.
9. Remove the listed Parcnet/PCD dependencies and update the appropriate pnpm lockfiles through the package manager. Check dependency usage before removing any other transitive crypto packages.
10. Remove the PCD ESM loader and its start-script, Dockerfile, and lint references. Verify the actual production API entrypoint without it.
11. Remove the Zupass-only browser stubs/aliases after confirming their remaining consumers; retain any independently needed compatibility configuration. Keep port 3200 unless a separate change requires otherwise.
12. Remove `ZUPASS_PUBLIC_KEY` from API configuration and deployment environment definitions where present.

Review `embeddedBrowserGuard.ts`: its documentation cites Zupass, but it also contains a separate WeChat navigation workaround. Remove provider-specific rationale and restrictions that are now unnecessary; do not delete unrelated browser fixes without checking their remaining purpose.

Historical blog posts can remain factual accounts of past events. Update present-tense product claims and active integration inventories, including the integration reference in `AGENTS_DELETION_SERVICE_PLAN.md`.

### Phase D — database structure cleanup

The product behavior above does not require a destructive purge. The repository currently prohibits ordinary hard deletion and new application-table drops; `check-soft-deletes` explicitly checks Flyway migrations for `DROP TABLE`.

**Approved implementation:** keep soft-retired ticket rows as inaccessible storage-only legacy data and permanently purge the retired entitlement rows. Restrict public entitlement queries/mappers to supported feature values, including the administrator listing. Keep legacy database enum definitions/columns until a separately generated structural cleanup, without exposing a supported ticket feature.

**Further physical cleanup, if explicitly approved:**

- Remove `conversation.requires_event_ticket`, `event_ticket`, and the now-unused `event_slug` / `ticket_provider` enum definitions from the canonical schema.
- Resolve old `event_ticket` entitlement rows before removing that label from the database `premium_feature` enum. Audit references before deleting or moving records; do not relabel them as an unrelated premium feature.
- Use a narrowly documented policy exception for this one feature-retirement migration if a table purge is approved. Do not broadly disable the soft-delete check or add a new migration to the historical allowlist as though it were pre-existing history.
- Generate structural migrations from `services/shared-backend/src/schema.ts` using `make sync-ts-backend`, then the API's `pnpm db:generate`. Follow the migration tooling's output and inspect enum replacement/DDL ordering and dependent objects.
- Run generation/application steps that are interactive or destructive only with explicit approval. Do not hand-author normal schema-removal SQL.

Keep all old Flyway migrations and Drizzle snapshots intact. Verify a fresh database can replay the migration history to the final schema, and an existing database can upgrade with its conversation data preserved.

## 4. Generation and deployment order

Edit canonical sources rather than generated copies.

1. Complete the behavior-retirement API bridge and stop old writers before the data backfill.
2. Pause new imports and let queued/in-flight imports finish under the compatible contract, or deploy the explicit boundary normalizer described above.
3. Apply data normalization, deploy the ticket-free frontend, and refresh affected realtime/cache state.
4. Remove shared/API fields and regenerate OpenAPI using the API's existing generation workflow; run `make generate` for both frontend and load-testing clients.
5. Run `make sync` to regenerate shared TypeScript copies, Python models/contracts/shared types, and API database fixtures. Review the generated diff, including deleted files.
6. Coordinate final API/frontend contract rollout and stale-client updates. Old frontend strict SSE parsing is incompatible with the final field removal; do not leave mixed versions operating indefinitely.
7. If physical schema cleanup is approved, stop old API/worker instances before applying it and start rebuilt consumers afterward. Generated whole-row models may select removed columns even in services without explicit Zupass logic.

Primary deployments: `api`, `agora`, and `import-worker`. Redeploy generated-schema consumers when their selected schema changes: the email-update, shared-analysis/math, scoring, content-translation, and relevant analysis retry workers. Redeploy `app` only if landing-page content is updated. Load-testing clients need regeneration, not a production service deployment.

Once the bridge/data backfill is active, rollback must not reintroduce ticket requirements. Keep the behavior-retirement release as the rollback floor. A physical purge cannot be undone by rolling back application code.

## 5. Verification and completion criteria

Add focused regression coverage for behavior changes rather than simply deleting old Zupass tests:

- A formerly ticket-gated guest conversation accepts ordinary guests for voting and statement submission.
- Formerly ticket-gated account/email/identity conversations still enforce their remaining verification requirements.
- Required/optional/outdated surveys and closed/locked/deleted conversations retain their ordinary behavior after ticket removal.
- Existing ticket-only users retain their device identity and can access their contributions like ordinary guests; users with email/phone/Rarimo retain registered status. Zupass-based new-device recovery ends with the integration.
- Legacy conversation drafts survive loading and republishing without sending or restoring a ticket setting.
- Existing conversations can be edited and imported without retired premium permissions, including organizations with old ticket grants.
- Normal/project/embed legacy verification URLs resolve through remaining onboarding steps, with correct return/back behavior.
- Legacy import jobs and stored/replayed settings events survive the contract transition without job loss, parse failures, or restored ticket restrictions.
- Profile and premium-admin responses validate against the new contracts even when legacy ticket/entitlement rows remain in storage.
- Account deletion, guest-to-registered merges, remaining auth methods, and expired registered-device behavior still pass their regression tests.
- Production frontend/API builds contain no Parcnet/PCD integration code, artifact packages, iframe initialization, or special PCD loader.
- Migration checks confirm the ticket requirement is absent/neutral everywhere and conversation/content/contribution identities are preserved.

Run the relevant frontend/API tests, lint and type/build checks; run import-worker lint/typecheck/tests for its contract/consumer changes and generated-schema checks for affected workers. Run `make check-soft-deletes`. For a schema purge, test both fresh migration replay and an upgrade fixture containing legacy tickets, entitlements, and conversations.

Finish with a repository search for `zupass`, `parcnet`, `@pcd`, `requiresEventTicket`, `requires_event_ticket`, `verifiedEventTickets`, `event_ticket_required`, and ticket-specific permission/route identifiers. Every remaining match should be explained by immutable migration history, factual historical content, minimal old-URL/data adapters, or the explicitly retained storage-only schema/history. There should be no active provider integration or ticket-based product decision left.

**Physical cleanup decision:** permanent deletion of retired entitlement records is approved. Permanent deletion of stored ticket/nullifier records is not included; retain them soft-retired. Database enum labels needed by retained storage can remain without exposing a supported product feature.

## 6. Post-implementation code review

- **Correctness:** old ticket URLs are router-level redirects in normal/project/embed contexts, preserving query, fragment, and Back behavior before any retired page can mount. Remaining participation requirements still run normally.
- **Type safety:** auth decisions use the credential owner's ID plus a device-status type derived from the shared DTO. Independent association flags, duplicated credential metadata, unused runtime schemas, and internal invariant throws are removed. Auth results are immutable; Python import JSON is parsed as `JsonValue` rather than `Any`.
- **Clean code:** remove the unused auth-strength/strategy scaffolding and ticket-only banner branches. Supported premium entitlements share one typed mutation predicate.
- **Security:** retired entitlement IDs cannot be edited, reactivated, or revoked through the supported-feature API. Missing/retired rows produce a controlled 404, including when a row disappears before the update completes. Expired registered DIDs remain retired; separate registered accounts cannot merge. Import validation diagnostics report error codes without including raw imported text.
- **Performance:** each phone/email/passport credential-owner lookup uses one query instead of two; the already-resolved device identity supplies association information. Current import payloads avoid legacy-copy work, and old URLs avoid an intermediate component mount.
- **Dead code:** remove the remaining ticket gates/metadata in load-testing and the event-ticket authentication claim from all landing-page locales. Retained provider identifiers belong only to storage/history, regression tests, and narrowly scoped compatibility handling.

Structural migration generation and SQL-file ordering remain deferred. The landing-page message changes also require deploying `app` with the removal release.
