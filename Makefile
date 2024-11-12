all: dev

generate:
	docker run --rm \
  -v ${PWD}:/local openapitools/openapi-generator-cli:latest generate \
  -i /local/services/api/openapi-zkorum.json \
  -g typescript-axios \
  -o /local/services/agora/src/api

sync:
	cd services/shared && pnpm run sync

dev-sync:
	watchman-make -p 'services/shared/src/**/*.ts' -t sync

dev-generate:
	watchman-make -p 'services/api/openapi-zkorum.json' -t generate

dev-front:
	cd services/agora && pnpm dev 

dev-api:
	cd services/api && pnpm start:dev 
	
