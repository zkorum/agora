import adapter from "@sveltejs/adapter-netlify";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),

    prerender: {
      origin: "https://www.agoracitizen.network",
    },

    alias: {
      $ui: "src/lib/ui",
      $components: "src/lib/components",
      $logic: "src/lib/logic",
      $state: "src/lib/state",
      $server: "src/lib/server",
    },

    experimental: {
      tracing: {
        server: true,
      },

      instrumentation: {
        server: true,
      },
    },
  },
};

export default config;
