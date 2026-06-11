#!/bin/bash

docker compose -f docker-compose-production.yml up -d
docker exec agora_nginx nginx -s reload
