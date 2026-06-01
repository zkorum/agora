IMAGE ?= quay.io/zkorum/agora-math-updater
TAG ?= latest

all: dev

dev:
	uv run python -m math_updater.worker

test:
	uv run --extra dev pytest -v

lint:
	uv run --extra dev ruff check

typecheck:
	uv run --extra dev basedpyright

image-buildx:
	docker buildx build --platform linux/amd64 -f Dockerfile -t $(IMAGE):$(TAG) ../..

image-push:
	docker push $(IMAGE):$(TAG)
