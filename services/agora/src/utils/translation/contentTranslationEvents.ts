import type { SSEContentTranslationUpdatedData } from "src/shared/types/sse";

type ContentTranslationFailedListener = (
  data: SSEContentTranslationUpdatedData
) => void;

const failedListeners = new Set<ContentTranslationFailedListener>();

export function publishContentTranslationFailed(
  data: SSEContentTranslationUpdatedData
): void {
  for (const listener of failedListeners) {
    listener(data);
  }
}

export function subscribeToContentTranslationFailed(
  listener: ContentTranslationFailedListener
): () => void {
  failedListeners.add(listener);
  return () => {
    failedListeners.delete(listener);
  };
}
