import path from "node:path";

import vue from "@vitejs/plugin-vue";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "jsdom",
    server: {
      deps: {
        // Polyfill tests must re-evaluate feature detection after resetting modules.
        inline: [/@formatjs\//],
      },
    },
    exclude: [...configDefaults.exclude, "scripts/*.test.mjs"],
  },
  resolve: {
    alias: [
      { find: "#q-app/wrappers", replacement: "@quasar/app-vite/wrappers" },
      { find: "src", replacement: path.resolve(__dirname, "./src") },
      // DOM component tests need Quasar's browser build, not its Node SSR entry.
      {
        find: /^quasar$/,
        replacement: path.resolve(
          __dirname,
          "node_modules/quasar/dist/quasar.client.js"
        ),
      },
    ],
  },
});
