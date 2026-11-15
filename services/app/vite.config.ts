import { sentrySvelteKit } from "@sentry/sveltekit/vite";
import adapter from "@sveltejs/adapter-netlify";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

import { browserBuildOptions } from "./browser-targets.js";

export default defineConfig({
  build: {
    ...browserBuildOptions,
    sourcemap: true,
  },
  plugins: [
    sentrySvelteKit({
      org: "zkorum",
      project: "agora-app-v2",
      adapter: "other",
      autoUploadSourceMaps: process.env.SENTRY_UPLOAD_SOURCEMAPS !== "false",
      sourcemaps: {
        assets: [".netlify/**/*", "build/**/*"],
        filesToDeleteAfterUpload: ["**/*.map"],
      },
    }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      strategy: ["url", "localStorage", "baseLocale"],
    }),
    tailwindcss(),
    enhancedImages(),
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({ publish: "build" }),
      paths: {
        origin: "https://www.agoracitizen.network",
      },
      alias: {
        $ui: "src/lib/ui",
        $components: "src/lib/components",
        $logic: "src/lib/logic",
        $state: "src/lib/state",
        $server: "src/lib/server",
      },
      tracing: {
        server: true,
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "eslint/**/*.test.ts"],
  },
});
