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
  type ContentTranslationRequestMode,
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
import {
  subscribeToContentTranslationFailed,
  subscribeToContentTranslationUpdated,
} from "./contentTranslationEvents";
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
  const shouldQueueNextTranslatedRequest = ref(false);
  const requestMode = computed<ContentTranslationRequestMode>(() =>
    shouldQueueNextTranslatedRequest.value && requestedMode.value === "translated"
      ? "queue_if_missing"
      : "read_existing"
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
    requestMode,
    enabled: computed(
      () => modePreference.value !== undefined && toValue(conversationData) !== undefined
    ),
    refetchInterval: completionPolling.refetchInterval,
  });

  function resetToOriginal(): void {
    completionPolling.stop();
    shouldQueueNextTranslatedRequest.value = false;
    modePreference.value = "original";
  }

  function handleTranslationFailure(): void {
    if (modePreference.value !== "translated") {
      return;
    }
    resetToOriginal();
    showNotifyMessage(t("translationFailed"));
  }

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
    const hasTranslatedContent =
      displayContent.status === "available" &&
      displayContent.mode === "translated" &&
      modePreference.value !== "original";
    let translationStatus: LocalizedContentTranslationStatus =
      translationControl.status;
    if (
      translationControl.status !== "failed" &&
      (isWaitingForTranslatedContent ||
        (modePreference.value === "translated" && !hasTranslatedContent))
    ) {
      translationStatus = "pending";
    }

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

    return {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: hasTranslatedContent ? "translated" : "original",
      sourceLanguageLabel,
      translationStatus,
      translatedTitle: hasTranslatedContent ? displayContent.content.title : "",
      translatedBody: hasTranslatedContent ? displayContent.content.body : undefined,
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
    completionPolling.stop();
    if (mode !== "translated") {
      shouldQueueNextTranslatedRequest.value = false;
      modePreference.value = mode;
      return;
    }
    const shouldRefetchCurrentMode = modePreference.value === "translated";
    shouldQueueNextTranslatedRequest.value = true;
    modePreference.value = mode;
    if (shouldRefetchCurrentMode) {
      void requestedContentQuery.refetch();
    }
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

  const unsubscribeFailedEvents = subscribeToContentTranslationFailed((data) => {
    if (
      modePreference.value !== "translated" ||
      data.targetLanguageCode !== displayLanguage.value ||
      data.subject.kind !== "conversation" ||
      data.subject.conversationSlugId !== conversationSlugId.value
    ) {
      return;
    }
    handleTranslationFailure();
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
    shouldQueueNextTranslatedRequest.value = false;
    modePreference.value = undefined;
  });

  watch(
    () => requestedContentQuery.isFetching.value,
    (isFetching, wasFetching) => {
      if (wasFetching && !isFetching) {
        shouldQueueNextTranslatedRequest.value = false;
      }
    }
  );

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

  watch(
    () => translationPreview.value?.translationStatus,
    (status) => {
      if (status === "failed") {
        handleTranslationFailure();
      }
    }
  );

  onScopeDispose(() => {
    completionPolling.stop();
    unsubscribeUpdatedEvents();
    unsubscribeFailedEvents();
  });

  return {
    activeDisplayContent,
    displayedTitle,
    displayedBody,
    translationPreview,
    setTranslationMode,
  };
}
