import { storeToRefs } from "pinia";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type {
  ExtendedConversationDisplayData,
  ExtendedConversationPayload,
  LocalizedContentTranslationStatus,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import {
  type ConversationContentMode,
  useConversationContentQuery,
  useConversationDisplayContentCache,
} from "src/utils/api/contentTranslation/useContentTranslationQueries";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  getConversationLanguageSettingSourceLanguageCode,
  isSameContentLanguage,
} from "./contentTranslation";

export interface ConversationContentTranslationPreview {
  isAvailable: boolean;
  isLoadingInitialTranslation: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedTitle: string;
  translatedBody: string | undefined;
}

export function useConversationDisplayContent({
  conversationData,
  initialDisplayContent,
  fallbackPayload,
}: {
  conversationData: MaybeRefOrGetter<ExtendedConversationDisplayData | undefined>;
  initialDisplayContent?: MaybeRefOrGetter<
    ConversationContentFetchResponse | undefined
  >;
  fallbackPayload?: MaybeRefOrGetter<ExtendedConversationPayload | undefined>;
}) {
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const modePreference = ref<ConversationContentMode | undefined>();
  const sortedSpokenLanguageKey = computed(() =>
    [...spokenLanguages.value].sort().join("\u0000")
  );
  const conversationSlugId = computed(
    () => toValue(conversationData)?.metadata.conversationSlugId ?? ""
  );

  const initialDisplayContentQuery = useConversationDisplayContentCache({
    conversationSlugId,
  });
  const effectiveInitialDisplayContent = computed(
    () => initialDisplayContentQuery.data.value ?? toValue(initialDisplayContent)
  );
  const sourceVersion = computed(
    () => effectiveInitialDisplayContent.value?.sourceVersion
  );
  const requestedMode = computed<ConversationContentMode>(
    () => modePreference.value ?? "original"
  );
  const requestedContentQuery = useConversationContentQuery({
    conversationSlugId,
    sourceVersion,
    mode: requestedMode,
    requestMode: computed(() =>
      requestedMode.value === "translated" ? "queue_if_missing" : "read_existing"
    ),
    enabled: computed(
      () => modePreference.value !== undefined && toValue(conversationData) !== undefined
    ),
  });

  const activeDisplayContent = computed<ConversationContentFetchResponse | undefined>(
    () => {
      if (
        modePreference.value !== undefined &&
        requestedContentQuery.data.value !== undefined &&
        isDisplayContentForMode({
          displayContent: requestedContentQuery.data.value,
          mode: requestedMode.value,
          isFetching: requestedContentQuery.isFetching.value,
        })
      ) {
        return requestedContentQuery.data.value;
      }
      return effectiveInitialDisplayContent.value;
    }
  );

  const translationPreview = computed<
    ConversationContentTranslationPreview | undefined
  >(() => {
    const displayContent = activeDisplayContent.value;
    const conversation = toValue(conversationData);
    if (displayContent === undefined || conversation === undefined) {
      return undefined;
    }

    const translationControl = displayContent.translationControl;
    if (translationControl === null) {
      return undefined;
    }
    const sourceLanguageCode = getConversationLanguageSettingSourceLanguageCode({
      contentLanguageMetadata: conversation.metadata.contentLanguageMetadata,
      languageSetting: conversation.metadata.languageSetting,
    });
    if (
      sourceLanguageCode !== undefined &&
      isSameContentLanguage({
        sourceLanguageCode,
        displayLanguage: displayLanguage.value,
      })
    ) {
      return undefined;
    }

    const isWaitingForTranslatedContent =
      modePreference.value === "translated" &&
      requestedContentQuery.isFetching.value &&
      !isDisplayContentForMode({
        displayContent,
        mode: "translated",
        isFetching: requestedContentQuery.isFetching.value,
      });
    const translationStatus = isWaitingForTranslatedContent
      ? "pending"
      : translationControl.status;

    const sourceLanguageLabel = getContentTranslationSourceLanguageLabel({
      sourceLanguage: undefined,
      fallbackLanguageCode: sourceLanguageCode,
      fallbackLabel: translationControl.sourceLanguageLabel,
      displayLanguage: displayLanguage.value,
    });

    if (displayContent.status !== "available") {
      return {
        isAvailable: true,
        isLoadingInitialTranslation: false,
        mode: "original",
        sourceLanguageLabel,
        translationStatus,
        translatedTitle: "",
        translatedBody: undefined,
      };
    }

    const isTranslatedContent =
      displayContent.mode === "translated" && modePreference.value !== "original";
    return {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: isTranslatedContent ? "translated" : "original",
      sourceLanguageLabel,
      translationStatus,
      translatedTitle: isTranslatedContent ? displayContent.content.title : "",
      translatedBody: isTranslatedContent ? displayContent.content.body : undefined,
    };
  });

  const displayedTitle = computed(() => {
    if (translationPreview.value?.isLoadingInitialTranslation === true) {
      return "";
    }
    if (translationPreview.value?.mode === "translated") {
      return translationPreview.value.translatedTitle;
    }
    const displayContent = activeDisplayContent.value;
    if (displayContent?.status === "available") {
      return displayContent.content.title;
    }
    return toValue(fallbackPayload)?.title ?? "";
  });

  const displayedBody = computed(() => {
    if (translationPreview.value?.isLoadingInitialTranslation === true) {
      return undefined;
    }
    if (translationPreview.value?.mode === "translated") {
      return translationPreview.value.translatedBody;
    }
    const displayContent = activeDisplayContent.value;
    if (displayContent?.status === "available") {
      return displayContent.content.body;
    }
    return toValue(fallbackPayload)?.body;
  });

  function setTranslationMode(mode: ContentTranslationDisplayMode): void {
    modePreference.value = mode;
  }

  function isDisplayContentForMode({
    displayContent,
    mode,
    isFetching,
  }: {
    displayContent: ConversationContentFetchResponse;
    mode: ConversationContentMode;
    isFetching: boolean;
  }): boolean {
    if (displayContent.status !== "available") {
      return !isFetching;
    }

    return displayContent.mode === mode;
  }

  watch([displayLanguage, sortedSpokenLanguageKey], () => {
    modePreference.value = undefined;
  });

  return {
    activeDisplayContent,
    displayedTitle,
    displayedBody,
    translationPreview,
    setTranslationMode,
  };
}
