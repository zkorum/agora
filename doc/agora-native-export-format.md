# Agora Project Package: native export design

**Date:** 2026-10-29. **Status:** architecture recommendation, not an implemented file-format specification.

This supersedes the Polis-first direction in [the export compatibility audit](conversation-export-compatibility-plan.md). That audit's observations, source-consistency issues, and import regression remain relevant.

## 1. Decision

Build an **Agora Project Package**:

> A self-describing, versioned snapshot of a project, its activities, their contributions and relationships, and the computations and interpretations derived from them.

Recommended physical format:

- **ZIP** for an ordinary download; the same logical package can be an unpacked directory or a collection of downloadable objects.
- **Frictionless Data Package v2 `datapackage.json`** as the single package descriptor, extended with a published Agora profile.
- **CSV** as the default encoding for records people inspect: activities, proposals/statements, responses, judgments, links, group statistics and results.
- **JSON** for package metadata, exact algorithm configurations and genuinely nested artifacts; optional JSON Lines for developer workflows.
- **Frictionless Table Schema** for CSV types/keys and **JSON Schema** for configuration and the Agora metadata extension, bundled for offline reading.
- Original permitted **attachments** as ordinary files, described in the package.
- Optional **XLSX workbook** for convenient multi-sheet browsing, and **Parquet** encoding of large analytical resources, following the same logical model.
- **Polis, Sensemaker, SQLite, and RO-Crate** as named projections/adapters when useful.

The central contract is the **logical domain model and its semantics**. ZIP is delivery, CSV is an encoding, and neither defines what a ballot or analysis means.

**CSV-first is a product requirement:** someone should be able to open the useful data directly in a spreadsheet without running code. Normalize repeated structures into related CSV tables, retain readable titles/text next to reference IDs in browsing views, and keep JSON out of ordinary data cells. Add optional JSONL/Parquet encodings when a workflow needs them, rather than making users convert the default export themselves.

## 2. Why this fits Agora

Agora is becoming a tool for connected decision-making processes:

```text
Project
  Gathering: collect proposals through a form
       | selected / copied / edited / merged, with provenance
       v
  Mapping: statements + agree/disagree/pass + opinion groups
       | selected options and/or a particular group-analysis snapshot
       v
  Prioritizing: comparisons or credit ballots
       | ordinary and optionally plural-adjusted computations
       v
  Results, interpretations, reports, and subsequent rounds
```

This is an example, not a required sequence. Activities can repeat, run independently, or start with Prioritizing. Display order, data dependency, and scheduling are separate concepts.

The export must answer questions such as:

- Which original submissions produced this shortlist item, and what changed along the way?
- Which statement version did people vote on?
- Which Mapping snapshot and group-count variant supplied the social information for this ranking?
- Are these ordinary results, plural-adjusted results, a display transformation, or AI interpretation?
- Which questionnaire definition and eligible population belonged to the displayed results?
- What can be reproduced from this particular package, with its access and retention limits?

AI-assisted development makes adapters cheaper. It does not recover lost source versions, candidate sets, missing cancellations, or undocumented score semantics. Invest in preserving those facts and publish deterministic, tested adapters around them.

## 3. Format evaluation

| Candidate | Useful qualities | Recommended role |
| --- | --- | --- |
| CSV files + typed descriptor | Familiar spreadsheets; streaming; open ecosystem | **Default record encoding**, using related fixed-column tables for repeated structures |
| One nested JSON document | Simple small examples; natural objects | Small descriptors; a project with millions of responses should not require reading one enormous object |
| JSONL resources + JSON descriptor | Streaming, typed values, easy TS/Python adapters, bounded nested structures | Optional developer representation of the same logical resources |
| Parquet + descriptor | Efficient scans, compression, typed columns, strong research tooling | **Large-data encoding** for supported resources; publish exact type mappings and validate equivalence |
| SQLite database | Excellent offline joins and indexes; stable portable file | Useful generated analytical/application view; requires a completed database file and a versioned export SQL schema |
| ZIP | Familiar single download; accommodates documents and multiple encodings | **Default container**, not the data model |
| Frictionless Data Package | Existing open resource catalogue, metadata, extension/profile mechanism | **Package metadata foundation** |
| RO-Crate | Rich dataset/software/research provenance and repository integration | Optional research-publication metadata adapter; avoid making JSON-LD traversal necessary for reading a vote |
| RDF/property graph | Expressive relationships | Possible downstream graph view; typed Agora resources already express the required links |
| Production database dump | High fidelity to one deployment's storage | Separate operational backup; unsuitable as the public domain contract |

