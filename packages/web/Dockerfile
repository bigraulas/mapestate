# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/

# Build
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN cd packages/web && npx vite build

# Stage 2: Serve with nginx
FROM nginx:alpine AS production

# Copy nginx config
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/packages/web/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
