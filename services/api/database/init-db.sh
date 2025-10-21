#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  CREATE USER readwritedelete;
  CREATE USER readwrite;
  CREATE USER read;
  CREATE USER replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password_change_in_prod';
  REVOKE CONNECT ON DATABASE agora FROM PUBLIC;
  GRANT CONNECT ON DATABASE agora TO readwritedelete;
  GRANT CONNECT ON DATABASE agora TO readwrite;
  GRANT CONNECT ON DATABASE agora TO read;
  ALTER DEFAULT PRIVILEGES
    FOR USER readwritedelete
    IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO readwritedelete;
  ALTER DEFAULT PRIVILEGES
    FOR USER readwrite
    IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE ON TABLES TO readwrite;
  ALTER DEFAULT PRIVILEGES
    FOR USER read
    IN SCHEMA public
    GRANT SELECT ON TABLES TO readwrite;
EOSQL
