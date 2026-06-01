IMAGE ?= quay.io/zkorum/agora-ai-description-retry-worker
TAG ?= latest
TAG_ARG := $(or $(word 2,$(MAKECMDGOALS)),$(TAG))

all: dev

dev:
	AGORA_DEV_MODE=true PYTHONUNBUFFERED=1 uv run python -m ai_description_retry_worker.worker

lint:
	uv run --extra dev ruff check

typecheck:
	uv run --extra dev basedpyright

image-buildx:
	docker buildx build --pull --platform linux/amd64 -f Dockerfile -t $(IMAGE):$(TAG_ARG) ../..

image-push:
	docker push $(IMAGE):$(TAG_ARG)

%:
	@:
