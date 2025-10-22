# Agora Python Bridge

This is a bridge for Agora Node backend API to communicate internally with Python.

All the data science libraries we are using are written in Python, including [reddwarf](https://github.com/polis-community/red-dwarf).

## Why Gunicorn?

**Gunicorn is used in both development and production** to handle concurrent math calculations.

The basic Flask dev server is **single-threaded** and processes requests sequentially. With the math-updater configured for concurrency of 10, all requests would queue up and process one at a time, making it impossible to test realistic behavior.

**Gunicorn with 10 workers** (matching math-updater concurrency):
- Uses **multiprocessing** to bypass Python's GIL (Global Interpreter Lock)
- Each worker runs on a separate CPU core (ideal for CPU-intensive PCA/clustering)
- Handles up to 10 concurrent math calculations simultaneously
- Essential for testing math-updater's singleton policy, rate limiting, and queue management

## Development

Install Python 3.11 or insure your python verison is compliant to the minimum requirement. We recommend using [pyenv](https://github.com/pyenv/pyenv) for managing python versions.

Create a virual env to better manage your python dependancies by running `python3 -m venv .venv` or equivalent.

Activate the virutal env by running `source .venv/bin/activate`

Install dependencies using `pip install '.[dev]'` (If you encounter issues with Python wheels, try to install the dependencies in a separate pip command, close your editor and move to next step. A failed pip install will lead to an inability to run the app.)

And finally run the app with:
- `make dev` - Runs with Gunicorn (10 workers, handles concurrent requests)
- `make dev-simple` - Runs with Flask dev server (single-threaded, for debugging only)

Pro tip: if you change the dependencies in pyproject.toml, you must force reinstall: `pip install --force-reinstall --no-cache-dir .`

### Configuration

The Gunicorn server can be configured via environment variables:
- `GUNICORN_WORKERS`: Number of worker processes (default: 10, matches math-updater concurrency)
- `GUNICORN_TIMEOUT`: Request timeout in seconds (default: 240, large conversations take 50-85s)

## Production

Production uses Gunicorn with the same configuration (10 workers, 240s timeout). Build the docker image, publish it and pull it.

## License

See [COPYING](./COPYING)
