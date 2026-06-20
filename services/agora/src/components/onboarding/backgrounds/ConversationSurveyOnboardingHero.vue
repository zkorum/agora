<template>
  <ConversationSurveyHero
    v-if="conversationData !== undefined"
    :conversation-title="displayedConversationTitle"
    :author-username="conversationData.metadata.authorUsername"
    :organization-name="conversationData.metadata.organization?.name ?? ''"
    :organization-image-url="conversationData.metadata.organization?.imageUrl ?? ''"
    :content-translation="conversationTranslationPreview"
    @update:content-translation-mode="setConversationTranslationMode"
  />
  <DefaultImageExample v-else />
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";
import {
  type ContentTranslationDisplayMode,
  getSupportedContentTranslationTargetLanguageCodes,
} from "src/utils/translation/contentTranslation";
import { useConversationContentTranslationPreview } from "src/utils/translation/useContentTranslationPreview";
import { computed } from "vue";

import ConversationSurveyHero from "./ConversationSurveyHero.vue";
import DefaultImageExample from "./DefaultImageExample.vue";

const props = defineProps<{
  conversationData?: ExtendedConversation;
}>();

const translationSubject = computed(() => ({
  kind: "conversation" as const,
  conversationSlugId: props.conversationData?.metadata.conversationSlugId ?? "",
}));

const sourceLanguageCode = computed(() => {
  const languageSetting = props.conversationData?.metadata.languageSetting;
  return (
    languageSetting?.languageCode ??
    languageSetting?.detectedLanguageCode ??
    languageSetting?.detectedRawLanguageCode
  );
});

const supportedTargetLanguageCodes = computed(() => {
  if (props.conversationData === undefined) {
    return [];
  }

  return getSupportedContentTranslationTargetLanguageCodes({
    languageSetting: props.conversationData.metadata.languageSetting,
    multilingualSetting: props.conversationData.metadata.multilingualSetting,
  });
});

const { preview: conversationTranslationPreview, setMode } =
  useConversationContentTranslationPreview({
    subject: translationSubject,
    dynamicTranslationEnabled: computed(
      () =>
        props.conversationData?.metadata.multilingualSetting
          .dynamicTranslationEnabled === true
    ),
    sourceLanguageCode,
    supportedTargetLanguageCodes,
  });

const displayedConversationTitle = computed(() => {
  if (
    conversationTranslationPreview.value?.mode === "translated" &&
    conversationTranslationPreview.value.translatedTitle.length > 0
  ) {
    return conversationTranslationPreview.value.translatedTitle;
  }
  return props.conversationData?.payload.title ?? "";
});

function setConversationTranslationMode(mode: ContentTranslationDisplayMode): void {
  void setMode(mode);
}
</script>
