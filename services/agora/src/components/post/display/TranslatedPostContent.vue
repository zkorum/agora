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
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
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

const extendedConversation = computed(() => props.extendedPostData);
const { translationPreview, setTranslationMode } = useConversationDisplayContent({
  extendedConversation,
});
</script>
