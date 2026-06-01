# Python Worker Shared

Shared Python package for Agora background workers.

This package contains DB models, generated shared constants, Valkey queue helpers, retry state logic, AI description/translation provider helpers, and red-dwarf analysis glue used by `math-updater`, `ai-description-retry-worker`, and `description-translation-retry-worker`.

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