CSV requires declared types, missing-value rules and related tables for nested/repeated data. Those are manageable requirements, and the spreadsheet accessibility is valuable. Neither CSV nor JSONL is as scan-efficient as Parquet; compression and partitioning keep the text export practical.

Frictionless Table Schema describes CSV fields, types, primary keys and foreign keys. Our profile/validator adds Agora-specific lifecycle and cross-resource consistency rules. Use JSON Schema for JSON configuration and optional JSONL records; do not pass it off as Frictionless Table Schema.

## 4. Domain model: a small common core and typed modules

### 4.1 Shared core

| Concept | Meaning |
| --- | --- |
| Project | Process identity, content, presentation, organizations/attributions, public contacts, documents, activity arrangement |
| Activity | One round or participant-facing activity, with immutable configuration/content revision references |
| Content revision | Exact authored content and language; identity is separate from mutable URL/title |
| Item | A proposal, statement, or prioritization option owned by an activity |
| Questionnaire | Versioned questions, options, rules, purpose, and scope |
| Submission / observation | What was actually submitted, using a method-specific schema |
| Link / derivation | How activities depend on one another and how content was copied/transformed |
| Capture | A coherent selected state of an activity or project, with exact component references |
| Input dataset | The precise normalized data supplied to a computation |
| Run | A computation or interpretation, its implementation/configuration, inputs, and outputs |
| Result | Typed output attached to its run, input, population, and units |
| Publication | What was selected/displayed/released at a particular boundary |
| Asset | A permitted document, image, report, or other file with metadata and digest |

These are export concepts. They do not require renaming all `conversation` DB tables or migrating every worker to a new universal engine.

Items share references, ownership, and versioning. Their content/payload stays typed: a structured proposal submission is not reduced to one statement string, and a questionnaire answer is not automatically public proposal content.

### 4.2 Activity intent, participant method, and analysis are different axes

- **Intent:** `gathering`, `mapping`, `prioritizing`; these describe the product activity.
- **Collection method:** form submissions, statement judgments, pairwise comparisons, best–worst tasks, credit allocations, and future explicitly registered methods.
- **Analysis/aggregation method:** opinion mapping, preference learning + aggregation, ordinary QV tally, a specified plural adjustment, topic analysis, etc.
- **Presentation:** list/card, result-view preference, selected group count, language, score display transformation.

Use discriminated method schemas, not a huge object with optional `agree`, `best`, `credits`, and `groups` fields. A method ID/version determines the valid shape. Activity intent does not decide the meaning of every record.

Plural adjustment is a result computation using specified social-information inputs. It is not a ballot method. One set of submissions can support multiple separately addressable result runs.

### 4.3 Method-specific facts to preserve

| Module | Required semantic information |
| --- | --- |
| Gathering | Form definition/revision, submission identity/revision/status, typed answers, attachments, publication/moderation decisions, selected public proposal representation |
| Mapping | Statement/content revision, judgment `agree` / `disagree` / `pass`, effective-state versus event semantics, eligibility and moderation, analysis input, candidates, memberships, representative statements and metrics |
| Pairwise | The two exact item revisions, answer representation and scale/orientation, task/session/order where recorded; an inferred score is not the raw answer |
| Best–worst | Full presented candidate set and exact item versions, best and worst selection, recorded ordering/session context; do not export only best/worst as if the unchosen set were irrelevant |
| Credit voting | Ballot/submission identity, configuration revision, budget, signed/support-only policy, price function, sparse allocations, replacement/withdrawal semantics, closure/result generation |
| Questionnaire | Purpose and scope, question semantic/content revisions, options and typed values, multiple selections, validity/completion/withdrawal and permitted aggregates |
| Plural/social weighting | Exact source capture/run/candidate/question revisions, memberships or another actual weighting input, identity alignment policy, missing-source policy, algorithm/version and ordinary baseline |
| Translation / AI | Actual source revision/input evidence, language, template/model/provider/configuration, output, correction/translation/reuse relationships |

Record task exposure, presentation order, and routing probabilities only if genuinely captured. Mark missing collection-design information as unavailable; it cannot be inferred from votes. Such information matters for future bias/adaptive-routing research.

Gathering can reuse the questionnaire engine while distinguishing `purpose=proposal_collection` from onboarding. Shared project onboarding must retain its own scope; it must not be copied into several activity-specific response records and accidentally counted several times.

### 4.4 Settings, inheritance and lifecycle

