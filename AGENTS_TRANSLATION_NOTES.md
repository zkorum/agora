# Translation Notes

## Ranking Item Dynamic Translation

Ranking-item translation is not fully implemented yet. This document describes the intended implementation direction.

The goal is not to bolt translation onto MaxDiff with one-off logic. The goal is to make rankable prioritization items a first-class translated content kind that can be reused by multiple comparison methods, starting with MaxDiff and later pairwise.

MaxDiff and pairwise are comparison methods. They should not own translated item content. A ranking item owns the title/body being compared; comparison methods own only how participants compare those items and how observations are scored.

## Implementation Status

This document is still the target plan. The current branch implements the storage/runtime foundation, not the full ranking-item translation product.

Implemented in the current branch:

- User-authored rich-text source writes now store frontend-provided plaintext where the frontend controls the editor, with backend sanitization and mismatch logging.
- Survey free-text answers, ranking item content, conversation content, opinion content, and project content have plaintext storage/backfill support.
- Translation tables now have storage-only plaintext columns derived from translated HTML; these fields are not exposed as frontend translation DTO fields.
- `content_translation_source_kind` has a `ranking_item` value, split into its own Flyway migration so PostgreSQL commits the enum value before later constraints/indexes use it.
- `content_translation_work` has `ranking_item_content_id`, ranking-item uniqueness, and source-kind constraints.
- `ranking_item`, `ranking_item_content`, `ranking_item_external_source`, `ranking_item_content_translation`, `polis_conversation_config`, `ranking_conversation_config`, and `conversation_import_source` exist in schema.
- Existing MaxDiff item rows are structurally copied into `ranking_item*` tables by explicit SQL backfill while preserving item slug IDs and `conversation_content_id`.
- Runtime MaxDiff item reads/writes and GitHub sync paths use `ranking_item*` tables internally while public `/maxdiff/*` naming remains temporarily.
- The scoring worker reads ranking items instead of legacy MaxDiff item tables.
- Plaintext data backfill is an explicit TypeScript script run after migrations, using application HTML-to-plaintext helpers rather than SQL HTML parsing.
- Shared TypeScript and content-translation-worker Python HTML-to-plaintext helpers strip HTML through sanitizer/parser libraries and have focused tests for newline/entity behavior.

Partially implemented in the current branch:

- Config/source tables and nullable pointers exist, but `conversation_type` still persists `polis | maxdiff`; it has not been migrated to `polis | ranking`.
- Legacy conversation columns remain as the compatibility source for some reads/writes; not every Polis/ranking/import read has moved to the new config/source tables.
- Ranking-item translation storage exists, but ranking-item translation is explicitly not wired through backend request handling or the worker yet.

Still pending:

- Migrate existing MaxDiff conversations to `conversation_type = 'ranking'` with `ranking_conversation_config.ranking_mode = 'maxdiff'` and add final subtype pointer constraints.
- Move all remaining subtype/source reads and writes off deprecated legacy `conversation` columns.
- Implement ranking-item source fetch, translation existence/freshness checks, localized content selection, and `requestContentTranslation()` support for `subject.kind = 'ranking_item'`.
- Extend the content-translation worker to claim, translate, upsert, and emit events for `ranking_item` work.
- Update MaxDiff item/results endpoints to return backend-selected original/translated ranking item fields and translation control/status metadata.
- Add frontend ranking-item translation controls, language-aware query keys, SSE/cache invalidation, and mid-round text-freezing behavior.
- Add lazy dialog translation request flow, optional eager scheduling, and later cleanup migrations for deprecated `maxdiff_item*` tables and moved legacy columns.

## Target Model

Use these conceptual layers:

```txt
conversation
  shared conversation identity, content pointer, access, lifecycle, and type

polis_conversation_config
  Polis-only analysis and labeling settings

ranking_conversation_config
  ranking-only mode, scoring pointer, and external source config

ranking_item
  stable item identity used by every ranking comparison mode

ranking_item_content
  immutable title/body version

ranking_item_content_translation
  translated immutable title/body version

maxdiff_result / maxdiff_comparison
  MaxDiff session state and best/worst observations

future pairwise_result / pairwise_comparison
  Future pairwise session state and A/B observations; do not add these in this pass
```

`conversation.conversation_type` should distinguish broad conversation families: `polis` or `ranking`. MaxDiff is the only ranking mode implemented in this pass, stored under ranking config instead of as a top-level conversation type. Future pairwise behavior should reuse the same ranking item/content model, but do not add pairwise product behavior, tables, endpoints, workers, or frontend branches in this pass.

## Current State

- Rankable prioritization items currently live under MaxDiff-specific names: `maxdiff_item` and immutable versions in `maxdiff_item_content`.
- The main conversation title/body can already use normal conversation translation.
- The actual prioritization items render raw `title` and `body` from `/maxdiff/items/fetch` and `/maxdiff/results`.
- The content translation system currently supports `project`, `conversation`, `opinion`, and `survey_question` subjects. There is no ranking-item or MaxDiff-item translation subject yet.
- Survey translation already includes both question text and all current options under the single `survey_question` subject.
- The scoring worker already separates comparison methods: it has `MaxDiffObservation`, `PairwiseObservation`, `score_maxdiff_observations()`, and `score_pairwise_observations()`.
- API/storage still couples rankable item content and ranking conversation mode to MaxDiff.

Missing pieces today:

- There is no method-neutral rankable item subject such as `ranking_item` or `prioritization_item`.
- `conversation_type` only has `polis` and `maxdiff`; target state should be `polis` and `ranking`, with `maxdiff` stored as the ranking mode for existing MaxDiff conversations.
- Polis-only config currently lives directly on `conversation`.
- Ranking-only config/state currently lives directly on `conversation` or in MaxDiff-specific tables.
- `content_translation_source_kind` has no method-neutral ranking item value.
- `content_translation_work` has no method-neutral ranking item content source column or unique work index.
- `maxdiff_item_content` has no `public_id` source version.
- `maxdiff_item_content` has no per-content source-language metadata.
- There is no ranking item content translation table.
- The content-translation worker cannot fetch, translate, store, or emit events for ranking items.
- Ranking item DTOs do not expose view-specific translated fields or backend-provided translation control metadata.
- MaxDiff query keys are not display-language-aware.
- MaxDiff cards, dialogs, personal rankings, community rankings, completed items, and canceled items render raw fields directly.

## Design Principles

- Separate rankable item content from comparison method.
- Separate shared conversation shell data from subtype-only config.
- Translation belongs to the item being ranked, not to MaxDiff or pairwise.
- Reuse generic translation machinery; do not conflate ranking items with opinions.
- Keep ranking item domain storage first-class: `ranking_item`, `ranking_item_content`, and `ranking_item_content_translation`.
- Use backend-first translation decisions. The backend decides whether translation is allowed, whether a control should exist, which original/translated content should be initially shown, and what translation status is active.
- Frontend responses should be view-specific. Return the fields each view needs, such as `title`, `bodyHtml`, and translation control/status metadata; do not force a generic content wrapper onto every frontend consumer.
- Keep comparison/ranking state keyed only by stable `itemSlugId`; translated text must never affect ranking identity.
- Preserve access to the original text because translations directly affect prioritization decisions.
- Avoid switching card text mid-selection. If a translation completes during a voting round, do not change currently visible candidate text until the next round or explicit dialog interaction.
- Per-item source-language detection metadata is required. The detected language fields may still be null when detection is unknown or unavailable, matching the existing translation model. GitHub-backed conversations can contain mixed-language issues, so the conversation source language must not be used as the item source language.
- Prefer clean, simple, type-safe design over minimal patches. Refactor shared translation helpers when it improves naming, invariants, or reuse.

## Implementation Principles

This work should optimize for the clean target design, not for avoiding refactors. Renaming tables, reshaping DTOs, moving logic, and regenerating artifacts are acceptable when they reduce long-term coupling and make future pairwise support straightforward.

- Implementation order is fixed: first refactor conversation type/config into the clean `polis`/`ranking` family model, then move subtype fields into config/source tables, then rename MaxDiff item storage into method-neutral ranking-item storage, then clean up naming boundaries across services, then implement translation on top of the new ranking-item model. Do not build translation against `maxdiff_item` and rename it later.
- Pairwise behavior is not implemented in this pass. The model should be prepared so pairwise can reuse ranking items later, but there should be no pairwise voting/session/product surface, result tables, comparison tables, workers, API endpoints, frontend branches, query invalidation, or tests unless explicitly added in a later pass.
- Prefer the clean method-neutral architecture over incremental MaxDiff-specific patches.
- Make invalid states unrepresentable with types, schemas, database constraints, and discriminated unions where practical.
- Push invariants down to the database when they are naturally expressible there; use API/schema validation for boundary rules; use TypeScript/Python types for in-process guarantees.
- Keep the frontend dumb and backend-first. The backend should decide translated/original content selection, translation eligibility, status, source/display-language policy, and control state.
- The frontend should tell the backend what it needs for the current view and language context. It should not manage backend implementation abstractions that exist only to support storage, work queues, or translation internals.
- Keep API responses view-appropriate and typesafe. Do not expose backend-only abstractions just because they exist in storage.
- Separate logic from controllers, DAO/query code, DTO shaping, and views.
- Avoid maintaining parallel MaxDiff-item and ranking-item internal service layers. Keep compatibility at endpoint/DTO boundaries only where existing public API names need to remain stable temporarily.
- Prefer pure, testable logic for non-trivial decisions such as translated/original content selection, translation eligibility, source freshness, and migration mapping.
- Unit test pure logic when it is non-trivial and could create real bugs. Do not add tests for trivial pass-through wiring.
- Avoid defensive programming when a better type/schema/database design can prevent the bad state entirely.
- When runtime handling is necessary at external boundaries or legacy data boundaries, handle errors deliberately and user-safely instead of silently swallowing them.
- When there are multiple known failure or skip cases, prefer a `reason` field with a discriminated union result shape over loose booleans or thrown internal-control-flow errors.
- Handle generic/unexpected errors smoothly with appropriate logging and stable user/API behavior.
- Avoid unsafe TypeScript escape hatches. Parse untyped data into typed values instead of validating and casting.
- Keep names domain-accurate even if that requires broad refactoring. `ranking_item` should mean a rankable item, while `maxdiff` and `pairwise` should mean comparison methods.

## Migration And Backfill Order

Plaintext columns are derived from rich HTML using application helpers, not SQL regexes. Keep that data backfill explicit and operator-controlled; do not run it automatically at API startup.

Required order for the ranking-item/plaintext migration pass:

1. Apply Flyway migrations through the enum split and schema/data-copy migrations.
2. Ensure `content_translation_source_kind = 'ranking_item'` is added in a migration before the migration that uses the value in indexes or check constraints. PostgreSQL rejects using a new enum value in the same transaction that adds it.
3. Apply the structural schema migration that creates ranking-item tables and new plaintext columns.
4. Apply the structural SQL data-copy backfill that copies legacy MaxDiff rows into `ranking_item*` tables.
5. Run the explicit TypeScript plaintext backfill script from `services/api` after all those migrations apply: `pnpm backfill:rich-text-plain-text`.

The TypeScript backfill exists because it reuses the app's HTML-to-plaintext logic for source and translation rows. Do not replace it with approximate SQL HTML parsing unless there is a concrete, reviewed reason.

## Naming Decision

Prefer `ranking_item` if the product concept is "items in a ranked/prioritized conversation". Prefer `prioritization_item` if product wording should emphasize prioritization over ranking.

