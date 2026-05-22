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
	watchman-make -p 'services/shared/src/**/*.ts' -t sync

dev-sync-app-api:
	watchman-make -p 'services/shared-app-api/src/**/*.ts' -t sync-app-api

dev-sync-ts-backend:
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
	watchman-make -p 'services/api/openapi-zkorum.json' -t generate

dev-app:
	cd services/agora && pnpm dev

dev-app-new:
	cd services/app && pnpm dev

dev-api:
	cd services/api && pnpm start:dev

dev-math-updater:
	cd services/math-updater && uv run python -m math_updater.worker

dev-ai-description-worker:
	cd services/math-updater && uv run python -m math_updater.ai_description_worker

dev-description-translation-worker:
	cd services/math-updater && uv run python -m math_updater.description_translation_worker

dev-import-worker:
	cd services/import-worker && uv run python -m import_worker.worker

dev-x-analyzer:
	cd services/x-analyzer && pnpm start:dev

dev-scoring-worker:
	cd services/scoring-worker && uv run python -m scoring_worker.worker