Preserve three separate facts for inherited settings: the project default revision, the activity's configured inheritance/override choice, and the effective value at the capture. An importer can then retain the design intent while a researcher can understand the rules that actually applied. Recomputing yesterday's effective participation/language settings from today's project defaults is incorrect.

Separate project publication/directory state from activity lifecycle and analysis visibility. A project published as an archive and an activity closed for submissions are related product actions, not interchangeable booleans. Record the states supported by the source feature and their revisions. A draft, an upcoming activity without options, and an open activity with no responses must remain distinguishable; exporting a configuration does not assert that it was ever published or used to collect observations.

## 5. Relationships and provenance are first-class

Use **typed relationship resources** with documented endpoints and constraints. Do not turn the whole format into an unconstrained subject/predicate/object store.

### 5.1 Three relationships with different meanings

1. **Arrangement:** activity membership/order within a project. Reordering does not rewrite observations or create a dependency.
2. **Dependency:** an activity/configuration consumes items, a questionnaire dimension, or an analysis output from another source.
3. **Derivation:** particular target content/results were produced from particular source revisions through an operation.

For example:

```text
Gathering submission S@revision3
       -- manual selection and editorial rewrite --> option O@revision1

Mapping capture M@frame12, candidate k=4
       -- supplies social-group input --> prioritization run R
```

The shortlist item's editable title is not its identity. The source is not merely a link to the Gathering page. A group source is not “the latest Mapping” without a resolved snapshot.

### 5.2 Copies, merges, splits, and live references

Each derived item gets its own entity identity. A derivation records operation, actor/AI attribution where permitted, time if known, exact source revisions, target revisions, and transformation-run reference when appropriate.

Support many-to-many inputs and outputs: several proposals may merge into one option; one proposal may split into several statements. Use separate input/output rows when these sets are large. A reference to a source does not imply permission to export its private form answers or author identity.

Keep the configured binding (`snapshot_copy`, `linked_reference`, or a separately defined synchronization policy) separate from the derivation actually performed. If a binding is live, each computation still pins the exact source revision it consumed. Future source edits must not retroactively change past results.

For missing/external sources, declare a dependency as included, externally referenced, or unavailable to this package, subject to disclosure permissions. Never invent a local target for a missing reference. Ordinary foreign-key references must resolve; only explicit boundary references may remain external.

## 6. Identity and versioning

### 6.1 Four identities that must stay separate

- **Entity ID:** stable identity of a project, activity, item, question, document, etc.
- **Revision ID:** immutable particular content/configuration version.
- **Capture/run ID:** immutable selected state or computation.
- **Package ID:** this generated, audience-specific export.

Use opaque string references, with source-instance namespacing for stable nonsensitive identities where needed. URLs/slugs are locators, not primary keys. Internal sequence IDs and storage paths must not become the public format contract.

Stable public content identities help deduplicate later imports; participant pseudonyms have different requirements. Use activity/package-scoped participant references by default. Cross-activity participant alignment is a separately permitted resource or an authorized run-local input; do not silently make a person's Gathering answers, Mapping votes, and QV ballot joinable because they share an account.

### 6.2 Version the right layers

1. Package/profile version: directory/descriptor conventions and compatibility.
2. Resource schema version: record shape and semantics.
3. Entity content/configuration revisions: the actual activity/question/item state.
4. Method/specification and software versions: how outputs were produced.

An additive new activity module should not force an unrelated Mapping resource to change version. Unknown optional resources can be skipped; unknown required methods/features must produce an explicit unsupported result, not silent interpretation.

Ship schemas and a clear support policy. Maintain migration functions for old packages and fixed input/output fixtures for adapters. A new method or enum value that an old reader cannot understand needs capability negotiation even when the surrounding package version is compatible.

## 7. Suggested package layout

Illustrative resource catalogue; a package includes only resources relevant and permitted for its scope. Do not generate dozens of misleading empty files.

