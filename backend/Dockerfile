# Multi-stage build for lightweight production container
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production runtime stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache docker-cli tar gzip curl

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create directories for data and backups
RUN mkdir -p /var/minecraft/servers /var/minecraft/backups /var/minecraft/router /app/data

EXPOSE 3001

CMD ["node", "dist/app.js"]
