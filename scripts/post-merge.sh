#!/bin/bash
set -e
# Timeout risk guard (timeout of 120s for install and 60s for migrations)
TIMEOUT_LIMIT=120

echo "Running post-merge hooks with timeout guard..."

if command -v timeout &> /dev/null; then
  timeout ${TIMEOUT_LIMIT}s pnpm install --frozen-lockfile || echo "pnpm install timed out or failed"
  timeout 60s pnpm --filter @workspace/db run migrate || echo "Database migration timed out or failed"
else
  pnpm install --frozen-lockfile
  pnpm --filter @workspace/db run migrate
fi