```text
agora-project.zip
  datapackage.json                    # one authoritative descriptor
  README.md                           # summary, scope, limitations, how to read
  schema/                             # pinned offline-readable schemas
  project/
    project.json
    activities.csv
    arrangement.csv
    content-revisions.csv
    activity-configurations.csv
    configurations/<revision-ref>.json
    activity-links.csv
    derivations.csv
    derivation-inputs.csv
    derivation-outputs.csv
    assets.csv
  activities/<activity-ref>/
    items.csv
    item-revisions.csv
    questionnaires.csv
    questions.csv
    options.csv
    submissions.csv                   # Gathering, when permitted
    answers.csv
    answer-choices.csv                # one row per selected option
    statement-judgments.csv            # Mapping, when permitted
    comparison-tasks.csv               # pairwise / best–worst
    comparison-task-items.csv          # complete presented set and recorded order
    credit-ballots.csv                 # only permitted ballot scope
    credit-allocations.csv             # one row per nonzero allocation
    captures.csv
    publications.csv
  analysis/
    runs.csv
    configurations/<run-ref>.json
    inputs/<input-ref>/...             # authorized exact normalized inputs
    candidates.csv
    groups.csv
    memberships.csv
    representative-items.csv
    group-item-statistics.csv
    ranking-results.csv
    tally-results.csv
    questionnaire-aggregates.csv
    metric-definitions.csv
    interpretations.csv
    interpretation-evidence.csv
    software/...
  history/...                         # explicitly requested retained history
  attachments/<asset-ref>/...
  views/                              # readable summaries, optional XLSX/Parquet/etc.
```

Resources are discovered through `datapackage.json`, not hardcoded directory walking. Large resources can be deterministically partitioned; each part has its own descriptor/checksum plus an Agora logical-resource reference and partition order. Paths do not encode participant identifiers or text.

Small deployments need only a small subset. A single-activity export uses this same format with its minimum permitted project/dependency context. Standalone activities do not require a user-visible artificial multi-activity project; the export can represent their actual container scope.

### Spreadsheet experience

Offer **Spreadsheet export** prominently: a workbook with an Overview, Activities, Statements/Proposals, Results, Groups and other applicable sheets, or a ZIP of the corresponding readable CSV files. Keep detailed relational/reproducibility resources available in the complete package. Human-friendly views can repeat statement text, activity title and group labels next to IDs; record the exact source revisions so those copies cannot disagree silently.

Use stable machine column names with human-readable descriptions in the data dictionary. Avoid enormous wide tables, cryptic ID-only result files, JSON arrays in cells and one file per tiny object. Multi-choice answers, candidate sets and allocations become related rows with stable keys.

XLSX is a convenience representation, not the only complete archive. Its cells can explicitly retain identifiers as text and supply filters/frozen headers. If a dataset exceeds worksheet limits, provide all rows in partitioned CSVs and clearly mark any workbook summary as partial; never silently truncate.

### 7.1 Descriptor responsibilities

Use standard Data Package fields for package/resource names, paths, format, encoding, size, hash, sources and applicable rights information. Add a namespaced `agora` object for domain-specific metadata.

The Agora extension describes:

- Profile/schema version, package ID, exporter build and schema catalogue.
- Scope roots: projects, activities, selected captures and history bounds.
- Requested/resolved selection, dependency-inclusion rules, and consistency statement.
- Purpose/audience and applicable release-policy version; these describe a decision, not grant access.
- Included modules and required features.
- Resource record schema, key/reference constraints, logical identity and representation.
- Materialization state: included, known-empty, not-collected, not-supported, legacy-unavailable, or withheld when that distinction can be disclosed safely.
- Replay availability for each run: complete, partial, output-only, unavailable.

Every included file has a descriptor with its byte digest; record resources also have row counts and schema references. Do not duplicate a second authoritative `manifest.json`. Generate README and optional RO-Crate metadata from the same descriptor/provenance model.

Do not self-hash `datapackage.json` inside itself. If package authenticity is needed, sign its final exact bytes with a detached signature whose trust/key policy is separately defined. SHA-256 alone detects changes relative to a trusted digest; it does not prove who created the package.

### 7.2 Small example

This abbreviated descriptor shows the separation between standard catalogue fields and Agora semantics. A complete package would catalogue its other data, schemas and documentation as well. Example references and schema paths are illustrative, not published IDs.

```json
{
  "$schema": "https://datapackage.org/profiles/2.0/datapackage.json",
  "name": "agora-project-riverside",
  "id": "urn:uuid:d65cba41-068e-46e5-821b-20ae0e971ad0",
  "created": "2026-10-29T15:00:00Z",
  "title": "Riverside project: selected published results",
  "agora": {
    "format": "agora-project-package",
    "version": "1.0.0",
    "profileSchema": "schema/agora-package.schema.json",
    "scope": { "projectRefs": ["project:riverside"] },
    "selection": "published_captures",
    "consistency": "pinned_dependency_set",
    "purpose": "published_archive"
  },
  "resources": [
    {
      "name": "mapping-statements",
      "path": "activities/activity-mapping/item-revisions.csv",
      "type": "table",
      "format": "csv",
      "encoding": "utf-8",
      "schema": "schema/item-revision.tableschema.json",
      "agora": {
        "resourceType": "item_revision",
        "schemaVersion": "1.0.0",
        "recordSchema": "schema/item-revision.schema.json",
        "primaryKey": ["id"],
        "recordCount": 2
      }
    }
  ]
}
```

