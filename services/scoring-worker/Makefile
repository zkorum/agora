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
	docker buildx build --platform linux/amd64 -t quay.io/zkorum/agora-scoring-worker:latest .
