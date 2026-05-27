#!/bin/bash
# post-merge.sh — runs after every task merge.
set -euo pipefail

echo "▶ post-merge: checking environment..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠  WARNING: DATABASE_URL is not set. Set it before running the API server." >&2
fi

echo "✓ post-merge complete"
