# Analysis Worker Shared

Shared Python package for Agora analysis and description workers.

This package contains DB models, generated shared constants, Valkey queue helpers, retry state logic, AI description/translation provider helpers, and red-dwarf analysis glue used by `math-updater`, `ai-description-retry-worker`, and `description-translation-retry-worker`.

Python workers share code in two ways:

- Reusable Python implementation lives here under `src/agora_analysis_worker_shared/` and is imported as the editable `agora-shared-analysis-worker` package by worker services.
- Generated files under `src/agora_analysis_worker_shared/generated_*.py` are produced from TypeScript sources in `services/shared` and `services/shared-backend/src/schema.ts`.

Do not hand-edit generated files. Edit the TypeScript source schema/types or the reusable Python implementation, depending on what needs to change.

Generated artifacts are synced here from the repository root:

```bash
make sync-python-artifacts
```

Useful checks:

```bash
uv run --extra dev ruff check
uv run --extra dev basedpyright
uv run --extra dev pytest -v
```

## PostgreSQL connections

`postgres_engine.py` supplies the shared psycopg connection policy used by the
math updater and both description retry workers. PostgreSQL URL schemes
`postgres://`, `postgresql://`, and `postgresql+psycopg://` use psycopg 3. URL
normalization preserves credentials and TLS parameters.

Defaults (explicit DSN query parameters take precedence):

| libpq parameter | Default | Purpose |
| --- | --- | --- |
| `connect_timeout` | 10 seconds | Connection establishment, per host |
| `keepalives` | 1 | Enable TCP keepalives |
| `keepalives_idle` | 15 seconds | Idle time before probing |
| `keepalives_interval` | 5 seconds | Interval between probes |
| `keepalives_count` | 3 | Unanswered probes before failure |
| `tcp_user_timeout` | 30000 milliseconds | Bound unacknowledged TCP data on supported systems |

Pool checkout waits at most 10 seconds for a slot. `pool_pre_ping` checks pooled
connections before reuse, while the network settings help detect a dead peer
during a ping, query, or rollback. These are distinct controls, not an absolute
wall-clock deadline for a whole transaction: DNS, multiple hosts, OS support, and
a live TCP peer with an unresponsive database can affect observed durations.

Ready engines set `application_name` from the worker log prefix and database role.
Callers can opt into statement and idle-transaction timeouts; the AI description
retry worker does so. Existing DSN `options` are preserved and applied after these
defaults. The math updater and translation retry worker retain their existing
server-side timeout policy.

Because this package is baked into worker images, connection-policy changes take
effect when each consuming service is rebuilt and redeployed.

## Database reconciliation

Latest-lineage matching uses one ordered candidate lookup per requested lineage
scope before loading representative statements. It requires the canonical
`opinion_group_scope_latest_lineage_idx` partial index from
`services/shared-backend/src/schema.ts`. Generate and apply its migration before
deploying the updated math updater. The query explicitly matches the descending
index's `NULLS LAST` ordering; PostgreSQL can otherwise prefer a backward scan of
an unrelated candidate index even though the candidate ID is non-null.

Requested translation materialization selects missing `(description_id, locale)`
pairs in SQL instead of issuing lineage and translation queries per request.
It waits for all required base descriptions, preserves the earliest eligible
request's ownership of shared descriptions, and excludes satisfied or already
correctly assigned work before applying the batch limit. The writer still
rechecks insertion and reassignment against concurrent claims. Eager lineage
materialization also excludes ready, already-assigned, and actively leased work
before limiting candidates, allowing later missing work to progress.

Lease recovery first probes the partial lease-expiry indexes. When nothing is
expired, it skips planning and executing the candidate/view relevance updates.
Existing polling intervals, retry cooldowns, and checkpoint eligibility continue
to govern when work becomes runnable.

Run database regressions against a disposable local PostgreSQL database:

```bash
AGORA_TEST_POSTGRES_DSN=postgresql://postgres:test-only@localhost:5432/postgres \
  uv run --extra dev pytest tests/test_previous_lineage_selection.py tests/test_ai_description_work.py
```

The tests use isolated schemas and exercise shared descriptions, small-batch
fairness, leases, retry state, checkpoints, and idle-query counts. Without that
environment variable, the functional tests use SQLite and PostgreSQL-specific
concurrency cases are skipped.

Local synthetic measurements during this change found:

- With 150,000 group rows across 1,000 scopes, selecting five scopes took about
  8 ms with the original query/indexes, 0.24 ms with the new index alone, and
  0.12 ms with the indexed lookup rewrite. The results were identical.
- With 200 locale requests sharing correctly assigned translation work, one
  reconciliation cycle dropped from 403 statements to 2. Five-run median elapsed
  time dropped from about 152 ms to 9.4 ms.
- Idle description lease recovery kept two statements but reduced five-run median
  time from about 8.7 ms to 1.2 ms by using simple expiry probes.

These are synthetic local PostgreSQL 16 measurements, not production capacity
estimates or evidence of the cause of a historical RDS failover. Compare plans,
buffer reads, query rates, and CPU-credit trends after deployment.

## English AI descriptions

Base descriptions use English as their canonical language. A fixed system
instruction is added even when the analysis prompt is overridden. Provider output
is parsed, checked, and converted to `EnglishDescription` before persistence.

`description_generation.py` owns a single two-request budget per claimed candidate
batch. Successful groups are retained; only missing or rejected groups are retried.
Wrong-language drafts are corrected faithfully into English. Timeouts stop immediate
retries, preserving accepted groups. Both initial analysis and background retries use
this path, including simulation providers.

Each group has one typed outcome: an accepted pair, missing output, a language issue,
or a provider failure. The result mapping is immutable. Correction inputs carry their
draft on the group itself, rather than in a separate dictionary. Retry workers select
typed generation or translation work with its required provider, without dummy providers.

The label and summary form one persistence unit. A short ambiguous label is accepted
with an English summary; confidently non-English labels are corrected. Summary
ambiguity may use the existing configured Google credentials for secondary detection.
No conversation-language hints influence this check. Detection failures and ambiguity
remain unresolved rather than being interpreted as English.

Lingua English acceptance uses its existing strong-global threshold (0.55) and relative
distance (0.2); an initial 0.8 threshold rejected ordinary English summaries in the
regression corpus. Non-English evidence requires 0.9 confidence; weaker evidence is
ambiguous and can use secondary detection. Label mismatches also require 0.9 confidence.
Foreign sentence spans are checked separately, including short sentences. Embedded
proper names do not independently trigger a mismatch. Long foreign names can still
make the whole summary ambiguous, requiring secondary detection or a correction.
These are practical detection thresholds, not calibrated probabilities or a proof
of language. Regression examples live in `tests/test_description_generation.py`.

Provider clients are initialized lazily and reused. An optional Google initialization
failure becomes a retryable detection outcome rather than preventing worker startup.
Routine generation and translation logs contain identifiers, counts, and outcomes,
not conversation text, drafts, generated summaries, or full model responses.

The first-pass scheduler retains its existing allowance of two claims; each now has
at most two provider calls. Unresolved output is released to the durable retry worker
with the existing `ai_description_retryable` code so its configured cooldown applies.
Language issue details are logged per snapshot/group without adding a separate queue.

Prompt guidance: [Mistral prompting](https://docs.mistral.ai/inference/prompting) and
[Bedrock system content](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_SystemContentBlock.html).

## License

AGPL-3.0. See [COPYING](./COPYING).
