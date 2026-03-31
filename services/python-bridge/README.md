# Agora Python Bridge

Bridge for the Agora Node backend to communicate with Python data science libraries. Handles Polis clustering (opinion groups, PCA) via [reddwarf](https://github.com/polis-community/red-dwarf) and Polis conversation imports.

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/import` | GET | Load Polis conversation data for import |
| `/math` | POST | Run reddwarf clustering (PCA, opinion groups, consensus) |

## Why Gunicorn?

**Gunicorn is used in both development and production** to handle concurrent math calculations.

The basic Flask dev server is **single-threaded** and processes requests sequentially. With the math-updater configured for concurrency of 10, all requests would queue up and process one at a time.

**Gunicorn with 10 workers** (matching math-updater concurrency):
- Uses **multiprocessing** to bypass Python's GIL
- Each worker runs on a separate CPU core (ideal for CPU-intensive PCA/clustering)
- Handles up to 10 concurrent math calculations simultaneously

## Development

Requires Python 3.13+. We recommend [pyenv](https://github.com/pyenv/pyenv) for managing Python versions.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install '.[dev]'

# Run with Gunicorn (10 workers, handles concurrent requests)
make dev

# Run with Flask dev server (single-threaded, for debugging only)
make dev-simple
```

If you change dependencies in `pyproject.toml`: `pip install --force-reinstall --no-cache-dir .`

### Configuration

- `GUNICORN_WORKERS`: Number of worker processes (default: 10, matches math-updater concurrency)
- `GUNICORN_TIMEOUT`: Request timeout in seconds (default: 240, large conversations take 50-85s)

## License

AGPL-3.0. See [COPYING](./COPYING).
