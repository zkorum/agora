import {
  isChunkLoadError,
  reloadForChunkError,
} from "src/utils/error/chunkError";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
  // Vite's `vite:preloadError` event must remain uncancelled so lazy imports
  // reject normally. Route imports then reach Router.onError with their target
  // URL; other imports reach this fallback. Cancelling the Vite event instead
  // resolves the import as undefined, which Vue Router reports misleadingly as
  // "Couldn't resolve component".
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      reloadForChunkError();
    }
  });

  // Catch chunk errors that bubble through Vue's component tree
  const existingHandler = app.config.errorHandler;
  app.config.errorHandler = (err, instance, info) => {
    if (isChunkLoadError(err)) {
      reloadForChunkError();
      return;
    }
    if (existingHandler) {
      existingHandler(err, instance, info);
    } else {
      console.error(err);
    }
  };
});
