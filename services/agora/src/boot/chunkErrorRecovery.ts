import {
  createVueChunkErrorHandler,
  handleUnhandledChunkError,
} from "src/utils/error/chunkErrorRecovery";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
  if (import.meta.env.DEV) return;

  // Cancelling `vite:preloadError` makes the failed import resolve as undefined,
  // which Vue Router misleadingly reports as an unresolved component.
  window.addEventListener("unhandledrejection", handleUnhandledChunkError);
  app.config.errorHandler = createVueChunkErrorHandler(
    app.config.errorHandler
  );
});
