#!/usr/bin/env bash
# Deploy to VPS: sync source, build on server, restart service
# Usage: bash scripts/deploy.sh

set -e

VPS="root@145.79.2.154"
APP="/opt/wtus-dashboard"

echo "→ Syncing source files..."
scp src/App.tsx src/styles.css src/data.ts "$VPS:$APP/src/"
scp .env.production "$VPS:$APP/"

# Sync any other changed source files
scp -r app/ "$VPS:$APP/"
scp -r prisma/ "$VPS:$APP/"
scp package.json pnpm-lock.yaml next.config.mjs "$VPS:$APP/" 2>/dev/null || true

echo "→ Building on VPS (generates Linux Prisma binaries)..."
ssh "$VPS" "cd $APP && CI=true pnpm install --frozen-lockfile && pnpm build"

echo "→ Copying static assets into standalone..."
ssh "$VPS" "
  cp -r $APP/.next/static $APP/.next/standalone/.next/static
  cp -r $APP/public $APP/.next/standalone/public
  chown -R wtus:wtus $APP/.next/standalone/
"

echo "→ Restarting service..."
ssh "$VPS" "systemctl restart wtus-dashboard"
sleep 3
ssh "$VPS" "systemctl is-active wtus-dashboard"

echo "✓ Deployed."
