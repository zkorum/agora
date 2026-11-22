import { fileURLToPath } from "node:url";

import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { browserBuildOptions } from "../browser-targets.js";

// Deliberately independent of the production Kit/Netlify/Sentry configuration.
export default defineConfig({
  build: browserBuildOptions,
  server: {
    watch: {
      // Production verification must not trigger reloads for every generated page.
      ignored: [
        "**/build/**",
        "**/.netlify/**",
        "**/.svelte-kit/**",
        "**/storybook-static/**",
      ],
    },
  },
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      strategy: ["url", "localStorage", "baseLocale"],
    }),
    svelte({ configFile: false, preprocess: vitePreprocess() }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      $ui: fileURLToPath(new URL("../src/lib/ui", import.meta.url)),
      $components: fileURLToPath(
        new URL("../src/lib/components", import.meta.url),
      ),
      $logic: fileURLToPath(new URL("../src/lib/logic", import.meta.url)),
      $state: fileURLToPath(new URL("../src/lib/state", import.meta.url)),
    },
  },
});
