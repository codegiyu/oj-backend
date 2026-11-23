#!/usr/bin/env bash
# Clone a MongoDB database from one Atlas URI to another.
#
# This is a one-time setup script to seed the staging database from production.
# Run from the oj-backend directory.
#
# Prerequisites:
#   mongodump and mongorestore from MongoDB Database Tools:
#   https://www.mongodb.com/docs/database-tools/
#
# Usage:
#   bash scripts/clone-mongo-db.sh \
#     --source "mongodb+srv://user:pass@prod-cluster.mongodb.net/oj-multimedia" \
#     --dest   "mongodb+srv://user:pass@staging-cluster.mongodb.net/oj-multimedia-staging"
#
# If source and dest share the same DB name, omit --dest-db.
# If they differ, specify --source-db and --dest-db explicitly.
#
# Options:
#   --source     Full MongoDB connection string for the source (prod) DB
#   --dest       Full MongoDB connection string for the destination (staging) DB
#   --source-db  DB name in source URI (default: extracted from URI path)
#   --dest-db    DB name in dest URI (default: same as source-db)
#   --dump-dir   Temp directory for the dump (default: ./tmp/mongo-clone-dump)

set -euo pipefail

SOURCE_URI=""
DEST_URI=""
SOURCE_DB=""
DEST_DB=""
DUMP_DIR="./tmp/mongo-clone-dump"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)   SOURCE_URI="$2"; shift 2 ;;
    --dest)     DEST_URI="$2";   shift 2 ;;
    --source-db) SOURCE_DB="$2"; shift 2 ;;
    --dest-db)  DEST_DB="$2";    shift 2 ;;
    --dump-dir) DUMP_DIR="$2";   shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ -z "$SOURCE_URI" || -z "$DEST_URI" ]]; then
  echo "Usage: bash scripts/clone-mongo-db.sh --source <prod-uri> --dest <staging-uri>"
  echo "       Optionally: --source-db <name> --dest-db <name> --dump-dir <path>"
  exit 1
fi

# Extract DB name from URI path segment if not explicitly given
if [[ -z "$SOURCE_DB" ]]; then
  SOURCE_DB="$(echo "$SOURCE_URI" | sed 's|.*\.net/||' | sed 's|?.*||')"
fi
if [[ -z "$DEST_DB" ]]; then
  DEST_DB="$(echo "$DEST_URI" | sed 's|.*\.net/||' | sed 's|?.*||')"
fi

echo "=== MongoDB Staging Seed ==="
echo "Source DB : $SOURCE_DB"
echo "Dest DB   : $DEST_DB"
echo "Dump dir  : $DUMP_DIR"
echo ""

# Clean any previous dump
rm -rf "$DUMP_DIR"
mkdir -p "$DUMP_DIR"

echo "Step 1/2 — Dumping from production..."
mongodump \
  --uri="$SOURCE_URI" \
  --db="$SOURCE_DB" \
  --out="$DUMP_DIR" \
  --gzip

echo ""
echo "Step 2/2 — Restoring to staging..."

if [[ "$SOURCE_DB" == "$DEST_DB" ]]; then
  mongorestore \
    --uri="$DEST_URI" \
    --db="$DEST_DB" \
    --drop \
    --gzip \
    "$DUMP_DIR/$SOURCE_DB"
else
  # Rename the dump folder so mongorestore writes to the target DB name
  mv "$DUMP_DIR/$SOURCE_DB" "$DUMP_DIR/$DEST_DB"

  mongorestore \
    --uri="$DEST_URI" \
    --db="$DEST_DB" \
    --drop \
    --gzip \
    "$DUMP_DIR/$DEST_DB"
fi

echo ""
echo "Done. Staging DB \"$DEST_DB\" is now a copy of production."

# Clean up dump
rm -rf "$DUMP_DIR"
