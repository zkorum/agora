IMAGE ?= quay.io/zkorum/agora-content-translation-worker
TAG ?= latest
TAG_ARG := $(or $(word 2,$(MAKECMDGOALS)),$(TAG))

all: dev

dev:
	PYTHONUNBUFFERED=1 uv run python -m content_translation_worker.worker

lint:
	uv run --extra dev ruff check .

typecheck:
	uv run --extra dev basedpyright

test:
	uv run --extra dev python -m pytest

image-buildx:
	docker buildx build --pull --platform linux/amd64 -f Dockerfile -t $(IMAGE):$(TAG_ARG) ../..

image-push:
	docker push $(IMAGE):$(TAG_ARG)

%:
	@:
