FROM node:22-slim

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/agent/package*.json ./packages/agent/

# Install dependencies
RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/agent ./packages/agent

# Build shared types first
RUN npm run build --workspace=packages/shared

# Build agent
RUN npm run build --workspace=packages/agent

EXPOSE 3001

CMD ["node", "packages/agent/dist/index.js"]
