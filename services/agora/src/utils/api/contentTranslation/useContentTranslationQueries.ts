import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { ContentTranslationSubject } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

import { useBackendAuthApi } from "../auth";
import {
  type ContentTranslationResponse,
  type ConversationContentFetchResponse,
  useBackendContentTranslationApi,
} from "./contentTranslation";

export type ContentTranslationRequestMode = "read_existing" | "queue_if_missing";
export type ConversationContentMode = "original" | "translated";

export function getContentTranslationQueryKey({
  subject,
  targetLanguageCode,
}: {
  subject: ContentTranslationSubject;
  targetLanguageCode: SupportedDisplayLanguageCodes;
}) {
  return ["contentTranslation", subject, targetLanguageCode] as const;
}

export function getConversationContentQueryKey({
  conversationSlugId,
  contentId,
  mode,
  targetLanguageCode,
  spokenLanguages,
}: {
  conversationSlugId: string;
  contentId: string;
  mode: ConversationContentMode;
  targetLanguageCode: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
}) {
  return [
    "conversationContent",
    conversationSlugId,
    contentId,
    mode,
    targetLanguageCode,
    [...spokenLanguages].sort(),
  ] as const;
}

export function getConversationContentQueryPrefix({
  conversationSlugId,
}: {
  conversationSlugId: string;
}) {
  return ["conversationContent", conversationSlugId] as const;
}

export function getConversationDisplayContentQueryKey({
  conversationSlugId,
  targetLanguageCode,
  spokenLanguages,
}: {
  conversationSlugId: string;
  targetLanguageCode: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
}) {
  return [
    "conversationDisplayContent",
    conversationSlugId,
    targetLanguageCode,
    [...spokenLanguages].sort(),
  ] as const;
}

export function getConversationDisplayContentQueryPrefix({
  conversationSlugId,
}: {
  conversationSlugId: string;
}) {
  return ["conversationDisplayContent", conversationSlugId] as const;
}

export function useConversationDisplayContentCache({
  conversationSlugId,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
}) {
  const queryClient = useQueryClient();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const queryKey = computed(() =>
    getConversationDisplayContentQueryKey({
      conversationSlugId: toValue(conversationSlugId),
      targetLanguageCode: displayLanguage.value,
      spokenLanguages: spokenLanguages.value,
    })
  );

  return useQuery<ConversationContentFetchResponse>({
    queryKey,
    queryFn: async () => {
      const cached = queryClient.getQueryData<ConversationContentFetchResponse>(
        queryKey.value
      );
      if (cached !== undefined) {
        return cached;
      }
      throw new Error("Conversation display content has not been fetched");
    },
    enabled: false,
    staleTime: Infinity,
  });
}

export function useContentTranslationQuery({
  subject,
  targetLanguageCode,
  requestMode,
  enabled = true,
}: {
  subject: MaybeRefOrGetter<ContentTranslationSubject>;
  targetLanguageCode: MaybeRefOrGetter<SupportedDisplayLanguageCodes>;
  requestMode: MaybeRefOrGetter<ContentTranslationRequestMode>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { requestContentTranslation } = useBackendContentTranslationApi();
  const { updateAuthState } = useBackendAuthApi();

  return useQuery<ContentTranslationResponse>({
    queryKey: computed(() =>
      getContentTranslationQueryKey({
        subject: toValue(subject),
        targetLanguageCode: toValue(targetLanguageCode),
      })
    ),
    queryFn: async () => {
      const response = await requestContentTranslation({
        subject: toValue(subject),
        targetLanguageCode: toValue(targetLanguageCode),
        requestMode: toValue(requestMode),
      });
      if (response.success) {
        void updateAuthState({ partialLoginStatus: { isKnown: true } });
      }
      return response;
    },
    enabled: computed(() => toValue(enabled)),
    retry: false,
  });
}

export function useConversationContentQuery({
  conversationSlugId,
  contentId,
  mode,
  requestMode,
  enabled = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  contentId: MaybeRefOrGetter<string | undefined>;
  mode: MaybeRefOrGetter<ConversationContentMode>;
  requestMode: MaybeRefOrGetter<ContentTranslationRequestMode>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchConversationContent } = useBackendContentTranslationApi();
  const { updateAuthState } = useBackendAuthApi();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

  return useQuery<ConversationContentFetchResponse>({
    queryKey: computed(() =>
      getConversationContentQueryKey({
        conversationSlugId: toValue(conversationSlugId),
        contentId: toValue(contentId) ?? "",
        mode: toValue(mode),
        targetLanguageCode: displayLanguage.value,
        spokenLanguages: spokenLanguages.value,
      })
    ),
    queryFn: async () => {
      const response = await fetchConversationContent({
        conversationSlugId: toValue(conversationSlugId),
        contentId: toValue(contentId) ?? "",
        mode: toValue(mode),
        requestMode: toValue(requestMode),
      });
      void updateAuthState({ partialLoginStatus: { isKnown: true } });
      return response;
    },
    enabled: computed(() => toValue(enabled) && toValue(contentId) !== undefined),
    retry: false,
  });
}
