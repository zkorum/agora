import { storeToRefs } from "pinia";
import type { RankingItemDisplayedContent } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
} from "./contentTranslation";
import {
  type RankingItemContentTranslationPreview,
  useRankingItemContentTranslationPreview,
} from "./useContentTranslationPreview";

export interface RankingItemDisplayedText {
  title: string;
  body: string | null;
}

export function getRankingItemDisplayText({
  displayContent,
}: {
  displayContent: RankingItemDisplayedContent;
}): RankingItemDisplayedText {
  if (displayContent.status !== "available") {
    return { title: "", body: null };
  }

  return {
    title: displayContent.content.title,
    body: displayContent.content.bodyHtml ?? null,
  };
}

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
        translatedTitle: currentDisplayContent.content.title,
        translatedBody: currentDisplayContent.content.bodyHtml,
      };
    }

    return {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: "original",
      sourceLanguageLabel,
      translationStatus: translationControl.status,
      translatedTitle: "",
      translatedBody: undefined,
    };
  });

  const translationPreview = computed(
    () => requestedTranslationPreview.value ?? initialTranslationPreview.value
  );

  const displayedTitle = computed(() => {
    const preview = translationPreview.value;
    if (preview?.mode === "translated") {
      return preview.translatedTitle;
    }
    const currentDisplayContent = toValue(displayContent);
    if (currentDisplayContent?.status !== "available") {
      return "";
    }
    return currentDisplayContent.content.title;
  });

  const displayedBody = computed(() => {
    const preview = translationPreview.value;
    if (preview?.mode === "translated") {
      return preview.translatedBody ?? "";
    }
    const currentDisplayContent = toValue(displayContent);
    if (currentDisplayContent?.status !== "available") {
      return "";
    }
    return currentDisplayContent.content.bodyHtml ?? "";
  });

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
