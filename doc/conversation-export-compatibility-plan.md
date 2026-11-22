# Conversation exports: Polis compatibility and reproducible analysis

**Audit date:** 2026-10-28. **Status:** investigated implementation plan; application behavior is not changed by this document.

**Direction update (2026-10-29):** the [Agora-native export design](agora-native-export-format.md) supersedes this document's Polis-first implementation priority. Retain the reference-format findings and correctness issues below; treat Polis compatibility as an adapter around the native project/activity model.

## 1. Recommendation

1. Use the **currently served `polis-export/1` contract** as the interoperability reference. Both supplied reports use it today. An old conversation is not an archived version of its exporter.
2. Give the Polis and existing Sensemaker shapes explicit profiles. The current Agora `comments.csv` is deliberately Sensemaker-oriented; replacing it in place would break that integration.
3. Build every bundle from one pinned source context, with shared statement/participant mappings and explicit population/count semantics. Do this before adding a vote matrix.
4. Persist effective algorithm and software provenance **when computing**, not by consulting the export worker's current configuration later.
5. Export one selected analysis in the root Polis files; put multiple group-count variants, history, and AI results in versioned Agora extensions.
6. Implement the data-backed exports first. Importance flags, topic clusters, complete vote-event history, and exact historic presentation each have distinct data-model gaps; label those capabilities honestly.

The first compatibility fix should be import-side: today's Polis summaries are rejected by Agora's strict summary parser because of the new `vote-convention` row.

## 2. Downloaded references and evidence

Reports supplied:

- Old: <https://pol.is/report/r32beaksmhwesyum6kaur> — conversation `3phdex2kjf`.
- Recent: <https://pol.is/report/r84fwd8axfjy3mmsfjmpr> — conversation `2525kxsn2f`.

Unmodified downloads are in the gitignored workspace directory:

```text
.local/polis-export-audit/
  old/                         # seven CSVs + format.json
  recent/                      # seven CSVs + format.json
  audit.json                   # URL, HTTP status, size, SHA-256, headers, samples
  consistency.json             # cross-file checks
  download_and_inspect.py       # repeatable downloader
  check_consistency.py          # relationship checks
  check_agora_import.mts        # exercise this checkout's actual API CSV parser
  polis-reference-exports.zip   # both reference sets and audit results
```

Each file is available at:

```text
https://pol.is/api/v3/reportExport/<report-id>/<filename>
```

All 16 requests returned HTTP 200. The current report bundle links six CSVs and `format.json`; the supported `comment-clusters.csv` route supplies a seventh CSV. This is a separate topic/statement-clustering export, not participant opinion-group membership.

### 2.1 Inventory

CSV row counts below exclude headers, except summary, which has no header.

| File | Old | Recent | Meaning |
| --- | ---: | ---: | --- |
| `summary.csv` | 9 key/value rows | 9 key/value rows | Conversation metadata and summary |
| `comments.csv` | 199 | 12 | Statement text, authors, moderation, vote counts |
| `votes.csv` | 53,927 | 142 | Stored vote-history records, including repeated participant/statement pairs |
| `participant-votes.csv` | 2,256 | 30 | One participant per row; deduplicated vote matrix |
| `participant-importance.csv` | 2,256 | 30 | Importance matrix with missing-vote cells blank |
| `comment-groups.csv` | 199 | 12 | Per-opinion-group statement tallies |
| `comment-clusters.csv` | 199 | 12 | Topic clustering layers, when available |
| `format.json` | same declaration | same declaration | Vote convention and field roles |

Both reports have two participant opinion groups. Old has 1,334 grouped participants; recent has 15. The old statement/topic export has layer 0 assignments; recent has no topic layers, only base columns. All recorded importance flags in both datasets are zero, so these references do **not** test positive importance behavior.

There is no `stats.csv` or stats-history download in the inspected current report-export route. The older knowledge-base page describes a historical Stats History file, not this live export set. It also contains an obsolete export-disabled notice. Do not treat that page as the current contract.

### 2.2 Exact base schemas

```text
summary.csv                           # no header; key,value rows
  topic
  url
  voters
  voters-in-conv
  commenters
  comments
  groups
  conversation-description
  vote-convention

comments.csv
  timestamp,datetime,comment-id,author-id,agrees,disagrees,
  moderated,importance,comment-body

votes.csv
  timestamp,datetime,comment-id,voter-id,vote,important

participant-votes.csv
  participant,group-id,n-comments,n-votes,n-agree,n-disagree,
  <one column per comment-id>

participant-importance.csv
  participant,group-id,n-comments,n-votes,n-important,
  <one column per comment-id>

comment-groups.csv
  comment-id,comment,total-votes,total-agrees,total-disagrees,total-passes,
  group-a-votes,group-a-agrees,group-a-disagrees,group-a-passes,
  ...same four columns for every group...

comment-clusters.csv
  comment-id,moderated,active,
  <all layerN-cluster-id columns>,
  <all layerN-distance columns>,
  <all layerN-confidence columns>,comment-body
```

`comment-clusters.csv` with no layers is simply `comment-id,moderated,active,comment-body`. Topic outliers use cluster ID `-1`; missing assignments use blank. Neither means participant group `-1`.

