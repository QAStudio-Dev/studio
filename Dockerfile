# Multi-stage Dockerfile for QA Studio
# Supports both development and production builds

# Stage 1: Base Node.js image with dependencies
FROM node:22-alpine AS base

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install dependencies based on lockfile
COPY package.json package-lock.json* ./
RUN npm ci

# Copy prisma schema for generation
COPY prisma ./prisma/
RUN npx prisma generate

# Stage 2: Development
FROM base AS development

WORKDIR /app

# Copy all source files
COPY . .

# Expose dev server port
EXPOSE 3000

# Run database migrations and start dev server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev -- --host"]

# Stage 3: Builder for production
FROM base AS builder

WORKDIR /app

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 4: Production runner
FROM node:20-alpine AS production

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy prisma for migrations
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node build"]
