#!/bin/bash
set -e

REPO_DIR="$HOME/darry/apps/Portfolio_V2"
BUILD_DIR="$HOME/darry/apps/Portfolio_V2_build"

echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Starting Atomic Zero-Downtime Deployment ==="
cd "$REPO_DIR"

cleanup() {
    EXIT_CODE=$?
    if [ -d "$BUILD_DIR" ]; then
        echo "Cleaning up temporary build workspace..."
        git worktree remove --force "$BUILD_DIR" 2>/dev/null || rm -rf "$BUILD_DIR"
    fi
    if [ $EXIT_CODE -ne 0 ]; then
        echo "Deployment failed with exit code $EXIT_CODE. Live build remained untouched."
    fi
}
trap cleanup EXIT

echo "[1/6] Fetching latest changes from origin..."
git fetch origin main

echo "[2/6] Fast-forwarding main branch..."
git pull origin main

echo "[3/6] Syncing dependencies..."
pnpm install

echo "[4/6] Creating isolated build workspace..."
rm -rf "$BUILD_DIR"
git worktree prune
git worktree add --detach "$BUILD_DIR" HEAD

# Symlink dependencies and environment files into isolated workspace
ln -s "$REPO_DIR/node_modules" "$BUILD_DIR/node_modules"
[ -f "$REPO_DIR/.env" ] && ln -s "$REPO_DIR/.env" "$BUILD_DIR/.env"
[ -f "$REPO_DIR/.env.local" ] && ln -s "$REPO_DIR/.env.local" "$BUILD_DIR/.env.local"

echo "[5/6] Building application in isolated workspace (V8 heap capped at 1.5GB)..."
cd "$BUILD_DIR"
export NODE_OPTIONS="--max-old-space-size=1536"
pnpm build

echo "[6/6] Atomically swapping build directories..."
cd "$REPO_DIR"
rm -rf "$REPO_DIR/.next_old"
if [ -d "$REPO_DIR/.next" ]; then
    mv "$REPO_DIR/.next" "$REPO_DIR/.next_old"
fi
mv "$BUILD_DIR/.next" "$REPO_DIR/.next"

# Sync any newly generated sitemaps or robots into public
if [ -d "$BUILD_DIR/public" ]; then
    cp -f "$BUILD_DIR/public/sitemap"* "$REPO_DIR/public/" 2>/dev/null || true
    cp -f "$BUILD_DIR/public/robots.txt" "$REPO_DIR/public/" 2>/dev/null || true
fi

echo "Reloading portfolio under PM2..."
pm2 reload portfolio

rm -rf "$REPO_DIR/.next_old"
echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Deployment successful! Zero downtime achieved. ==="
