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
- [pnpm](https://pnpm.io/)
- [watchman](https://facebook.github.io/watchman/)
- [docker](https://www.docker.com/)

## Services

For detailed information about each service, licenses, and documentation, see [COPYING-README.md](./COPYING-README.md).

### Frontend

**[Landing Page](./services/app)** - A SvelteKit application for the public Agora Citizen Network website.

**[Agora](./services/agora)** - A Quasar application (Vue.js frontend) providing the user interface for Agora Citizen Network.

### Backend Services

**[API](./services/api)** - A Fastify application supported by a PostgreSQL database. Main backend API handling user requests, authentication, voting, and conversation management.

**[Math Updater](./services/math-updater)** - Python background worker that runs <a href="https://github.com/polis-community/red-dwarf"><u>red-dwarf</u></a> opinion-group analysis and generates AI-powered cluster insights using LLM models.

**[AI Description Retry Worker](./services/ai-description-retry-worker)** - Python worker that retries and backfills AI-generated opinion-group labels and summaries requested by analysis views.

**[Description Translation Retry Worker](./services/description-translation-retry-worker)** - Python worker that retries and backfills translated opinion-group labels and summaries for requested display languages.

**[Content Translation Worker](./services/content-translation-worker)** - Python worker that processes durable content translation work and stores translated dynamic user content.

**[Import Worker](./services/import-worker)** - Python worker that consumes conversation import jobs and imports Polis URLs or CSV archives.

**[Scoring Worker](./services/scoring-worker)** - Python worker that runs [Solidago](https://solidago.tournesol.app/) algorithm to produce community rankings from MaxDiff (Best-Worst Scaling) comparisons. Uses Valkey for job queuing and supports parallel scoring.

### Shared Libraries

**[Shared](./services/shared)** - Common TypeScript code synced to TypeScript services and used as a source for generated Python worker artifacts.

**[Shared App-API](./services/shared-app-api)** - TypeScript code shared specifically between the frontend (agora) and API service.

**[Shared Analysis Worker](./services/shared-analysis-worker)** - Shared Python package used by analysis and description workers for generated models/types, queue helpers, retry logic, AI providers, and red-dwarf integration.

### Development Tools

**[LLM](./services/llm)** - LLM prompts and Python scripts for AI-related development.

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

### Shared

Some typescript source files are shared directly without using npm packages - by copy-pasting using rsync.

Use these commands to automatically rsync shared files to back and front:

```
make dev-sync
```

### OpenAPI

Automatically generate frontend stub from backends and subsequent openapi changes:

```
make dev-generate
```

... and start coding!

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
