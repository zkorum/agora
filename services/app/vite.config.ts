import { sentrySvelteKit } from "@sentry/sveltekit";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      org: "zkorum",
      project: "agora-app-v2",
    }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      strategy: ["url", "localStorage", "baseLocale"],
    }),
    tailwindcss(),
    sveltekit(),
    Icons({
      compiler: "svelte",
    }),
    legacy({
      targets: ["defaults", "chrome >= 86", "safari >= 14"],
      modernPolyfills: true,
    }),
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
