import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: { baseURL: "http://127.0.0.1:6007" },
  webServer: {
    command:
      "pnpm storybook:build && pnpm exec vite preview --config .storybook/vite.config.ts --outDir storybook-static --host 127.0.0.1 --port 6007 --strictPort",
    url: "http://127.0.0.1:6007",
    timeout: 120_000,
  },
  testDir: "stories",
  testMatch: "**/*.test.ts",
});
