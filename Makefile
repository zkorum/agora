all: dev

generate:
	docker run --rm \
		-v ${PWD}:/local openapitools/openapi-generator-cli:v7.12.0 generate \
		-i /local/services/api/openapi-zkorum.json \
		-g typescript-axios \
		-o /local/services/agora/src/api

sync:
	cd services/shared && pnpm run sync

dev-sync:
	watchman-make -p 'services/shared/src/**/*.ts' -t sync

dev-generate:
	watchman-make -p 'services/api/openapi-zkorum.json' -t generate

dev-app:
	cd services/agora && yarn dev 

dev-api:
	cd services/api && && docker-compose up -d && pnpm start:dev  

dev-polis:
	cd services/python-bridge && source .venv/bin/activate && flask --app main run
