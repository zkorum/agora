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
  type ProjectContentFetchResponse,
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
  sourceVersion,
  mode,
  targetLanguageCode,
  spokenLanguages,
}: {
  conversationSlugId: string;
  sourceVersion: string;
  mode: ConversationContentMode;
  targetLanguageCode: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
}) {
  return [
    "conversationContent",
    conversationSlugId,
    sourceVersion,
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

export function getProjectContentQueryKey({
  projectSlug,
  sourceVersion,
  mode,
  targetLanguageCode,
  spokenLanguages,
}: {
  projectSlug: string;
  sourceVersion: string;
  mode: ConversationContentMode;
  targetLanguageCode: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
}) {
  return [
    "projectContent",
    projectSlug,
    sourceVersion,
    mode,
    targetLanguageCode,
    [...spokenLanguages].sort(),
  ] as const;
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
    queryFn: () => {
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
  refetchInterval = false,
}: {
  subject: MaybeRefOrGetter<ContentTranslationSubject>;
  targetLanguageCode: MaybeRefOrGetter<SupportedDisplayLanguageCodes>;
  requestMode: MaybeRefOrGetter<ContentTranslationRequestMode>;
  enabled?: MaybeRefOrGetter<boolean>;
  refetchInterval?: MaybeRefOrGetter<number | false>;
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
    refetchInterval: computed(() => toValue(refetchInterval)),
    retry: false,
  });
}

export function useConversationContentQuery({
  conversationSlugId,
  sourceVersion,
  mode,
  requestMode,
  enabled = true,
  refetchInterval = false,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  sourceVersion: MaybeRefOrGetter<string | undefined>;
  mode: MaybeRefOrGetter<ConversationContentMode>;
  requestMode: MaybeRefOrGetter<ContentTranslationRequestMode>;
  enabled?: MaybeRefOrGetter<boolean>;
  refetchInterval?: MaybeRefOrGetter<number | false>;
}) {
  const { fetchConversationContent } = useBackendContentTranslationApi();
  const { updateAuthState } = useBackendAuthApi();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

  return useQuery<ConversationContentFetchResponse>({
    queryKey: computed(() =>
      getConversationContentQueryKey({
        conversationSlugId: toValue(conversationSlugId),
        sourceVersion: toValue(sourceVersion) ?? "",
        mode: toValue(mode),
        targetLanguageCode: displayLanguage.value,
        spokenLanguages: spokenLanguages.value,
      })
    ),
    queryFn: async () => {
      const response = await fetchConversationContent({
        conversationSlugId: toValue(conversationSlugId),
        sourceVersion: toValue(sourceVersion) ?? "",
        mode: toValue(mode),
        requestMode: toValue(requestMode),
      });
      void updateAuthState({ partialLoginStatus: { isKnown: true } });
      return response;
    },
    enabled: computed(() => toValue(enabled) && toValue(sourceVersion) !== undefined),
    refetchInterval: computed(() => toValue(refetchInterval)),
    retry: false,
  });
}

export function useProjectContentQuery({
  projectSlug,
  sourceVersion,
  mode,
  requestMode,
  enabled = true,
}: {
  projectSlug: MaybeRefOrGetter<string>;
  sourceVersion: MaybeRefOrGetter<string | undefined>;
  mode: MaybeRefOrGetter<ConversationContentMode>;
  requestMode: MaybeRefOrGetter<ContentTranslationRequestMode>;
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  const { fetchProjectContent } = useBackendContentTranslationApi();
  const { updateAuthState } = useBackendAuthApi();
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

  return useQuery<ProjectContentFetchResponse>({
    queryKey: computed(() =>
      getProjectContentQueryKey({
        projectSlug: toValue(projectSlug),
        sourceVersion: toValue(sourceVersion) ?? "",
        mode: toValue(mode),
        targetLanguageCode: displayLanguage.value,
        spokenLanguages: spokenLanguages.value,
      })
    ),
    queryFn: async () => {
      const response = await fetchProjectContent({
        projectSlug: toValue(projectSlug),
        sourceVersion: toValue(sourceVersion) ?? "",
        mode: toValue(mode),
        requestMode: toValue(requestMode),
      });
      void updateAuthState({ partialLoginStatus: { isKnown: true } });
      return response;
    },
    enabled: computed(() => toValue(enabled) && toValue(sourceVersion) !== undefined),
    retry: false,
  });
}
