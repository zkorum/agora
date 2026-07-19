import { useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SSEContentTranslationUpdatedData } from "src/shared/types/sse";
import type {
  ContentTranslationSubject,
  LocalizedContentTranslationStatus,
  TitleBodyContentVariant,
} from "src/shared/types/zod";
import {
  zodConversationContentVariant,
  zodOpinionContentVariant,
  zodSurveyQuestionContentVariant,
  zodTitleBodyContentVariant,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { ContentTranslationRequestMode } from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { useContentTranslationQuery } from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { updateConversationQueryCache } from "src/utils/api/post/useConversationQuery";
import { useNotify } from "src/utils/ui/notify";
import type { MaybeRefOrGetter } from "vue";
import { computed, onScopeDispose, ref, toValue, watch } from "vue";

import { useBoundedTranslationPolling } from "./boundedTranslationPolling";
import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  getLanguageDisplayName,
} from "./contentTranslation";
import {
  subscribeToContentTranslationFailed,
  subscribeToContentTranslationUpdated,
} from "./contentTranslationEvents";
import {
  type ContentTranslationPreviewTranslations,
  contentTranslationPreviewTranslations,
} from "./useContentTranslationPreview.i18n";

const TRANSLATION_POLL_INTERVAL_MS = 500;
const TRANSLATION_POLL_MAX_DURATION_MS = 30_000;

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
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "conversation" && right.kind === "conversation") {
    return left.conversationSlugId === right.conversationSlugId;
  }
  if (left.kind === "opinion" && right.kind === "opinion") {
    return (
      left.conversationSlugId === right.conversationSlugId &&
      left.opinionSlugId === right.opinionSlugId
    );
  }
  if (left.kind === "survey_question" && right.kind === "survey_question") {
    return (
      left.conversationSlugId === right.conversationSlugId &&
      left.questionSlugId === right.questionSlugId
    );
  }
  if (left.kind === "project" && right.kind === "project") {
    return left.projectSlug === right.projectSlug;
  }
  if (left.kind === "ranking_item" && right.kind === "ranking_item") {
    return (
      left.conversationSlugId === right.conversationSlugId &&
      left.itemSlugId === right.itemSlugId
    );
  }

  return false;
}

export interface ConversationContentTranslationPreview {
  isAvailable: boolean;
  isLoadingInitialTranslation: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedTitle: string;
  translatedBody: string | undefined;
}

export interface OpinionContentTranslationPreview {
  isAvailable: boolean;
  isLoadingInitialTranslation: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedOpinion: string;
}

export interface SurveyQuestionContentTranslationPreview {
  isAvailable: boolean;
  isLoadingInitialTranslation: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedQuestionText: string;
  translatedOptions: { optionSlugId: string; optionText: string }[];
}

export interface RankingItemContentTranslationPreview {
  isAvailable: boolean;
  isLoadingInitialTranslation: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  originalContent: TitleBodyContentVariant | undefined;
  translatedContent: TitleBodyContentVariant | undefined;
}

interface ContentTranslationController {
  mode: Readonly<{ value: ContentTranslationDisplayMode }>;
  sourceLanguageLabel: Readonly<{ value: string | undefined }>;
  translationStatus: Readonly<{ value: LocalizedContentTranslationStatus }>;
  isAvailable: Readonly<{ value: boolean }>;
  isLoadingInitialTranslation: Readonly<{ value: boolean }>;
  setMode: (mode: ContentTranslationDisplayMode) => Promise<void>;
}

