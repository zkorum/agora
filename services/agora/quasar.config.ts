/* eslint-env node */
// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";

import { defineConfig } from "#q-app/wrappers";

import { envSchema, validateEnv } from "./src/utils/processEnv";

// TODO: add env var to use TLS/SSL
// import basicSsl from "@vitejs/plugin-basic-ssl";

const __dirname = dirname(fileURLToPath(import.meta.url));

import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig((ctx) => {
  // Build the boot files array
  // Note: VITE_STAGING must be set in the shell environment (not just .env files)
  // because this code runs before Vite loads .env files
  const boot: string[] = [];
  if (ctx.prod && process.env.VITE_STAGING !== "true") {
    boot.push("sentry");
  }
  boot.push(
    ...[
      "i18n",
      "axios",
      "primevue",
      "maz-ui",
      "vue-query",
      "embeddedBrowserGuard",
    ]
  );

  if (process.env.NODE_ENV) {
    console.log("Loaded boot files", boot);
  }

  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: boot,

    bin: {
      windowsAndroidStudio:
        "C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe",
      linuxAndroidStudio: "/home/nicobao/.local/bin/studio.sh",
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: ["app.scss", "~primeicons/primeicons.css"],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      "roboto-font", // optional, you are not bound to it
      "mdi-v7", // optional, you are not bound to it
      "material-icons",
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      sourcemap: true, // should be just boolean true, see https://github.com/quasarframework/quasar/issues/14589
      target: {
        browser: ["es2022", "firefox115", "chrome115", "safari14"],
        node: "node20",
      },

      // typescript: {
      //   // strict: true,
      //   vueShim: true,
      //   // extendTsConfig (tsConfig) {}
      // },

      vueRouterMode: "history", // available values: 'hash', 'history'
      // vueRouterBase: "/feed/",
      // vueDevtools,
      vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      publicPath: "/",
      extendViteConf(viteConf, _params) {
        // Ensure plugins array exists before adding any plugins
        if (viteConf.plugins === undefined) {
          viteConf.plugins = [];
        }

        // Configure resolve.alias to stub out Node.js built-in modules
        // The @pcd/gpc library (server-side only) has dependencies on Node.js modules
        // We point them to our stub files since they're never actually called in the browser
        if (!viteConf.resolve) {
          viteConf.resolve = {};
        }
        if (!viteConf.resolve.alias) {
          viteConf.resolve.alias = {};
        }

        // Point Node.js modules to stub files
        viteConf.resolve.alias = {
          ...viteConf.resolve.alias,
          constants: resolve(__dirname, "src/stubs/constants.js"),
          fs: resolve(__dirname, "src/stubs/fs.js"),
          path: resolve(__dirname, "src/stubs/path.js"),
          crypto: resolve(__dirname, "src/stubs/crypto.js"),
        };

        // Add Sentry plugin in production (non-staging) builds
        // Note: Sentry should be added after all other plugins
        if (process.env.VITE_STAGING !== "true" && ctx.prod) {
          viteConf.plugins.push(
            sentryVitePlugin({
              authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
              org: "zkorum",
              project: "agora-app",
            })
          );
        }

        // Add bundle visualizer in production builds
        if (ctx.prod) {
          viteConf.plugins.push(
            visualizer({
              filename: "dist/stats.html",
              open: false,
              gzipSize: true,
              brotliSize: true,
            })
          );
        }

        // Configure manual chunks for better code splitting
        if (!viteConf.build) {
          viteConf.build = {};
        }
        if (!viteConf.build.rollupOptions) {
          viteConf.build.rollupOptions = {};
        }

        // Ensure output is an object (not an array) and add manual chunks configuration
        const outputOptions = Array.isArray(viteConf.build.rollupOptions.output)
          ? viteConf.build.rollupOptions.output[0] || {}
          : viteConf.build.rollupOptions.output || {};

        outputOptions.manualChunks = (id: string) => {
          // Core Vue ecosystem
          if (
            id.includes("node_modules/vue/") ||
            id.includes("node_modules/@vue/") ||
            id.includes("node_modules/vue-router/") ||
            id.includes("node_modules/pinia/") ||
            id.includes("node_modules/vue-i18n/")
          ) {
            return "vue-vendor";
          }

          // PrimeVue
          if (
            id.includes("node_modules/primevue/") ||
            id.includes("node_modules/@primeuix/") ||
            id.includes("node_modules/primeicons/")
          ) {
            return "primevue";
          }

          // Quasar
          if (id.includes("node_modules/quasar/")) {
            return "quasar";
          }

          // Maz UI
          if (id.includes("node_modules/maz-ui/")) {
            return "maz-ui";
          }

          // Sentry
          if (id.includes("node_modules/@sentry/")) {
            return "sentry";
          }

          // UI utilities
          if (
            id.includes("node_modules/@dicebear/") ||
            id.includes("node_modules/swiper/")
          ) {
            return "ui-utils";
          }

          // Data & API utilities
          if (
            id.includes("node_modules/@tanstack/vue-query") ||
            id.includes("node_modules/axios/") ||
            id.includes("node_modules/zod/")
          ) {
            return "data-utils";
          }

          // VueUse composables
          if (id.includes("node_modules/@vueuse/")) {
            return "vueuse";
          }

          // Text processing utilities
          if (
            id.includes("node_modules/linkifyjs/") ||
            id.includes("node_modules/linkify-html/") ||
            id.includes("node_modules/sanitize-html/")
          ) {
            return "text-utils";
          }

          // Phone number utilities
          if (id.includes("node_modules/libphonenumber-js/")) {
            return "phone-utils";
          }

          // QR code generation
          if (id.includes("node_modules/qrcode/")) {
            return "qrcode";
          }
        };

        // Set the output back to the configuration
        viteConf.build.rollupOptions.output = outputOptions;

        // viteConf.base = ""; // @see https://github.com/quasarframework/quasar/issues/8513#issuecomment-1127654470 - otherwise the browser doesn't find index.html!
      },
      // analyze: true,
      // See
      // https://quasar.dev/quasar-cli-webpack/handling-process-env/#using-dotenv
      // https://github.com/quasarframework/quasar/discussions/15303#discussioncomment-5904464
      // https://vite.dev/config/
      // Generate env object dynamically from Zod schema (single source of truth: src/utils/processEnv.ts)
      env: Object.fromEntries(
        Object.keys(envSchema.shape).map((key) => [key, process.env[key]])
      ),
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      viteVuePluginOptions: {
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith("swiper-"),
          },
        },
      },

      vitePlugins: [
        // Custom plugin to validate environment variables at build time
        {
          name: "validate-env",
          configResolved() {
            // Validate environment after Vite has fully loaded all .env files
            // This runs after config hook and ensures env vars are available
            // Note: config.env only contains VITE_* vars, so we use process.env
            validateEnv(process.env);
          },
        } satisfies Plugin,
        [
          "vite-plugin-checker",
          {
            vueTsc: true,
            eslint: {
              lintCommand:
                'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
        // TODO: add env variable to add TLS/SSL
        // basicSsl(),
        [
          "unplugin-vue-router/vite",
          {
            // routesFolder: 'src/pages',
            dts: "./typed-router.d.ts",
          },
        ],
      ],
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      // https: {},
      open: true, // opens browser window automatically
      port: 3200, // Use whitelisted port for Zupass Devconnect ARG collection
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ["BottomSheet", "Dialog", "Notify", "Loading"],
    },

    animations: [], // --- includes all animations
    // https://v2.quasar.dev/options/animations

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        "render", // keep this as last one
      ],

      // extendPackageJson (json) {},
      // extendSSRWebserverConf (esbuildConf) {},

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: false,

      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!
      // will mess up SSR

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: "GenerateSW", // 'GenerateSW' or 'InjectManifest'
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json'
      // extendManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      // extendPWACustomSWConf (esbuildConf) {},
      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf) {},
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: ["electron-preload"],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: "packager", // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: "@zkorum/agora",
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      extraScripts: [],
    },
  };
});
