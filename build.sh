#!/bin/bash

# BandMate Build and Run Script
# This script builds the Docker image, tags it, and starts the container

set -e  # Exit on any error

echo "Stopping existing running container (if exists)..."
docker container stop bandmate 2>/dev/null || echo "Container 'bandmate' not running"
docker container remove bandmate 2>/dev/null || echo "Container 'bandmate' does not exist"

echo "Building BandMate Docker image..."
docker build --no-cache -t bandmate:latest .
#docker build -t bandmate:latest .
echo "Image built and tagged as bandmate:latest"

echo "Starting BandMate container..."
docker run -d \
  --name bandmate \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/uploads:/app/uploads" \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASE_URL="file:/app/data/bandmate.db" \
  -e JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-bandmate-access-secret-change-me}" \
  -e JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-bandmate-refresh-secret-change-me}" \
  -e JWT_ACCESS_EXPIRY="15m" \
  -e JWT_REFRESH_EXPIRY="7d" \
  -e ADMIN_EMAIL="admin@bandmate.local" \
  -e ADMIN_PASSWORD="admin" \
  --restart unless-stopped \
  --health-cmd "wget -q --spider http://localhost:3000/api/health" \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 3 \
  --health-start-period 40s \
  bandmate:latest

echo "BandMate container started successfully!"
echo "Application should be available at http://localhost:3000"
echo "Check logs with: docker logs -f bandmate"
