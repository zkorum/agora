import {
  isChunkLoadError,
  reloadForChunkError,
} from "src/utils/error/chunkError";
import type { App } from "vue";

type ChunkRejectionEvent = Pick<
  PromiseRejectionEvent,
  "preventDefault" | "reason" | "stopImmediatePropagation"
>;
type VueErrorHandler = NonNullable<App["config"]["errorHandler"]>;

export function handleUnhandledChunkError(event: ChunkRejectionEvent): void {
  if (!isChunkLoadError(event.reason)) {
    return;
  }

  const result = reloadForChunkError({ error: event.reason });
  if (result !== "blocked") {
    event.preventDefault();
    // Recovery boots before Sentry, whose separate handler otherwise reports it.
    event.stopImmediatePropagation();
  }
}

export function createVueChunkErrorHandler(
  existingHandler: VueErrorHandler | undefined
): VueErrorHandler {
  return (error, instance, info) => {
    if (isChunkLoadError(error)) {
      const result = reloadForChunkError({ error });
      if (result !== "blocked") {
        return;
      }
    }
    if (existingHandler) {
      existingHandler(error, instance, info);
    } else {
      console.error(error);
    }
  };
}
