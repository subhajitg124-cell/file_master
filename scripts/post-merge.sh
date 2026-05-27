#!/bin/bash
# post-merge.sh — runs after every task merge (must complete in < 20 s).
# ONLY fast operations here. Heavy tasks (pnpm install, codegen) belong in
# the workflow run command, not here.
set -euo pipefail

echo "▶ post-merge: checking environment..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠  WARNING: DATABASE_URL is not set. Set it in Replit Secrets before running the API server." >&2
fi

echo "✓ post-merge complete"
