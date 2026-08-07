import type { SSEContentTranslationUpdatedData } from "src/shared/types/sse";

type ContentTranslationEventListener = (
  data: SSEContentTranslationUpdatedData
) => void;

const listeners = new Set<ContentTranslationEventListener>();

export function publishContentTranslationEvent(
  data: SSEContentTranslationUpdatedData
): void {
  for (const listener of listeners) {
    try {
      listener(data);
    } catch (error) {
      console.error("[ContentTranslation] Event listener failed", error);
    }
  }
}

export function subscribeToContentTranslationEvents(
  listener: ContentTranslationEventListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
