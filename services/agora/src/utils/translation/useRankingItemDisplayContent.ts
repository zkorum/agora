import { storeToRefs } from "pinia";
import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  isRequestedTranslationPreviewCurrent,
} from "./contentTranslation";
import {
  resolveRankingItemDisplayedContent,
  resolveRankingItemDisplayText,
} from "./rankingItemDisplayText";
import {
  type RankingItemContentTranslationPreview,
  useRankingItemContentTranslationPreview,
} from "./useContentTranslationPreview";

export function useRankingItemDisplayContent({
  conversationSlugId,
  itemSlugId,
  displayContent,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  itemSlugId: MaybeRefOrGetter<string | undefined>;
  displayContent: MaybeRefOrGetter<RankingItemDisplayedContent | undefined>;
}) {
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const requestedTranslationSourceVersion = ref<string | undefined>();
  const resolvedItemSlugId = computed(() => toValue(itemSlugId));
  const sourceVersion = computed(() => toValue(displayContent)?.sourceVersion);
  const spokenLanguageKey = computed(() =>
    [...spokenLanguages.value].sort().join("\u0000")
  );
  const hasTranslationControl = computed(() => {
    const currentDisplayContent = toValue(displayContent);
    return (
      currentDisplayContent !== undefined &&
      currentDisplayContent.translationControl !== null
    );
  });
  const hasCurrentRequestedTranslation = computed(() =>
    isRequestedTranslationPreviewCurrent({
      requestedSourceVersion: requestedTranslationSourceVersion.value,
      currentSourceVersion: sourceVersion.value,
      hasTranslationControl: hasTranslationControl.value,
    })
  );

  const translationSubject = computed(() => ({
    kind: "ranking_item" as const,
    conversationSlugId: toValue(conversationSlugId),
    itemSlugId: resolvedItemSlugId.value ?? "",
    sourceVersion: sourceVersion.value ?? "",
  }));

  const {
    preview: requestedTranslationPreview,
    setMode: setRequestedTranslationMode,
  } = useRankingItemContentTranslationPreview({
    subject: translationSubject,
    enabled: computed(
      () =>
        hasCurrentRequestedTranslation.value &&
        resolvedItemSlugId.value !== undefined &&
        sourceVersion.value !== undefined
    ),
    sourceLanguageCode: undefined,
  });

  const initialTranslationPreview = computed<
    RankingItemContentTranslationPreview | undefined
  >(() => {
    const currentDisplayContent = toValue(displayContent);
    const translationControl = currentDisplayContent?.translationControl;
    if (
      currentDisplayContent === undefined ||
      translationControl === undefined ||
      translationControl === null
    ) {
      return undefined;
    }

    const sourceLanguageLabel = getContentTranslationSourceLanguageLabel({
      sourceLanguage: undefined,
      fallbackLanguageCode: undefined,
      fallbackLabel: translationControl.sourceLanguageLabel,
      displayLanguage: displayLanguage.value,
    });

    if (
      currentDisplayContent.status === "available" &&
      currentDisplayContent.mode === "translated"
    ) {
      return {
        isAvailable: true,
        isLoadingInitialTranslation: false,
        mode: "translated",
        sourceLanguageLabel,
        translationStatus: translationControl.status,
        originalContent: undefined,
        translatedContent: currentDisplayContent.content,
      };
    }

    return {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: "original",
      sourceLanguageLabel,
      translationStatus: translationControl.status,
      originalContent:
        currentDisplayContent.status === "available"
          ? currentDisplayContent.content
          : undefined,
      translatedContent: undefined,
    };
  });

  const translationPreview = computed(
    () => requestedTranslationPreview.value ?? initialTranslationPreview.value
  );

  const displayedText = computed(() =>
    resolveRankingItemDisplayText({
      displayContent: toValue(displayContent),
      translationPreview: translationPreview.value,
    })
  );
  const displayedTitle = computed(() => displayedText.value.title);
  const displayedBody = computed(() => displayedText.value.body ?? "");
  const resolvedDisplayContent = computed(() => {
    const currentDisplayContent = toValue(displayContent);
    if (currentDisplayContent === undefined) {
      return undefined;
    }
    return resolveRankingItemDisplayedContent({
      displayContent: currentDisplayContent,
      translationPreview: translationPreview.value,
    });
  });

  function setTranslationMode(mode: ContentTranslationDisplayMode): void {
    requestedTranslationSourceVersion.value = sourceVersion.value;
    void setRequestedTranslationMode(mode);
  }

  function resetTranslationMode(): void {
    requestedTranslationSourceVersion.value = undefined;
  }

  watch(
    [
      () => toValue(conversationSlugId),
      resolvedItemSlugId,
      sourceVersion,
      hasTranslationControl,
      displayLanguage,
      spokenLanguageKey,
    ],
    resetTranslationMode
  );

  return {
    displayedTitle,
    displayedBody,
    resolvedDisplayContent,
    translationPreview,
    setTranslationMode,
    resetTranslationMode,
  };
}
