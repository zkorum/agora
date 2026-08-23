IMAGE ?= quay.io/zkorum/agora-conversation-email-update-worker
TAG ?= latest
TAG_ARG := $(or $(word 2,$(MAKECMDGOALS)),$(TAG))
DEV_SCENARIO ?= simulated-success

all: dev

dev:
	../../scripts/run-worker-scenario.sh conversation-email-update-worker "$(DEV_SCENARIO)"

exercise:
	pnpm dev:exercise $(COMMAND)

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

image-buildx:
	docker buildx build --pull --platform linux/amd64 -f Dockerfile -t $(IMAGE):$(TAG_ARG) .

image-push:
	docker push $(IMAGE):$(TAG_ARG)

%:
	@:
