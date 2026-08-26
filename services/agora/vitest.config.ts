import path from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "#q-app/wrappers": "@quasar/app-vite/wrappers",
      src: path.resolve(__dirname, "./src"),
    },
  },
});
