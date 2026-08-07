import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type {
  ExtendedConversationDisplayData,
  ExtendedConversationPayload,
  LocalizedContentTranslationStatus,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { ConversationContentMode } from "src/utils/api/contentTranslation/conversationContentQuery";
import {
  type ContentTranslationRequestMode,
  useConversationContentQuery,
  useConversationDisplayContentCache,
} from "src/utils/api/contentTranslation/useContentTranslationQueries";
import { useNotify } from "src/utils/ui/notify";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  getConversationLanguageSettingSourceLanguageCode,
  isSameContentLanguage,
  selectConversationInitialDisplayContent,
} from "./contentTranslation";
import {
  type ContentTranslationPreviewTranslations,
  contentTranslationPreviewTranslations,
} from "./useContentTranslationPreview.i18n";
import {
  getContentTranslationEventIdentity,
  isContentTranslationEventForIdentity,
  useContentTranslationRecovery,
} from "./useContentTranslationRecovery";

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
  conversationData: MaybeRefOrGetter<
    ExtendedConversationDisplayData | undefined
  >;
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
  const effectiveInitialDisplayContent = computed(() =>
    selectConversationInitialDisplayContent({
      cachedDisplayContent: initialDisplayContentQuery.data.value,
      providedDisplayContent: toValue(initialDisplayContent),
    })
  );
  const sourceVersion = computed(
    () => effectiveInitialDisplayContent.value?.sourceVersion
  );
  const pendingServerTranslationMode = computed<
    ContentTranslationDisplayMode | undefined
  >(() => {
    const displayContent = effectiveInitialDisplayContent.value;
    const translationControl = displayContent?.translationControl;
    if (
      displayContent === undefined ||
      translationControl === undefined ||
      translationControl === null ||
      (translationControl.status !== "pending" &&
        translationControl.status !== "running")
    ) {
      return undefined;
    }
    return translationControl.alternateMode;
  });
  const requestedMode = computed<ConversationContentMode>(
    () => modePreference.value ?? "original"
  );
  const shouldQueueNextTranslatedRequest = ref(false);
  const requestMode = computed<ContentTranslationRequestMode>(() =>
    shouldQueueNextTranslatedRequest.value &&
    requestedMode.value === "translated"
      ? "queue_if_missing"
      : "read_existing"
  );
  const requestedContentQuery = useConversationContentQuery({
    conversationSlugId,
    sourceVersion,
    mode: requestedMode,
    requestMode,
    enabled: computed(
      () =>
        modePreference.value !== undefined &&
        toValue(conversationData) !== undefined
    ),
  });

  function resetToOriginal(): void {
    recovery.stop();
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

  const activeDisplayContent = computed<
    ConversationContentFetchResponse | undefined
  >(() => {
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
  });

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
    const sourceLanguageCode = getConversationLanguageSettingSourceLanguageCode(
      {
        contentLanguageMetadata: conversation.metadata.contentLanguageMetadata,
        languageSetting: conversation.metadata.languageSetting,
      }
    );
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
      translatedBody: hasTranslatedContent
        ? displayContent.content.body
        : undefined,
    };
  });
  const eventSubject = computed(() => {
    const currentSourceVersion = sourceVersion.value;
    if (currentSourceVersion === undefined) {
      return undefined;
    }
    return {
      kind: "conversation" as const,
      conversationSlugId: conversationSlugId.value,
      sourceVersion: currentSourceVersion,
    };
  });

  const recovery = useContentTranslationRecovery({
    identity: computed(() =>
      getContentTranslationEventIdentity({
        subject: eventSubject.value,
        targetLanguageCode: displayLanguage.value,
      })
    ),
    enabled: computed(
      () =>
        modePreference.value === "translated" &&
        sourceVersion.value !== undefined
    ),
    isPending: computed(() => {
      const status = translationPreview.value?.translationStatus;
      return status === "pending" || status === "running";
    }),
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
      const result = await requestedContentQuery.refetch();
      if (result.isError || result.data === undefined) {
        return "pending";
      }
      if (result.data.status === "failed") {
        return "failed";
      }
      return result.data.status === "available" &&
        result.data.mode === "translated"
        ? "settled"
        : "pending";
    },
    onFailure: handleTranslationFailure,
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
    if (modePreference.value === mode) {
      return;
    }
    recovery.stop();
    if (mode !== "translated") {
      shouldQueueNextTranslatedRequest.value = false;
      modePreference.value = mode;
      return;
    }
    shouldQueueNextTranslatedRequest.value = true;
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
    recovery.stop();
    shouldQueueNextTranslatedRequest.value = false;
    modePreference.value = pendingServerTranslationMode.value;
  });

  watch(
    [conversationSlugId, sourceVersion],
    () => {
      recovery.stop();
      shouldQueueNextTranslatedRequest.value = false;
      modePreference.value = pendingServerTranslationMode.value;
    },
    { immediate: true }
  );

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
        recovery.stop();
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

  return {
    activeDisplayContent,
    displayedTitle,
    displayedBody,
    translationPreview,
    setTranslationMode,
  };
}
