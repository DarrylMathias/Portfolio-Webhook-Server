#!/bin/bash
set -e

echo " Erasing previous build..."
cd ~/apps/Portfolio/Portfolio_V2/

echo " Pulling latest version... "
git pull origin main

echo " Installing dependencies..."
pnpm install

echo " Building new build..."
pnpm build || exit 1

echo " Restarting server..."
pm2 reload portfolio 

echo " Deployment successful. Closing terminal in 3s..."
sleep 3