This note uses `ranking_item` below for concreteness.

Do not introduce a separate `pairwise_item`, `pairwise_item_content`, or `pairwise_item_content_translation`. Pairwise should reuse ranking items and add only pairwise-specific session/comparison storage.

## Naming Boundary Refactor

Current code often uses `maxdiff` for concepts that are actually shared ranking concepts. The refactor should make naming match domain ownership across API, frontend, generated shared types, Python workers, tests, and comments.

Use `ranking` for shared prioritization concepts:

- Conversation family after the type/config refactor: `conversation_type = ranking`.
- Shared subtype config: `ranking_conversation_config`.
- Shared rankable item storage and services: `ranking_item`, `ranking_item_content`, `ranking_item_external_source`.
- Shared item lifecycle enum: `ranking_item_lifecycle_status`.
- Shared ranking scores: `ranking_score`, `ranking_score_entity`.
- Shared item DTOs and internal services that fetch, update lifecycle, sync external item metadata, or build item read DTOs.
- Shared translation subject and worker branch: `ranking_item`.

Use `maxdiff` only for Best-Worst Scaling-specific concepts:

- MaxDiff candidate-set routing and BWS algorithms.
- `maxdiff_result` and `maxdiff_comparison` session/observation tables.
- MaxDiff save/load/submit endpoint compatibility while public routes remain `/maxdiff/*`.
- MaxDiff-specific UI components and copy that describe the Best-Worst interaction.
- MaxDiff-specific scoring conversion from best/worst observations.

Use `pairwise` only for future A/B comparison-specific concepts:

- Pairwise result/session/comparison tables.
- Pairwise candidate generation.
- Pairwise observation conversion and UI copy.

Do not add pairwise tables, routes, frontend branches, worker paths, or tests in this pass. Pairwise belongs only in future-facing documentation and naming boundaries until a separate pairwise implementation pass starts.

After `ranking_item*` tables exist, rename internal MaxDiff item services before adding translation. For example, `maxdiffItem.ts` should become a ranking item service if it no longer owns MaxDiff-specific behavior. Endpoint wrappers may keep MaxDiff names temporarily, but their internals should call ranking services.

## What To Reuse

Reuse these existing concepts and utilities:

- `createZodLocalizedContent()` and existing translation metadata/control helpers where they fit the domain.
- The project-content `bodyHtml` naming pattern for frontend/API read DTOs that render rich HTML. Storage can keep physical `body` columns when they already store sanitized HTML.
- `ContentTranslationSubject` as the public subject envelope.
- `content_translation_work` queue rows, leases, priority ranks, rate limiting, and Valkey queueing.
- Backend `translationControl` policy from `conversationContent.ts`.
- `shouldTranslateContent()` and language comparison helpers.
- Existing language preference resolution from request display language and user spoken languages.
- Existing source-language metadata shape: `sourceLanguageCode`, `sourceRawLanguageCode`, `sourceLanguageProvider`, `sourceLanguageConfidence`.
- Existing language detection pipeline for user/GitHub content.
- Content-translation worker claim/process/retry lifecycle.
- SSE event envelope and per-conversation translation topic pattern.
- Frontend `ContentTranslationControl`.
- Frontend `useContentTranslationQuery()` and translation preview/controller patterns.
- Display-language-aware query-key patterns used by conversation and opinion queries.

Do not reuse these as shortcuts:

- `opinion_content_translation`.
- `opinion_content_id` as a ranking item source key.
- Opinion moderation/voting fields.
- Opinion-specific personal-author translation blocking unless product explicitly asks for it.
- Survey option bundling semantics.
- Conversation source language as item source language.
- MaxDiff-specific content table names as the long-term owner of pairwise content.

## Source Identity And Versions

Use two identifiers for ranking item translation:

- `ranking_item.slug_id`: logical item identity, URL/API subject identity, stable across edits and comparison methods.
- `ranking_item_content.public_id`: exact immutable title/body version.

The translation subject should identify the logical item:

```ts
{
    kind: "ranking_item";
    conversationSlugId: string;
    itemSlugId: string;
}
```

Translation responses and SSE events should include the content version as `sourceVersion`, using `ranking_item_content.public_id`.

This prevents stale translations from being applied after GitHub or manual content updates.

## Conversation And Comparison Model

The durable model should make this distinction explicit:

- `conversation.conversationType` identifies the broad family: `polis` or `ranking`.
- `polis_conversation_config` owns Polis-only analysis and labeling settings.
- `ranking_conversation_config` owns ranking-only settings/state, including `rankingMode`. In this pass the only valid persisted value is `maxdiff`.
- Ranking item tables are shared by all ranking comparison modes.
- MaxDiff tables store only MaxDiff-specific session state and best/worst observations.
- Future pairwise tables should store only pairwise-specific session state and A/B observations.
- `ranking_score` and `ranking_score_entity` can remain method-neutral outputs, with pipeline metadata recording which preference-learning path produced the score.

For this pass, the required refactor is the clean foundation: existing MaxDiff conversations become `conversation_type = 'ranking'` with `ranking_conversation_config.ranking_mode = 'maxdiff'`. Pairwise behavior is still deferred.

Any code path that needs MaxDiff behavior must check both the broad family and the concrete ranking mode: `conversation_type = 'ranking'` and `ranking_mode = 'maxdiff'`. Do not rely on `conversation_type = 'ranking'` alone for MaxDiff-specific routing, UI, scoring, or lifecycle behavior.

Use config pointers on `conversation` to make missing subtype config unrepresentable for normal rows. The subtype config rows should not also carry `conversation_id`; otherwise creation and migration become circular for little benefit. Insert the config row first, return its `id`, then insert or update `conversation` with the required config pointer in the same transaction.

Suggested schema direction:

