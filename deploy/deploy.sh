#!/usr/bin/env bash
set -euo pipefail

# USAGE: ./deploy/deploy.sh [REPO_DIR]
# REPO_DIR defaults to /srv/merlin when not provided
REPO_DIR="${1:-/srv/merlin}"
COMPOSE_FILE="$REPO_DIR/deploy/docker-compose.yml"

echo "Deploying MERLIN from $REPO_DIR"
cd "$REPO_DIR"

# Update code
git fetch --all
git reset --hard origin/main

# Copy web env if provided (used for Vite build)
if [ -f deploy/web.env ]; then
  echo "Applying web env"
  cp deploy/web.env apps/web/.env.production
fi

echo "Building web (apps/web)..."
npm --prefix apps/web ci
npm --prefix apps/web run build

echo "Starting/updating containers..."
docker-compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

echo "Running Prisma migrations inside api container (if any)..."
docker-compose -f "$COMPOSE_FILE" exec -T api sh -c "npx prisma migrate deploy || true"

echo "Reloading API process via PM2 (graceful reload)..."
docker-compose -f "$COMPOSE_FILE" exec -T api sh -c "npx pm2 reload ecosystem.config.js --env production || npx pm2 start ecosystem.config.js --env production"

echo "Deploy complete."
