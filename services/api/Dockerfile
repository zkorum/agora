# ---- Dependencies (production only) ----
FROM node:24.14.1-trixie-slim AS deps
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace-docker.yaml ./pnpm-workspace.yaml
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# ---- Build ----
FROM node:24.14.1-trixie-slim AS build
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace-docker.yaml ./pnpm-workspace.yaml
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

# ---- Production ----
FROM node:24.14.1-trixie-slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates tini && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json esm-loader-lodash-fix.mjs ./
USER node
RUN node --input-type=module -e "await import('opencc')"
EXPOSE 8080
ENTRYPOINT ["tini", "--"]
CMD ["node", "--loader", "esm-module-alias/loader", "--loader", "./esm-loader-lodash-fix.mjs", "--no-warnings", "dist/index.js"]