function useContentTranslationController({
  subject,
  sourceLanguageCode,
  enabled,
}: {
  subject: MaybeRefOrGetter<ContentTranslationSubject>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
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
  const sortedSpokenLanguageKey = computed(() =>
    [...spokenLanguages.value].sort().join("\u0000")
  );

  const requestMode = ref<ContentTranslationRequestMode>("read_existing");
  const translationPolling = useBoundedTranslationPolling({
    intervalMs: TRANSLATION_POLL_INTERVAL_MS,
    maxDurationMs: TRANSLATION_POLL_MAX_DURATION_MS,
    onTimeout: () => {
      resetToOriginal();
      showNotifyMessage(t("translationTimedOut"));
    },
  });

  const query = useContentTranslationQuery({
    subject,
    targetLanguageCode: displayLanguage,
    requestMode,
    enabled: computed(() => toValue(enabled)),
    refetchInterval: translationPolling.refetchInterval,
  });

  const isLoadingInitialTranslation = computed(() => {
    return (
      modePreference.value === undefined &&
      query.isPending.value
    );
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
    if (isLoadingInitialTranslation.value) {
      return "pending";
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
      if (
        hasRequestedTranslation.value &&
        modePreference.value === "translated" &&
        content.variants.translated === undefined &&
        content.translation.status !== "failed"
      ) {
        return "pending";
      }
      return content.translation.status;
    }
    return "pending";
  });

  const mode = computed<ContentTranslationDisplayMode>(() => {
    const preferredMode = modePreference.value ?? "original";
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
      return getContentTranslationSourceLanguageLabel({
        sourceLanguage: content.translation.sourceLanguage,
        fallbackLanguageCode: content.translation.sourceLanguageCode,
        fallbackLabel: content.translation.sourceLanguageLabel,
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
        if (hasRequestedTranslation.value) {
          translationPolling.start();
          return;
        }
        translationPolling.stop();
        requestMode.value = "queue_if_missing";
        hasRequestedTranslation.value = true;
        try {
          await query.refetch();
        } finally {
          requestMode.value = "read_existing";
        }
        if (
          translationStatus.value !== "completed" ||
          translatedVariant.value === undefined
        ) {
          translationPolling.start();
        }
      }
      return;
    }
    resetToOriginal();
  }

  function resetToOriginal(): void {
    translationPolling.stop();
    requestMode.value = "read_existing";
    modePreference.value = "original";
    hasRequestedTranslation.value = false;
  }

  watch([displayLanguage, sortedSpokenLanguageKey], () => {
    translationPolling.stop();
    requestMode.value = "read_existing";
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
    if ("conversationSlugId" in currentSubject) {
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
    }
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

  function isEventForCurrentRequest(
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
      if (!isEventForCurrentRequest(data)) {
        return;
      }
      resetToOriginal();
      showNotifyMessage(t("translationFailed"));
    }
  );

  const unsubscribeUpdatedEvents = subscribeToContentTranslationUpdated((data) => {
    if (!isEventForCurrentRequest(data)) {
      return;
    }
    void query.refetch();
    translationPolling.start();
  });

  watch([translationStatus, translatedVariant], ([status, variant]) => {
    if (status === "completed" && variant !== undefined) {
      translationPolling.stop();
    }
  });

  watch(translationStatus, (status) => {
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
    translationPolling.stop();
    unsubscribeUpdatedEvents();
    unsubscribeFailedEvents();
  });

  return {
    mode,
    sourceLanguageLabel,
    translationStatus,
    isAvailable: computed(() => toValue(enabled)),
    isLoadingInitialTranslation,
    setMode,
    query,
  };
}

export function useConversationContentTranslationPreview({
  subject,
  sourceLanguageCode,
  enabled,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "conversation" }>
  >;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const controller = useContentTranslationController({
    subject,
    sourceLanguageCode,
    enabled,
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
        isLoadingInitialTranslation: controller.isLoadingInitialTranslation.value,
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
  sourceLanguageCode,
  enabled,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "opinion" }>
  >;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const controller = useContentTranslationController({
    subject,
    sourceLanguageCode,
    enabled,
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
      isLoadingInitialTranslation: controller.isLoadingInitialTranslation.value,
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
  sourceLanguageCode,
  enabled,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "survey_question" }>
  >;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const controller = useContentTranslationController({
    subject,
    sourceLanguageCode,
    enabled,
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
        isLoadingInitialTranslation: controller.isLoadingInitialTranslation.value,
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

export function useRankingItemContentTranslationPreview({
  subject,
  sourceLanguageCode,
  enabled,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "ranking_item" }>
  >;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
}) {
  const controller = useContentTranslationController({
    subject,
    sourceLanguageCode,
    enabled,
  });

  const preview = computed<RankingItemContentTranslationPreview | undefined>(
    () => {
      if (!controller.isAvailable.value) {
        return undefined;
      }
      const response = controller.query.data.value;
      const rawOriginalVariant =
        response?.success === true &&
        response.subject.kind === "ranking_item"
          ? response.content.variants.original
          : undefined;
      const rawTranslatedVariant =
        response?.success === true &&
        response.subject.kind === "ranking_item" &&
        response.content.kind === "translatable"
          ? response.content.variants.translated
          : undefined;
      const originalVariant =
        zodTitleBodyContentVariant.safeParse(rawOriginalVariant);
      const translatedVariant =
        zodTitleBodyContentVariant.safeParse(rawTranslatedVariant);
      return {
        isAvailable: true,
        isLoadingInitialTranslation: controller.isLoadingInitialTranslation.value,
        mode: controller.mode.value,
        sourceLanguageLabel: controller.sourceLanguageLabel.value,
        translationStatus: controller.translationStatus.value,
        originalContent: originalVariant.success
          ? originalVariant.data
          : undefined,
        translatedContent: translatedVariant.success
          ? translatedVariant.data
          : undefined,
      };
    }
  );

  return {
    preview,
    setMode: controller.setMode,
  };
}
