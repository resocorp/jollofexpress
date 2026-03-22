#!/bin/bash
# deploy.sh — Pull latest code, rebuild, and restart the app
# Usage: sudo bash /opt/jollofexpress/deploy.sh

set -e
cd /opt/jollofexpress

echo "==> Pulling latest code..."
git stash
git pull origin master
git stash pop 2>/dev/null || true

echo "==> Installing dependencies..."
npm install --production=false

echo "==> Building..."
npm run build

echo "==> Restarting services..."
sudo -u nodeapp pm2 restart jollofexpress --update-env
sudo -u nodeapp pm2 save

echo ""
echo "Deploy complete. Site is live."
curl -s -o /dev/null -w "Health check: HTTP %{http_code}\n" http://127.0.0.1:3000/
