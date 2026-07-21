// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { sentryVitePlugin } from "@sentry/vite-plugin";
import legacy from "@vitejs/plugin-legacy";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin, ViteDevServer } from "vite";
import viteCompression from "vite-plugin-compression";
import { z } from "zod";

import { defineConfig } from "#q-app/wrappers";

import { envSchema, validateEnv } from "./src/utils/processEnv";

// TODO: add env var to use TLS/SSL
// import basicSsl from "@vitejs/plugin-basic-ssl";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEV_BROWSER_LOG_ENDPOINT = "/__agora_dev_browser_log";
const DEV_BROWSER_LOG_MAX_BYTES = 64_000;

const devBrowserLogMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const devBrowserLogEventSchema = z
  .object({
    schemaVersion: z.number().int(),
    timestamp: z.string(),
    sequence: z.number().int().nonnegative(),
    level: z.enum(["debug", "info", "log", "warn", "error"]),
    category: z.string(),
    message: z.string(),
    url: z.string(),
    route: z.string(),
    stack: z.string().optional(),
    metadata: z.record(z.string(), devBrowserLogMetadataValueSchema).optional(),
  })
  .strict();

async function readRequestBody({
  req,
  maxBytes,
}: {
  req: IncomingMessage;
  maxBytes: number;
}): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = chunk instanceof Buffer ? chunk : Buffer.from(String(chunk));
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error("Browser log payload is too large");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function sendJsonResponse({
  res,
  statusCode,
  body,
}: {
  res: ServerResponse;
  statusCode: number;
  body: Record<string, string | boolean>;
}): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return Object.prototype.toString.call(error);
}

async function handleDevBrowserLogRequest({
  req,
  res,
}: {
  req: IncomingMessage;
  res: ServerResponse;
}): Promise<void> {
  if (req.method !== "POST") {
    sendJsonResponse({
      res,
      statusCode: 405,
      body: { ok: false, error: "Method not allowed" },
    });
    return;
  }

  try {
    const rawBody = await readRequestBody({
      req,
      maxBytes: DEV_BROWSER_LOG_MAX_BYTES,
    });
    const jsonPayload: unknown = JSON.parse(rawBody);
    const parsedPayload = devBrowserLogEventSchema.safeParse(jsonPayload);

    if (!parsedPayload.success) {
      sendJsonResponse({
        res,
        statusCode: 400,
        body: { ok: false, error: "Invalid browser log payload" },
      });
      return;
    }

    console.log(
      `AGORA_BROWSER_EVENT ${JSON.stringify({
        receivedAt: new Date().toISOString(),
        ...parsedPayload.data,
      })}`
    );
    sendJsonResponse({ res, statusCode: 200, body: { ok: true } });
  } catch (error) {
    const message = errorMessage(error);
    console.error(`[dev-browser-log] ${message}`);
    sendJsonResponse({
      res,
      statusCode: 500,
      body: { ok: false, error: message },
    });
  }
}

function devBrowserLogPlugin(): Plugin {
  return {
    name: "agora-dev-browser-log",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(DEV_BROWSER_LOG_ENDPOINT, (req, res) => {
        void handleDevBrowserLogRequest({ req, res });
      });
    },
  };
}

export default defineConfig((ctx) => {
  // Build the boot files array
  // Note: VITE_STAGING must be set in the shell environment (not just .env files)
  // because this code runs before Vite loads .env files
  const boot: string[] = ["chunkErrorRecovery"];
  if (ctx.prod && process.env.VITE_STAGING !== "true") {
    boot.push("sentry");
  }
  if (ctx.dev) {
    boot.push("devBrowserLogger");
  }
  boot.push(
    ...[
      "i18n",
      "axios",
      "primevue",
      "vue-query",
      "embeddedBrowserGuard",
      "maz-ui",
      "spaLinkInterceptor",
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

      // "roboto-font", // optional, you are not bound to it
      "mdi-v7", // optional, you are not bound to it
      "material-icons",
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      // Production maps are uploaded to Sentry and removed from the image.
      sourcemap:
        ctx.prod && process.env.VITE_STAGING !== "true" ? "hidden" : false,
      target: {
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
      vueOptionsAPI: true,

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

        if (ctx.dev) {
          viteConf.plugins.push(devBrowserLogPlugin());
        }

        viteConf.build = {
          ...viteConf.build,
          // Vite does not read Browserslist for CSS syntax lowering.
          // Keep these engine floors aligned with .browserslistrc.
          cssTarget: ["chrome51", "edge15", "firefox54", "ios10", "safari10"],
        };

        if (ctx.prod) {
          viteConf.plugins.push(
            ...legacy({
              modernPolyfills: true,
            })
          );
        }

        // Point Node.js modules to stub files
        viteConf.resolve.alias = {
          ...viteConf.resolve.alias,
          constants: resolve(__dirname, "src/stubs/constants.js"),
          fs: resolve(__dirname, "src/stubs/fs.js"),
          path: resolve(__dirname, "src/stubs/path.js"),
          crypto: resolve(__dirname, "src/stubs/crypto.js"),
          "source-map-js": resolve(__dirname, "src/stubs/source-map-js.js"),
          url: resolve(__dirname, "src/stubs/url.js"),
        };

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

        // Add Sentry after plugins that transform or inspect the final bundles.
        if (process.env.VITE_STAGING !== "true" && ctx.prod) {
          viteConf.plugins.push(
            sentryVitePlugin({
              org: "zkorum",
              project: "agora-app",
            })
          );
        }

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

      viteVuePluginOptions: {},

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
        },
        viteCompression({
          algorithm: "gzip",
          ext: ".gz",
        }),
        [
          "vite-plugin-checker",
          {
            vueTsc: true,
          },
          { server: false },
        ],
        // TODO: add env variable to add TLS/SSL
        // basicSsl(),
        [
          "vue-router/vite",
          {
            // routesFolder: 'src/pages',
            dts: "./src/route-map.d.ts",
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
      plugins: ["Dialog", "Notify"],
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