```ts
export const conversationTypeEnum = pgEnum("conversation_type", [
    "polis",
    "ranking",
]);

export const rankingModeEnum = pgEnum("ranking_mode", [
    "maxdiff",
]);
```

Add `pairwise` to `ranking_mode` only in the later pairwise implementation pass. Keeping the enum maxdiff-only for now makes invalid persisted pairwise conversations unrepresentable.

The target TypeScript shape should be a discriminated union:

```ts
type ConversationModeConfig =
    | {
          conversationType: "polis";
          config: PolisConversationConfig;
      }
    | {
          conversationType: "ranking";
          config: RankingConversationConfig;
      };
```

Use a Zod discriminated union with `.strict()` branches for DTO/API boundaries so the subtype config is always present and has the correct shape for the conversation type.

## Schema Plan

Refactor `conversation` into a shared shell plus required subtype config pointers.

Target `conversation` fields:

```txt
id
slug_id
project_id
current_content_id
conversation_type                 -- polis | ranking
polis_config_id                   -- non-null only when conversation_type = polis
ranking_config_id                 -- non-null only when conversation_type = ranking
dynamic_translation_enabled
language_settings_source
is_indexed
participation_mode
is_importing
is_closed
is_edited
requires_event_ticket
created_at
updated_at
last_reacted_at
```

Move these current `conversation` fields into `polis_conversation_config`:

```txt
id
ai_labeling_enabled
analysis_data_generation
preferred_opinion_group_count
created_at
updated_at
```

Move these current `conversation` fields into `ranking_conversation_config`:

```txt
id
ranking_mode                      -- maxdiff in this pass; add pairwise later with pairwise behavior
current_ranking_score_id
external_source_config            -- typed with existing external source config schema
created_at
updated_at
```

Move current Polis import metadata out of `conversation` into `conversation_import_source`:

```txt
id
conversation_id                   -- unique
import_url
import_conversation_url
import_export_url
import_created_at
import_author
import_method                     -- url | csv
created_at
updated_at
```

`conversation.current_content_id` stays on `conversation`. The conversation title/body is shared wrapper content and should not move into subtype config.

Use DB constraints for subtype pointers:

```sql
(
  conversation_type = 'polis'
  AND polis_config_id IS NOT NULL
  AND ranking_config_id IS NULL
)
OR
(
  conversation_type = 'ranking'
  AND polis_config_id IS NULL
  AND ranking_config_id IS NOT NULL
)
```

The config tables should not have `conversation_id`. Put unique constraints on `conversation.polis_config_id` and `conversation.ranking_config_id` so a config row cannot be shared by multiple conversations. Child-to-parent lookups can join from config to conversation through these pointer columns. This avoids circular FKs and keeps the required-subtype invariant owned by `conversation`.

Rename or replace the MaxDiff-owned item tables with method-neutral ranking item tables:

- `maxdiff_item` -> `ranking_item`
- `maxdiff_item_content` -> `ranking_item_content`
- `maxdiff_item_external_source` -> `ranking_item_external_source`
- `maxdiff_lifecycle_status` -> `ranking_item_lifecycle_status`

The ranking item table keeps item lifecycle and stable identity:

```ts
export const rankingItemTable = pgTable("ranking_item", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    slugId: varchar("slug_id", { length: 8 }).notNull().unique(),
    authorId: uuid("author_id").notNull().references(() => userTable.id),
    conversationId: integer("conversation_id")
        .notNull()
        .references(() => conversationTable.id),
    currentContentId: integer("current_content_id"),
    isSeed: boolean("is_seed").notNull().default(false),
    lifecycleStatus: rankingItemLifecycleStatusEnum("lifecycle_status")
        .notNull()
        .default("active"),
    snapshotScore: real("snapshot_score"),
    snapshotRank: integer("snapshot_rank"),
    snapshotParticipantCount: integer("snapshot_participant_count"),
    createdAt: timestamp("created_at", { mode: "date", precision: 0 })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 0 })
        .defaultNow()
        .notNull(),
});
```

Add a database invariant that `ranking_item.current_content_id`, when non-null, points to a `ranking_item_content` row owned by the same `ranking_item`. Prefer a composite foreign key such as `(current_content_id, id) -> (ranking_item_content.id, ranking_item_content.ranking_item_id)` with a matching unique constraint on the content table. A plain FK to `ranking_item_content.id` is weaker and should only be used if the migration tooling cannot express the composite constraint cleanly.

Add these columns to the immutable content table:

```ts
publicId: uuid("public_id").defaultRandom().notNull().unique(),
bodyPlainText: text("body_plain_text"),
sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
sourceRawLanguageCode: varchar("source_raw_language_code", { length: 35 }),
sourceLanguageProvider: languageDetectionProviderEnum("source_language_provider"),
sourceLanguageConfidence: real("source_language_confidence"),
```

Normalize ranking item content before storage:

- `title`: plaintext only. GitHub issue titles are already plaintext. If legacy manual MaxDiff titles contain sanitized HTML from the old seed-opinion path, use a lossy HTML-to-text backfill; this is acceptable because the current UI does not intentionally create rich manual ranking titles.
- `body`: sanitized HTML for rich display and machine translation, nullable when no body exists.
- `body_plain_text`: plaintext sent alongside `body`/`bodyHtml` on normal frontend create/edit paths, following the existing opinion pattern (`opinionBody` + `opinionPlainText`). It is used for language detection, comparison against provider updates, search/export needs, and future plain-text consumers.

This mirrors the existing conversation/opinion storage pattern and avoids treating raw provider Markdown/HTML as the canonical display body.

On normal frontend writes, do not rely on stripping HTML as the primary way to get plaintext. Accept both rich HTML and plaintext from the frontend, sanitize/normalize the HTML on the backend, derive server plaintext from the sanitized HTML, and verify/log mismatches using the same policy as opinions. For provider/import paths, derive plaintext from normalized provider text or sanitized HTML as needed.

For legacy rows or schema backfills, add plaintext columns as nullable first, backfill by stripping existing sanitized HTML with the same HTML-to-text helper used elsewhere (`htmlToCountedText`-style normalization), then make the plaintext column non-null when table semantics require it. If a table or DTO is renamed from an overloaded `body` field to `bodyHtml`, treat the existing `body` value as sanitized HTML. Do not drop/recreate it as a new empty column. Use a column rename when the physical DB column changes, or backfill `body_html = body` before retiring the old name later.

Keep `ranking_item_content.conversation_content_id`. Ranking items are created under a specific conversation content/version today, and that relationship is still useful for conversation-version semantics, imports, and audit/history. Make this relationship explicit in service code. It is not the translation freshness key; `ranking_item_content.public_id` is.

Add the same source metadata consistency check used by other content tables:

```sql
((source_language_provider IS NULL AND source_raw_language_code IS NULL)
 OR
 (source_language_provider IS NOT NULL AND source_raw_language_code IS NOT NULL))
```

Add `ranking_item_content_translation`:

```ts
export const rankingItemContentTranslationTable = pgTable(
    "ranking_item_content_translation",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        rankingItemContentId: integer("ranking_item_content_id")
            .notNull()
            .references(() => rankingItemContentTable.id),
        displayLanguageCode: displayLanguageCodeEnum("display_language_code").notNull(),
        translatedTitle: text("translated_title").notNull(),
        translatedBodyHtml: text("translated_body_html"),
        sourceLanguageCode: spokenLanguageCodeEnum("source_language_code"),
        sourceRawLanguageCode: varchar("source_raw_language_code", { length: 35 }),
        sourceLanguageProvider: languageDetectionProviderEnum("source_language_provider"),
        sourceLanguageConfidence: real("source_language_confidence"),
        createdAt: timestamp("created_at", { mode: "date", precision: 0 }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: "date", precision: 0 }).defaultNow().notNull(),
    },
    (table) => [
        check(
            "ranking_item_content_translation_source_metadata_check",
            sql`((${table.sourceLanguageProvider} IS NULL AND ${table.sourceRawLanguageCode} IS NULL) OR (${table.sourceLanguageProvider} IS NOT NULL AND ${table.sourceRawLanguageCode} IS NOT NULL))`,
        ),
        unique("ranking_item_content_translation_unique").on(
            table.rankingItemContentId,
            table.displayLanguageCode,
        ),
    ],
);
```

Extend `content_translation_source_kind` with `ranking_item`.

Add this source column to `content_translation_work`:

```ts
rankingItemContentId: integer("ranking_item_content_id").references(
    () => rankingItemContentTable.id,
),
```

Add a partial unique index:

```ts
uniqueIndex("content_translation_work_ranking_item_unique")
    .on(table.rankingItemContentId, table.displayLanguageCode)
    .where(
        sqlAnd(
            sql`${table.sourceKind} = 'ranking_item'`,
            isNotNull(table.rankingItemContentId),
        ),
    );
```

Update `content_translation_work_source_check` so exactly one source column is populated for `ranking_item` work.

Service annotations should include generated model consumers:

- `ranking_item`: `api`, `scoring-worker`, `shared-analysis-worker`, and any existing ranking consumers that need it.
- `ranking_item_content`: `api`, `scoring-worker`, `shared-analysis-worker`, `content-translation-worker`, and any existing ranking consumers that need it.
- `ranking_item_content_translation`: `api`, `content-translation-worker`.

Follow normal migration rules: edit `schema.ts`, generate schema migrations, and regenerate synced/generated artifacts. Do not hand-write generated schema migrations unless the migration tool cannot express the needed change.

## Migration Plan

Because nothing is too much here, prefer a clean rename/migration rather than cementing MaxDiff-specific item ownership.

Recommended order:

1. Refactor rich-text body input and backend/domain naming before the ranking renames. New/refactored write paths should accept HTML plus plaintext from the frontend, following the opinion pattern.
2. Add or backfill plaintext body columns where needed. For existing rows, add nullable first, backfill by stripping current sanitized HTML, then make non-null when safe. If a generated schema migration represents `body` -> `bodyHtml` as drop/add, intervene before applying it. Either tell Drizzle to use a rename when appropriate, or add an explicit backfill step so existing HTML body content is preserved.
3. Add `polis_conversation_config`, `ranking_conversation_config`, and `conversation_import_source`. The subtype config tables should have primary keys only; do not add `conversation_id` to them.
4. Add `conversation.polis_config_id` and `conversation.ranking_config_id` as nullable columns without the final subtype pointer check constraint.
5. Backfill Polis conversations into `polis_conversation_config` and set `conversation.polis_config_id` to the inserted config row.
6. Backfill existing MaxDiff conversations into `ranking_conversation_config` with `ranking_mode = 'maxdiff'` and set `conversation.ranking_config_id` to the inserted config row.
7. Add unique constraints on `conversation.polis_config_id` and `conversation.ranking_config_id`.
8. Change existing MaxDiff conversation rows to `conversation_type = 'ranking'`.
9. Add and validate the final subtype pointer constraints.
10. Move API/shared/frontend/worker reads for Polis config fields to `polis_conversation_config`.
11. Move reads for ranking config fields to `ranking_conversation_config`. MaxDiff-specific consumers must check both `conversation_type = 'ranking'` and `ranking_mode = 'maxdiff'`.
12. Move import metadata reads/writes to `conversation_import_source`.
13. Keep moved legacy columns in place. In `schema.ts`, add comments on each moved/deprecated legacy column noting that it should be dropped in a later cleanup migration when explicitly requested. Do not drop columns in this pass.
14. Add method-neutral ranking item enums and tables alongside existing MaxDiff item tables.
15. Backfill `ranking_item`, `ranking_item_content`, and `ranking_item_external_source` from existing MaxDiff tables, preserving existing item slug IDs and `conversation_content_id` exactly.
16. Add `public_id`, source-language metadata, `body_plain_text`, and the current-content ownership invariant as part of the new content table.
17. Move API reads/writes to ranking item tables while preserving old `/maxdiff/*` endpoint URLs.
18. Move scoring-worker generated models and queries to ranking item tables.
19. Move shared-analysis-worker/import/generated-model consumers that currently reference MaxDiff item tables.
20. Update MaxDiff result/comparison code to treat stored slug IDs as ranking item slug IDs; the existing comparison/result table names can remain MaxDiff-specific because they describe the comparison method, not item content.
21. Refactor naming boundaries across all services: shared ranking concepts should use `ranking`; BWS-specific behavior should keep `maxdiff`.
22. Keep old MaxDiff item tables, generated models, comments, and compatibility code in place. In `schema.ts`, add comments on old MaxDiff item tables/columns noting that they should be dropped in a later cleanup migration when explicitly requested. Do not drop tables/columns unless explicitly requested in a later cleanup pass.
23. Only after the method-neutral item model, naming cleanup, and shared backend content conventions are live, add ranking-item translation schema, worker support, backend content selection, and frontend rendering.

