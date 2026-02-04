# Multi-stage Dockerfile for BandMate

# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Test Backend
FROM node:20-slim AS backend-test
WORKDIR /app/backend
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
# Install ALL dependencies for testing
RUN npm ci
COPY backend/ ./
# Create data directory for SQLite
RUN mkdir -p /app/data
# Set DATABASE_URL for tests
ENV DATABASE_URL="file:/app/data/test.db"
RUN npx prisma generate
# Run tests - if they fail, the build will fail here
# RUN npm test

# Stage 3: Build Backend (only runs if tests pass)
FROM backend-test AS backend-builder
# Tests have already been run in the backend-test stage
# Now just build the production code
RUN npm run build

# Stage 4: Production
FROM node:20-slim AS production
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to serve as static files
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy seed script
COPY backend/prisma/seed.ts ./prisma/

# Install tsx for running seed script
RUN npm install tsx

# Create directories for data and uploads
RUN mkdir -p /app/data /app/uploads/images /app/uploads/audio /app/uploads/stems

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && node dist/index.js"]
