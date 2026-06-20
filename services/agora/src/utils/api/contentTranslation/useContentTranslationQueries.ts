import { useQuery } from "@tanstack/vue-query";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { ContentTranslationSubject } from "src/shared/types/zod";
import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

import { useBackendAuthApi } from "../auth";
import {
  type ContentTranslationResponse,
  useBackendContentTranslationApi,
} from "./contentTranslation";

export type ContentTranslationRequestMode = "read_existing" | "queue_if_missing";

export function getContentTranslationQueryKey({
  subject,
  targetLanguageCode,
}: {
  subject: ContentTranslationSubject;
  targetLanguageCode: SupportedDisplayLanguageCodes;
}) {
  return ["contentTranslation", subject, targetLanguageCode] as const;
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
    staleTime: 0,
  });
}
