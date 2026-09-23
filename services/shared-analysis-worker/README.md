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