The final Agora profile should extend/validate the pinned Data Package v2 profile; schema resolution must work offline. The example uses the standard `$schema` and a local Agora schema reference to avoid suggesting that a future hosted Agora profile already exists. Required resource digests/sizes are omitted here only for brevity.

Native Mapping judgments in a directly openable CSV:

```csv
id,capture_ref,activity_ref,participant_ref,item_revision_ref,value
judgment:j7,capture:m12,activity:mapping,participant:local7,item-revision:s3v2,agree
```

This resource is declared **effective state**. Absence means no effective judgment in this population; `pass` is an explicit answer. Changing or canceling a vote belongs to a separately declared event/history resource if recorded. No numeric sign convention is needed in the native representation.

Derivation operation and endpoint tables retain many-to-many relationships without packing arrays into spreadsheet cells:

```csv
id,operation
derivation:selection17,manual_editorial_copy
```

```csv
derivation_ref,input_type,input_ref
derivation:selection17,submission_revision,submission-revision:proposal42v3
```

```csv
derivation_ref,output_type,output_ref
derivation:selection17,item_revision,item-revision:shortlist9v1
```

## 8. Wire rules that prevent ambiguity

- CSV uses a declared UTF-8 encoding/dialect, one fixed header, stable column order and library quoting for commas, quotes and multiline content. Support spreadsheet import conventions explicitly rather than depending on the user's locale delimiter. A BOM, if offered for a spreadsheet compatibility variant, is declared rather than added inconsistently.
- CSV fields have explicit Table Schema types and missing-value rules. Distinguish absent values from valid empty text where needed with a status column; suppression/unavailability uses explicit status/reason columns, never unexplained zeroes.
- Native enums are explicit strings. Booleans have one schema-declared lexical representation. A display-language translation does not change machine column names or enum semantics.
- JSON configuration preserves native types and omits absent optional properties. Optional JSONL has exactly one object per line, escaped embedded newlines, no BOM and a final newline. Blank lines and duplicate JSON keys are invalid.
- Object key order is not meaning. Define stable record/partition order where required for replay, hashes, or task order.
- Exact large integers/decimals use schema-declared decimal strings where they exceed the cross-language safe-integer contract. Bounded allocations/counts may use safe JSON integers. Do not silently round Postgres bigints in JavaScript.
- Timestamps are RFC 3339 UTC strings with recorded precision. Unknown time is explicitly unavailable; do not manufacture an event time from computation/export time.
- Floating metrics are finite numbers with declared meaning/units. `NaN`, infinities, and meaningless zero substitutions are invalid. Record undefined metrics with a reason.
- Text revisions preserve authoritative source format and language, with a declared plain-text projection where useful. A translation points to the exact source revision and records human/machine origin. Do not treat HTML, Markdown and plain text as interchangeable strings.
- IDs/reference types are strings with specified scope, not array positions. Choice answers refer to option IDs; candidate sets refer to exact item revisions.
- Sparse observations/allocations/memberships are canonical. Dense participant × item or participant × participant matrices are generated views, never mandatory storage/interchange structures.
- A metric's name, population/denominator, unit, aggregation and transformation definition travel with it. A Solidago display score is not a percent agreement; QV vote units are not credits spent.
- Spreadsheet-facing CSV text uses a declared reversible formula-escaping convention, including escaping existing leading apostrophes so exact text can be recovered. Quote escaping alone does not prevent formula evaluation. XLSX writes user text as literal strings, not formulas. Numeric vote/allocation columns retain their numeric semantics.

Parquet/JSONL mappings must specify logical types, related-table reconstruction, ordering, timestamp precision, missing-value handling, text decoding and decimal encoding explicitly. Do not allow readers to infer them differently from a few example rows. Different representations of one resource describe the same logical records; do not count them twice.

## 9. Captures, results, reproducibility and AI

### 9.1 A project export is a pinned dependency set

A capture composes exact content/configuration, analysis, questionnaire aggregate and lifecycle references. It is the export analogue of the planned unified view-frame model.

Resolve a project's authoritative activity pointers in a consistent database read, then close over their exact permitted dependencies. A ranking may correctly use an older Mapping run than the project's currently displayed Mapping. Include that historical dependency when permitted; do not substitute the latest run.

