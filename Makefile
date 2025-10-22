all: dev

generate:
	docker run --rm \
		-v ${PWD}:/local openapitools/openapi-generator-cli:v7.12.0 generate \
		-i /local/services/api/openapi-zkorum.json \
		-g typescript-axios \
		-o /local/services/agora/src/api
	docker run --rm \
		-v ${PWD}:/local openapitools/openapi-generator-cli:v7.12.0 generate \
		-i /local/services/api/openapi-zkorum.json \
		-g typescript-axios \
		-o /local/services/load-testing/src/api

sync: sync-all sync-app-api sync-backend

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

dev-generate:
	watchman-make -p 'services/api/openapi-zkorum.json' -t generate

dev-app:
	cd services/agora && yarn dev 

dev-api:
	cd services/api && pnpm start:dev

dev-math-updater:
	cd services/math-updater && pnpm start:dev

dev-polis:
	cd services/python-bridge && source .venv/bin/activate && gunicorn -c gunicorn.conf.py main:app
