#!/bin/bash
# db/migrate.sh
# Run the multi-tenant schema migration against Neon PostgreSQL.
# Usage: ./db/migrate.sh

set -e

source .env.local

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set in .env.local"
  exit 1
fi

echo "Running migration: db/schema.sql"
psql "$DATABASE_URL" -f db/schema.sql
echo "Migration complete."
