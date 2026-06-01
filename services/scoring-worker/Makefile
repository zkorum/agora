IMAGE ?= quay.io/zkorum/agora-scoring-worker
TAG ?= latest
GPU_TAG ?= gpu

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
	docker buildx build --pull --platform linux/amd64 --build-arg PIP_INSTALL_TARGET=. -t $(IMAGE):$(TAG) .

image-buildx-gpu:
	docker buildx build --pull --platform linux/amd64 --build-arg "PIP_INSTALL_TARGET=.[gpu]" -t $(IMAGE):$(GPU_TAG) .

image-push:
	docker push $(IMAGE):$(TAG)

image-push-gpu:
	docker push $(IMAGE):$(GPU_TAG)
