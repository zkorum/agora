IMAGE ?= quay.io/zkorum/agora-scoring-worker

all: dev

dev:
	uv run python -m scoring_worker.worker

test:
	uv run pytest -v

lint:
	uv run ruff check

typecheck:
	uv run basedpyright

image-buildx:
	docker buildx build --platform linux/amd64 --build-arg PIP_INSTALL_TARGET=. -t $(IMAGE):latest .

image-buildx-gpu:
	docker buildx build --platform linux/amd64 --build-arg "PIP_INSTALL_TARGET=.[gpu]" -t $(IMAGE):gpu .
