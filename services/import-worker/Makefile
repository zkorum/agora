IMAGE ?= quay.io/zkorum/agora-import-worker
TAG ?= latest
TAG_ARG := $(or $(word 2,$(MAKECMDGOALS)),$(TAG))

all: dev

dev:
	uv run python -m import_worker.worker

test:
	uv run --extra dev pytest -v

lint:
	uv run --extra dev ruff check

typecheck:
	uv run --extra dev basedpyright

image-buildx:
	docker buildx build --pull --platform linux/amd64 -t $(IMAGE):$(TAG_ARG) .

image-push:
	docker push $(IMAGE):$(TAG_ARG)

%:
	@:
