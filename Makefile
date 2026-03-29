all: dev

generate:
	docker run --rm \
		-v ${PWD}:/local openapitools/openapi-generator-cli generate \
		-i /local/services/api/openapi-zkorum.json \
		-g typescript-axios \
		-o /local/services/agora/src/api
	docker run --rm \
		-v ${PWD}:/local openapitools/openapi-generator-cli generate \
		-i /local/services/api/openapi-zkorum.json \
		-g typescript-axios \
		-o /local/services/load-testing/src/api

sync: sync-all sync-app-api sync-backend sync-python-models

sync-all:
	cd services/shared && pnpm run sync

sync-app-api:
	cd services/shared-app-api && pnpm run sync

sync-backend:
	cd services/shared-backend && pnpm run sync

dev-sync:
	watchman-make -p 'services/shared/src/**/*.ts' -t sync

dev-sync-app-api:
	watchman-make -p 'services/shared-app-api/src/**/*.ts' -t sync-app-api

dev-sync-backend:
	watchman-make -p 'services/shared-backend/src/**/*.ts' -t sync-backend

sync-python-models:
	cd services/api && npx drizzle-kit export > /tmp/agora-schema.sql
	node script/sync-schema.mjs \
		--service scoring-worker \
		--schema-ts services/shared-backend/src/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output services/scoring-worker/src/scoring_worker/generated_models.py

dev-sync-python-models:
	watchman-make -p 'services/shared-backend/src/schema.ts' -t sync-python-models

dev-generate:
	watchman-make -p 'services/api/openapi-zkorum.json' -t generate

dev-app:
	cd services/agora && pnpm dev

dev-app-new:
	cd services/app && pnpm dev

dev-api:
	cd services/api && pnpm start:dev

dev-math-updater:
	cd services/math-updater && pnpm start:dev

dev-x-analyzer:
	cd services/x-analyzer && pnpm start:dev

dev-polis:
	cd services/python-bridge && source .venv/bin/activate && make dev

dev-scoring-worker:
	cd services/scoring-worker && uv run python -m scoring_worker.worker
