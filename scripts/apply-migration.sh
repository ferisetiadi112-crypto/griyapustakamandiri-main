#!/bin/sh
# Apply pending Drizzle migrations to the database
#
# Usage:
#   DATABASE_URL="postgresql://..." sh scripts/apply-migration.sh
#
# Or if DATABASE_URL is already in the environment:
#   sh scripts/apply-migration.sh

set -e

echo "=== Drizzle Migration ==="
echo "Checking DATABASE_URL..."

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Please set DATABASE_URL in Settings → Environment first."
  exit 1
fi

echo "DATABASE_URL is configured (length: ${#DATABASE_URL})"
echo ""
echo "Running drizzle-kit migrate..."
bunx drizzle-kit migrate

echo ""
echo "=== Migration Complete ==="
echo "Pending migrations should now be applied."
