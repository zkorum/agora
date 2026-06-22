import { storeToRefs } from "pinia";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type {
  ExtendedConversation,
  LocalizedContentTranslationStatus,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import {
  type ConversationContentMode,
  useConversationContentQuery,
  useConversationDisplayContentCache,
} from "src/utils/api/contentTranslation/useContentTranslationQueries";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  getConversationLanguageSettingSourceLanguageCode,
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
  extendedConversation,
}: {
  extendedConversation: MaybeRefOrGetter<ExtendedConversation | undefined>;
}) {
  const { displayLanguage } = storeToRefs(useLanguageStore());
  const modePreference = ref<ConversationContentMode | undefined>();
  const conversationSlugId = computed(
    () => toValue(extendedConversation)?.metadata.conversationSlugId ?? ""
  );

  const initialDisplayContentQuery = useConversationDisplayContentCache({
    conversationSlugId,
  });
  const contentId = computed(() => initialDisplayContentQuery.data.value?.contentId);
  const requestedMode = computed<ConversationContentMode>(
    () => modePreference.value ?? "original"
  );
  const requestedContentQuery = useConversationContentQuery({
    conversationSlugId,
    contentId,
    mode: requestedMode,
    requestMode: computed(() =>
      requestedMode.value === "translated" ? "queue_if_missing" : "read_existing"
    ),
    enabled: computed(
      () => modePreference.value !== undefined && toValue(extendedConversation) !== undefined
    ),
  });

  const activeDisplayContent = computed<ConversationContentFetchResponse | undefined>(
    () => {
      if (
        modePreference.value !== undefined &&
        requestedContentQuery.data.value !== undefined
      ) {
        return requestedContentQuery.data.value;
      }
      return initialDisplayContentQuery.data.value;
    }
  );

  const translationPreview = computed<
    ConversationContentTranslationPreview | undefined
  >(() => {
    const displayContent = activeDisplayContent.value;
    const conversation = toValue(extendedConversation);
    if (displayContent === undefined || conversation === undefined) {
      return undefined;
    }

    const translationControl = displayContent.translationControl;
    if (translationControl === null) {
      return undefined;
    }

    const sourceLanguageLabel = getContentTranslationSourceLanguageLabel({
      sourceLanguage: undefined,
      fallbackLanguageCode: getConversationLanguageSettingSourceLanguageCode({
        languageSetting: conversation.metadata.languageSetting,
      }),
      fallbackLabel: translationControl.sourceLanguageLabel,
      displayLanguage: displayLanguage.value,
    });

    if (displayContent.status !== "available") {
      return {
        isAvailable: true,
        isLoadingInitialTranslation: false,
        mode: "original",
        sourceLanguageLabel,
        translationStatus: requestedContentQuery.isFetching.value
          ? "pending"
          : translationControl.status,
        translatedTitle: "",
        translatedBody: undefined,
      };
    }

    const isTranslatedContent = displayContent.mode === "translated";
    return {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: isTranslatedContent ? "translated" : "original",
      sourceLanguageLabel,
      translationStatus: requestedContentQuery.isFetching.value
        ? "pending"
        : translationControl.status,
      translatedTitle: isTranslatedContent ? displayContent.content.title : "",
      translatedBody: isTranslatedContent ? displayContent.content.body : undefined,
    };
  });

  const displayedTitle = computed(() => {
    const conversation = toValue(extendedConversation);
    if (translationPreview.value?.isLoadingInitialTranslation === true) {
      return "";
    }
    if (translationPreview.value?.mode === "translated") {
      return translationPreview.value.translatedTitle;
    }
    return conversation?.payload.title ?? "";
  });

  const displayedBody = computed(() => {
    const conversation = toValue(extendedConversation);
    if (translationPreview.value?.isLoadingInitialTranslation === true) {
      return undefined;
    }
    if (translationPreview.value?.mode === "translated") {
      return translationPreview.value.translatedBody;
    }
    return conversation?.payload.body;
  });

  function setTranslationMode(mode: ContentTranslationDisplayMode): void {
    modePreference.value = mode;
  }

  return {
    activeDisplayContent,
    displayedTitle,
    displayedBody,
    translationPreview,
    setTranslationMode,
  };
}
