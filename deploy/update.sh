#!/usr/bin/env bash
# Run after changing code:  bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d .git ] && git pull
pnpm install --frozen-lockfile || pnpm install
pnpm build
pm2 restart astrxymail
