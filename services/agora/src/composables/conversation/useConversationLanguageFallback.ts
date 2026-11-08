import { useQueryClient } from "@tanstack/vue-query";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { zodContentLanguageMetadataOutput } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import {
  isQueryForViewerScope,
  useViewerQueryScope,
} from "src/utils/query/viewerScope";
import { type MaybeRefOrGetter, onScopeDispose, toValue, watch } from "vue";
import { z } from "zod";

// Query-cache events are untyped. Parse only the backend-owned metadata needed
// here, without trusting a generic getQueryData<T>() cast or inspecting content.
const cachedConversationLanguage = z.object({
  conversationData: z.object({
    metadata: z.object({
      conversationSlugId: z.string(),
      contentLanguageMetadata: zodContentLanguageMetadataOutput,
    }),
  }),
});

export function useConversationLanguageFallback({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string | undefined>;
}): void {
  const queryCache = useQueryClient().getQueryCache();
  const languageStore = useLanguageStore();
  const viewerScope = useViewerQueryScope();
  let hasChosenFallback = false;

  function refreshFallback(): void {
    if (hasChosenFallback) {
      return;
    }
    const slugId = toValue(conversationSlugId);
    const queries =
      slugId === undefined
        ? []
        : queryCache.findAll({
            queryKey: ["conversation", slugId],
            predicate: (query) =>
              isQueryForViewerScope({
                queryKey: query.queryKey,
                viewerScope: viewerScope.value,
              }),
          });
    let latest:
      | {
          updatedAt: number;
          language: SupportedDisplayLanguageCodes | undefined;
        }
      | undefined;
    for (const query of queries) {
      if (
        latest !== undefined &&
        query.state.dataUpdatedAt < latest.updatedAt
      ) {
        continue;
      }
      const parsed = cachedConversationLanguage.safeParse(query.state.data);
      if (
        !parsed.success ||
        parsed.data.conversationData.metadata.conversationSlugId !== slugId
      ) {
        continue;
      }
      latest = {
        updatedAt: query.state.dataUpdatedAt,
        language:
          parsed.data.conversationData.metadata.contentLanguageMetadata
            .detectedDisplayLanguageCode ?? undefined,
      };
    }
    hasChosenFallback = latest?.language !== undefined;
    void languageStore.setConversationLanguageFallback(latest?.language);
  }

  // A cache subscription cannot fetch or poll, and is independent of UI locale:
  // changing the language must not lose its own conversation fallback.
  const unsubscribe = queryCache.subscribe((event) => {
    const dataChanged =
      event.type === "removed" ||
      (event.type === "updated" && event.action.type === "success");
    if (
      dataChanged &&
      event.query.queryKey[0] === "conversation" &&
      event.query.queryKey[1] === toValue(conversationSlugId)
    ) {
      refreshFallback();
    }
  });
  watch(
    [() => toValue(conversationSlugId), viewerScope],
    () => {
      hasChosenFallback = false;
      refreshFallback();
    },
    {
      immediate: true,
      flush: "sync",
    }
  );
  onScopeDispose(() => {
    unsubscribe();
    void languageStore.setConversationLanguageFallback(undefined);
  });
}
