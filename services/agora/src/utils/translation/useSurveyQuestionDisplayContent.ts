import { storeToRefs } from "pinia";
import type {
  SurveyQuestionContentVariant,
  SurveyQuestionDisplayedContent,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
} from "./contentTranslation";
import {
  areSurveyQuestionContentsEqual,
  getSurveyQuestionSourceKey,
  resolveSurveyQuestionDisplayContent,
} from "./surveyQuestionDisplayText";
import {
  type SurveyQuestionContentTranslationPreview,
  useSurveyQuestionContentTranslationPreview,
} from "./useContentTranslationPreview";

export function useSurveyQuestionDisplayContent({
  conversationSlugId,
  questionSlugId,
  originalContent,
  displayContent,
  sourceLanguageCode,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  questionSlugId: MaybeRefOrGetter<string>;
  originalContent: MaybeRefOrGetter<SurveyQuestionContentVariant>;
  displayContent: MaybeRefOrGetter<SurveyQuestionDisplayedContent | undefined>;
  sourceLanguageCode: MaybeRefOrGetter<string | null | undefined>;
}) {
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const requestedTranslationSourceKey = ref<string | undefined>();
  const sourceVersion = computed(() => toValue(displayContent)?.sourceVersion);
  const sourceKey = computed(() =>
    getSurveyQuestionSourceKey({
      sourceVersion: sourceVersion.value,
      content: toValue(originalContent),
    })
  );
  const spokenLanguageKey = computed(() =>
    [...spokenLanguages.value].sort().join("\u0000")
  );
  const hasTranslationControl = computed(
    () => toValue(displayContent)?.translationControl != null
  );
  const pendingServerTranslationMode = computed<
    ContentTranslationDisplayMode | undefined
  >(() => {
    const translationControl = toValue(displayContent)?.translationControl;
    if (
      translationControl === undefined ||
      translationControl === null ||
      (translationControl.status !== "pending" &&
        translationControl.status !== "running")
    ) {
      return undefined;
    }
    return translationControl.alternateMode;
  });
  const hasCurrentRequestedTranslation = computed(
    () =>
      requestedTranslationSourceKey.value !== undefined &&
      requestedTranslationSourceKey.value === sourceKey.value &&
      hasTranslationControl.value
  );
  const translationSubject = computed(() => ({
    kind: "survey_question" as const,
    conversationSlugId: toValue(conversationSlugId),
    questionSlugId: toValue(questionSlugId),
  }));
  const {
    preview: requestedTranslationPreview,
    setMode: setRequestedTranslationMode,
  } = useSurveyQuestionContentTranslationPreview({
    subject: translationSubject,
    expectedSourceVersion: sourceVersion,
    sourceLanguageCode,
    enabled: computed(
      () =>
        hasCurrentRequestedTranslation.value ||
        pendingServerTranslationMode.value !== undefined
    ),
    initialModePreference: pendingServerTranslationMode,
  });
  const currentRequestedTranslationPreview = computed(() => {
    const preview = requestedTranslationPreview.value;
    if (
      !hasCurrentRequestedTranslation.value ||
      preview === undefined ||
      preview.sourceVersion !== sourceVersion.value
    ) {
      return undefined;
    }
    return areSurveyQuestionContentsEqual({
      left: preview.originalContent,
      right: toValue(originalContent),
    })
      ? preview
      : undefined;
  });

  const initialTranslationPreview = computed<
    SurveyQuestionContentTranslationPreview | undefined
  >(() => {
    const currentDisplayContent = toValue(displayContent);
    const translationControl = currentDisplayContent?.translationControl;
    if (currentDisplayContent === undefined || translationControl == null) {
      return undefined;
    }
    const sourceLanguageLabel = getContentTranslationSourceLanguageLabel({
      sourceLanguage: undefined,
      fallbackLanguageCode: toValue(sourceLanguageCode),
      fallbackLabel: translationControl.sourceLanguageLabel,
      displayLanguage: displayLanguage.value,
    });

    if (
      currentDisplayContent.status === "available" &&
      currentDisplayContent.mode === "translated"
    ) {
      return {
        sourceVersion: currentDisplayContent.sourceVersion,
        originalContent: toValue(originalContent),
        isAvailable: true,
        isLoadingInitialTranslation: false,
        mode: "translated",
        sourceLanguageLabel,
        translationStatus: translationControl.status,
        translatedQuestionText: currentDisplayContent.content.questionText,
        translatedOptions: currentDisplayContent.content.options,
      };
    }

    return {
      sourceVersion: currentDisplayContent.sourceVersion,
      originalContent: toValue(originalContent),
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: "original",
      sourceLanguageLabel,
      translationStatus: translationControl.status,
      translatedQuestionText: "",
      translatedOptions: [],
    };
  });
  const translationPreview = computed(
    () =>
      currentRequestedTranslationPreview.value ??
      initialTranslationPreview.value
  );
  const displayedContent = computed(() =>
    resolveSurveyQuestionDisplayContent({
      originalContent: toValue(originalContent),
      translationPreview: translationPreview.value,
    })
  );
  const translationMode = computed<ContentTranslationDisplayMode>({
    get: () => translationPreview.value?.mode ?? "original",
    set: setTranslationMode,
  });

  function setTranslationMode(mode: ContentTranslationDisplayMode): void {
    requestedTranslationSourceKey.value = sourceKey.value;
    void setRequestedTranslationMode(mode);
  }

  function resetTranslationMode(): void {
    requestedTranslationSourceKey.value = undefined;
  }

  watch(
    [
      () => toValue(conversationSlugId),
      () => toValue(questionSlugId),
      sourceVersion,
      sourceKey,
      hasTranslationControl,
      displayLanguage,
      spokenLanguageKey,
    ],
    resetTranslationMode
  );

  return {
    displayedContent,
    translationPreview,
    translationMode,
  };
}
