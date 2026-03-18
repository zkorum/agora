import { isChunkLoadError, reloadForChunkError } from "src/utils/error/chunkError";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
  // Vite fires this event when a dynamic import's module preload link fails.
  // Calling preventDefault() suppresses the unhandled rejection.
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadForChunkError();
  });

  // Catch chunk errors that surface as unhandled promise rejections
  // (e.g., lazy-loaded route components that fail to fetch).
  // Replaces the inline script that was previously in index.html.
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
