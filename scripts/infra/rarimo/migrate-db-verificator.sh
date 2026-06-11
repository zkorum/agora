#!/usr/bin/env bash
docker run --network=zkorum_default --rm -e KV_VIPER_FILE=/usr/local/etc/config.yaml -v ./scripts/infra/rarimo/config/config.yaml:/usr/local/etc/config.yaml zkorum/verificator-svc:0.2.2 migrate up
