#!/bin/bash
# Digital Ocean Deployment Script for JollofExpress
# Usage: ./deploy.sh [setup|deploy|restart]

set -e

# Configuration - Update these values
SERVER_IP="${DO_SERVER_IP:-YOUR_SERVER_IP}"
SERVER_USER="${DO_SERVER_USER:-deploy}"
APP_DIR="/home/$SERVER_USER/jollofexpress"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if server IP is configured
check_config() {
    if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
        log_error "Please set DO_SERVER_IP environment variable or update SERVER_IP in this script"
        exit 1
    fi
}

# Initial server setup
setup() {
    log_info "Setting up server at $SERVER_IP..."
    
    ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
        # Update system
        sudo apt update && sudo apt upgrade -y
        
        # Install Node.js 20
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
        
        # Install PM2 globally
        sudo npm install -g pm2
        
        # Install Nginx
        sudo apt install -y nginx
        
        # Install Git
        sudo apt install -y git
        
        # Create logs directory
        mkdir -p ~/logs
        
        echo "Node version: $(node --version)"
        echo "NPM version: $(npm --version)"
        echo "PM2 version: $(pm2 --version)"
ENDSSH
    
    log_info "Server setup complete!"
}

# Deploy application
deploy() {
    log_info "Deploying to $SERVER_IP..."
    
    # Push latest changes
    log_info "Pushing latest changes to origin..."
    git push origin master
    
    # Deploy on server
    ssh $SERVER_USER@$SERVER_IP << ENDSSH
        cd $APP_DIR || { 
            log_error "App directory not found. Please clone the repo first."
            exit 1
        }
        
        # Pull latest changes
        git pull origin master
        
        # Install dependencies
        npm ci --legacy-peer-deps
        
        # Build application
        npm run build
        
        # Restart PM2 processes
        pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
        
        # Save PM2 config
        pm2 save
        
        # Show status
        pm2 status
ENDSSH
    
    log_info "Deployment complete!"
}

# Restart application
restart() {
    log_info "Restarting application on $SERVER_IP..."
    
    ssh $SERVER_USER@$SERVER_IP << ENDSSH
        cd $APP_DIR
        pm2 restart ecosystem.config.js --env production
        pm2 status
ENDSSH
    
    log_info "Restart complete!"
}

# View logs
logs() {
    log_info "Viewing logs from $SERVER_IP..."
    ssh $SERVER_USER@$SERVER_IP "pm2 logs --lines 50"
}

# Check status
status() {
    log_info "Checking status on $SERVER_IP..."
    ssh $SERVER_USER@$SERVER_IP "pm2 status && pm2 monit"
}

# Main
check_config

case "${1:-deploy}" in
    setup)
        setup
        ;;
    deploy)
        deploy
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {setup|deploy|restart|logs|status}"
        exit 1
        ;;
esac
