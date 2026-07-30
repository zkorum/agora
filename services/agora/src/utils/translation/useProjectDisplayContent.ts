import { storeToRefs } from "pinia";
import type {
  ContentTranslationSubject,
  ProjectContentVariant,
  ProjectDisplayedContent,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { MaybeRefOrGetter } from "vue";
import { computed, ref, toValue, watch } from "vue";

import {
  type ContentTranslationDisplayMode,
  getContentTranslationSourceLanguageLabel,
  isRequestedTranslationPreviewCurrent,
} from "./contentTranslation";
import {
  resolveProjectContentVariant,
  resolveProjectTranslationPreview,
} from "./projectDisplayContent";
import {
  type ProjectContentTranslationPreview,
  useProjectContentTranslationPreview,
} from "./useContentTranslationPreview";

export function useProjectDisplayContent({
  projectSlug,
  displayContent,
}: {
  projectSlug: MaybeRefOrGetter<string>;
  displayContent: MaybeRefOrGetter<ProjectDisplayedContent>;
}) {
  const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
  const requestedTranslationSourceVersion = ref<string | undefined>();
  const sourceVersion = computed(() => toValue(displayContent).sourceVersion);
  const spokenLanguageKey = computed(() =>
    [...spokenLanguages.value].sort().join("\u0000")
  );
  const hasTranslationControl = computed(
    () => toValue(displayContent).translationControl !== null
  );
  const pendingServerTranslationMode = computed<
    ContentTranslationDisplayMode | undefined
  >(() => {
    const translationControl = toValue(displayContent).translationControl;
    if (
      translationControl === null ||
      (translationControl.status !== "pending" &&
        translationControl.status !== "running")
    ) {
      return undefined;
    }
    return translationControl.alternateMode;
  });
  const hasCurrentRequestedTranslation = computed(() =>
    isRequestedTranslationPreviewCurrent({
      requestedSourceVersion: requestedTranslationSourceVersion.value,
      currentSourceVersion: sourceVersion.value,
      hasTranslationControl: hasTranslationControl.value,
    })
  );
  const translationSubject = computed<
    Extract<ContentTranslationSubject, { kind: "project" }>
  >(() => ({
    kind: "project",
    projectSlug: toValue(projectSlug),
    sourceVersion: sourceVersion.value,
  }));
  const {
    preview: requestedTranslationPreview,
    setMode: setRequestedTranslationMode,
  } = useProjectContentTranslationPreview({
    subject: translationSubject,
    enabled: computed(
      () =>
        hasTranslationControl.value &&
        (hasCurrentRequestedTranslation.value ||
          pendingServerTranslationMode.value !== undefined)
    ),
    initialModePreference: pendingServerTranslationMode,
  });

  const initialTranslationPreview = computed<
    ProjectContentTranslationPreview | undefined
  >(() => {
    const currentDisplayContent = toValue(displayContent);
    const translationControl = currentDisplayContent.translationControl;
    if (translationControl === null) {
      return undefined;
    }
    const sourceLanguageLabel = getContentTranslationSourceLanguageLabel({
      sourceLanguage: undefined,
      fallbackLanguageCode: undefined,
      fallbackLabel: translationControl.sourceLanguageLabel,
      displayLanguage: displayLanguage.value,
    });
    const originalContent =
      currentDisplayContent.status === "available" &&
      currentDisplayContent.mode === "original"
        ? currentDisplayContent.content
        : undefined;
    const translatedContent =
      currentDisplayContent.status === "available" &&
      currentDisplayContent.mode === "translated"
        ? currentDisplayContent.content
        : undefined;

    return {
      mode:
        currentDisplayContent.status === "available"
          ? currentDisplayContent.mode
          : "original",
      sourceLanguageLabel,
      translationStatus: translationControl.status,
      originalContent,
      translatedContent,
    };
  });
  const translationPreview = computed(() =>
    resolveProjectTranslationPreview({
      requestedPreview: requestedTranslationPreview.value,
      initialPreview: initialTranslationPreview.value,
    })
  );
  const resolvedContent = computed(() =>
    resolveProjectContentVariant({
      displayContent: toValue(displayContent),
      translationPreview: translationPreview.value,
    })
  );
  const displayedContent = computed<ProjectContentVariant>(() => {
    if (resolvedContent.value !== undefined) {
      return resolvedContent.value;
    }
    const initialContent = toValue(displayContent);
    return initialContent.status === "available"
      ? initialContent.content
      : { title: "" };
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
      () => toValue(projectSlug),
      sourceVersion,
      hasTranslationControl,
      displayLanguage,
      spokenLanguageKey,
    ],
    resetTranslationMode
  );

  return {
    displayedContent,
    translationPreview,
    setTranslationMode,
  };
}