Record capture time separately from input/computation/publication times. Do not claim all activities were recomputed at one instant. Do not find the latest result independently in each generator. Use a common capture abstraction over current Mapping/ranking snapshots now; an export need not wait for a complete unified-frame DB migration.

### 9.2 Inputs, runs, result variants, and presentation

Each run identifies actual software/code revision, immutable algorithm specification, fully resolved parameters/defaults, seed, numerical environment, input dataset references/digests, and typed outputs.

Preserve the precise normalized inputs fed to the algorithm where authorized. Raw observations plus undocumented filtering are insufficient for replay. Mapping, ranking, questionnaire and plural inputs may have different populations; declare the transformation and exclusions/count semantics.

- Mapping candidates with different `k` share input references but have distinct candidate IDs and assessments.
- Ordinary and plural-adjusted results share the base ballot input when appropriate, with distinct run identities and social-information dependencies.
- Rankings preserve raw scores/uncertainties, transformed display scores, item universe and tie/rank policy; those transformations have their own definitions/version.
- Publication records identify system recommendation, facilitator preference and actual resolved display choice. These are different facts.

Red-dwarf provenance alone is not enough for the wider project. Capture the ranking preference-learning implementation, Solidago stages/parameters, any native MaxDiff learner, QV price/tally rules, source-binding rules, display transform, and AI services actually used.

### 9.3 AI interpretation

Treat labels, summaries, translations, topic extraction, proposal synthesis and AI-assisted shortlist generation as typed interpretations or transformation runs:

- Output text/structured values, locale, status and selected/overridden/reused relationship.
- Exact permitted source revisions and evidence references.
- Actual provider/model version if known, prompt/template version, resolved request settings, output schema and validation/postprocessing.
- Original producing run when output is reused through lineage; a current group must not pretend it generated old text anew.

Export observed accepted output and permitted evidence. Distinguish computational replay from hosted-model regeneration, which may not return identical wording even with the same recorded inputs. Legacy provenance is unknown unless reliable stored evidence exists.

### 9.4 Replay availability is per package and per run

An aggregate/public package can describe results faithfully while being **output-only** for individual-level replay. An authorized research package may include the same result plus its inputs. A redacted input is a new derivative and may not reproduce the original result.

Do not expose restricted input hashes, participant mappings, trust/verification data or private source dimensions merely to make provenance look complete. Publish checksums of emitted bytes; use opaque run/dependency references where the original input identity is restricted.

## 10. Scope and privacy follow the activity's actual rules

Package purpose and requested modules are selections, not permissions. A project facilitator is not automatically entitled to every participant's raw data.

Recommended supported purposes:

- **Published archive:** permitted public content/results and process provenance.
- **Facilitation export:** additional administrative content already authorized for that facilitator.
- **Research export:** explicitly permitted pseudonymous observations/inputs and research metadata.
- **Personal export:** the requester's permitted own responses, votes, ballots and optional drafts.

Critical existing/upcoming distinctions:

- Public proposal content and private Gathering form answers can have different release rules.
- Questionnaire full responses, suppressed aggregates and public aggregates are different resources.
- The QV plan keeps individual ballots visible only to their owners; even a facilitator export must not silently include them. While open/reopened, it must not expose tally results or old result metadata through an archive. QV also does not promise a public checkpoint history.
- Cross-activity linkage can reveal more than separately pseudonymized activity files. Export identity bridges/social-source memberships only when specifically permitted.
- Project and document participant/owner versions remain distinct; exports include only permitted actual file bytes, not expiring S3 URLs as the preservation mechanism.
- Unlisted is not a grant of private-data access, and mutable public slugs are not stable identity. Avoid embedding bearer/capability URLs as harmless metadata.

Filter the permitted graph before writing files. Check disclosure through derived outputs, evidence, group variants and histories, not just through direct records. Metadata/omission counts must not reveal otherwise restricted activity or submission existence. Recheck lifecycle/access/redaction revision at publication.

A downloaded immutable package cannot automatically follow a later withdrawal. Its descriptor records when and under which policy it was generated; future downloads and stored artifacts follow the applicable invalidation/deletion policy.

## 11. History, restoration and interoperability

### 11.1 Snapshot first; history is optional

Separate effective state, retained revisions/checkpoints, publication history and accepted-action events. Each history resource declares coverage and gaps. Do not claim full event replay from today's coalesced vote buffer or reconstruct old questionnaire/group state from current rows.

Bound requested history by scope/time/snapshot count/bytes. The exact input dependency needed for a selected result can be included without enabling an unrestricted public history browser. Keep unavailable source history explicit.

