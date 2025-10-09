FROM node:22.14.0-alpine
WORKDIR /app
RUN npm install -g pnpm
ENV PATH=/app/node_modules/.bin:$PATH
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install
COPY . ./
RUN pnpm build

CMD ["pnpm", "start"]