Canonical exported votes are **agree `1`, disagree `-1`, pass `0`**. A blank matrix cell means **no vote**, not pass. Importance is a separate `0`/`1` flag, not a vote. `timestamp` is Unix seconds; the observed datetime is Node's UTC date-string representation, e.g. `Tue May 12 2026 09:34:32 GMT+0000 (Coordinated Universal Time)`.

The summary's final row is:

```csv
vote-convention,agree=+1;disagree=-1;pass=0;format=polis-export/1
```

Do not add preamble/comment rows to the other CSVs. Their declaration lives in the summary and JSON sidecar.

### 2.3 Cross-file consistency findings

**Consistent:** every matrix comment column, group-export statement, and topic-export statement joins to `comments.csv` in both samples. Every vote author/statement joins to the participant/comment sets. Participant row counters match the matrix cells. Importance-presence masks match vote-presence masks.

**Important semantic differences:**

- Old: 53,927 event rows collapse to 53,099 unique participant/statement pairs; 654 pairs have multiple records. Recent: 142 rows collapse to 140 pairs; two pairs have multiple records.
- `comments.csv` counts **all stored history rows**, not just the matrix's final state. Recent statement `1` has 14 agrees in comments/history, but 13 agrees in the matrix. Old has 173 agree/disagree field comparisons that differ from the matrix.
- `comment-groups.csv` totals are the **sum over grouped participants only**. They are not the all-participant counts in `comments.csv`. Recent statement `0` has 16 agrees in `comments.csv`, versus 9 in grouped totals.
- Recent grouped tallies match its grouped matrix exactly. Old has 12 per-group tally field differences, also reflected in 12 total fields, against its matrix reconstruction.
- Old has seven matrix cells that differ from reconstruction using exported event timestamps. The upstream matrix query orders by participant and statement, with **no timestamp/unique-ID ordering inside repeated pairs**. Exported timestamps also lose subsecond precision. Do not claim that this historical matrix deterministically selects the latest event.

These are reasons to document populations, time boundaries, and reductions, rather than copy every upstream counting quirk. Agora should use current/effective votes for state counts and expose event counts separately. It can match Polis columns and vote signs without advertising identical historical aggregation semantics.

### 2.4 Upstream sources

