#!/bin/bash

# Set error handling
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Logger functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    error "Please run the script with sudo"
fi

# Configuration
SOURCE_DIR="$(pwd)"
DEST_DIR="/var/www/inseat-customer"
BACKUP_DIR="/var/www/inseat-customer.backup.$(date +%Y%m%d_%H%M%S)"

# Start deployment
log "Starting deployment process..."

# Install dependencies and build
log "Installing dependencies..."
npm install || error "Failed to install dependencies"

log "Building project..."
npm run build || error "Build failed"

# Create backup of existing deployment
if [ -d "$DEST_DIR" ]; then
    log "Creating backup of existing deployment..."
    mv "$DEST_DIR" "$BACKUP_DIR" || error "Failed to create backup"
fi

# Create destination directory if it doesn't exist
log "Creating destination directory..."
mkdir -p "$DEST_DIR" || error "Failed to create destination directory"

# Copy files
log "Copying built files to destination..."
cp -r dist/* "$DEST_DIR/" || error "Failed to copy files"

# Set correct ownership and permissions
log "Setting correct permissions..."
chown -R www-data:www-data "$DEST_DIR" || error "Failed to set ownership"
chmod -R 755 "$DEST_DIR" || error "Failed to set permissions"

log "Deployment completed successfully!"
log "Files deployed to: $DEST_DIR"

# Optional: Remove backup if everything went well
read -p "Remove backup directory? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$BACKUP_DIR" && log "Backup removed" || error "Failed to remove backup"
fi
