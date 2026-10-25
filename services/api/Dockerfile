# Pin the target-platform base before the native build stage resolves the same
# multi-architecture tag. Reuse the stage so Podman cannot select the host Node
# binary for the runtime after installing target-platform native dependencies.
FROM --platform=$TARGETPLATFORM node:24.22.1-trixie-slim AS runtime-base

# ---- Dependencies (production only) ----
FROM --platform=$TARGETPLATFORM runtime-base AS deps
WORKDIR /app
# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
# APT otherwise accepts partial index downloads, hiding transient mirror failures.
RUN printf 'Acquire::Retries "3";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-build-network && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates python3 make g++ && \
    dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge 20250419+deb13u1 && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# ---- Build ----
# Only JavaScript output crosses into the runtime image. Compile natively to
# avoid Rosetta/QEMU child-process hangs during esbuild's install checks.
FROM --platform=$BUILDPLATFORM node:24.22.1-trixie-slim AS build
WORKDIR /app
# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN printf 'Acquire::Retries "3";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-build-network && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates python3 make g++ && \
    dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge 20250419+deb13u1 && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

# ---- Production ----
# Explicitly reset the target after the native build stage. Podman otherwise
# carries the ARM64 v8 variant into an AMD64-labelled runtime image.
FROM --platform=$TARGETPLATFORM runtime-base AS production
ARG TARGETARCH
# Builds have no TTY; noninteractive debconf avoids prompts and frontend fallback warnings.
RUN test "$(dpkg --print-architecture)" = "$TARGETARCH" && \
    printf 'Acquire::Retries "3";\nAPT::Update::Error-Mode "any";\n' > /etc/apt/apt.conf.d/80-build-network && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates tini && \
    dpkg --compare-versions "$(dpkg-query -W -f='${Version}' ca-certificates)" ge 20250419+deb13u1 && \
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