Defer incremental/delta packages until stable IDs, deletion semantics, baselines and change ordering are actually supported. `updated_at > last_export` is not a reliable change protocol.

### 11.2 Make portability a design objective

Distinguish:

1. **Inspect/analyze:** read content/results without the Agora service.
2. **Replay:** recompute the included results to the advertised level.
3. **Clone/reuse:** import permitted project definitions/content/links into another instance, remapping IDs and revalidating methods/policies.
4. **Restore a running installation:** operational backups, secrets and account authority; a separate system.

The native model should preserve enough semantics for the first three where requested. Import must not treat exported organization ownership, permissions, account identity, or worker state as authority on the receiving instance. Derived results can be retained as attributed source artifacts rather than silently becoming that instance's current result.

### 11.3 Adapters are versioned transformations

```text
Canonical permitted capture + typed resources
    -> Agora Project Package
    -> spreadsheet tables/workbook
    -> research Parquet / SQLite views
    -> Polis / Sensemaker projection
    -> RO-Crate publication metadata
```

All writers consume the same permitted capture contract. Adapters must not run their own independent current-state queries, bypass permissions, or use AI to guess field mappings at export time.

Each adapter declares supported method/profile versions and emits a conversion report: included resources, transformations, omitted unsupported features and any loss. For example, an entire project cannot be represented by one Polis CSV set; Mapping may be projected while Gathering, QV and cross-activity links are reported as unsupported.

Provide minimal TS/Python readers, schemas, one small end-to-end fixture and worked conversion examples. Those assets make AI-assisted adapters substantially more reliable than undocumented tables and configuration files.

## 12. Performance and implementation approach

### 12.1 Production pipeline

```text
Authorize scope -> pin coherent capture/dependency set
  -> materialize missing immutable source facts
  -> typed resource iterators -> encoder -> hash -> object storage
  -> finalize datapackage.json from actual resource metadata
  -> streaming ZIP of permitted objects -> publish
```

- Reuse durable generation/request/artifact lifecycle, with source pins, leases/heartbeats, fencing and attempt-specific object keys.
- No full project object, dense vote matrix, dense friend matrix, or all-CSV-in-memory ZIP is required.
- Prepare mutable source facts in a real consistent read/materialization, release the transaction before uploads/compression, and reuse prepared sources on retries.
- Use bounded ordered/keyset iteration and multipart uploads with backpressure; bounded buffers/row groups for Parquet. Preserve logical task order explicitly rather than relying on file arrival order.
- Partition large datasets by activity/resource and bounded part size. Checksum every part. Reuse immutable input datasets across candidate variants.
- ZIP is assembled after resource metadata is known; logical descriptor position does not require buffering the whole archive. Use ZIP64 where needed. Avoid double-compressing Parquet and already compressed attachments.
- Maintain source/format/audience/options-aware cache keys; cancel or invalidate a source that changes eligibility before publication. Do not overwrite a completed retry from a stale worker.
- Preserve schema-declared 64-bit byte/count metadata without unsafe JS integer conversion. Set limits based on measured resource costs.

### 12.2 Type safety and schemas

Define canonical export DTOs in the existing shared-code strategy, independent of DB row shapes. Prefer Zod-discriminated method types, with deterministic flattening into method-specific CSV tables. Generate/check Table Schema descriptors and the interoperable JSON Schema subset for configuration and optional JSONL; derive/check Python models through supported codegen. Test cross-language parsing so generated schemas do not weaken important invariants.

Schema validation covers record shape. A package validator also checks keys/references, revision ownership, candidate-set inclusion, selected snapshot consistency, source closure, allowed populations, and method-specific invariants. Large-resource validation uses bounded external joins/indexes where required; it must not load every participant in memory.

Bundle vetted schema versions and resolve local references from a catalogue. Do not fetch arbitrary schemas, external files or executable scripts automatically when opening an untrusted package. Treat rich-text/HTML reports as data, and apply archive path/size limits during import. Reversible CSV text escaping is decoded at the serialization boundary; it must not mutate the underlying content or computation inputs.

### 12.3 Delivery sequence

**A. Small stable core**

- Publish a draft Agora Data Package profile, native resource conventions and one illustrative Gathering → Mapping → Prioritizing fixture.
- Implement project/activity/content/capture/run/resource descriptors and Mapping resources over existing stored data.
- Add native package validation/inspection, streaming export and explicit scope/omission handling.
- Keep the confirmed Polis summary declaration parsing fix as an independent import compatibility correction.

**B. Current breadth**

