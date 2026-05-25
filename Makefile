all: dev

LOG_RUNNER := node scripts/dev-log-runner.mjs

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

sync: sync-all sync-app-api sync-ts-backend sync-python-artifacts

sync-all:
	cd services/shared && pnpm run sync

sync-app-api:
	cd services/shared-app-api && pnpm run sync

# TypeScript backend consumers of shared-backend/src. This is intentionally an
# explicit TS boundary (currently API and future TS agents such as the deletion
# agent), not a generic Python worker sync.
sync-ts-backend:
	cd services/shared-backend && pnpm run sync

# Backward-compatible alias for existing scripts/docs.
sync-backend: sync-ts-backend

dev-sync:
	$(LOG_RUNNER) --service shared -- $(MAKE) dev-sync-raw

dev-sync-raw:
	watchman-make -p 'services/shared/src/**/*.ts' -t sync

dev-sync-app-api:
	$(LOG_RUNNER) --service shared-app-api -- $(MAKE) dev-sync-app-api-raw

dev-sync-app-api-raw:
	watchman-make -p 'services/shared-app-api/src/**/*.ts' -t sync-app-api

dev-sync-ts-backend:
	$(LOG_RUNNER) --service shared-backend -- $(MAKE) dev-sync-ts-backend-raw

dev-sync-ts-backend-raw:
	watchman-make -p 'services/shared-backend/src/**/*.ts' -t sync-ts-backend

# Backward-compatible alias for existing scripts/docs.
dev-sync-backend: dev-sync-ts-backend

sync-python-artifacts: sync-python-models sync-python-shared-types sync-import-worker-contracts

sync-python-models: sync-ts-backend
	cd services/api && npx drizzle-kit export > /tmp/agora-schema.sql
	cd services/shared-backend && npx tsx scripts/sync-schema-cli.ts \
		--service scoring-worker \
		--schema-ts src/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output ../scoring-worker/src/scoring_worker/generated_models.py
	cd services/shared-backend && npx tsx scripts/sync-schema-cli.ts \
		--service math-updater \
		--schema-ts src/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output ../math-updater/src/math_updater/generated_models.py
	cd services/shared-backend && npx tsx scripts/sync-schema-cli.ts \
		--service import-worker \
		--schema-ts src/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output ../import-worker/src/import_worker/generated_models.py

sync-python-shared-types:
	cd services/shared-backend && npx tsx scripts/sync-python-shared-cli.ts \
		--shared-src ../shared/src \
		--output ../math-updater/src/math_updater/generated_shared_types.py
	cd services/shared-backend && npx tsx scripts/sync-python-shared-cli.ts \
		--shared-src ../shared/src \
		--output ../import-worker/src/import_worker/generated_shared_types.py

sync-import-worker-contracts:
	cd services/api && npx tsx scripts/export-import-worker-contract-schema.ts /tmp/agora-import-worker-contract.schema.json
	cd services/import-worker && uv run --extra dev datamodel-codegen \
		--input /tmp/agora-import-worker-contract.schema.json \
		--input-file-type jsonschema \
		--output src/import_worker/generated_import_contracts.py \
		--output-model-type pydantic_v2.BaseModel \
		--target-python-version 3.13 \
		--target-pydantic-version 2.11 \
		--use-standard-collections \
		--use-union-operator \
		--snake-case-field \
		--field-constraints \
		--reuse-model \
		--collapse-root-models \
		--use-default \
		--strict-nullable \
		--allow-population-by-field-name \
		--disable-timestamp \
		--formatters ruff-format ruff-check

# Backward-compatible alias for existing scripts/docs.
sync-python-shared: sync-python-shared-types sync-import-worker-contracts

dev-generate:
	$(LOG_RUNNER) --service openapi -- $(MAKE) dev-generate-raw

dev-generate-raw:
	watchman-make -p 'services/api/openapi-zkorum.json' -t generate

dev-app:
	$(LOG_RUNNER) --service agora -- $(MAKE) dev-app-raw

dev-app-raw:
	cd services/agora && pnpm dev

dev-landing:
	$(LOG_RUNNER) --service app -- $(MAKE) dev-landing-raw

dev-landing-raw:
	cd services/app && pnpm dev

dev-api:
	$(LOG_RUNNER) --service api -- $(MAKE) dev-api-raw

dev-api-raw:
	cd services/api && pnpm start:dev

dev-math-updater:
	$(LOG_RUNNER) --service math-updater -- $(MAKE) dev-math-updater-raw

dev-math-updater-raw:
	cd services/math-updater && AGORA_DEV_MODE=true PYTHONUNBUFFERED=1 uv run python -m math_updater.worker

dev-ai-description-worker:
	$(LOG_RUNNER) --service ai-description-worker -- $(MAKE) dev-ai-description-worker-raw

dev-ai-description-worker-raw:
	cd services/math-updater && AGORA_DEV_MODE=true PYTHONUNBUFFERED=1 uv run python -m math_updater.ai_description_worker

dev-description-translation-worker:
	$(LOG_RUNNER) --service description-translation-worker -- $(MAKE) dev-description-translation-worker-raw

dev-description-translation-worker-raw:
	cd services/math-updater && AGORA_DEV_MODE=true PYTHONUNBUFFERED=1 uv run python -m math_updater.description_translation_worker

dev-import-worker:
	$(LOG_RUNNER) --service import-worker -- $(MAKE) dev-import-worker-raw

dev-import-worker-raw:
	cd services/import-worker && PYTHONUNBUFFERED=1 uv run python -m import_worker.worker

dev-x-analyzer:
	$(LOG_RUNNER) --service x-analyzer -- $(MAKE) dev-x-analyzer-raw

dev-x-analyzer-raw:
	cd services/x-analyzer && pnpm start:dev

dev-scoring-worker:
	$(LOG_RUNNER) --service scoring-worker -- $(MAKE) dev-scoring-worker-raw

dev-scoring-worker-raw:
	cd services/scoring-worker && PYTHONUNBUFFERED=1 uv run python -m scoring_worker.worker

logs:
	node scripts/dev-logs.mjs list

logs-tail:
	node scripts/dev-logs.mjs tail --service "$(service)"

logs-clean:
	node scripts/dev-logs.mjs clean