If a zero-downtime migration is required, dual-read/dual-write temporarily. If not, use a direct migration and keep the design simple.

Do not add translation tables or work-queue support for `maxdiff_item` as an intermediate state. Translation should be implemented only for `ranking_item`.

Do not drop old MaxDiff item tables or moved conversation columns in this pass. During implementation, leave explicit `schema.ts` comments on the deprecated tables/columns saying they should be dropped in a later cleanup migration when requested.

Pairwise behavior is a separate future product migration. Do not add pairwise routing, API, frontend branching, workers, result tables, comparison tables, tests, or enum values in this translation pass.

## Shared Types Plan

Before adding ranking item content translation, refactor backend conversation/ranking content write paths and domain helpers to use explicit body naming where both forms exist:

- `title`: plaintext.
- `bodyHtml`: sanitized HTML, optional when no rich body exists.
- `bodyPlainText`: plaintext sent alongside `bodyHtml` on normal frontend create/edit paths, following `opinionBody` + `opinionPlainText`. It should be required whenever `bodyHtml` exists on new/refactored write paths.

On writes, the backend still sanitizes/normalizes `bodyHtml`, derives server plaintext from sanitized HTML, and verifies/logs frontend/server plaintext mismatches using the same policy as opinions. HTML stripping is for backend verification, provider/import normalization, and legacy backfill; normal frontend writes should send plaintext directly.

On reads, this does not require the frontend to receive or care about plaintext body when `bodyHtml` exists. The frontend should receive only the fields needed by each view and render rich content from `bodyHtml` where applicable. Plaintext body is primarily useful for backend logic, language detection, provider-change comparison, search, exports, and future plain-text consumers.

The storage layer can keep existing `body` / `body_plain_text` column names for conversation-like tables. In backend service/domain DTOs, avoid overloading `body` to sometimes mean HTML. Use explicit names when both forms are present.

Add a localized rich-content variant for ranking-item translation transport and backend policy logic. This is not a mandate to expose a generic content wrapper to every frontend view:

```ts
export const zodTitleBodyContentVariant = z
    .object({
        title: z.string(),
        // Sanitized HTML body for display and translation.
        bodyHtml: z.string().optional(),
    })
    .strict();

const zodTranslatedTitleBodyContentVariant = z
    .object({
        title: z.string(),
        // Translate/store rich body only when source bodyHtml exists.
        bodyHtml: z.string().optional(),
    })
    .strict();

export const zodLocalizedRankingItemContent = createZodLocalizedContent(
    zodTitleBodyContentVariant,
    zodTranslatedTitleBodyContentVariant,
);
```

Extend `ContentTranslationSubject` with the method-neutral subject:

```ts
{
    kind: "ranking_item";
    conversationSlugId: string;
    itemSlugId: string;
}
```

Avoid adding `pairwise_item` later. Pairwise should request translations with the same `ranking_item` subject.

Ranking item DTOs should return the fields each endpoint/view needs, selected by the backend for the request language context:

```ts
static rankingItem = z.object({
    slugId: z.string(),
    title: z.string(),
    bodyHtml: z.string().optional(),
    sourceVersion: z.string(),
    translationControl: zodRankingItemTranslationControl.nullable(),
    // existing fields...
});

static rankingResultItem = z.object({
    itemSlugId: z.string(),
    title: z.string(),
    bodyHtml: z.string().optional(),
    sourceVersion: z.string(),
    translationControl: zodRankingItemTranslationControl.nullable(),
    // existing fields...
});
```

Do not send both overloaded `body` and explicit `bodyHtml` to new frontend views. Prefer `bodyHtml` for rich rendered content. Plaintext body is backend/internal except on create/edit payloads where the frontend sends both HTML and plaintext.

## Backend Display Policy

Extend or refactor `conversationContent.ts` rather than duplicating policy.

The cleanest design is to refactor the existing policy helpers around reusable localized-content policy logic, then expose domain-specific wrappers that return view-appropriate DTO fields:

- existing conversation content fetch response shapers.
- existing survey question content response shapers.
- existing opinion content response shapers.
- `toRankingItemViewContent()` or equivalent view-specific ranking item shapers.

The backend must decide:

- Return `translationControl: null` when dynamic translation is disabled, source matches display language, content is original-only, or translation is otherwise not allowed.
- Return a populated `translationControl` when the user may request or toggle translation.
- Use `translationControl.status` for `not_requested`, `pending`, `running`, `failed`, or `completed`.
- Use `translationControl.alternateMode` to tell the frontend whether the button means translated or original.
- Use backend-selected original/translated fields plus translation status/control metadata to choose the initially visible content.

