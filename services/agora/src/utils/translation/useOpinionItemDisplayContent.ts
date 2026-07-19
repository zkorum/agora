import { storeToRefs } from "pinia";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
} from "./contentTranslation";
import { getInitialOpinionDisplayText } from "./opinionItemDisplayText";
import {
  type OpinionContentTranslationPreview,
  useOpinionContentTranslationPreview,
} from "./useContentTranslationPreview";

export function useOpinionItemDisplayContent({
  conversationSlugId,
  opinionItem,
  interactive = true,
}: {
  conversationSlugId: MaybeRefOrGetter<string>;
  opinionItem: MaybeRefOrGetter<DisplayedOpinionItem>;
  interactive?: MaybeRefOrGetter<boolean>;
}) {
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const hasRequestedTranslation = ref(false);
  const opinionSlugId = computed(() => toValue(opinionItem).opinionSlugId);
  const sourceVersion = computed(
    () => toValue(opinionItem).displayContent.sourceVersion
  );
  const spokenLanguageKey = computed(() =>
    [...spokenLanguages.value].sort().join("\u0000")
  );

  const translationSubject = computed(() => ({
    kind: "opinion" as const,
    conversationSlugId: toValue(conversationSlugId),
    opinionSlugId: opinionSlugId.value,
    sourceVersion: sourceVersion.value,
  }));
  const {
    preview: requestedTranslationPreview,
    setMode: setRequestedTranslationMode,
  } = useOpinionContentTranslationPreview({
    subject: translationSubject,
    enabled: computed(
      () => toValue(interactive) && hasRequestedTranslation.value
    ),
    sourceLanguageCode: computed(() => toValue(opinionItem).sourceLanguageCode),
  });

  const initialTranslationPreview = computed<
    OpinionContentTranslationPreview | undefined
  >(() => {
    const item = toValue(opinionItem);
    const displayContent = item.displayContent;
    const translationControl = displayContent.translationControl;
    if (translationControl === null) {
      return undefined;
    }
    const sourceLanguageLabel = getContentTranslationSourceLanguageLabel({
      sourceLanguage: undefined,
      fallbackLanguageCode: item.sourceLanguageCode,
      fallbackLabel: translationControl.sourceLanguageLabel,
      displayLanguage: displayLanguage.value,
    });

    if (
      displayContent.status === "available" &&
      displayContent.mode === "translated"
    ) {
      return {
        isAvailable: true,
        isLoadingInitialTranslation: false,
        mode: "translated",
        sourceLanguageLabel,
        translationStatus: translationControl.status,
        translatedOpinion: displayContent.content.content,
      };
    }

    return {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: "original",
      sourceLanguageLabel,
      translationStatus: translationControl.status,
      translatedOpinion: "",
    };
  });

  const translationPreview = computed(
    () => requestedTranslationPreview.value ?? initialTranslationPreview.value
  );
  const displayedOpinion = computed(() => {
    const preview = translationPreview.value;
    if (preview?.mode === "translated") {
      return preview.translatedOpinion;
    }
    return toValue(opinionItem).opinion;
  });
  const initialDisplayedOpinion = computed(() =>
    getInitialOpinionDisplayText(toValue(opinionItem))
  );

  function setTranslationMode(mode: ContentTranslationDisplayMode): void {
    hasRequestedTranslation.value = true;
    void setRequestedTranslationMode(mode);
  }

  function resetTranslationMode(): void {
    hasRequestedTranslation.value = false;
  }

  watch(
    [
      () => toValue(conversationSlugId),
      opinionSlugId,
      sourceVersion,
      displayLanguage,
      spokenLanguageKey,
    ],
    resetTranslationMode
  );

  return {
    displayedOpinion,
    initialDisplayedOpinion,
    translationPreview,
    setTranslationMode,
  };
}
