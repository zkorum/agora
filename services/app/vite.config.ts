import { sentrySvelteKit } from "@sentry/sveltekit";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    target: ["es2020", "chrome86", "safari14", "firefox91"],
    sourcemap: true,
  },
  plugins: [
    sentrySvelteKit({
      org: "zkorum",
      project: "agora-app-v2",
      adapter: "other",
      sourceMapsUploadOptions: {
        sourcemaps: {
          assets: [".netlify/**/*", "build/**/*"],
          filesToDeleteAfterUpload: ["**/*.map"],
        },
      },
    }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      strategy: ["url", "localStorage", "baseLocale"],
    }),
    tailwindcss(),
    enhancedImages(),
    sveltekit(),
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
