# Agora Citizen Network

Monorepo for [Agora Citizen Network](https://agoracitizen.network).

## About

We are at a critical moment where social media platforms are increasingly evolving into tools of computational propaganda (the use of bots and algorithms to manipulate public opinion), polarizing society, and threatening democratic values worldwide. Recent advancements in AI have unfortunately accelerated this dangerous trend.

**Agora Citizen Network** was born out of our belief that digital public spaces must be intentionally designed to strengthen the social fabric of our societies. We envision a future where technology transforms social diversity into a catalyst for progress, rather than a driver of division.

### What we're doing differently

- Using zero-knowledge proof (ZKP) cryptography, Agora allows users to anonymously prove they are human - not bots - without disclosing any personal information to anyone, including us.
- Besides, most social networks today use engagement-based ranking algorithms designed to maximize user attention and engagement. Unfortunately, these algorithms often promote polarizing content, which tends to attract the most attention, whether good or bad. In contrast, Agora employs bridging-based ranking algorithms that aim to highlight content appreciated by users across different political viewpoints. The goal is not to censor extreme opinions but to preserve a rich diversity of viewpoints and identify common ground.
- Additionally, we plan to build on top of [DDS (Decentralized Deliberation Standard)](https://github.com/dds-wg/dds), an open protocol for sovereign, verifiable, interoperable, and resilient deliberation at scale. DDS is built on AT Protocol for transport, decentralized storage for archival, and Ethereum for tamper-evident verification.

#### Check out and vote on the roadmap [here](https://www.agoracitizen.app/conversation/nRAynpw)

## Development

### Prerequisites

Install:

- rsync
- make
- [jq](https://jqlang.github.io/jq/)
- sed
- bash
- [Node.js](https://nodejs.org/) 26.13.1 LTS (matches `.nvmrc` and the Docker builds)
- [pnpm](https://pnpm.io/) 12.4.1
- [watchman](https://facebook.github.io/watchman/)
- [docker](https://www.docker.com/)

### Node.js version

From the repository root, use [nvm](https://github.com/nvm-sh/nvm) to install and
select the pinned runtime:

```bash
nvm install
nvm use
nvm alias default 26.13.1
npm install --global pnpm@12.4.1
```

Restart running development services after switching Node; existing processes keep
their original runtime. CI reads `.nvmrc`; Netlify and Docker builds pin the same
version explicitly.

The project uses Node.js 26.13.1 LTS, including the fixes from the
[November 2026 Node.js security releases](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases).
Rebuild affected Docker images with `--pull --no-cache`, publish fresh tags, and
redeploy the API, conversation-email-update-worker, Agora frontend, and Netlify landing page.
Existing images and running processes do not pick up the patched runtime automatically.

Check runtime pins and supported minimums with:

```bash
node --test scripts/node-configuration.test.mjs
```

### Python TLS trust updates

Python worker and experiments projects require uv 0.13.4 or newer and certifi
2026.10.19 or newer for the October 2026 eMudhra CA compromise. Docker builds
enforce patched CA packages. Rebuild images with `--pull --no-cache`, refresh local
environments with `uv sync --locked`, and restart running workers.

Local Python worker `make dev` targets and scenario launches automatically select
the patched certifi bundle for gRPC, whose bundled roots are independent of
Python's normal HTTPS trust store. Explicit `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH`
overrides must point to an updated bundle too.

Worker Dockerfiles bootstrap pip from the Python advisory's hash-pinned wheel
before downloading other packages. Standalone Python installations outside the
project virtual environments need their own pip and certifi upgrades.

### Package-manager configuration

All nine JavaScript services pin `pnpm@12.4.1` in `package.json`, and the API,
Agora, and conversation-email-update-worker Docker build stages use that same
version, installed through npm because Node.js 26 no longer bundles Corepack.
Each service's `pnpm-workspace.yaml` is used for both local and Docker
installs. Run `pnpm install --frozen-lockfile` from the service directory after
pulling dependency changes.

pnpm 12 reads overrides, patches, and dependency build permissions from
`pnpm-workspace.yaml`, not a `pnpm` block in `package.json`. Use explicit
`allowBuilds` booleans: `true` for required installation scripts, `false` for
scripts intentionally skipped. Keep the five-day `minimumReleaseAge` policy
and existing narrowly scoped exceptions. Commit the workspace configuration
and regenerated lockfile together; do not commit pnpm's unresolved
`set this to true or false` placeholders.

The API enables OpenCC and esbuild installation scripts. Testcontainers' optional
SSH native accelerators use their JavaScript fallback, so local installs do not
require a separate node-gyp installation for those accelerators. Shared-backend
explicitly skips protobufjs's optional postinstall script.

Check package-manager configuration consistency with:

```bash
node --test scripts/pnpm-configuration.test.mjs
```

## Services

For detailed information about each service, licenses, and documentation, see [COPYING-README.md](./COPYING-README.md).

### Frontend

**[Landing Page](./services/app)** - A SvelteKit application for the public Agora Citizen Network website.

**[Agora](./services/agora)** - A Quasar application (Vue.js frontend) providing the user interface for Agora Citizen Network.

### Backend Services

**[API](./services/api)** - A Fastify application supported by a PostgreSQL database. Main backend API handling user requests, authentication, voting, and conversation management.

**[Conversation Email Updates Worker](./services/conversation-email-update-worker)** - Independent TypeScript worker that processes PostgreSQL-backed delivery work and SES events. The API verifies and stores SNS events; the worker renders localized messages, sends them through SESv2, and durably updates delivery state.

**[Math Updater](./services/math-updater)** - Python background worker that runs <a href="https://github.com/polis-community/red-dwarf"><u>red-dwarf</u></a> opinion-group analysis and generates AI-powered cluster insights using LLM models.

**[AI Description Retry Worker](./services/ai-description-retry-worker)** - Python worker that retries and backfills AI-generated opinion-group labels and summaries requested by analysis views.

**[Description Translation Retry Worker](./services/description-translation-retry-worker)** - Python worker that retries and backfills translated opinion-group labels and summaries for requested display languages.

**[Content Translation Worker](./services/content-translation-worker)** - Python worker that processes durable content translation work and stores translated dynamic user content.

**[Import Worker](./services/import-worker)** - Python worker that consumes conversation import jobs and imports Polis URLs or CSV archives.

**[Scoring Worker](./services/scoring-worker)** - Python worker that runs [Solidago](https://solidago.tournesol.app/) algorithm to produce community rankings from MaxDiff (Best-Worst Scaling) comparisons. Uses Valkey for job queuing and supports parallel scoring.

### Shared Libraries

**[Shared](./services/shared)** - Common TypeScript code synced to TypeScript services and used as a source for generated Python worker artifacts.

**[Shared App-API](./services/shared-app-api)** - TypeScript code shared specifically between the frontend (agora) and API service.

**[Shared Backend](./services/shared-backend)** - Canonical Drizzle schema and TypeScript backend source synced into API and explicit TypeScript workers.

**[Shared Analysis Worker](./services/shared-analysis-worker)** - Shared Python package used by analysis and description workers for generated models/types, queue helpers, retry logic, AI providers, and red-dwarf integration.

### Development Tools

**[LLM](./services/llm)** - LLM prompts and Python scripts for AI-related development.

**[Load Testing](./services/load-testing)** - k6 scenarios and monitoring support for exercising Agora under load.

**[X Analyzer](./services/x-analyzer)** - X/Twitter reply and quote-tweet analyzer for producing Polis-compatible import data.

### OpenAPI

We generate an `openapi-zkorum.json` file from the backend, and then use [openapi-generator-cli](https://openapi-generator.tech/) to generate the corresponding frontend client.

### Getting started

Please read the README for the service you are working on. Start with `/services/app`, `/services/agora`, `/services/api`, and the worker directory you are running.

### Run in dev mode

| Service | Command |
| --- | --- |
| Landing page | `make dev-landing` |
| Agora frontend | `make dev-app` |
| API | `make dev-api` |
| Conversation Email Updates worker | `make dev-conversation-email-update-worker` |
| Math updater | `make dev-math-updater` |
| AI description retry worker | `make dev-ai-description-retry-worker` |
| Description translation retry worker | `make dev-description-translation-retry-worker` |
| Content translation worker | `make dev-content-translation-worker` |
| Import worker | `make dev-import-worker` |
| Scoring worker | `make dev-scoring-worker` |
| X analyzer | `make dev-x-analyzer` |

### Development logs

Root `make dev-*` targets write durable logs under `.local/logs` while still streaming output to the terminal or kitty tab.

```bash
make logs
make logs-tail service=api
make logs-clean
```

Log layout:

- `.local/logs/runs/<run-id>/<service>.log` stores each captured service run.
- `.local/logs/latest/<service>.log` points to the latest run for quick inspection.
- `.local/logs/latest/<service>.events.jsonl` stores semantic load-test events emitted with `AGORA_LOAD_EVENT`.
- `.local/logs/latest/<service>-browser.jsonl` stores dev-browser events emitted by the Quasar frontend.
- `.local/logs/latest/<service>.summary.json` stores k6 summaries when available.

Use `rg` directly for searches, for example `rg "error|failed" .local/logs/latest/api.log`. Logs rotate at 25 MB per file, keep 5 files per service, prune runs older than 7 days, and cap total run storage at 750 MB by default. Override with `AGORA_LOG_DIR`, `AGORA_LOG_RUN_ID`, `AGORA_LOG_MAX_BYTES`, `AGORA_LOG_MAX_FILES`, `AGORA_LOG_RETENTION_DAYS`, or `AGORA_LOG_MAX_TOTAL_BYTES`.

`run_all_in_kitty_tabs.sh` exports one shared `AGORA_LOG_RUN_ID`, so all tabs from the same launch land in the same run directory.

API logging supports `API_LOG_LEVEL` (default `info`) and opt-in
`API_LOG_SQL_QUERIES=true` (SQL templates at DEBUG, never parameter values).
`API_RANKING_PERFORMANCE_ENABLED=true` and
`SCORING_WORKER_PERFORMANCE_ENABLED=true` emit ranking timings through the same
`AGORA_LOAD_EVENT` capture path. See the [ranking performance workflow](services/load-testing/PERFORMANCE.md)
for database preparation, reproducible workload strategies, and run reports.

### Shared

Some typescript source files are shared directly without using npm packages - by copy-pasting using rsync.

Use these commands to automatically rsync universal and backend shared files:

```
make dev-sync
make dev-sync-ts-backend
```

### OpenAPI

Automatically generate frontend stub from backends and subsequent openapi changes:

```
make dev-generate
```

... and start coding!

## Deployment

### Building worker images

All six Python workers and the Conversation Email Updates worker support the same
build-cache option. Run these commands from the worker's service directory:

```bash
# Normal build: check for a newer base image and reuse cached build steps.
make image-buildx TAG=YOUR_TAG

# Fresh rebuild: also rerun every build step, including package installation.
make image-buildx TAG=YOUR_TAG NO_CACHE=1

# Publish the image, then update the deployment's image reference and restart it.
make image-push TAG=YOUR_TAG

# Inspect the fresh-build command without executing it.
make -n image-buildx TAG=YOUR_TAG NO_CACHE=1
```

The scoring worker's optional GPU target supports the same option:
`make image-buildx-gpu GPU_TAG=YOUR_GPU_TAG NO_CACHE=1`, followed by
`make image-push-gpu GPU_TAG=YOUR_GPU_TAG`.

`--pull` is always enabled: it checks for an updated base image. `NO_CACHE=1`
additionally passes Docker's `--no-cache`, preventing reuse of previously built
layers. This is useful after an OS-package or certificate-trust security update,
when package repositories have changed without a Dockerfile change, or when
troubleshooting an unexpectedly stale build. A cached package-install layer does
not rerun just because new packages are available upstream. Likewise, pip's
`--no-cache-dir` only controls pip's download cache; Docker can still reuse the
entire installation layer.

Use cached builds for routine development: fresh rebuilds take longer and download
more data. Omit `NO_CACHE` or use `NO_CACHE=0` to keep the default behavior. A fresh
rebuild does not update lockfiles or override pinned dependency versions; those
still need explicit updates when a fix requires a newer version. Rebuilding alone
does not replace running containers, so publish and deploy the new image tag too.

See the [production Compose configuration](scripts/infra/docker-compose-production.yml)
for service wiring and each service's README for its runtime configuration.

## Embedding Agora on your website

Refer to [the embed documentation](./doc/embed.md).

## Security disclosures

If you discover any security issues, please send an email to <security@zkorum.com>. The email is automatically CCed to the entire team, and we'll respond promptly. See [SECURITY](./SECURITY.md) for more info.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

See [COPYING-README](COPYING-README.md)

## Acknowledgements

<img src="https://ngi.eu/wp-content/uploads/2019/06/Logo-NGI_Explicit-with-baseline-rgb.png" width="200" alt="NGI">

This project has received funding from the European Union's Horizon Europe 2020 research and innovation program through the [NGI TRUSTCHAIN](https://trustchain.ngi.eu/) program under cascade funding agreement No. 101093274 and the [NGI SARGASSO](https://ngisargasso.eu/) project under grant agreement No. 101092887.

In terms of source code, the NGI SARGASSO program exclusively funded the integration with Rarimo. For detailed information, please refer to the commit messages and file headers.
