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

export type ContentTranslationInclude = "original" | "translation" | "both";

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
  include,
  enabled = true,
}: {
  subject: MaybeRefOrGetter<ContentTranslationSubject>;
  targetLanguageCode: MaybeRefOrGetter<SupportedDisplayLanguageCodes>;
  include: MaybeRefOrGetter<ContentTranslationInclude>;
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
        include: toValue(include),
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
