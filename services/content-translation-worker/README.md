# Content Translation Worker

Processes durable `content_translation_work` rows and stores translated dynamic user content.

## Configuration

Environment variables are parsed with Pydantic settings and invalid values fail startup.

Required variables for the real Google provider:

- `CONTENT_TRANSLATION_WORKER_CONNECTION_STRING` or `CONNECTION_STRING`
- `CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER=google`
- `CONTENT_TRANSLATION_WORKER_GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS`

Optional Google model override:

- `CONTENT_TRANSLATION_WORKER_GOOGLE_CLOUD_TRANSLATION_MODEL`
- fallback alias: `GOOGLE_CLOUD_TRANSLATION_MODEL`

Allowed model values:

- `general/translation-llm` (default)
- `general/nmt`

The worker builds the full Google model path from the validated enum value:
`projects/<project-id>/locations/<location>/models/<model>`.

Local simulation:

```bash
make dev-content-translation-worker-scenario SCENARIO=simulated-success
./run_all_in_kitty_tabs.sh --simulate-workers content-translation-worker=simulated-success
```

Simulation uses `CONTENT_TRANSLATION_WORKER_TRANSLATION_PROVIDER=simulated` and never initializes Google credentials. The worker still claims durable `content_translation_work` rows and writes normal translation result rows/events.
