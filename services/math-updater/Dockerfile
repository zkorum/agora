FROM node:22.14.0-alpine
WORKDIR /app
RUN npm install -g pnpm
ENV PATH=/app/node_modules/.bin:$PATH
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace-docker.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile
COPY . ./
RUN pnpm build

CMD ["pnpm", "start"]
