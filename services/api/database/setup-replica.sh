#!/bin/bash
set -e

echo "Starting replica setup..."

# Wait for primary to be ready
until PGPASSWORD="7QPgtYETx4EdzvqUeNfo" psql -h postgres -U postgres -d agora -c '\q' 2>/dev/null; do
  echo "Waiting for primary database to be ready..."
  sleep 2
done

echo "Primary database is ready. Setting up replication..."

# Remove any existing data
rm -rf /data/postgres/*

# Perform base backup from primary
PGPASSWORD="replicator_password_change_in_prod" pg_basebackup \
  -h postgres \
  -U replicator \
  -D /data/postgres \
  -Fp \
  -Xs \
  -P \
  -R

# Create standby.signal file to indicate this is a replica
touch /data/postgres/standby.signal

echo "Replica setup complete!"
