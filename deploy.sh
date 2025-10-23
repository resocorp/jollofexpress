#!/bin/bash
# Deployment script for JollofExpress on Digital Ocean

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest changes from GitHub..."
git pull origin master

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building Next.js application..."
npm run build

# Restart the application
echo "♻️  Restarting application..."
if command -v pm2 &> /dev/null; then
    echo "Using PM2..."
    pm2 restart jollofexpress || pm2 start ecosystem.config.js
    pm2 save
elif systemctl is-active --quiet jollofexpress; then
    echo "Using systemd..."
    sudo systemctl restart jollofexpress
else
    echo "⚠️  Warning: No process manager detected. You may need to restart manually."
fi

echo "✅ Deployment complete!"
echo "🔍 Checking application status..."

if command -v pm2 &> /dev/null; then
    pm2 status
fi

echo ""
echo "🌐 Your app should be live now!"
echo "📊 View logs with: pm2 logs jollofexpress"
