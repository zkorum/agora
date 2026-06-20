import { useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { SSEContentTranslationUpdatedData } from "src/shared/types/sse";
import type {
  ContentTranslationSubject,
  LocalizedContentTranslationStatus,
} from "src/shared/types/zod";
import {
  zodConversationContentVariant,
  zodOpinionContentVariant,
  zodSurveyQuestionContentVariant,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { ContentTranslationRequestMode } from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { useContentTranslationQuery } from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { updateConversationQueryCache } from "src/utils/api/post/useConversationQuery";
import { useNotify } from "src/utils/ui/notify";
import type { MaybeRefOrGetter } from "vue";
import { computed, onScopeDispose, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getLanguageDisplayName,
  resolveContentTranslationState,
} from "./contentTranslation";
import { subscribeToContentTranslationFailed } from "./contentTranslationEvents";
import {
  type ContentTranslationPreviewTranslations,
  contentTranslationPreviewTranslations,
} from "./useContentTranslationPreview.i18n";

const TRANSLATION_WAIT_TIMEOUT_MS = 30_000;

function isRateLimitError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 429;
}

function isSameContentTranslationSubject({
  left,
  right,
}: {
  left: ContentTranslationSubject;
  right: ContentTranslationSubject;
}): boolean {
  if (
    left.kind !== right.kind ||
    left.conversationSlugId !== right.conversationSlugId
  ) {
    return false;
  }

  if (left.kind === "conversation" && right.kind === "conversation") {
    return true;
  }
  if (left.kind === "opinion" && right.kind === "opinion") {
    return left.opinionSlugId === right.opinionSlugId;
  }
  if (left.kind === "survey_question" && right.kind === "survey_question") {
    return left.questionSlugId === right.questionSlugId;
  }

  return false;
}

export interface ConversationContentTranslationPreview {
  isAvailable: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedTitle: string;
  translatedBody: string | undefined;
}

export interface OpinionContentTranslationPreview {
  isAvailable: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedOpinion: string;
}

export interface SurveyQuestionContentTranslationPreview {
  isAvailable: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedQuestionText: string;
  translatedOptions: { optionSlugId: string; optionText: string }[];
}

interface ContentTranslationController {
  mode: Readonly<{ value: ContentTranslationDisplayMode }>;
  sourceLanguageLabel: Readonly<{ value: string | undefined }>;
  translationStatus: Readonly<{ value: LocalizedContentTranslationStatus }>;
  isAvailable: Readonly<{ value: boolean }>;
  setMode: (mode: ContentTranslationDisplayMode) => Promise<void>;
}

function useContentTranslationController({
  subject,
  dynamicTranslationEnabled,
  sourceLanguageCode,
  supportedTargetLanguageCodes,
}: {
  subject: MaybeRefOrGetter<ContentTranslationSubject>;
  dynamicTranslationEnabled: MaybeRefOrGetter<boolean>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  supportedTargetLanguageCodes: MaybeRefOrGetter<SupportedDisplayLanguageCodes[]>;
}): ContentTranslationController & {
  query: ReturnType<typeof useContentTranslationQuery>;
} {
  const languageStore = useLanguageStore();
  const { displayLanguage, spokenLanguages } = storeToRefs(languageStore);
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ContentTranslationPreviewTranslations>(
    contentTranslationPreviewTranslations
  );
  const modePreference = ref<ContentTranslationDisplayMode | undefined>(undefined);
  const hasRequestedTranslation = ref(false);
  let waitTimeout: ReturnType<typeof setTimeout> | undefined;

  const resolvedState = computed(() =>
    resolveContentTranslationState({
      dynamicTranslationEnabled: toValue(dynamicTranslationEnabled),
      sourceLanguageCode: toValue(sourceLanguageCode),
      displayLanguage: displayLanguage.value,
      spokenLanguages: spokenLanguages.value,
      supportedTargetLanguageCodes: toValue(supportedTargetLanguageCodes),
      hasTranslatedContent: true,
    })
  );
  const requestMode = computed<ContentTranslationRequestMode>(() =>
    hasRequestedTranslation.value ? "queue_if_missing" : "read_existing"
  );

  const query = useContentTranslationQuery({
    subject,
    targetLanguageCode: displayLanguage,
    requestMode,
    enabled: computed(() => resolvedState.value.isAvailable),
  });

  const translatedVariant = computed(() => {
    const response = query.data.value;
    const content = response?.success === true ? response.content : undefined;
    if (content?.kind !== "translatable") {
      return undefined;
    }
    return content.variants.translated;
  });

  const translationStatus = computed<LocalizedContentTranslationStatus>(() => {
    const response = query.data.value;
    const content = response?.success === true ? response.content : undefined;
    if (
      content?.kind === "translatable" &&
      content.translation.status === "completed" &&
      content.variants.translated !== undefined
    ) {
      return "completed";
    }
    if (!hasRequestedTranslation.value) {
      return "not_requested";
    }
    if (query.isFetching.value) {
      return "pending";
    }
    if (query.isError.value) {
      return "failed";
    }
    if (content?.kind === "translatable") {
      return content.translation.status;
    }
    return "pending";
  });

  const mode = computed<ContentTranslationDisplayMode>(() => {
    const preferredMode = modePreference.value ?? resolvedState.value.initialMode;
    if (
      preferredMode === "translated" &&
      translationStatus.value === "completed" &&
      translatedVariant.value !== undefined
    ) {
      return "translated";
    }
    return "original";
  });

  const sourceLanguageLabel = computed(() => {
    const response = query.data.value;
    const content = response?.success === true ? response.content : undefined;
    if (content?.kind === "translatable") {
      return getLanguageDisplayName({
        languageCode: content.translation.sourceLanguageCode,
        displayLanguage: displayLanguage.value,
      });
    }
    return getLanguageDisplayName({
      languageCode: toValue(sourceLanguageCode),
      displayLanguage: displayLanguage.value,
    });
  });

  async function setMode(nextMode: ContentTranslationDisplayMode): Promise<void> {
    if (nextMode === "translated") {
      modePreference.value = "translated";
      if (
        translationStatus.value !== "completed" ||
        translatedVariant.value === undefined
      ) {
        hasRequestedTranslation.value = true;
        await query.refetch();
      }
      return;
    }
    modePreference.value = nextMode;
    hasRequestedTranslation.value = false;
  }

  function resetToOriginal(): void {
    modePreference.value = "original";
    hasRequestedTranslation.value = false;
  }

  watch(displayLanguage, () => {
    modePreference.value = undefined;
    hasRequestedTranslation.value = false;
  });

  function applyTranslationNotEnabledResponse(): void {
    const response = query.data.value;
    if (
      response?.success !== false ||
      response.reason !== "content_translation_not_enabled"
    ) {
      return;
    }
    const currentSubject = toValue(subject);
    updateConversationQueryCache({
      queryClient,
      conversationSlugId: currentSubject.conversationSlugId,
      updateConversation: (conversation) => ({
        ...conversation,
        metadata: {
          ...conversation.metadata,
          multilingualSetting: response.multilingualSetting,
        },
      }),
    });
    resetToOriginal();
    showNotifyMessage(t("translationNotEnabled"));
  }

  function showQueryFailureToast(): void {
    showNotifyMessage(
      isRateLimitError(query.error.value)
        ? t("translationRateLimited")
        : t("translationFailed")
    );
  }

  function clearWaitTimeout(): void {
    if (waitTimeout !== undefined) {
      clearTimeout(waitTimeout);
      waitTimeout = undefined;
    }
  }

  function isFailedEventForCurrentRequest(
    data: SSEContentTranslationUpdatedData
  ): boolean {
    return (
      hasRequestedTranslation.value &&
      data.targetLanguageCode === displayLanguage.value &&
      isSameContentTranslationSubject({
        left: data.subject,
        right: toValue(subject),
      })
    );
  }

  const unsubscribeFailedEvents = subscribeToContentTranslationFailed(
    (data) => {
      if (!isFailedEventForCurrentRequest(data)) {
        return;
      }
      clearWaitTimeout();
      resetToOriginal();
      showNotifyMessage(t("translationFailed"));
    }
  );

  watch(translationStatus, (status) => {
    if (status === "pending" || status === "running") {
      clearWaitTimeout();
      waitTimeout = setTimeout(() => {
        resetToOriginal();
        showNotifyMessage(t("translationTimedOut"));
      }, TRANSLATION_WAIT_TIMEOUT_MS);
      return;
    }

    clearWaitTimeout();
    if (status === "failed") {
      resetToOriginal();
      showQueryFailureToast();
    }
  });

  watch(
    () => query.data.value,
    (response) => {
      if (response?.success === false && hasRequestedTranslation.value) {
        if (response.reason === "content_translation_not_enabled") {
          applyTranslationNotEnabledResponse();
          return;
        }
        resetToOriginal();
        showNotifyMessage(t("translationFailed"));
      }
    }
  );

  onScopeDispose(() => {
    clearWaitTimeout();
    unsubscribeFailedEvents();
  });

  return {
    mode,
    sourceLanguageLabel,
    translationStatus,
    isAvailable: computed(() => resolvedState.value.isAvailable),
    setMode,
    query,
  };
}

export function useConversationContentTranslationPreview({
  subject,
  dynamicTranslationEnabled,
  sourceLanguageCode,
  supportedTargetLanguageCodes,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "conversation" }>
  >;
  dynamicTranslationEnabled: MaybeRefOrGetter<boolean>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  supportedTargetLanguageCodes: MaybeRefOrGetter<SupportedDisplayLanguageCodes[]>;
}) {
  const controller = useContentTranslationController({
    subject,
    dynamicTranslationEnabled,
    sourceLanguageCode,
    supportedTargetLanguageCodes,
  });

  const preview = computed<ConversationContentTranslationPreview | undefined>(
    () => {
      if (!controller.isAvailable.value) {
        return undefined;
      }
      const response = controller.query.data.value;
      const rawTranslatedVariant =
        response?.success === true &&
        response.subject.kind === "conversation" &&
        response.content.kind === "translatable"
          ? response.content.variants.translated
          : undefined;
      const translatedVariant =
        zodConversationContentVariant.safeParse(rawTranslatedVariant);
      return {
        isAvailable: true,
        mode: controller.mode.value,
        sourceLanguageLabel: controller.sourceLanguageLabel.value,
        translationStatus: controller.translationStatus.value,
        translatedTitle: translatedVariant.success
          ? translatedVariant.data.title
          : "",
        translatedBody: translatedVariant.success
          ? translatedVariant.data.body
          : undefined,
      };
    }
  );

  return {
    preview,
    setMode: controller.setMode,
  };
}

export function useOpinionContentTranslationPreview({
  subject,
  dynamicTranslationEnabled,
  sourceLanguageCode,
  supportedTargetLanguageCodes,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "opinion" }>
  >;
  dynamicTranslationEnabled: MaybeRefOrGetter<boolean>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  supportedTargetLanguageCodes: MaybeRefOrGetter<SupportedDisplayLanguageCodes[]>;
}) {
  const controller = useContentTranslationController({
    subject,
    dynamicTranslationEnabled,
    sourceLanguageCode,
    supportedTargetLanguageCodes,
  });

  const preview = computed<OpinionContentTranslationPreview | undefined>(() => {
    if (!controller.isAvailable.value) {
      return undefined;
    }
    const response = controller.query.data.value;
    const rawTranslatedVariant =
      response?.success === true &&
      response.subject.kind === "opinion" &&
      response.content.kind === "translatable"
        ? response.content.variants.translated
        : undefined;
    const translatedVariant =
      zodOpinionContentVariant.safeParse(rawTranslatedVariant);
    return {
      isAvailable: true,
      mode: controller.mode.value,
      sourceLanguageLabel: controller.sourceLanguageLabel.value,
      translationStatus: controller.translationStatus.value,
      translatedOpinion: translatedVariant.success
        ? translatedVariant.data.content
        : "",
    };
  });

  return {
    preview,
    setMode: controller.setMode,
  };
}

export function useSurveyQuestionContentTranslationPreview({
  subject,
  dynamicTranslationEnabled,
  sourceLanguageCode,
  supportedTargetLanguageCodes,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "survey_question" }>
  >;
  dynamicTranslationEnabled: MaybeRefOrGetter<boolean>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  supportedTargetLanguageCodes: MaybeRefOrGetter<SupportedDisplayLanguageCodes[]>;
}) {
  const controller = useContentTranslationController({
    subject,
    dynamicTranslationEnabled,
    sourceLanguageCode,
    supportedTargetLanguageCodes,
  });

  const preview = computed<SurveyQuestionContentTranslationPreview | undefined>(
    () => {
      if (!controller.isAvailable.value) {
        return undefined;
      }
      const response = controller.query.data.value;
      const rawTranslatedVariant =
        response?.success === true &&
        response.subject.kind === "survey_question" &&
        response.content.kind === "translatable"
          ? response.content.variants.translated
          : undefined;
      const translatedVariant =
        zodSurveyQuestionContentVariant.safeParse(rawTranslatedVariant);
      return {
        isAvailable: true,
        mode: controller.mode.value,
        sourceLanguageLabel: controller.sourceLanguageLabel.value,
        translationStatus: controller.translationStatus.value,
        translatedQuestionText: translatedVariant.success
          ? translatedVariant.data.questionText
          : "",
        translatedOptions: translatedVariant.success
          ? translatedVariant.data.options
          : [],
      };
    }
  );

  return {
    preview,
    setMode: controller.setMode,
  };
}
