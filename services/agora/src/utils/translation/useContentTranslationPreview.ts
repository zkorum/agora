import { useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ContentTranslationSubject,
  LocalizedContentTranslationStatus,
  ProjectContentVariant,
  SurveyQuestionContentVariant,
  TitleBodyContentVariant,
} from "src/shared/types/zod";
import {
  zodOpinionContentVariant,
  zodProjectContentVariant,
  zodSurveyQuestionContentVariant,
  zodTitleBodyContentVariant,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { ContentTranslationRequestMode } from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { useContentTranslationQuery } from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { updateConversationQueryCache } from "src/utils/api/post/useConversationQuery";
import { useNotify } from "src/utils/ui/notify";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  getLanguageDisplayName,
  resolveContentTranslationPollingOutcome,
} from "./contentTranslation";
import {
  type ContentTranslationPreviewTranslations,
  contentTranslationPreviewTranslations,
} from "./useContentTranslationPreview.i18n";
import {
  type ContentTranslationEventSubject,
  getContentTranslationEventIdentity,
  isContentTranslationEventForIdentity,
  useContentTranslationRecovery,
} from "./useContentTranslationRecovery";

type ContentTranslationRequestState = "idle" | "submitting" | "waiting";

function toContentTranslationEventSubject({
  subject,
  sourceVersion,
}: {
  subject: ContentTranslationSubject;
  sourceVersion: string | undefined;
}): ContentTranslationEventSubject | undefined {
  if (sourceVersion === undefined) {
    return undefined;
  }
  if (subject.kind === "conversation") {
    return { ...subject, sourceVersion };
  }
  if (subject.kind === "survey_question") {
    return { ...subject, sourceVersion };
  }
  return subject;
}

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
      left.opinionSlugId === right.opinionSlugId &&
      left.sourceVersion === right.sourceVersion
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
      left.itemSlugId === right.itemSlugId &&
      left.sourceVersion === right.sourceVersion
    );
  }

  return false;
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
  sourceVersion: string | undefined;
  originalContent: SurveyQuestionContentVariant | undefined;
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

export interface ProjectContentTranslationPreview {
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  originalContent: ProjectContentVariant | undefined;
  translatedContent: ProjectContentVariant | undefined;
}

