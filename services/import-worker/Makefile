IMAGE ?= quay.io/zkorum/agora-import-worker

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
	docker buildx build --platform linux/amd64 -t $(IMAGE):latest .
