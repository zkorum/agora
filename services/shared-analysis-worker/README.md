# Analysis Worker Shared

Shared Python package for Agora analysis and description workers.

This package contains DB models, generated shared constants, Valkey queue helpers, retry state logic, AI description/translation provider helpers, and red-dwarf analysis glue used by `math-updater`, `ai-description-retry-worker`, and `description-translation-retry-worker`.

Python workers share code in two ways:

- Reusable Python implementation lives here under `src/agora_analysis_worker_shared/` and is imported as the editable `agora-shared-analysis-worker` package by worker services.
- Generated files under `src/agora_analysis_worker_shared/generated_*.py` are produced from TypeScript sources in `services/shared` and `services/api/src/shared-backend/schema.ts`.

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