function useContentTranslationController({
  subject,
  expectedSourceVersion,
  sourceLanguageCode,
  enabled,
  initialModePreference,
}: {
  subject: MaybeRefOrGetter<ContentTranslationSubject>;
  expectedSourceVersion: MaybeRefOrGetter<string | undefined>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
  initialModePreference?: MaybeRefOrGetter<
    ContentTranslationDisplayMode | undefined
  >;
}) {
  const languageStore = useLanguageStore();
  const { displayLanguage, spokenLanguages } = storeToRefs(languageStore);
  const queryClient = useQueryClient();
  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ContentTranslationPreviewTranslations>(
    contentTranslationPreviewTranslations
  );
  const modePreference = ref<ContentTranslationDisplayMode | undefined>(
    undefined
  );
  const requestState = ref<ContentTranslationRequestState>("idle");
  let requestGeneration = 0;
  const sortedSpokenLanguageKey = computed(() =>
    [...spokenLanguages.value].sort().join("\u0000")
  );

  const requestMode = ref<ContentTranslationRequestMode>("read_existing");

  const query = useContentTranslationQuery({
    subject,
    targetLanguageCode: displayLanguage,
    requestMode,
    enabled: computed(() => toValue(enabled)),
  });

  const currentResponse = computed(() => {
    const response = query.data.value;
    const currentSourceVersion = toValue(expectedSourceVersion);
    if (
      currentSourceVersion === undefined ||
      response?.success !== true ||
      response.content.sourceVersion !== currentSourceVersion ||
      !isSameContentTranslationSubject({
        left: response.subject,
        right: toValue(subject),
      })
    ) {
      return undefined;
    }
    return response;
  });

  const isLoadingInitialTranslation = computed(() => {
    return modePreference.value === undefined && query.isPending.value;
  });

  const translatedVariant = computed(() => {
    const content = currentResponse.value?.content;
    if (content?.kind !== "translatable") {
      return undefined;
    }
    return content.variants.translated;
  });

  const originalVariant = computed(() => {
    return currentResponse.value?.content.variants.original;
  });

  const pollingOutcome = computed(() => {
    const response = query.data.value;
    const content = currentResponse.value?.content;
    return resolveContentTranslationPollingOutcome({
      responseSuccess: response?.success,
      translationStatus:
        content?.kind === "translatable"
          ? content.translation.status
          : undefined,
      hasTranslatedVariant: translatedVariant.value !== undefined,
    });
  });

  const translationStatus = computed<LocalizedContentTranslationStatus>(() => {
    const content = currentResponse.value?.content;
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
    if (
      requestState.value === "idle" &&
      (toValue(initialModePreference) === undefined ||
        modePreference.value !== undefined)
    ) {
      return "not_requested";
    }
    if (query.isFetching.value || requestState.value !== "idle") {
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
    const preferredMode =
      modePreference.value ?? toValue(initialModePreference) ?? "original";
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
    const content = currentResponse.value?.content;
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
  const eventSubject = computed(() =>
    toContentTranslationEventSubject({
      subject: toValue(subject),
      sourceVersion: toValue(expectedSourceVersion),
    })
  );

  const recovery = useContentTranslationRecovery({
    identity: computed(() =>
      getContentTranslationEventIdentity({
        subject: eventSubject.value,
        targetLanguageCode: displayLanguage.value,
      })
    ),
    enabled: computed(() => toValue(enabled)),
    isPending: computed(() => requestState.value === "waiting"),
    classifyEvent: (data) => {
      if (
        !isContentTranslationEventForIdentity({
          data,
          subject: eventSubject.value,
          targetLanguageCode: displayLanguage.value,
        })
      ) {
        return "ignore";
      }
      return data.status === "failed" ? "fail" : "refresh";
    },
    refresh: async () => {
      const result = await query.refetch();
      if (result.isError) {
        return "pending";
      }
      if (result.data?.success === false) {
        return "failed";
      }
      if (currentResponse.value === undefined) {
        return "pending";
      }
      if (pollingOutcome.value === "completed") {
        return "settled";
      }
      return pollingOutcome.value === "terminal_failure" ? "failed" : "pending";
    },
    onFailure: () => {
      resetToOriginal();
      showNotifyMessage(t("translationFailed"));
    },
  });

  async function setMode(
    nextMode: ContentTranslationDisplayMode
  ): Promise<void> {
    if (nextMode === "translated") {
      if (requestState.value === "submitting") {
        return;
      }
      modePreference.value = "translated";
      if (
        translationStatus.value !== "completed" ||
        translatedVariant.value === undefined
      ) {
        if (requestState.value === "waiting") {
          recovery.start();
          return;
        }
        recovery.stop();
        requestMode.value = "queue_if_missing";
        requestState.value = "submitting";
        const activeRequestGeneration = requestGeneration;
        let result: Awaited<ReturnType<typeof query.refetch>>;
        try {
          result = await query.refetch();
        } finally {
          if (activeRequestGeneration === requestGeneration) {
            requestMode.value = "read_existing";
          }
        }
        if (activeRequestGeneration !== requestGeneration) {
          return;
        }
        if (result.isError) {
          resetToOriginal();
          showQueryFailureToast();
          return;
        }
        if (requestState.value !== "submitting") {
          return;
        }
        if (
          translationStatus.value !== "completed" ||
          translatedVariant.value === undefined
        ) {
          requestState.value = "waiting";
          recovery.start();
        } else {
          requestState.value = "idle";
        }
      }
      return;
    }
    if (originalVariant.value !== undefined) {
      resetToOriginal();
      return;
    }

    const previousModePreference = modePreference.value;
    recovery.stop();
    requestMode.value = "read_existing";
    modePreference.value = "original";
    requestState.value = "submitting";
    const activeRequestGeneration = requestGeneration;
    const result = await query.refetch();
    if (activeRequestGeneration !== requestGeneration) {
      return;
    }
    requestState.value = "idle";
    if (result.isError || originalVariant.value === undefined) {
      modePreference.value = previousModePreference;
      showQueryFailureToast();
    }
  }

  function resetToOriginal(): void {
    recovery.stop();
    requestMode.value = "read_existing";
    modePreference.value = "original";
    requestState.value = "idle";
  }

  watch([displayLanguage, sortedSpokenLanguageKey], () => {
    requestGeneration += 1;
    recovery.stop();
    requestMode.value = "read_existing";
    modePreference.value = undefined;
    requestState.value = "idle";
  });

  watch(
    () => toValue(subject),
    () => {
      requestGeneration += 1;
      recovery.stop();
      requestMode.value = "read_existing";
      modePreference.value = undefined;
      requestState.value = "idle";
    }
  );

  watch(
    [
      () => toValue(enabled),
      () => toValue(initialModePreference),
      () => toValue(subject),
      displayLanguage,
      sortedSpokenLanguageKey,
    ],
    ([isEnabled, initialMode]) => {
      if (isEnabled && initialMode !== undefined) {
        requestState.value = "waiting";
        recovery.start();
      } else if (!isEnabled) {
        recovery.stop();
        requestState.value = "idle";
      }
    },
    { immediate: true }
  );

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

  watch([translationStatus, translatedVariant], ([status, variant]) => {
    if (status === "completed" && variant !== undefined) {
      recovery.stop();
      requestState.value = "idle";
    }
  });

  watch(
    () => query.dataUpdatedAt.value,
    () => {
      const response = query.data.value;
      if (requestState.value === "idle") {
        return;
      }
      if (response?.success === false) {
        if (response.reason === "content_translation_not_enabled") {
          applyTranslationNotEnabledResponse();
          return;
        }
        resetToOriginal();
        showNotifyMessage(t("translationFailed"));
        return;
      }
      if (pollingOutcome.value === "terminal_failure") {
        resetToOriginal();
        showNotifyMessage(t("translationFailed"));
      }
    }
  );

  return {
    mode,
    sourceLanguageLabel,
    translationStatus,
    isAvailable: computed(() => toValue(enabled)),
    isLoadingInitialTranslation,
    setMode,
    response: currentResponse,
  };
}

export function useOpinionContentTranslationPreview({
  subject,
  sourceLanguageCode,
  enabled,
  initialModePreference,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "opinion" }>
  >;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
  initialModePreference?: MaybeRefOrGetter<
    ContentTranslationDisplayMode | undefined
  >;
}) {
  const controller = useContentTranslationController({
    subject,
    expectedSourceVersion: computed(() => toValue(subject).sourceVersion),
    sourceLanguageCode,
    enabled,
    initialModePreference,
  });

  const preview = computed<OpinionContentTranslationPreview | undefined>(() => {
    if (!controller.isAvailable.value) {
      return undefined;
    }
    const response = controller.response.value;
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
  expectedSourceVersion,
  sourceLanguageCode,
  enabled,
  initialModePreference,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "survey_question" }>
  >;
  expectedSourceVersion: MaybeRefOrGetter<string | undefined>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
  initialModePreference?: MaybeRefOrGetter<
    ContentTranslationDisplayMode | undefined
  >;
}) {
  const controller = useContentTranslationController({
    subject,
    expectedSourceVersion,
    sourceLanguageCode,
    enabled,
    initialModePreference,
  });

  const preview = computed<SurveyQuestionContentTranslationPreview | undefined>(
    () => {
      if (!controller.isAvailable.value) {
        return undefined;
      }
      const response = controller.response.value;
      const rawTranslatedVariant =
        response?.success === true &&
        response.subject.kind === "survey_question" &&
        response.content.kind === "translatable"
          ? response.content.variants.translated
          : undefined;
      const translatedVariant =
        zodSurveyQuestionContentVariant.safeParse(rawTranslatedVariant);
      const rawOriginalVariant =
        response?.success === true &&
        response.subject.kind === "survey_question"
          ? response.content.variants.original
          : undefined;
      const originalVariant =
        zodSurveyQuestionContentVariant.safeParse(rawOriginalVariant);
      const sourceVersion =
        response?.success === true &&
        response.subject.kind === "survey_question"
          ? response.content.sourceVersion
          : undefined;
      return {
        sourceVersion,
        originalContent: originalVariant.success
          ? originalVariant.data
          : undefined,
        isAvailable: true,
        isLoadingInitialTranslation:
          controller.isLoadingInitialTranslation.value,
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
  initialModePreference,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "ranking_item" }>
  >;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
  enabled: MaybeRefOrGetter<boolean>;
  initialModePreference?: MaybeRefOrGetter<
    ContentTranslationDisplayMode | undefined
  >;
}) {
  const controller = useContentTranslationController({
    subject,
    expectedSourceVersion: computed(() => toValue(subject).sourceVersion),
    sourceLanguageCode,
    enabled,
    initialModePreference,
  });

  const preview = computed<RankingItemContentTranslationPreview | undefined>(
    () => {
      if (!controller.isAvailable.value) {
        return undefined;
      }
      const response = controller.response.value;
      const rawOriginalVariant =
        response?.success === true && response.subject.kind === "ranking_item"
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
        isLoadingInitialTranslation:
          controller.isLoadingInitialTranslation.value,
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

export function useProjectContentTranslationPreview({
  subject,
  enabled,
  initialModePreference,
}: {
  subject: MaybeRefOrGetter<
    Extract<ContentTranslationSubject, { kind: "project" }>
  >;
  enabled: MaybeRefOrGetter<boolean>;
  initialModePreference?: MaybeRefOrGetter<
    ContentTranslationDisplayMode | undefined
  >;
}) {
  const controller = useContentTranslationController({
    subject,
    expectedSourceVersion: computed(() => toValue(subject).sourceVersion),
    sourceLanguageCode: undefined,
    enabled,
    initialModePreference,
  });

  const preview = computed<ProjectContentTranslationPreview | undefined>(() => {
    if (!controller.isAvailable.value) {
      return undefined;
    }
    const response = controller.response.value;
    const isCurrentProjectResponse =
      response?.success === true &&
      response.subject.kind === "project" &&
      response.subject.sourceVersion === toValue(subject).sourceVersion &&
      response.content.sourceVersion === toValue(subject).sourceVersion;
    const rawOriginalVariant = isCurrentProjectResponse
      ? response.content.variants.original
      : undefined;
    const rawTranslatedVariant =
      isCurrentProjectResponse && response.content.kind === "translatable"
        ? response.content.variants.translated
        : undefined;
    const originalVariant =
      zodProjectContentVariant.safeParse(rawOriginalVariant);
    const translatedVariant =
      zodProjectContentVariant.safeParse(rawTranslatedVariant);
    return {
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
  });

  return {
    preview,
    setMode: controller.setMode,
  };
}
