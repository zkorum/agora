# AI Description Retry Worker

Dedicated Python service for AI-description retry/backlog work. The main `math-updater` service owns red-dwarf analysis and immediate first-pass AI description generation.

Real Bedrock calls are enabled by default through `AI_DESCRIPTION_RETRY_WORKER_AWS_AI_LABEL_SUMMARY_ENABLE=true`. Bedrock uses normal AWS credentials plus `AI_DESCRIPTION_RETRY_WORKER_AWS_AI_LABEL_SUMMARY_*` region, model, timeout, and prompt settings; there is no explicit Bedrock URL.

```bash
make dev
```

Build and push:

```bash
make image-buildx TAG=1.0.0
make image-push TAG=1.0.0
```