- Current declaration: <https://github.com/compdemocracy/polis/blob/edge/docs/export-format.md>.
- Inspected upstream source revision: `a9da77522322a3fe7bb45eadc550ccd6e0e9f47b`.
- [Export route](https://github.com/compdemocracy/polis/blob/a9da77522322a3fe7bb45eadc550ccd6e0e9f47b/server/src/routes/export.ts) enumerates the seven CSV routes and sidecar.
- [CSV producers](https://github.com/compdemocracy/polis/blob/a9da77522322a3fe7bb45eadc550ccd6e0e9f47b/server/src/report.ts) explain history-count versus matrix-count behavior and grouped-only totals.
- [Report UI](https://github.com/compdemocracy/polis/blob/a9da77522322a3fe7bb45eadc550ccd6e0e9f47b/client-report/src/components/exportReport/ExportReport.jsx).
- [Older knowledge-base description](https://compdemocracy.org/export/) is useful background, not the live schema authority.

The source revision was cross-checked against observed bytes; it is not a claim that the public deployment exposes its exact build revision. The old/recent reports are different conversations, not versions of the same dataset.

## 3. Current Agora implementation review

### 3.1 What actually ships in this checkout

`services/api/src/service/conversationExport/generators/factory.ts` registers:

- `comments.csv`.
- `survey_questions.csv`.
- `survey_question_options.csv`.
- `survey_participant_responses.csv` — owner access.
- `survey_public_aggregates.csv`.
- `survey_full_aggregates.csv` — owner access.

The shared/DB enums also contain `votes`, `participants`, `summary`, and `stats`; those enum entries do **not** have registered generators. This checkout's factory does not generate `votes.csv`.

Generation/request/artifact tables, bounded request history, retry processing, S3 artifacts, per-audience ZIPs, expiry, and status-time access checks already exist. Reuse them. Prioritization/ranking exports are explicitly unsupported today; do not cast MaxDiff comparisons into Polis votes.

### 3.2 Current comments are valid for their intended profile, not strict Polis

Current header:

```text
timestamp,datetime,comment-id,author-id,agrees,disagrees,passes,votes,moderated,comment_text
```

Differences from current Polis:

- `comment_text` instead of `comment-body`.
- Extra `passes` and `votes`; missing `importance`.
- Different, though readable, UTC datetime format.
- Hidden statements omitted; moved statements kept with `moderated=-1`.
- Statement IDs assigned after filtering by row index. Ordering is only `createdAt`, without a unique-ID tiebreaker.
- Participant IDs allocated lazily in generator traversal order, shared with survey files within one pass.
- Surviving seed statements from deleted administrators deliberately have blank author IDs.

The existing tests explicitly assert the Sensemaker header and the absence of `comment-body`. Preserve that profile explicitly. Give strict Polis import/export its own contract; do not add an ambiguous second text column and call it compatibility.

**Consistency gaps in the current query path:**

1. `comments.ts` independently selects the latest activated view, then reads current statement text/moderation, then snapshot counts. Statements absent from that analysis are given zero counts. A text edit can therefore be paired with votes on an older content version.
2. Survey generators each load their own current config/responses and independently selected group memberships. They can disagree with comments, with one another, or with a newly added matrix if analysis/settings change mid-generation.
3. No export-generation column pins a view/analysis snapshot, input digest, format version, or effective group candidate.
4. Formula escaping exists in `csv.ts` but is opt-in. Comments do not enable it; several other user-controlled text fields also need a shared policy.
5. `buildCsvBuffer` accumulates all rows/chunks; `core.ts` caches all generated CSV buffers and builds a full in-memory JSZip archive. That is unsuitable for large vote matrices.
6. A partial CSV retry rebuilds all CSVs together, which protects traversal-based mappings within the retry, but it can read a new underlying dataset. Source pinning and persisted mapping identity are required for reproducible retries.

### 3.3 Confirmed import regression

The actual `parseSummaryCsv` rejects **both downloaded summaries**, with `unrecognized_keys: ["vote-convention"]`. Downloaded comments and votes are accepted, including all 53,927 old vote rows.

- API: `services/api/src/service/polisCsvParser.ts`, strict summary Zod object has no declaration field.
- Worker: `services/import-worker/src/import_worker/import_models.py`, `SummaryCsvRow` also forbids extras and has no declaration field. This second rejection follows directly from its schema; the API parser was exercised against both datasets.
- Agora's current Sensemaker comments would also fail its strict Polis comment schema (`comment_text` versus required `comment-body`, extra columns).

Plan a shared declaration grammar and matching TS/Python boundary parsing. Accept the optional legacy-absent declaration; when present, parse and check signs/format rather than ignore it. Reject contradictions with stable error codes. Do not merely relax every strict schema or copy the external documentation's ambiguous grammar wording. Validate `format.json` too when supplied, and reject conflicts between sidecars/declarations.

Also remove export-only incompatibilities such as the API summary topic limit of 140 versus the application's canonical title limit, and explicitly handle blank seed author IDs in Agora-aware imports without coercing blank to participant `0`.

## 4. Compatibility profiles and file-by-file plan

Use explicit profile/version selection, persisted with the export request and generation:

- **Polis-compatible:** exact base filenames/columns, declared vote sign, one resolved analysis candidate, and documented extensions/deviations.
- **Sensemaker:** existing `comment_text` shape, with a compatibility-tested migration path for current consumers.
- **Agora analysis:** normalized additional tables plus provenance and optional bounded history. It can accompany the Polis files in the same ZIP.

Profile is a typed choice, not client-supplied arbitrary filenames or S3 paths. Keep existing requests backward-compatible during rollout. A format profile does not confer additional data access.

| File | Source / implementation | Conditions and semantics |
| --- | --- | --- |
| `summary.csv` | Pinned conversation metadata, export statement catalog, input population, selected candidate | No header. Voters = participants with effective votes; voters-in-conv = members of the resolved candidate; groups = its actual group count. Declare unavailable analysis, not fabricated grouping. |
| `comments.csv` | Frozen statement versions + all-population effective-vote tallies | Exact Polis header in that profile. Compute state counts from the same input as the matrix; document divergence from Polis history-count behavior. |
| `votes.csv` | Sparse, effective votes for the pinned input | Start with latest-state rows, explicitly `vote_record_semantics=effective_state`. A replayable event-history export is a later capability; never label this an event log. Preserve real cast/persist timestamps if known; do not invent them from snapshot time. |
| `participant-votes.csv` | Same sparse input, pinned candidate memberships | Numeric statement columns in numeric order. Blank membership for ungrouped participants; blank vote cell for no vote. Row counters recomputed from emitted cells. Include active voters; document author-only participants separately. |
| `comment-groups.csv` | Normalized `opinion_group_opinion_stats` for one candidate | Totals are grouped-only. Expose all-participant and ungrouped counts in Agora's long-form stats so users can reconcile them. |
| `participant-importance.csv` | No native importance source exists today | Track as `not_collected`; do not silently equate unknown with a measured false. See importance compatibility rule below. |
| `comment-clusters.csv` | No persisted topic-clustering layer found in the inspected analysis schema | Can emit the base, no-layer shape, as recent Polis does. Declare topic clustering unavailable. Add layer columns only from a separately versioned topic-analysis result. Never populate them from opinion groups. |
| `format.json` | Versioned code-owned contract | Polis sign declaration plus the field-role descriptions; Agora-specific capabilities and semantics belong in a separate manifest. |
| Existing survey files | One frozen survey context, same candidate and participant mappings | Retain restricted/full versus public/suppressed distinctions. Pin response/config revisions; do not rebuild public aggregates from a different current population. |

**Importance compatibility rule:** strict latest-Polis columns require an explicit product choice because Agora has not collected this signal. Recommended first release: mark this capability unsupported in the manifest and omit the importance matrix; retain a documented legacy-column variant for comments/votes if needed. If byte-shape compatibility requires zero-filled importance columns/matrix, make that a separately identified compatibility mode with `importance_status=not_collected` and `zero_fill_is_synthetic=true`. Those zeros must never enter analytics as measured user choices. Full semantic support requires recording the signal, not just adding a generator.

**Unknown timestamps:** current analysis vote payloads have no timestamps. Extend the frozen export input with the source vote-content timestamp and its meaning before shipping timestamp-bearing votes. Old snapshots without this information get an explicit limitation; do not fill a required timestamp with zero or `computed_at` and claim exact compatibility.

## 5. One coherent export input

### 5.1 Selection boundary

Resolve `latest` **once**, when preparing the source context, using the latest **activated** view visible to that requester. Pending or merely newest-created analysis must not displace the published view. Resolve automatic candidate selection, administrator preference, explicit requested group count, entitlement, and supported view rules through the existing analysis-selection service.

Persist at least:

- Export schema/profile version and canonical request options hash.
- Pinned view, analysis snapshot/result, input snapshot, data generation, requested/resolved candidate, source digest.
- Chosen conversation content version, survey config/revision, and frozen survey response source.
- Identity-mapping version/scope, text-escaping policy, authorization audience, and redaction revision.
- Preparation time and actual source/computation timestamps, separately.

If no usable analysis exists, export available state with explicit `analysis_unavailable`, or wait for the required analysis according to the selected profile. Never silently select a different historic successful run and present it as current.

### 5.2 Materialization and isolation

Use immutable analysis input as the canonical vote matrix. Prepare export-specific statement/participant catalogs and required metadata in one consistent database read boundary. For mutable survey/history data, materialize bounded typed rows to a private generation-scoped source under a consistent snapshot. End the transaction before formatting, S3 work, or ZIP compression.

A wall-clock cutoff alone is insufficient: current pointers can change and writes can commit out of order. A sequence high-water mark alone is also not a commit-consistent snapshot. Use an actual consistent read or existing immutable snapshot IDs. Large source materializations need transaction duration/byte limits and cancellation; partition independent work only after freezing its source.

For statement catalogs, include eligible zero-vote statements with explicit zero counts when they genuinely existed at the chosen boundary. The present analysis input is built from vote rows and does not enumerate zero-vote statements. Avoid mixing newly created current statements into an older analysis catalog without declaring that separate scope.

For retries, reuse the exact prepared source and mappings. Store source rows/objects durably enough for recovery. If source invalidation makes exact reuse impossible, invalidate the generation instead of silently changing its identity.

### 5.3 Identity and content-version mappings

- Assign export-local statement IDs once to a deterministic catalog, with stable tiebreakers. Every profile/variant in the bundle uses that catalog.
- Assign participant IDs over the required union of voters, eligible authors, and permitted survey respondents. Persist the mapping privately; do not expose global UUIDs, internal serial IDs, or a reversible identity map.
- Keep participant pseudonyms conversation/export scoped. Reusing them across a requested history bundle is explicit; do not accidentally make people linkable across unrelated conversations.
- Preserve the current deleted-seed-author behavior; deleted identities must not reappear through a mapping or history file.
- Within a candidate, `group-id`, `group-a-*`, and Agora's normalized group keys must have one explicit mapping. Group `a` is not a stable global identity.
- Freeze statement content revisions. Votes tied to different statement-content versions must be excluded or exported as explicitly versioned history, not combined under one current text.

**Existing historic-input limitation:** `input_snapshot.py` stores local numeric participant/opinion indices and votes in the compressed canonical payload, but no full participant-index-to-identity catalog. Opinion indices are persisted in `analysis_snapshot_opinion`; group memberships preserve identities only for grouped participants. A full historical join for ungrouped participants, authors, survey answers, and later redactions cannot be reconstructed reliably from that payload alone. Add a private normalized mapping at snapshot creation; do not recreate it later by sorting today's users. Old snapshots can support a de-identified matrix, but not an invented exact historic identity join.

Deletion/hiding/withdrawal eligibility overrides historic replay. Apply the present permitted-data policy at preparation and publication, and record when the export is a redacted derivative of the original run. Recompute exported state tallies on the emitted population, or mark historic aggregate metrics as belonging to the original input. Never mix those silently.

## 6. Performance, durability, and security

### 6.1 Streaming architecture

Extend the existing durable generation/artifact design instead of placing work in HTTP handlers:

```text
POST request -> durable generation -> leased worker
  -> pinned/materialized source + mappings
  -> bounded ordered row iteration
  -> CSV/JSON encoder -> checksumming stream -> S3 multipart upload
  -> streaming ZIP from completed artifact streams -> S3
  -> publish completed manifest/request
```

- Replace buffer-returning `CsvGenerator` with a typed artifact writer/async byte source that honors backpressure and cancellation.
- Use keyset pagination or supported typed cursors over frozen sources; no OFFSET scans or per-participant SQL queries. Add covering indexes only after query-plan review.
- Traverse sparse votes in `(participant_export_id, statement_export_id)` order. Assemble one dense row at a time. Dense output is inherently **O(participants × statements)** bytes/work; memory need not be.
- Reuse the same sparse input across the root files and variants. Do not rerun red-dwarf during export, or rebuild a dense matrix independently for every group count.
- Stream existing S3 objects into ZIP entries; do not download them all into `csvByArtifactId` buffers. Use maintained ZIP64-capable tooling where the supported size ceiling requires it.
- Estimate matrix cells/bytes before admitting optional wide exports. Bound concurrent jobs, total in-flight bytes, execution time, multipart buffers, and temporary-source storage. Large conversations still get sparse votes and long-form group files; the UI explains unavailable/oversized dense files.
- Prepare the survey context once. Share immutable subcontexts rather than re-querying every survey generator.
- Revisit `integer` file sizes/counts in the artifact schema: Postgres int4 cannot represent artifacts over 2 GiB. Use appropriate DB types and a deliberate wire representation rather than unsafe numeric casts.

### 6.2 Worker correctness

- Preserve Postgres as job source of truth; add/strengthen expiring leases, heartbeats, and an attempt token. Fence **artifact updates and publication**, not only final generation status.
- Upload under generation/attempt-specific object keys. A stale worker must not overwrite a successful retry's object. Publish completed object references atomically only while the lease and source/redaction revision are still current.
- Abort multipart uploads on cancellation/failure; configure abandoned-upload cleanup. Publish no partial object as a completed file.
- Retry a failed artifact from the same frozen source. A bundle-only retry can reuse checksummed completed objects.
- Coalesce requests only when source/profile/options/locale/history range/audience/redaction revision agree. A public request must not receive an owner bundle through a shared cache key.
- Move the worker out of the API process when export CPU/memory starts competing with requests; its durable schema should make that operational split straightforward.
- Keep POST-only authenticated application endpoints. Existing S3 signed downloads do not require new public application GET routes.

### 6.3 Access and disclosure

Recommended default: retain current conversation-accessible statement/aggregate exports; make newly introduced individual vote matrices/history owner-only initially. If product intends Polis-style conversation-accessible individual voting, configure it explicitly and describe that audience in the UI. Numeric pseudonyms do not make voting patterns unlinkable.

- Enforce conversation access and artifact audience when requesting, preparing, publishing, and issuing download URLs. Respect existing entitlements for alternate analyses.
- Build per-audience manifests and ZIPs. Do not include private survey files, input mappings, prompts with restricted text, or owner artifacts in public bundles, including nested paths.
- Expire signed URLs no later than the export; permission revocation prevents new URLs. Already issued bearer URLs require short TTLs or an authenticated download layer if immediate revocation is a requirement.
- Invalidate dependent artifacts on applicable deletion, hiding, account deletion, and survey withdrawal. Apply this to histories, AI text, manifests, and all audience bundles, not only the base CSV. Follow the repository's soft-delete/purge lifecycle.
- Reuse survey suppression policies and check alternate-group/history combinations for differencing. Publishing several individually suppressed tables can reveal small counts through their differences.
- Apply formula protection to every user-controlled string field, including statement text, topic/description, survey metadata, labels, and AI text. Preserve machine-original strings in an authorized JSON representation when needed; declare the reversible escaping convention. Never escape numeric `-1` vote values as text.
- Use CSV-library quoting for commas/newlines/quotes and explicit UTF-8. HTML-to-text normalization and spreadsheet escaping are separate operations. Keep any exact-text machine profile and spreadsheet-safe derivative clearly identified.
- Use fixed artifact paths and sanitized Content-Disposition filenames. Do not render downloaded HTML/AI output as trusted markup.
- Logs record registered structured counts/timings/statuses, never vote matrices, participant identity mappings, text, URLs, or provider payloads.

## 7. Type-safe contracts and integration changes

Create a canonical export registry that distinguishes **implemented**, **unsupported**, and **optional** capabilities. An enum value alone must not advertise a working file.

Suggested contract shape:

- Literal artifact kinds/profiles with exact code-owned filenames, MIME types, source requirements, audience, and schema versions.
- Explicit CSV row types inferred from Zod boundary schemas; column tuples checked against those types.
- Discriminated source context: e.g. `analysis_available` includes the concrete input/result/candidate, while `analysis_unavailable` has a reason. Profile variants carry their necessary parameters together.
- Separate available-file descriptors from omission descriptors (`not_collected`, `analysis_unavailable`, `not_authorized`, `size_limit`, `historical_source_unavailable`). Do not report a successful empty computation for missing data.
- Typed normalized internal rows; runtime parsing at compressed/JSON/S3/external boundaries. Unknown algorithm-output blobs never become an unchecked `as` cast.
- Dynamic matrix columns come from the typed statement catalog, not arbitrary JSON object keys. Keep missing cells distinct from numeric zero.
- Versioned strict manifest schemas and a documented extension policy. Do not claim the entire Agora package is the upstream Polis format just because its vote convention matches.

Implementation touchpoints:

1. `services/shared/src/types/zod.ts` and `dto.ts`: profile/options, file metadata, omissions, provenance types, and requests/status responses.
2. `services/shared-backend/src/schema.ts`: generation source pins, checksums, artifact dimensions/versions, private source catalogs, execution provenance. Ensure unique artifact identity includes variant/snapshot/profile dimensions; current uniqueness by `(generation,fileType,audience)` cannot represent multiple same-kind candidate/history files.
3. Run `make sync-ts-backend`, generate normal migrations through the API `pnpm db:generate`, and generate Python artifacts through the supported sync target. Never manually edit synchronized copies/generated SQL for normal schema changes.
4. `services/api/src/service/conversationExport/`: source preparation, registry/generators, streaming S3/ZIP orchestration, retry fencing, audience-aware manifests.
5. `services/api/src/service/polisCsvParser.ts` and import-worker CSV models: declared/legacy format parsing, cross-file IDs, vote signs, content semantics. Export/import round-trip must not duplicate or invert votes.
6. `services/shared-analysis-worker/` and `services/math-updater/`: capture actual computation/AI provenance at source, including retries handled by dedicated description workers.
7. Regenerate OpenAPI/client with `make generate`; inspect generated unions for lost invariants and parse rich DTOs at frontend boundaries.
8. `services/agora/src/components/conversation/export/` and export pages: profile, selected snapshot/candidate, available variants, omission reasons, source freshness, dataset scope, and download metadata. Key rows by artifact identity/path, not only `fileType` (the current component does the latter).

## 8. Analysis extensions: different numbers of groups

Use the existing `analysis_snapshot_result -> opinion_group_candidate -> opinion_group` structure. A candidate is identified by the **snapshot/result, immutable analysis specification, and requested group count**, not group count alone.

Proposed layout:

```text
comments.csv                         # root Polis-compatible selected view
votes.csv
participant-votes.csv
comment-groups.csv
summary.csv
format.json
manifest.json
survey_*.csv                         # existing permitted files
agora/
  analyses.csv
  groups.csv
  group-memberships.csv              # restricted individual data
  group-opinion-stats.csv
  representative-opinions.csv
  opinion-metrics.csv
  descriptions.csv
  description-evidence.csv
  analysis-runs/<run-ref>.json
  ai-runs/<ai-run-ref>.json
  history.csv                        # optional bounded selection
variants/<snapshot-ref>/<spec-ref>/k-<k>/
  participant-votes.csv               # optional convenience, expensive
  comment-groups.csv
```

Normalized CSVs include snapshot/run/candidate refs explicitly. This avoids duplicating text and votes across five wide matrices.

`analyses.csv` should record requested and actual group counts, outcome/reason, hidden reason, availability/entitlement, silhouette, coefficient of variation, balance/selection scores, and separate flags for system-recommended, administrator-preferred, and export-resolved candidate. A failed/hidden/insufficient-data candidate must not masquerade as an empty successful analysis.

`groups.csv` contains candidate-local group key, public export-local lineage ref if available, size, and description refs. Export lineage as best-effort continuity **within its existing variant scope**; do not assert that group `a` in `k=2` is group `a` in `k=3`, or that an algorithm change preserves group identity.

`group-opinion-stats.csv` should be long-form with grouped and explicitly ungrouped population accounting. `opinion-metrics.csv` can expose already persisted majority probabilities, group-aware consensus, divisiveness, ranks, and routing priority, each attached to its correct snapshot/candidate scope. Numeric algorithm metrics are separate from AI interpretation.

## 9. Reproducibility provenance

### 9.1 What exists and what is missing

Already persisted: compressed canonical input, input hash, data generation, analysis snapshots/results, spec key/version/reducer/clusterer/selection policy and thresholds, per-count variants, assessments, group memberships, representative statements, candidate raw output, activated views, checkpoint reasons, and survey aggregate snapshots.

Current checked-in shared analysis/math red-dwarf pin:

```text
repository: https://github.com/nicobao/red-dwarf.git
commit:     55dd641b9b486eaefb4daedaf92b354716ae8ca8
entrypoint: reddwarf.implementations.polis.run_pipeline
```

The import-worker independently pins red-dwarf at `6563d9c91ddc4a284adc65620ce033020733d28b` for loading/import. Record provenance by executed service/task; a single repository-wide red-dwarf version field would be misleading.

The wrapper currently passes thresholds/counts and `random_state=0`. The pinned library supplies implicit defaults including PCA, KMeans, empty reducer/clusterer kwargs, `pick_max=5`, and `confidence=0.9`. Agora's worker selection score is currently `0.65 * normalized_silhouette + 0.35 * balance`, with additional candidate-hiding and selection rules. The DB config loader does not pass reducer/clusterer/selection-policy fields through its compute record. Therefore exporting only the DB labels would not prove what ran.

`analysis_engine_epoch` helps retry invalidation; it is not a red-dwarf version or immutable provenance record. Current config/package pins cannot reliably identify old runs after deployments. The local sibling red-dwarf checkout is on a different commit; it must not be mistaken for the deployed/pinned dependency.

### 9.2 Persist an immutable execution record

Create a typed, versioned execution record linked to each analysis result, captured from the executable environment and resolved arguments. Store:

- Analysis family, pipeline/entrypoint, algorithm-spec key/version, and execution-schema version.
- Red-dwarf repository, full commit, package version if present, and build/wheel digest where available.
- Agora computation/adapter/selection-policy revisions and deployed image digest.
- Exact resolved reducer, clusterer, kwargs, dimensionality, initialization/warm-start behavior, seeds, group-count request, thresholds, representative/consensus parameters, preprocessing/filtering rules, and numerical settings. Include implicit library defaults explicitly; do not export a later library's defaults retroactively.
- NumPy/pandas/scikit-learn/SciPy/Python versions and relevant numerical backend/thread/runtime information; lockfile/environment digest plus an obtainable lockfile/environment artifact.
- Canonical input schema and digest, identity/catalog mapping version, deterministic ordering, eligible populations, moderation/content filters, and content revision refs.
- Computation timestamps, outcome, candidate references, selection algorithm/version/weights, preferred/resolved group-count policy, and result-artifact checksums.

Use DB foreign keys/uniqueness for run links and immutable-spec identity. A structured parameter document is acceptable only with a versioned schema and runtime parsing; do not substitute unvalidated debug JSON for canonical provenance.

Record the **executed** implementation: either thread typed spec choices through the worker or define the current fixed wrapper as its own immutable spec. A metadata label must never claim an algorithm option that the worker ignored.

### 9.3 Three distinct reproducibility claims

1. **Artifact integrity:** SHA-256, file schema, row counts, byte counts, and source/run references let someone verify the downloaded export.
2. **Computational replay:** the precise emitted input and preserved execution recipe let someone rerun the calculation. Bitwise equality additionally requires the relevant numerical environment; compare label-permutation-invariant groups and numeric tolerances when exact bytes are not guaranteed.
3. **Historical replay:** original input/metadata/presentation must still be retained and permitted. If deleted or redacted, expose `redacted`/`unavailable`, original-run reference where permitted, and the new emitted-input digest. Do not promise that a redacted dataset reproduces the original grouping.

Public metadata must not expose hashes of restricted raw inputs as if hashes were harmless identifiers. Use opaque references where necessary; only publish original-input digests in the matching authorized package. Keep an ordinary checksum of the bytes actually exported.

Export builds a **new export manifest** from persisted execution facts. It does not overwrite old run metadata or copy the current red-dwarf pin onto historic results. Legacy records get `provenance_unknown` unless trustworthy recorded build evidence allows a clearly identified backfill.

## 10. History

Distinguish three histories:

1. **Export/download history:** current request lifecycle; already implemented. Not analysis history.
2. **Analysis/view history:** persisted snapshots, candidate assessments, activated settings/group-count preferences, and checkpoint reasons. Use this first.
3. **Individual vote-event history:** incomplete today. `vote_content` retains some changes, but cancellation updates the current pointer without inserting a cancellation event; the Valkey buffer coalesces changes, and content timestamps are persistence-time defaults. It is not a complete accepted-action log.

Start with bounded, paginated checkpoint/history selection: a time range and maximum snapshots/bytes, plus explicit requested versus resolved references. Export counts/analysis summaries by default; request full individual matrices separately. Capture source availability and retention gaps rather than regenerating historical results using current code.

The current view stores preferences/counts, but description text is reached through mutable lineage pointers. It cannot establish exactly which label/translation was displayed at every past instant. Capture immutable description/version references at a presentation boundary; identify reconstructed historic descriptions as reconstructed.

If true vote-event replay is required, introduce a separate append-only accepted-action event model with stable idempotency keys/order, original acceptance time, cast/change/cancel actions, and statement-content revision, persisted durably with the accepted state transition. Define whether the product promises every accepted action or every durable coalesced transition. Cancellation is not `pass`. A restricted Agora event file can represent cancel explicitly; the Polis `vote` column cannot. Do not claim that replaying an unfiltered legacy `votes.csv` can express all of these transitions.

Stats history is a separate optional extension. Derive it from retained checkpoints/events with exact definitions. If visitor/view data was never collected, leave that metric unavailable; do not synthesize `n-visitors` or expose a fake legacy stats file.

## 11. AI output and provenance

Export user-visible labels, summaries, translations, and administrator overrides as **separate interpretive artifacts**. AI output did not compute the vote clustering.

Suggested `descriptions.csv` fields:

```text
snapshot-ref,candidate-ref,group-key,lineage-ref,description-ref,
locale,source-kind,label,summary,generated-at,ai-run-ref,
source-description-ref,is-selected,status
```

`source-kind` distinguishes AI generation, machine translation, administrator-authored override, and known fallback. Include pending/failed/not-enabled status separately from successful content. Freeze exactly which description/translation IDs and locale fallback were used for this export.

Persist AI execution provenance at the successful generation/translation boundary:

- Actual provider and requested/resolved model revision, with unknown resolution recorded honestly.
- Prompt template/version and hash; authorized original template where available.
- Exact canonical request/input hash and output-schema version; reference the conversation content and representative statement revisions/stances in `description-evidence.csv`.
- Temperature, top-p, token limits, supported seed, safety-relevant output transformations, and correction/translation parent relationships.
- Creation time, actual output digest, output-validation status, locale, source candidate and lineage.
- Whether a prior lineage description was reused: retain its original generating candidate/input, do not relabel it as freshly generated for the latest snapshot.

The current description/translation tables store text, locale, and creation time, but not this model/prompt/request provenance. A current environment variable is insufficient for old descriptions. Provider fallback must record the provider that actually succeeded, not just the configured first choice.

For AI, promise **traceability and preservation of the observed result**. Even with temperature zero and identical inputs, hosted models need not regenerate identical text. Do not promise exact deterministic LLM replay. Export accepted output and permitted request evidence, not credentials, internal provider diagnostics, or hidden reasoning.

## 12. Delivery sequence and acceptance criteria

### Phase A — contract and immediate compatibility

- Adopt sanitized minimal fixtures derived from these observed contracts; preserve the old/recent differences and add a positive-importance synthetic case.
- Fix optional `vote-convention` parsing in API and import-worker; check legacy absent declarations, sign mismatch, malformed declarations, and sidecar conflicts.
- Define explicit Polis/Sensemaker profiles and latest-state/event semantics. Preserve current Sensemaker callers.
- Introduce registry descriptors and per-audience capability/omission metadata. Correct misleading UI text advertising vote files before they exist.

### Phase B — coherent, scalable core exports

- Pin/materialize the generation context, catalogs, source timestamps, mappings, survey scope, and redaction revision.
- Add streaming artifact interfaces, multipart S3, streaming ZIP, lease fencing, immutable attempt keys, checksums, and size admission limits.
- Implement summary, Polis comments, sparse effective votes, participant votes, grouped tallies, and format/manifest; retain survey files on the shared source context.
- Emit base-only topic export when requested; declare no topic analysis. Resolve importance compatibility mode explicitly.

### Phase C — reproducibility and alternate analyses

- Persist immutable actual-run provenance and missing private snapshot catalogs at computation time. This can be developed in parallel with Phase B's exporter infrastructure.
- Add normalized analysis/group/evidence/metric files, variant dimensions, and selected candidate descriptors.
- Capture AI run/translation provenance and freeze description references; export current visible AI results with truthful legacy provenance status.

### Phase D — bounded history and richer signals

- Export retained analysis/view checkpoints and explicit source/retention gaps.
- Add stable presentation-description history where needed.
- Implement true importance collection, topic clustering, or accepted vote-action history as separate data-producing capabilities if required. Export generators follow those sources; they cannot create missing history.

### Verification gates for implementation

- Golden schemas for seven CSV shapes and JSON sidecars; missing-vote versus pass, positive importance, nonconsecutive IDs, zero-vote statements, no analysis, and no topic layers.
- Cross-file foreign keys and shared mappings; state comment totals equal emitted effective votes; matrix row totals agree; grouped totals equal member votes, with explicitly reconciled ungrouped votes.
- Legacy/new Polis import acceptance and Agora profile round-trip, including duplicates, canceled votes, and edited statement versions. Do not require copying Polis's historical aggregation bugs.
- Concurrent votes/edits/moderation/settings/survey changes cannot mix source generations. Failed-artifact retries preserve input/mapping identity. Zip-only retry uses exact completed objects.
- Multi-worker claim/recovery, stale-worker fencing, partial S3 failures, cancellation, and invalidation during publication.
- Owner/public/requester boundaries, revocation, deleted seed authors, hidden statements, survey withdrawal, all-variant/history differencing, and nested ZIP manifests.
- Formula strings, leading control/whitespace, apostrophes, non-Latin text, multiline quotes, hostile filenames, empty files, and correct MIME/extension handling.
- Meaningful large sparse/dense load scenarios: record peak RSS, bytes, rows/sec, query count/plans, API event-loop impact, and cancellation latency. Acceptance is bounded memory/in-flight work, not merely completing a tiny fixture.
- Replay one preserved execution fixture using its recorded dependency/code versions and input; compare candidate outcomes, group memberships modulo label permutation, and documented numeric tolerances.

### Verification performed for this audit

- Downloaded and parsed all seven CSVs and JSON sidecar from both reports; recorded byte sizes and SHA-256 hashes.
- Checked ID joins, participant counters, vote/event reductions, importance masks, moderation values, and group tallies against matrices. Differences are recorded above and in `consistency.json`.
- Exercised the actual API CSV parser on both full summary/comments/votes sets: comments/votes accepted; both summaries rejected specifically on `vote-convention`.
- Ran existing export comment/CSV tests: **2 test files, 4 tests passed**. This confirms the current intended Sensemaker behavior, not Polis compatibility.
- Reviewed this checkout's source and stored-data contracts. No deployed Agora export artifact was supplied, so the current-output comparison is against its generator/tests rather than a claimed production download.

## 13. Product choices to settle before implementation

1. **Audience:** owner-only initial raw voting exports (recommended), or explicitly conversation-accessible individual voting as Polis does?
2. **Importance:** honest omission/legacy-column profile until collected (recommended), or clearly marked synthetic zero-fill compatibility?
3. **Default scope:** one latest activated view and its resolved candidate (recommended); alternate variants and history explicitly requested and bounded.
4. **History promise:** retained analysis checkpoints first (recommended), or invest in complete accepted-action vote history as well?
5. **Text fidelity:** spreadsheet-safe CSV plus authorized exact-text JSON (recommended), with any exact-text CSV profile explicitly identified.

These choices do not block the import declaration fix, source-context design, streaming infrastructure, or computation-time provenance capture.
