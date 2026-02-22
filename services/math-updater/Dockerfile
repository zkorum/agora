# ---- Dependencies (production only) ----
FROM node:22.22.0-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace-docker.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile --prod

# ---- Build ----
FROM node:22.22.0-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace-docker.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ---- Production ----
FROM node:22.22.0-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN chown -R node:node /app
USER node
ENTRYPOINT ["tini", "--"]
CMD ["node", "--loader", "esm-module-alias/loader", "--no-warnings", "dist/index.js"]
