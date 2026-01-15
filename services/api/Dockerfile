FROM node:22.14.0-alpine
WORKDIR /app
RUN npm install -g pnpm
ENV PATH=/app/node_modules/.bin:$PATH
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install
COPY . ./
RUN pnpm build

EXPOSE 8080
CMD ["pnpm", "start"]
