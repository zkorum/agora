# Description Translation Retry Worker

Dedicated Python service for description-translation retry/backlog work. The main `math-updater` service owns red-dwarf analysis and immediate first-pass translation when translation is enabled.

Bedrock translation is enabled by default through `DESCRIPTION_TRANSLATION_RETRY_WORKER_AWS_DESCRIPTION_TRANSLATION_ENABLE=true`. Bedrock uses normal AWS credentials plus `DESCRIPTION_TRANSLATION_RETRY_WORKER_AWS_DESCRIPTION_TRANSLATION_*` region, model, timeout, and prompt settings; there is no explicit Bedrock URL. Configure `DESCRIPTION_TRANSLATION_RETRY_WORKER_GOOGLE_APPLICATION_CREDENTIALS` or `DESCRIPTION_TRANSLATION_RETRY_WORKER_GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY` to enable Google fallback/direct translation.

```bash
make dev
```

Build and push:

```bash
make image-buildx TAG=1.0.0
make image-push TAG=1.0.0
```
