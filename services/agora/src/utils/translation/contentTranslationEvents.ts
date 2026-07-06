import type { SSEContentTranslationUpdatedData } from "src/shared/types/sse";

type ContentTranslationFailedListener = (
  data: SSEContentTranslationUpdatedData
) => void;
type ContentTranslationUpdatedListener = (
  data: SSEContentTranslationUpdatedData
) => void;

const failedListeners = new Set<ContentTranslationFailedListener>();
const updatedListeners = new Set<ContentTranslationUpdatedListener>();

export function publishContentTranslationUpdated(
  data: SSEContentTranslationUpdatedData
): void {
  for (const listener of updatedListeners) {
    listener(data);
  }
}

export function subscribeToContentTranslationUpdated(
  listener: ContentTranslationUpdatedListener
): () => void {
  updatedListeners.add(listener);
  return () => {
    updatedListeners.delete(listener);
  };
}

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
