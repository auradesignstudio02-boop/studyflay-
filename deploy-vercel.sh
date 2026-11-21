#!/usr/bin/env bash
set -euo pipefail

echo "1. Checking project file count (excluding node_modules and dist)..."
FILE_COUNT=$(find . -type f \
  -not -path './node_modules/*' \
  -not -path './dist/*' \
  -not -path './.git/*' \
  | wc -l | tr -d ' ')

echo "   Source files count: ${FILE_COUNT}"
if [ "${FILE_COUNT}" -gt 100 ]; then
  echo "Error: File count (${FILE_COUNT}) exceeds 100 files."
  exit 1
fi

echo "2. Building production bundle..."
npm run build

DIST_COUNT=$(find ./dist -type f | wc -l | tr -d ' ')
echo "   Built dist files count: ${DIST_COUNT}"
if [ "${DIST_COUNT}" -gt 100 ]; then
  echo "Error: dist file count (${DIST_COUNT}) exceeds 100 files."
  exit 1
fi

echo "3. Deploying to Vercel (Production)..."
npx --yes vercel --prod
