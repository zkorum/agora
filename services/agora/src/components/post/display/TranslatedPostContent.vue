<template>
  <PostContent
    :extended-post-data="extendedPostData"
    :compact-mode="compactMode"
    :content-translation="translationPreview"
    @update:content-translation-mode="setTranslationMode"
    @open-moderation-history="emit('openModerationHistory')"
    @conversation-deleted="emit('conversationDeleted')"
    @verified="emit('verified', $event)"
  />
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";
import { useConversationContentTranslationPreview } from "src/utils/translation/useContentTranslationPreview";
import { computed } from "vue";

import PostContent from "./PostContent.vue";

const props = defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
}>();

const emit = defineEmits<{
  openModerationHistory: [];
  conversationDeleted: [];
  verified: [payload: { userIdChanged: boolean; needsCacheRefresh: boolean }];
}>();

const translationSubject = computed(() => ({
  kind: "conversation" as const,
  conversationSlugId: props.extendedPostData.metadata.conversationSlugId,
}));

const sourceLanguageCode = computed(
  () =>
    props.extendedPostData.metadata.languageSetting.languageCode ??
    props.extendedPostData.metadata.languageSetting.detectedLanguageCode ??
    props.extendedPostData.metadata.languageSetting.detectedRawLanguageCode
);

const { preview: translationPreview, setMode: setTranslationMode } =
  useConversationContentTranslationPreview({
    subject: translationSubject,
    dynamicTranslationEnabled: computed(
      () =>
        props.extendedPostData.metadata.multilingualSetting
          .dynamicTranslationEnabled
    ),
    sourceLanguageCode,
  });
</script>
