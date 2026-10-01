#!/usr/bin/env bash
# One-time (or idempotent) infra for studiodaze-beatober on Vercel: Blob + Neon + DB migrate/seed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BLOB_NAME="${BEATOBER_BLOB_STORE:-beatober-media}"
NEON_NAME="${BEATOBER_NEON_DB:-beatober-db}"
BLOB_ACCESS="${BEATOBER_BLOB_ACCESS:-public}"

echo "==> Blob store (${BLOB_NAME})"
if npx vercel@latest storage list 2>/dev/null | grep -q "${BLOB_NAME}"; then
  echo "    Store exists, skipping create."
else
  npx vercel@latest storage create "${BLOB_NAME}" --type blob --access "${BLOB_ACCESS}" --region iad1 --json
fi
npx vercel@latest storage connect "${BLOB_NAME}" --yes 2>/dev/null || true

echo "==> Neon (${NEON_NAME})"
if npx vercel@latest storage list 2>/dev/null | grep -q "${NEON_NAME}"; then
  echo "    Neon resource exists, skipping integration add."
else
  npx vercel@latest integration add neon --name "${NEON_NAME}" --non-interactive
fi

echo "==> Pull env + migrate DB"
npx vercel@latest env pull .env.local --yes --environment=development
set -a
# shellcheck disable=SC1091
source .env.local
set +a
node scripts/db-migrate.mjs
node scripts/db-seed.mjs

echo "Done. Optional: npx vercel env add BEATOBER_AUTHOR_SECRET (production/preview/development)"
