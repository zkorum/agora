# Shared language detection

Small typed Python package shared by import and analysis workers. It provides a
cached Lingua detector and a credential-independent Google detection adapter.
Google failures remain distinct from genuinely unknown languages.

Consumer policy belongs to the consumer: import-language hints, supported-language
mapping, and Chinese-script normalization remain in `import-worker`; acceptance of
English AI descriptions lives in `shared-analysis-worker/description_language.py`.

Like the existing shared analysis package, this is a local Python dependency,
installed editable by uv during development and installed into Docker images.
It is not an rsync-generated copy. Consumers declare the path in `[tool.uv.sources]`.

Run checks using the shared analysis development environment:

```bash
# From services/shared-analysis-worker
uv run --extra dev python -m basedpyright ../shared-language/src
uv run --extra dev python -m ruff check ../shared-language/src
```
