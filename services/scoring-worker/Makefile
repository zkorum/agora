IMAGE ?= quay.io/zkorum/agora-scoring-worker

all: dev

dev:
	uv run python -m scoring_worker.worker

test:
	uv run --extra dev pytest -v

lint:
	uv run --extra dev ruff check

typecheck:
	uv run --extra dev basedpyright

image-buildx:
	docker buildx build --pull --platform linux/amd64 --build-arg PIP_INSTALL_TARGET=. -t $(IMAGE):latest .

image-buildx-gpu:
	docker buildx build --pull --platform linux/amd64 --build-arg "PIP_INSTALL_TARGET=.[gpu]" -t $(IMAGE):gpu .