The frontend should not replicate this logic.

## API Translation Service Plan

Extend `contentTranslation.ts` with ranking item support.

Add a source type:

```ts
export interface RankingItemContentSource {
    conversationId: number;
    conversationSlugId: string;
    itemSlugId: string;
    contentId: number;
    publicId: string;
    title: string;
    bodyPlainText: string | null;
    bodyHtml: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}
```

In this source type, `bodyPlainText` is backend/internal plaintext and `bodyHtml` is sanitized HTML. Internally this may be read from `ranking_item_content.body_plain_text` and `ranking_item_content.body`; keep service naming explicit so display logic never has to guess whether `body` is HTML.

Extend work input with:

```ts
{
    conversationId: number;
    sourceKind: "ranking_item";
    rankingItemContentId: number;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}
```

Add functions with ranking-item-specific names and storage boundaries:

- `fetchRankingItemSource()`.
- `hasRankingItemTranslation()`.
- `buildLocalizedRankingItemContent()`.
- `buildRankingItemResponse()`.

Add a `requestContentTranslation()` branch for `subject.kind === "ranking_item"`.

Refactor when useful, but keep adapters domain-specific. For example, ranking item read DTOs can expose `{ title, bodyHtml }`, while backend/internal source objects can additionally carry `bodyPlainText` for detection and comparison. The DB fetch/upsert/event functions should stay separate.

## Ranking Fetch/Results Plan

Update MaxDiff endpoints as the first consumers of ranking item translated/original content selection. If endpoint names stay `/maxdiff/items/fetch` and `/maxdiff/results` temporarily, their internals should still read from ranking item tables and return view-specific fields selected for the request language context.

Resolve language preferences like opinion fetch does:

- Verify optional auth.
- Read request display language.
- Resolve user display and spoken languages.
- Check preferred content translation availability for the conversation.
- Pass request language context into ranking item services.

Update ranking item service queries to left join `ranking_item_content_translation` for the target language.

Each returned item/result should include:

- Backend-selected `title` and optional `bodyHtml`.
- Translation control/status metadata when the view can request or toggle translation.

Ranking logic should continue to use only item slug IDs and scores. Translation must not affect candidate generation, comparisons, scoring, lifecycle snapshots, or ranking identity.

## Source Language Detection Plan

Reuse existing detection logic and metadata shape.

Manual seed items:

- Detect per seed item before inserting `ranking_item_content`.

GitHub items:

- New issue creation and issue update both insert ranking item content rows.
- Detect per GitHub issue title/body content version.
- Use plain text for detection, not raw HTML.
- For Markdown bodies, convert to HTML for storage, but detect from plain text derived from title plus body text.
- Store provider titles as plaintext. Store provider bodies as sanitized HTML plus derived plaintext. If a provider ever sends title markup, strip it into plaintext before storage.

Avoid unnecessary GitHub content-version churn:

- Before inserting a new `ranking_item_content` row on GitHub sync/update, compare normalized stored plaintext title, sanitized body HTML, and derived body plaintext with normalized incoming content.
- If content did not change, update external metadata/lifecycle only and keep `currentContentId` unchanged.
- This prevents needless translation invalidation.

## Content Translation Worker Plan

After schema changes, regenerate the worker models.

Extend the worker with `ranking_item` as a supported source kind.

Add source-key handling:

```py
if row.source_kind == ContentTranslationSourceKind.ranking_item:
    if row.ranking_item_content_id is None:
        return None
    return f"ranking_item_content:{row.ranking_item_content_id}"
```

Add a source dataclass:

```py
@dataclass(frozen=True)
class RankingItemSource:
    conversation_slug_id: str
    item_slug_id: str
    content_id: int
    public_id: str
    title: str
    body: str | None
    body_html: str | None
    source_language_code: str | None
    source_raw_language_code: str | None
    source_language_provider: LanguageDetectionProvider | None
    source_language_confidence: float | None
```

In the worker source dataclass, `body` is plaintext and `body_html` is sanitized HTML.

Add worker functions:

- `_fetch_ranking_item_source()`.
- `_has_fresh_ranking_item_translation()`.
- `_translate_ranking_item_source()`.
- `_insert_ranking_item_translation_event()`.

Worker behavior:

- Claim only current ranking item content: `ranking_item.current_content_id == ranking_item_content.id`.
- Translate title as `text/plain`.
- If `body_html` exists, translate it as `text/html`.
- Sanitize translated body HTML using existing HTML sanitizer.
- Upsert by `(ranking_item_content_id, display_language_code)`.
- Emit `content_translation_updated` with `subject.kind = "ranking_item"` and `sourceVersion = ranking_item_content.public_id`.

Reuse and rename worker helpers when useful. For example, `choose_opinion_translation_source()` can become a generic user-content source decision helper if ranking items need the same Google-detection fallback behavior.

## Eager Scheduling

Do not eagerly translate every ranking item by default.

Recommended rollout:

1. Read existing translations and lazy request translation from the item dialog.
2. Eagerly schedule seed items created with a new ranking conversation, once durable ranking item translation exists.
3. Later, add capped/lower-priority eager scheduling for GitHub-created or GitHub-updated active items.

GitHub-backed conversations can contain many issues, so eager translation must be bounded and lower priority unless product explicitly requires otherwise.

## Frontend Plan

The frontend should render the view-specific fields returned by the backend. It should not reconstruct translation eligibility, source/display-language policy, initial original/translated mode, or work status locally.

Update ranking item query keys to include language context:

- `displayLanguage`.
- sorted `spokenLanguages`.
- lifecycle filter where relevant.
- comparison mode where the query result shape differs.

Update these views to render backend-selected ranking item content:

- MaxDiff voting cards.
- Expanded item dialog.
- Personal ranking.
- Community ranking.
- Completed items.
- Canceled items.

Keep ranking state slug-based:

- Candidate sets remain `itemSlugId[]`.
- MaxDiff comparisons remain slug IDs.
- Saved ranking remains slug IDs.
- Displayed text is a rendering concern only.

Add a ranking item translation request flow using the existing content-translation query transport, but do not reuse frontend logic that computes translation eligibility, initial mode, source/display-language policy, or control status. Those decisions come from backend response fields and translation control/status metadata.

The request subject is:

```ts
{
    kind: "ranking_item",
    conversationSlugId,
    itemSlugId,
}
```

Use `ContentTranslationControl` in the expanded dialog first. Do not clutter voting cards with controls.

Frontend control visibility:

- Show no button when the backend returns no translation control metadata.
- When control metadata is present, pass backend-provided status/source label into `ContentTranslationControl`.
- Let the existing control render pending/running/completed/original labels from props.
- On toggle/request, call the backend with the `ranking_item` subject and then render the backend response; do not locally decide that translation is allowed or which mode should initially display.

Avoid mid-round text changes:

- Freeze displayed candidate content for the current candidate set.
- If cache updates arrive while a user is selecting best/worst, do not change the visible candidate text until the next round or explicit dialog interaction.

## SSE And Cache Plan

Extending `ContentTranslationSubject` with `ranking_item` extends the SSE payload schema.

On `content_translation_updated` for `ranking_item`:

- Invalidate the specific `contentTranslation` query.
- Invalidate active ranking item queries for the conversation.
- Invalidate MaxDiff results queries for the conversation.
- Invalidate lifecycle item queries for completed/canceled lists.
- Do not force current voting card text to update mid-selection.

The existing event topic can remain conversation-scoped:

```txt
translation:conversation:{conversationSlugId}:target:{targetLanguageCode}
```

The payload subject distinguishes which item changed.

## Pairwise Future-Proofing Checklist

When pairwise is introduced, it should not require new translation infrastructure.

Pairwise should add:

- A comparison mode/config value.
- Pairwise candidate generation.
- Pairwise session/result state if needed.
- `pairwise_comparison` rows or equivalent observation storage.
- API endpoints or generic ranking endpoints for submitting A/B observations.
- Scoring-worker path that feeds `PairwiseObservation` into `score_pairwise_observations()`.

Pairwise should reuse:

- `ranking_item`.
- `ranking_item_content`.
- `ranking_item_content_translation`.
- `ranking_item_external_source`.
- `ranking_item` content translation subject.
- Backend translation/content-selection policy.
- Frontend translation controls.
- SSE/cache invalidation patterns.
- `ranking_score` outputs.

Do not add:

- `pairwise_item`.
- `pairwise_item_content`.
- `pairwise_item_content_translation`.
- `subject.kind = "pairwise_item"`.
- A separate pairwise translation worker branch.

## Testing Plan

Backend tests:

- `ranking_item` subject parses and round-trips.
- Same-language ranking item produces `translationControl: null`.
- Different-language ranking item produces a translation control.
- Completed translation can be initially shown when viewer does not understand source language.
- Completed translation stays original-first when viewer understands source language.
- Stale translation metadata is ignored.
- MaxDiff item fetch/results include backend-selected `title`, optional `bodyHtml`, source version, and translation control/status metadata from ranking item content.
- GitHub sync avoids new content rows when title/bodyHtml/body plaintext did not change.

Worker tests:

- Claims only current ranking item content.
- Marks stale/missing item content as missing source.
- Translates title and bodyHtml with correct MIME types.
- Sanitizes translated bodyHtml.
- Upserts translations by item content ID and display language.
- Emits `ranking_item` translation events with correct `sourceVersion`.

Frontend tests or component-testing coverage:

- No translation button when backend returns no translation control metadata.
- Dialog shows pending/running disabled state.
- Dialog requests translation with `ranking_item` subject.
- Cards/results render backend-selected translated/original ranking item fields.
- Query cache separates display languages and spoken language sets.
- Active MaxDiff candidate text does not change mid-selection.

Migration tests:

- Existing MaxDiff items migrate to ranking items with stable slug IDs.
- Existing MaxDiff comparisons continue to reference the same item slug IDs.
- Existing ranking scores remain associated with the same entity slug IDs.
- Existing GitHub external sources migrate without duplicate items.

## Suggested Milestones

1. Refactor rich-text body write paths and backend/domain naming to use `bodyHtml` plus `bodyPlainText`, following the opinion pattern.
2. Add/backfill plaintext body columns where needed, using nullable-first/backfill/non-null migrations for legacy data.
3. Refactor conversation family/config: `conversation_type = polis | ranking`, mandatory subtype config pointers, and backfilled Polis/ranking config rows.
4. Move subtype/source fields out of `conversation`: Polis analysis config, ranking score/source config, and import metadata. Leave deprecated `schema.ts` comments on old columns; do not drop them.
5. Add method-neutral ranking item storage alongside MaxDiff item storage and backfill it.
6. Refactor naming boundaries across services so shared concepts use `ranking` and BWS-specific concepts keep `maxdiff`.
7. Add source-language metadata and `public_id` on ranking item content.
8. Add `ranking_item_content_translation` and `content_translation_work` support.
9. Backend content-selection helpers and MaxDiff item/result endpoints return read-existing backend-selected ranking item fields.
10. Content-translation worker support for `ranking_item`.
11. Lazy item-dialog translation request and SSE cache invalidation.
12. Optional eager seed-item scheduling.
13. Optional capped GitHub eager scheduling.
14. Later cleanup migration drops deprecated columns/tables only when explicitly requested.
15. Later pairwise implementation reuses ranking item content and adds only pairwise observation/session storage.

Each milestone should keep code type-safe and names domain-accurate. Prefer extracting small generic helpers over copy-paste, but keep table-specific and subject-specific adapters explicit.
