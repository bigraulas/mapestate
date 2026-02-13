# Stage 1: Install and Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/

# Install all dependencies
ENV CI=true
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/

# Generate Prisma client
RUN cd packages/api && npx prisma generate

# Build NestJS (remove tsbuildinfo to prevent stale incremental cache)
RUN cd packages/api && rm -rf dist tsconfig.tsbuildinfo && npx nest build

# Stage 2: Production
FROM node:20-alpine AS production

# Install OpenSSL for Prisma engine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy everything from builder (node_modules + dist + prisma client)
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/packages/api/node_modules/ packages/api/node_modules/
COPY --from=builder /app/packages/api/dist/ packages/api/dist/
COPY --from=builder /app/packages/api/prisma/ packages/api/prisma/
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/packages/api/package.json packages/api/package.json

# Create uploads directory
RUN mkdir -p packages/api/uploads

EXPOSE 3000

WORKDIR /app/packages/api

CMD ["node", "dist/main.js"]
