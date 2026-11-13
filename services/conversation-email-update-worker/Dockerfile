# ---- Dependencies ----
FROM node:26.13.1-alpine AS deps
WORKDIR /app
RUN apk add --no-cache 'ca-certificates>=20261020-r0' python3 make g++
RUN npm install --global pnpm@12.4.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---- Build ----
FROM node:26.13.1-alpine AS build
WORKDIR /app
RUN apk add --no-cache 'ca-certificates>=20261020-r0' python3 make g++
RUN npm install --global pnpm@12.4.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY assertProductionBuild.mjs ./
COPY src ./src
RUN pnpm build && rm -rf dist/devExercise

# ---- Production ----
FROM node:26.13.1-alpine
RUN apk add --no-cache 'ca-certificates>=20261020-r0' tini
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN chown -R node:node /app
USER node
STOPSIGNAL SIGTERM
ENTRYPOINT ["tini", "--"]
CMD ["node", "--loader", "esm-module-alias/loader", "--no-warnings", "dist/index.js"]
