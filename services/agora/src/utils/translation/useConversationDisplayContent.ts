import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
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
import { useNotify } from "src/utils/ui/notify";
import type { MaybeRefOrGetter } from "vue";
import { computed, onScopeDispose, ref, toValue, watch } from "vue";

import { useBoundedTranslationPolling } from "./boundedTranslationPolling";
import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  getConversationLanguageSettingSourceLanguageCode,
  isSameContentLanguage,
} from "./contentTranslation";
import { subscribeToContentTranslationUpdated } from "./contentTranslationEvents";
import {
  type ContentTranslationPreviewTranslations,
  contentTranslationPreviewTranslations,
} from "./useContentTranslationPreview.i18n";

const TRANSLATION_COMPLETION_POLL_INTERVAL_MS = 500;
const TRANSLATION_COMPLETION_POLL_MAX_DURATION_MS = 5_000;

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
  const { t } = useComponentI18n<ContentTranslationPreviewTranslations>(
    contentTranslationPreviewTranslations
  );
  const { showNotifyMessage } = useNotify();
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
  const completionPolling = useBoundedTranslationPolling({
    intervalMs: TRANSLATION_COMPLETION_POLL_INTERVAL_MS,
    maxDurationMs: TRANSLATION_COMPLETION_POLL_MAX_DURATION_MS,
    onTimeout: () => {
      modePreference.value = "original";
      showNotifyMessage(t("translationTimedOut"));
    },
  });
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
    refetchInterval: completionPolling.refetchInterval,
  });

  const activeDisplayContent = computed<ConversationContentFetchResponse | undefined>(
    () => {
      const requestedDisplayContent = requestedContentQuery.data.value;
      const initialDisplayContent = effectiveInitialDisplayContent.value;
      if (
        modePreference.value !== undefined &&
        requestedDisplayContent !== undefined &&
        isDisplayContentForMode({
          displayContent: requestedDisplayContent,
          mode: requestedMode.value,
          isFetching: requestedContentQuery.isFetching.value,
        })
      ) {
        if (
          requestedDisplayContent.status === "available" ||
          initialDisplayContent?.status !== "available"
        ) {
          return requestedDisplayContent;
        }
      }
      return initialDisplayContent ?? requestedDisplayContent;
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

    const requestedDisplayContent = requestedContentQuery.data.value;
    const requestedTranslationControl =
      modePreference.value === "translated" &&
      requestedDisplayContent?.status !== "available"
        ? requestedDisplayContent?.translationControl
        : undefined;
    const translationControl =
      requestedTranslationControl ?? displayContent.translationControl;
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

  const unsubscribeUpdatedEvents = subscribeToContentTranslationUpdated((data) => {
    if (
      modePreference.value !== "translated" ||
      data.targetLanguageCode !== displayLanguage.value ||
      data.subject.kind !== "conversation" ||
      data.subject.conversationSlugId !== conversationSlugId.value
    ) {
      return;
    }
    void requestedContentQuery.refetch();
    completionPolling.start();
  });

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
    completionPolling.stop();
    modePreference.value = undefined;
  });

  watch(
    () => requestedContentQuery.data.value,
    (displayContent) => {
      if (
        displayContent?.status === "available" &&
        displayContent.mode === "translated"
      ) {
        completionPolling.stop();
      }
    }
  );

  onScopeDispose(() => {
    completionPolling.stop();
    unsubscribeUpdatedEvents();
  });

  return {
    activeDisplayContent,
    displayedTitle,
    displayedBody,
    translationPreview,
    setTranslationMode,
  };
}
