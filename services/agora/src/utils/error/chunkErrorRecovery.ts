import {
  isChunkLoadError,
  reloadForChunkError,
} from "src/utils/error/chunkError";
import type { App } from "vue";

type ChunkRejectionEvent = Pick<
  PromiseRejectionEvent,
  "preventDefault" | "reason"
>;
type VueErrorHandler = NonNullable<App["config"]["errorHandler"]>;

export function handleUnhandledChunkError(event: ChunkRejectionEvent): void {
  if (isChunkLoadError(event.reason) && reloadForChunkError()) {
    event.preventDefault();
  }
}

export function createVueChunkErrorHandler(
  existingHandler: VueErrorHandler | undefined
): VueErrorHandler {
  return (error, instance, info) => {
    if (isChunkLoadError(error) && reloadForChunkError()) {
      return;
    }
    if (existingHandler) {
      existingHandler(error, instance, info);
    } else {
      console.error(error);
    }
  };
}
