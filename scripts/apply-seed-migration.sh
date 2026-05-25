#!/bin/bash
# Chunk + apply a seed-tools migration via the b64 RPC helper.
# Usage: bash scripts/apply-seed-migration.sh supabase/migrations/NNN_seed_tools_batchXX.sql
set -e
if [ -z "$1" ]; then
  echo "usage: $0 <migration_path>"
  exit 1
fi
MIG="$1"
BASE=$(basename "$MIG" .sql)
CHUNK_DIR="/tmp/chunks_${BASE}"
echo "[apply] chunking $MIG -> $CHUNK_DIR"
python3 scripts/chunk-seed-migration.py "$MIG" "$CHUNK_DIR"
echo "[apply] running b64 applier"
npx tsx --env-file=.env.local scripts/apply-migration-chunks-b64.ts "$CHUNK_DIR"