- Add existing questionnaires, ranking items/full best–worst tasks, ranking raw/display results, documents, translations and visible AI interpretations.
- Persist missing source mappings, effective configuration and per-run provenance at creation/computation time. Mark legacy gaps truthfully.
- Add a convenient multi-sheet workbook and Polis/Sensemaker adapters from the canonical permitted model; the default CSV package no longer depends on matching external tool schemas.

**C. Upcoming modules as their producers land**

- Gathering/project-scoped questionnaires, activity arrangement and content derivations.
- Exact cross-activity analysis/social-information bindings.
- Credit ballots/QV/plural result variants, honoring their actual disclosure/lifecycle rules.
- Bounded history, then optional Parquet/research-publication views and clone/import support.

Avoid implementing absent product features inside the exporter. Define their semantic slots and register modules as the feature acquires real data.

### 12.4 Meaningful verification

- One multi-activity fixture demonstrates selection/rewrite/merge provenance, a Mapping group variant and a ranking dependent on that exact variant.
- Same input with ordinary/plural runs retains distinct results and exact dependencies; a display transformation is not mislabeled as a tally.
- Empty versus unavailable versus withheld states survive readers/adapters without changing meanings.
- Content edits preserve original observation revision references; changing activity order does not change those references.
- Partial/external dependency packages identify missing replay inputs without creating dangling ordinary foreign keys.
- QV lifecycle/personal-only ballot boundaries, questionnaire withdrawal/suppression and cross-activity linkage are enforced in files and metadata.
- CSV/XLSX/JSONL/Parquet conversions preserve IDs, numeric precision, empty/missing distinctions, related method tables, exact text after decoding and order; adapters explicitly report loss.
- Large sparse resources export with bounded memory, deterministic retry sources, correct hashes and stale-worker fencing.
- A second implementation reads the bundled schemas/fixture offline and reconstructs the documented process and permitted inputs/results.

## 13. Current implementation versus proposed model

Reviewed sources include ongoing local work; “existing” means this checkout, not certified production deployment.

- `services/shared-backend/src/schema.ts`: projects/documents, `polis` and `ranking` conversations, versioned content, questionnaires, Mapping snapshots/candidates and ranking snapshots/tasks/scores.
- `services/scoring-worker/src/scoring_worker/observations.py`: preserves best–worst candidate sets and distinguishes pairwise answer scale/orientation.
- `services/scoring-worker/src/scoring_worker/scoring.py`: preference-learning/aggregation/display distinctions; optional social-weighting support is not evidence that production uses it.
- [Project redesign brief](agora-redesign-design-brief.md): projects as the process boundary, publication/permanent-link direction, plural inputs and statement reuse decisions.
- [Connected journeys inventory](agora-connected-journeys-audit.md): activity ordering/repetition, proposal collection through shared questions, and comparison/credit/plural distinctions; several are prototypes.
- [Settings inventory](project-conversation-settings-inventory.md): configured/inherited/effective settings and questionnaire scope; newer project-publication decisions supersede older prototype visibility choices.
- [QV plan](quadratic-voting-implementation.md): proposed credit-ballot behavior, closure/reopen boundaries, individual ballots visible only to their respective ballot owners, and no public checkpoint history.
- [Unified survey frames plan](../AGENTS_UNIFIED_SURVEY_FRAMES_PLAN.md): proposed coherent captures across Mapping/ranking without merging analysis engines.

Gathering is used here per the current product direction; older prototypes call it Proposals. The native schema should stabilize method/intent meanings without treating every UI rename as a new wire format.

## 14. Standards references

- [Data Package v2](https://datapackage.org/standard/data-package/), [resources](https://datapackage.org/standard/data-resource/), and [extension profiles](https://datapackage.org/standard/extensions/). The older `specs.frictionlessdata.io` pages describe v1.
- [JSON Lines](https://jsonlines.org/): streamable UTF-8 record encoding; its MIME conventions are not a finalized universal media-type standard.
- [Apache Parquet](https://parquet.apache.org/docs/overview/): efficient typed analytical encoding; implementation feature support needs interoperability tests.
- [SQLite application-file discussion](https://www.sqlite.org/appfileformat.html): a credible optional offline query view, with different construction/update trade-offs.
- [RO-Crate 1.3 introduction](https://www.researchobject.org/ro-crate/specification/1.3/introduction.html): dataset and software provenance useful for an optional publication profile.

**Bottom line:** own Agora's domain semantics, use established packaging/encoding standards, preserve exact relationships and computation inputs, and make every tool-specific export a transparent view of that model.
