import { storeToRefs } from "pinia";
import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
} from "./contentTranslation";
import { resolveRankingItemDisplayText } from "./rankingItemDisplayText";
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
  const { displayLanguage } = storeToRefs(useLanguageStore());
  const hasRequestedTranslation = ref(false);

  const translationSubject = computed(() => ({
    kind: "ranking_item" as const,
    conversationSlugId: toValue(conversationSlugId),
    itemSlugId: toValue(itemSlugId) ?? "",
  }));

  const { preview: requestedTranslationPreview, setMode: setRequestedTranslationMode } =
    useRankingItemContentTranslationPreview({
      subject: translationSubject,
      enabled: computed(
        () => hasRequestedTranslation.value && toValue(itemSlugId) !== undefined
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

  function setTranslationMode(mode: ContentTranslationDisplayMode): void {
    hasRequestedTranslation.value = true;
    void setRequestedTranslationMode(mode);
  }

  function resetTranslationMode(): void {
    hasRequestedTranslation.value = false;
  }

  watch([translationSubject, displayLanguage], resetTranslationMode);

  return {
    displayedTitle,
    displayedBody,
    translationPreview,
    setTranslationMode,
    resetTranslationMode,
  };
}
