all: dev

LOG_RUNNER := node scripts/dev-log-runner.mjs
LOAD_TEST_CONVERSATIONS := $(or $(CONVERSATION_SLUG_IDS),$(conversations))
CONTENT_TRANSLATION_WORKER_DEV_SCENARIO ?= simulated-success

PYTHON_TYPECHECK_PATTERNS := \
	services/shared-analysis-worker/src/**/*.py \
	services/shared-analysis-worker/tests/**/*.py \
	services/math-updater/src/**/*.py \
	services/ai-description-retry-worker/src/**/*.py \
	services/description-translation-retry-worker/src/**/*.py \
	services/content-translation-worker/src/**/*.py \
	services/import-worker/src/**/*.py \
	services/import-worker/tests/**/*.py \
	services/scoring-worker/src/**/*.py \
	services/scoring-worker/tests/**/*.py \
	services/*/pyproject.toml

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

sync: sync-all sync-app-api sync-python-artifacts sync-api-test-db-fixtures

sync-all:
	cd services/shared && pnpm run sync

sync-app-api:
	cd services/shared-app-api && pnpm run sync

dev-sync:
	$(LOG_RUNNER) --service shared -- $(MAKE) dev-sync-raw

dev-sync-raw:
	watchman-make -p 'services/shared/src/**/*.ts' -t sync

dev-sync-app-api:
	$(LOG_RUNNER) --service shared-app-api -- $(MAKE) dev-sync-app-api-raw

dev-sync-app-api-raw:
	watchman-make -p 'services/shared-app-api/src/**/*.ts' -t sync-app-api

sync-python-artifacts: sync-python-models sync-python-shared-types sync-import-worker-contracts

sync-python-models:
	cd services/api && npx drizzle-kit export > /tmp/agora-schema.sql
	cd services/api && npx tsx scripts/sync-schema-cli.ts \
		--service scoring-worker \
		--schema-ts src/shared-backend/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output ../scoring-worker/src/scoring_worker/generated_models.py
	cd services/api && npx tsx scripts/sync-schema-cli.ts \
		--service shared-analysis-worker \
		--schema-ts src/shared-backend/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output ../shared-analysis-worker/src/agora_analysis_worker_shared/generated_models.py
	cd services/api && npx tsx scripts/sync-schema-cli.ts \
		--service import-worker \
		--schema-ts src/shared-backend/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output ../import-worker/src/import_worker/generated_models.py
	cd services/api && npx tsx scripts/sync-schema-cli.ts \
		--service content-translation-worker \
		--schema-ts src/shared-backend/schema.ts \
		--sql /tmp/agora-schema.sql \
		--output ../content-translation-worker/src/content_translation_worker/generated_models.py

sync-api-test-db-fixtures:
	cd services/api && npx drizzle-kit export > /tmp/agora-schema.sql
	cd services/api && npx tsx scripts/sync-api-test-schema-fixtures-cli.ts \
		--sql /tmp/agora-schema.sql \
		--config tests/fixtures/db/schema-fixtures.json \
		--output-dir tests/fixtures/db

sync-python-shared-types:
	cd services/api && npx tsx scripts/sync-python-shared-cli.ts \
		--shared-src ../shared/src \
		--output ../shared-analysis-worker/src/agora_analysis_worker_shared/generated_shared_types.py
	cd services/api && npx tsx scripts/sync-python-shared-cli.ts \
		--shared-src ../shared/src \
		--output ../import-worker/src/import_worker/generated_shared_types.py
	cd services/api && npx tsx scripts/sync-python-shared-cli.ts \
		--shared-src ../shared/src \
		--output ../content-translation-worker/src/content_translation_worker/generated_shared_types.py

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

typecheck-python:
	cd services/shared-analysis-worker && uv run --extra dev basedpyright
	cd services/math-updater && uv run --extra dev basedpyright
	cd services/ai-description-retry-worker && uv run --extra dev basedpyright
	cd services/description-translation-retry-worker && uv run --extra dev basedpyright
	cd services/content-translation-worker && uv run --extra dev basedpyright
	cd services/import-worker && uv run --extra dev basedpyright
	cd services/scoring-worker && uv run --extra dev basedpyright

dev-typecheck-python:
	$(LOG_RUNNER) --service python-typecheck -- $(MAKE) dev-typecheck-python-raw

dev-typecheck-python-raw:
	watchman-make $(foreach pattern,$(PYTHON_TYPECHECK_PATTERNS),-p '$(pattern)') -t typecheck-python

dev-generate:
	$(LOG_RUNNER) --service openapi -- $(MAKE) dev-generate-raw

dev-generate-raw:
	watchman-make -p 'services/api/openapi-zkorum.json' -t generate

load-test-scenario1:
ifeq ($(strip $(LOAD_TEST_CONVERSATIONS)),)
	$(error CONVERSATION_SLUG_IDS is required. Usage: make load-test-scenario1 CONVERSATION_SLUG_IDS=slug1,slug2)
endif
	services/load-testing/scripts/run-scenario1-with-monitoring.sh "$(LOAD_TEST_CONVERSATIONS)"

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

dev-math-updater-scenario:
	$(LOG_RUNNER) --service math-updater -- $(MAKE) dev-math-updater-scenario-raw

dev-math-updater-scenario-raw:
	scripts/run-worker-scenario.sh math-updater "$(SCENARIO)"

dev-ai-description-retry-worker:
	$(LOG_RUNNER) --service ai-description-retry-worker -- $(MAKE) dev-ai-description-retry-worker-raw

dev-ai-description-retry-worker-raw:
	cd services/ai-description-retry-worker && $(MAKE) dev

dev-ai-description-retry-worker-scenario:
	$(LOG_RUNNER) --service ai-description-retry-worker -- $(MAKE) dev-ai-description-retry-worker-scenario-raw

dev-ai-description-retry-worker-scenario-raw:
	scripts/run-worker-scenario.sh ai-description-retry-worker "$(SCENARIO)"

dev-ai-description-worker: dev-ai-description-retry-worker

dev-description-translation-retry-worker:
	$(LOG_RUNNER) --service description-translation-retry-worker -- $(MAKE) dev-description-translation-retry-worker-raw

dev-description-translation-retry-worker-raw:
	cd services/description-translation-retry-worker && $(MAKE) dev

dev-description-translation-retry-worker-scenario:
	$(LOG_RUNNER) --service description-translation-retry-worker -- $(MAKE) dev-description-translation-retry-worker-scenario-raw

dev-description-translation-retry-worker-scenario-raw:
	scripts/run-worker-scenario.sh description-translation-retry-worker "$(SCENARIO)"

dev-description-translation-worker: dev-description-translation-retry-worker

dev-content-translation-worker:
	$(LOG_RUNNER) --service content-translation-worker -- $(MAKE) dev-content-translation-worker-scenario-raw SCENARIO="$(CONTENT_TRANSLATION_WORKER_DEV_SCENARIO)"

dev-content-translation-worker-raw:
	cd services/content-translation-worker && PYTHONUNBUFFERED=1 uv run python -m content_translation_worker.worker

dev-content-translation-worker-scenario:
	$(LOG_RUNNER) --service content-translation-worker -- $(MAKE) dev-content-translation-worker-scenario-raw

dev-content-translation-worker-scenario-raw:
	scripts/run-worker-scenario.sh content-translation-worker "$(or $(SCENARIO),$(CONTENT_TRANSLATION_WORKER_DEV_SCENARIO))"

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
