#!/bin/bash

# Deployment script for INSEAT Menu

# Set error handling
set -e

# Log function
log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1"
}

# Check if we are deploying to production
if [ "$1" != "production" ]; then
    log "Error: Please specify environment. Usage: ./deploy.sh production"
    exit 1
fi

# Ensure we have the required environment files
if [ ! -f .env.production ]; then
    log "Error: .env.production file is missing"
    exit 1
fi

# Build for production
log "Building for production environment..."
echo "NODE_ENV=production" > .env.local
cp .env.production .env

# Run the build
log "Running build command..."
npm run build

# Verify the build
if [ -d "dist" ]; then
    log "Build completed successfully"
else
    log "Error: Build failed - dist directory not found"
    exit 1
fi

log "Deployment build completed successfully"
