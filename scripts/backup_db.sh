#!/bin/bash
# Database backup script for MoviesDB
# Usage: ./scripts/backup_db.sh [output_path]

set -euo pipefail

CONTAINER_NAME="movies-db-db-1"
DB_NAME="${POSTGRES_DB:-moviesdb}"
DB_USER="${POSTGRES_USER:-postgres}"
OUTPUT="${1:-db_backup_$(date +%Y%m%d_%H%M%S).sql}"

echo "Backing up $DB_NAME..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges --if-exists --clean > "$OUTPUT"

SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "Backup complete: $OUTPUT ($SIZE)"
