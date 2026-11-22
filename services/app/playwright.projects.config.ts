import { defineConfig } from "@playwright/test";

import base from "./playwright.config.js";

export default defineConfig({
  ...base,
  testMatch: "**/projects-mock.test.ts",
  testIgnore: [],
  use: { ...base.use, baseURL: "http://localhost:4176" },
  webServer: {
    command: "pnpm build && pnpm preview --port 4176 --strictPort",
    port: 4176,
    timeout: 120_000,
    env: {
      SENTRY_UPLOAD_SOURCEMAPS: "false",
      VITE_STAGING: "true",
      VITE_PROJECTS_MOCK: "true",
    },
  },
});
