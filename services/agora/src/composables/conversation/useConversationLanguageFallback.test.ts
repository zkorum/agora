import type * as VueQuery from "@tanstack/vue-query";
import { QueryClient } from "@tanstack/vue-query";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { ContentLanguageMetadataOutput } from "src/shared/types/zod";
import type { useLanguageStore } from "src/stores/language";
import { getConversationQueryKey } from "src/utils/query/conversationQueryKeys";
import type * as ViewerScopeModule from "src/utils/query/viewerScope";
import type { ViewerQueryScope } from "src/utils/query/viewerScope";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EffectScope, effectScope, ref } from "vue";

const mocks = vi.hoisted(() => ({
  setFallback:
    vi.fn<
      ReturnType<typeof useLanguageStore>["setConversationLanguageFallback"]
    >(),
}));
const queryClient = new QueryClient();
const viewerScope = ref<ViewerQueryScope>({ kind: "viewer", userId: "user-a" });
vi.mock("@tanstack/vue-query", async (importOriginal) => ({
  ...(await importOriginal<typeof VueQuery>()),
  useQueryClient: () => queryClient,
}));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({
    setConversationLanguageFallback: mocks.setFallback,
  }),
}));
vi.mock("src/utils/query/viewerScope", async (importOriginal) => ({
  ...(await importOriginal<typeof ViewerScopeModule>()),
  useViewerQueryScope: () => viewerScope,
}));

import { useConversationLanguageFallback } from "./useConversationLanguageFallback";

function cacheConversation({
  slugId = "conversation-a",
  userId = "user-a",
  displayLanguage = "en",
  detectedLanguage = "fr",
  updatedAt = 1,
}: {
  slugId?: string;
  userId?: string;
  displayLanguage?: SupportedDisplayLanguageCodes;
  detectedLanguage?: SupportedDisplayLanguageCodes | null;
  updatedAt?: number;
} = {}): void {
  const metadata = {
    detectedDisplayLanguageCode: detectedLanguage,
    detectedSourceLanguageCode: detectedLanguage,
    detectedRawLanguageCode: detectedLanguage,
    detectionConfidence: 1,
    autoDetectionStatus: "detected",
  } satisfies ContentLanguageMetadataOutput;
  queryClient.setQueryData(
    getConversationQueryKey({
      conversationSlugId: slugId,
      displayLanguage,
      spokenLanguages: [displayLanguage],
      viewerScope: { kind: "viewer", userId },
    }),
    {
      conversationData: {
        metadata: {
          conversationSlugId: slugId,
          contentLanguageMetadata: metadata,
        },
      },
    },
    { updatedAt }
  );
}

describe("conversation language fallback", () => {
  let scope: EffectScope;
  beforeEach(() => {
    queryClient.clear();
    mocks.setFallback.mockReset().mockResolvedValue(true);
    viewerScope.value = { kind: "viewer", userId: "user-a" };
    scope = effectScope();
  });
  afterEach(() => {
    scope.stop();
    queryClient.clear();
  });

  it("does not create queries, observers, or requests just to detect a language", () => {
    scope.run(() =>
      useConversationLanguageFallback({ conversationSlugId: "conversation-a" })
    );
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(mocks.setFallback).toHaveBeenLastCalledWith(undefined);
    cacheConversation();
    expect(mocks.setFallback).toHaveBeenLastCalledWith("fr");
    expect(queryClient.getQueryCache().getAll()[0]?.getObserversCount()).toBe(
      0
    );
  });

  it("chooses the newest cached detection once per visit, not on every refresh", () => {
    cacheConversation({ detectedLanguage: "es", updatedAt: 1 });
    cacheConversation({
      displayLanguage: "fr",
      detectedLanguage: "fr",
      updatedAt: 2,
    });
    cacheConversation({
      displayLanguage: "ru",
      detectedLanguage: "es",
      updatedAt: 1,
    });
    scope.run(() =>
      useConversationLanguageFallback({ conversationSlugId: "conversation-a" })
    );
    expect(mocks.setFallback).toHaveBeenLastCalledWith("fr");
    cacheConversation({
      displayLanguage: "fr",
      detectedLanguage: null,
      updatedAt: 3,
    });
    expect(mocks.setFallback).toHaveBeenLastCalledWith("fr");
  });

  it("waits for the first usable detection rather than locking in a missing language", () => {
    cacheConversation({ detectedLanguage: null });
    scope.run(() =>
      useConversationLanguageFallback({ conversationSlugId: "conversation-a" })
    );
    expect(mocks.setFallback).toHaveBeenLastCalledWith(undefined);
    cacheConversation({ detectedLanguage: "fr", updatedAt: 2 });
    expect(mocks.setFallback).toHaveBeenLastCalledWith("fr");
    cacheConversation({ detectedLanguage: "es", updatedAt: 3 });
    expect(mocks.setFallback).toHaveBeenLastCalledWith("fr");
  });

  it("ignores other viewers and clears context synchronously on account/route changes", () => {
    const slugId = ref<string | undefined>("conversation-a");
    cacheConversation();
    cacheConversation({
      userId: "user-b",
      detectedLanguage: "es",
      updatedAt: 2,
    });
    scope.run(() =>
      useConversationLanguageFallback({ conversationSlugId: slugId })
    );
    expect(mocks.setFallback).toHaveBeenLastCalledWith("fr");
    viewerScope.value = { kind: "viewer", userId: "user-b" };
    expect(mocks.setFallback).toHaveBeenLastCalledWith("es");
    slugId.value = "conversation-b";
    expect(mocks.setFallback).toHaveBeenLastCalledWith(undefined);
    cacheConversation({
      slugId: "conversation-b",
      userId: "user-b",
      detectedLanguage: "ru",
    });
    expect(mocks.setFallback).toHaveBeenLastCalledWith("ru");
    slugId.value = undefined;
    expect(mocks.setFallback).toHaveBeenLastCalledWith(undefined);
  });

  it("rejects malformed cache entries and never infers language from content or legacy settings", () => {
    const key = getConversationQueryKey({
      conversationSlugId: "conversation-a",
      displayLanguage: "en",
      spokenLanguages: ["en"],
      viewerScope: viewerScope.value,
    });
    queryClient.setQueryData(key, {
      conversationData: {
        metadata: {
          conversationSlugId: "conversation-a",
          languageSetting: { languageCode: "fr", detectedLanguageCode: "fr" },
        },
      },
    });
    scope.run(() =>
      useConversationLanguageFallback({ conversationSlugId: "conversation-a" })
    );
    expect(mocks.setFallback).toHaveBeenLastCalledWith(undefined);
    queryClient.setQueryData(key, {
      conversationData: {
        metadata: {
          conversationSlugId: "conversation-b",
          contentLanguageMetadata: { detectedDisplayLanguageCode: "fr" },
        },
      },
    });
    expect(mocks.setFallback).toHaveBeenLastCalledWith(undefined);
  });

  it("releases subscriptions and clears the fallback on disposal", () => {
    cacheConversation();
    scope.run(() =>
      useConversationLanguageFallback({ conversationSlugId: "conversation-a" })
    );
    scope.stop();
    expect(mocks.setFallback).toHaveBeenLastCalledWith(undefined);
    mocks.setFallback.mockClear();
    cacheConversation({ detectedLanguage: "es" });
    expect(mocks.setFallback).not.toHaveBeenCalled();
  });
});
