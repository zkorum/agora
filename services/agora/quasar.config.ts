/* eslint-env node */
// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

import { defineConfig } from "#q-app/wrappers";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
// TODO: add env var to use TLS/SSL
// import basicSsl from "@vitejs/plugin-basic-ssl";
import "dotenv/config";

export default defineConfig((ctx) => {
  const boot = [];
  if (ctx.prod && process.env.VITE_STAGING !== "true") {
    boot.push("sentry");
  }
  boot.push(...["i18n", "axios", "primevue", "maz-ui", "vue-query"]);
  console.log("Loaded boot files", boot);

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
    css: ["app.scss"],

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
        if (viteConf.plugins === undefined) {
          viteConf.plugins = [];
        }

        // Add bundle visualizer in production builds (but outside dist folder)
        if (ctx.prod) {
          viteConf.plugins.push(
            visualizer({
              filename: "stats.html", // Root of project, not in dist/
              open: false,
              gzipSize: true,
              brotliSize: true,
              template: "treemap",
            })
          );
        }

        if (process.env.VITE_STAGING !== "true" && ctx.prod) {
          viteConf.plugins.push(
            // Put the Sentry vite plugin after all other plugins
            sentryVitePlugin({
              authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
              org: "zkorum",
              project: "agora-app",
            })
          );
        }

        // Manual chunking disabled - causes circular dependency errors in production
        // Let Vite handle code splitting automatically via dynamic route imports
        /*
        if (!viteConf.build) viteConf.build = {};
        if (!viteConf.build.rollupOptions) viteConf.build.rollupOptions = {};
        if (!viteConf.build.rollupOptions.output) {
          viteConf.build.rollupOptions.output = {};
        }

        if (Array.isArray(viteConf.build.rollupOptions.output)) {
          viteConf.build.rollupOptions.output.forEach((output) => {
            output.manualChunks = (id) => {
              // Only split route-specific vendors that are NOT used in:
              // - Boot files (axios, @sentry, @tanstack, primevue, maz-ui, vue-i18n)
              // - Stores (quasar, @vueuse, pinia)
              // - Widely-imported shared utilities (localforage, sanitize-html, linkify, libphonenumber-js, zod)
              // - Core framework (vue, vue-router, pinia)

              // Safe to split - only used for avatar generation in specific component
              if (id.includes("node_modules/@dicebear"))
                return "vendor-dicebear";

              // Safe to split - crypto libs used only in auth/crypto flows
              if (id.includes("node_modules/@stablelib"))
                return "vendor-stablelib";
              if (id.includes("node_modules/@zkorum/keystore-idb"))
                return "vendor-keystore-idb";
              if (id.includes("node_modules/multiformats"))
                return "vendor-multiformats";
              if (id.includes("node_modules/tweetnacl"))
                return "vendor-tweetnacl";
              if (id.includes("node_modules/big-integer"))
                return "vendor-big-integer";
              if (id.includes("node_modules/@ucans")) return "vendor-ucans";

              // DON'T split stores, utils, shared, or layouts - they create circular dependencies
              // These are loaded at app initialization and must be in the main bundle or route chunks
              // Only split large, route-specific component directories

              // Split application code by directory - be more granular
              if (id.includes("/src/components/")) {
                if (id.includes("/src/components/feed/"))
                  return "components-feed";

                // Split authentication by subdirectory
                if (id.includes("/src/components/authentication/intention/"))
                  return "components-auth-intention";
                if (id.includes("/src/components/authentication/"))
                  return "components-auth";

                if (id.includes("/src/components/report/"))
                  return "components-report";

                // Split features by subdirectory
                if (id.includes("/src/components/features/opinion/"))
                  return "components-features-opinion";
                if (id.includes("/src/components/features/"))
                  return "components-features";

                if (id.includes("/src/components/ui-library/"))
                  return "components-ui";

                // Split navigation by subdirectory
                if (id.includes("/src/components/navigation/header/"))
                  return "components-nav-header";
                if (id.includes("/src/components/navigation/footer/"))
                  return "components-nav-footer";
                if (id.includes("/src/components/navigation/"))
                  return "components-nav";

                // Split post/analysis by subdirectory
                if (
                  id.includes("/src/components/post/analysis/opinionGroupTab/")
                )
                  return "components-post-analysis-opiniongroup";
                if (id.includes("/src/components/post/analysis/consensusTab/"))
                  return "components-post-analysis-consensus";
                if (
                  id.includes("/src/components/post/analysis/divisivenessTab/")
                )
                  return "components-post-analysis-divisiveness";
                if (id.includes("/src/components/post/analysis/"))
                  return "components-post-analysis";

                // Split post/comments by subdirectory
                if (id.includes("/src/components/post/comments/group/"))
                  return "components-post-comments-group";
                if (id.includes("/src/components/post/comments/"))
                  return "components-post-comments";

                // Split other post subdirectories
                if (id.includes("/src/components/post/common/"))
                  return "components-post-common";
                if (id.includes("/src/components/post/display/"))
                  return "components-post-display";
                if (id.includes("/src/components/post/interactionBar/"))
                  return "components-post-interaction";
                if (id.includes("/src/components/post/"))
                  return "components-post";

                if (id.includes("/src/components/conversation/"))
                  return "components-conversation";
                if (id.includes("/src/components/opinion/"))
                  return "components-opinion";
                if (id.includes("/src/components/moderation/"))
                  return "components-moderation";
                if (id.includes("/src/components/settings/"))
                  return "components-settings";

                // Don't bundle remaining components - let Vite split them per route
                return undefined;
              }

              // Don't manually split these - let Vite handle them automatically per route:
              // - layouts: loaded at app initialization
              // - stores: eagerly loaded, create circular dependencies
              // - composables: widely imported across components
              // - utils: widely imported shared utilities
              // - shared: fundamental utilities used everywhere
              //
              // Vite will automatically split them as part of route chunks
            };
          });
        } else {
          viteConf.build.rollupOptions.output.manualChunks = (id) => {
            // Only split route-specific vendors that are NOT used in:
            // - Boot files (axios, @sentry, @tanstack, primevue, maz-ui, vue-i18n)
            // - Stores (quasar, @vueuse, pinia)
            // - Widely-imported shared utilities (localforage, sanitize-html, linkify, libphonenumber-js, zod)
            // - Core framework (vue, vue-router, pinia)

            // Safe to split - only used for avatar generation in specific component
            if (id.includes("node_modules/@dicebear"))
              return "vendor-dicebear";

            // Safe to split - crypto libs used only in auth/crypto flows
            if (id.includes("node_modules/@stablelib"))
              return "vendor-stablelib";
            if (id.includes("node_modules/@zkorum/keystore-idb"))
              return "vendor-keystore-idb";
            if (id.includes("node_modules/multiformats"))
              return "vendor-multiformats";
            if (id.includes("node_modules/tweetnacl"))
              return "vendor-tweetnacl";
            if (id.includes("node_modules/big-integer"))
              return "vendor-big-integer";
            if (id.includes("node_modules/@ucans")) return "vendor-ucans";

            // Split application code by directory - be more granular
            if (id.includes("/src/components/")) {
              if (id.includes("/src/components/feed/"))
                return "components-feed";

              // Split authentication by subdirectory
              if (id.includes("/src/components/authentication/intention/"))
                return "components-auth-intention";
              if (id.includes("/src/components/authentication/"))
                return "components-auth";

              if (id.includes("/src/components/report/"))
                return "components-report";

              // Split features by subdirectory
              if (id.includes("/src/components/features/opinion/"))
                return "components-features-opinion";
              if (id.includes("/src/components/features/"))
                return "components-features";

              if (id.includes("/src/components/ui-library/"))
                return "components-ui";

              // Split navigation by subdirectory
              if (id.includes("/src/components/navigation/header/"))
                return "components-nav-header";
              if (id.includes("/src/components/navigation/footer/"))
                return "components-nav-footer";
              if (id.includes("/src/components/navigation/"))
                return "components-nav";

              // Split post/analysis by subdirectory
              if (id.includes("/src/components/post/analysis/opinionGroupTab/"))
                return "components-post-analysis-opiniongroup";
              if (id.includes("/src/components/post/analysis/consensusTab/"))
                return "components-post-analysis-consensus";
              if (id.includes("/src/components/post/analysis/divisivenessTab/"))
                return "components-post-analysis-divisiveness";
              if (id.includes("/src/components/post/analysis/"))
                return "components-post-analysis";

              // Split post/comments by subdirectory
              if (id.includes("/src/components/post/comments/group/"))
                return "components-post-comments-group";
              if (id.includes("/src/components/post/comments/"))
                return "components-post-comments";

              // Split other post subdirectories
              if (id.includes("/src/components/post/common/"))
                return "components-post-common";
              if (id.includes("/src/components/post/display/"))
                return "components-post-display";
              if (id.includes("/src/components/post/interactionBar/"))
                return "components-post-interaction";
              if (id.includes("/src/components/post/"))
                return "components-post";

              if (id.includes("/src/components/conversation/"))
                return "components-conversation";
              if (id.includes("/src/components/opinion/"))
                return "components-opinion";
              if (id.includes("/src/components/moderation/"))
                return "components-moderation";
              if (id.includes("/src/components/settings/"))
                return "components-settings";

              // Don't bundle remaining components - let Vite split them per route
              return undefined;
            }

            // Don't manually split these - let Vite handle them automatically per route:
            // - layouts: loaded at app initialization
            // - stores: eagerly loaded, create circular dependencies
            // - composables: widely imported across components
            // - utils: widely imported shared utilities
            // - shared: fundamental utilities used everywhere
            //
            // Vite will automatically split them as part of route chunks
          };
        }
        */
        // viteConf.base = ""; // @see https://github.com/quasarframework/quasar/issues/8513#issuecomment-1127654470 - otherwise the browser doesn't find index.html!
      },
      // analyze: true,
      // See
      // https://quasar.dev/quasar-cli-webpack/handling-process-env/#using-dotenv
      // https://github.com/quasarframework/quasar/discussions/15303#discussioncomment-5904464
      // https://vite.dev/config/
      env: {
        VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
        VITE_BACK_DID: process.env.VITE_BACK_DID,
        VITE_DEV_AUTHORIZED_PHONES: process.env.VITE_DEV_AUTHORIZED_PHONES,
        VITE_IS_ORG_IMPORT_ONLY: process.env.VITE_IS_ORG_IMPORT_ONLY,
        VITE_STAGING: process.env.VITE_STAGING,
      },
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

    animations: [], // --- import only animations you need for better tree-shaking
    // https://v2.quasar.dev/options/animations
    // animations: [],

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
