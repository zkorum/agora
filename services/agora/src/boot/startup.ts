import { createVueChunkErrorHandler } from "src/utils/error/chunkErrorRecovery";
import type { App } from "vue";

import { defineBoot } from "#q-app/wrappers";

const initializedApps = new WeakSet<App>();

export function hasStartupCompleted(app: App | undefined): boolean {
  return app !== undefined && initializedApps.has(app);
}

export default defineBoot(async (context) => {
  try {
    const telemetryModules = Promise.allSettled([
      import("./plausible"),
      ...(import.meta.env.PROD && process.env.VITE_STAGING !== "true"
        ? [import("./sentry")]
        : []),
      ...(import.meta.env.DEV ? [import("./devBrowserLogger")] : []),
    ]);

    // Quasar skips rejected boot-file imports. Await the whole set here so a
    // missing plugin cannot leave App.vue running with partial initialization.
    const [recovery, recipientPrivacy, ...applicationModules] =
      await Promise.all([
        import("./chunkErrorRecovery"),
        import("./recipientActionPrivacy"),
        import("./i18n"),
        import("./axios"),
        import("./primevue"),
        import("./vue-query"),
        import("./embeddedBrowserGuard"),
        import("./maz-ui"),
        import("./spaLinkInterceptor"),
      ]);

    await recovery.default(context);
    await recipientPrivacy.default(context);

    for (const result of await telemetryModules) {
      if (result.status === "rejected") {
        console.error(
          "[Startup] Telemetry module failed to load",
          result.reason
        );
        continue;
      }
      try {
        await result.value.default(context);
      } catch (error) {
        console.error("[Startup] Telemetry initialization failed", error);
      }
    }

    for (const { default: initialize } of applicationModules) {
      await initialize(context);
    }
    initializedApps.add(context.app);
  } catch (error) {
    // Rethrowing makes Quasar abort before mounting even the failure screen.
    // Use the configured error handler so recovery and Sentry privacy still apply.
    const handleError = createVueChunkErrorHandler(
      context.app.config.errorHandler
    );
    handleError(error, null, "application startup");
  }
});
