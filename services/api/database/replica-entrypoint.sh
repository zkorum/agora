#!/bin/bash
set -e

echo "Starting replica entrypoint..."

# Wait for primary to be ready
until PGPASSWORD="7QPgtYETx4EdzvqUeNfo" psql -h postgres -U postgres -d agora -c 'SELECT 1' >/dev/null 2>&1; do
  echo "Waiting for primary database..."
  sleep 2
done

echo "Primary is ready. Checking if replica needs initialization..."

# Check if data directory is empty or needs initialization
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Initializing replica from primary..."
  
  # Clean data directory
  rm -rf "$PGDATA"/*
  
  # Perform base backup as root, will fix permissions after
  PGPASSWORD="replicator_password_change_in_prod" pg_basebackup \
    -h postgres \
    -U replicator \
    -D "$PGDATA" \
    -Fp \
    -Xs \
    -P \
    -R
  
  # Ensure standby signal exists
  touch "$PGDATA/standby.signal"
  
  # Fix ownership
  chown -R postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  
  echo "Replica initialization complete!"
else
  echo "Replica already initialized, starting server..."
fi

# Start PostgreSQL as postgres user
exec gosu postgres postgres -c config_file=/etc/postgresql/postgresql.conf
