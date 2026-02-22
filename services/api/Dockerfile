# ---- Dependencies (production only) ----
FROM node:22.22.0-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace-docker.yaml ./pnpm-workspace.yaml
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# ---- Build ----
FROM node:22.22.0-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace-docker.yaml ./pnpm-workspace.yaml
COPY patches ./patches
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
COPY package.json esm-loader-lodash-fix.mjs ./
RUN chown -R node:node /app
USER node
EXPOSE 8080
ENTRYPOINT ["tini", "--"]
CMD ["node", "--loader", "esm-module-alias/loader", "--loader", "./esm-loader-lodash-fix.mjs", "--no-warnings", "dist/index.js"]
