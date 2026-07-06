<template>
  <PostContent
    :extended-post-data="extendedPostData"
    :compact-mode="compactMode"
    :content-translation="translationPreview"
    :displayed-title="displayedTitle"
    :displayed-body="displayedBody"
    @update:content-translation-mode="setTranslationMode"
    @open-moderation-history="emit('openModerationHistory')"
    @conversation-deleted="emit('conversationDeleted')"
    @verified="emit('verified', $event)"
  />
</template>

<script setup lang="ts">
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type {
  ExtendedConversation,
  ExtendedConversationDisplayData,
} from "src/shared/types/zod";
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
import { computed } from "vue";

import PostContent from "./PostContent.vue";

const props = defineProps<{
  extendedPostData: ExtendedConversation | ExtendedConversationDisplayData;
  compactMode: boolean;
  initialDisplayContent?: ConversationContentFetchResponse;
}>();

const emit = defineEmits<{
  openModerationHistory: [];
  conversationDeleted: [];
  verified: [payload: { userIdChanged: boolean; needsCacheRefresh: boolean }];
}>();

const extendedConversation = computed(() => props.extendedPostData);
const fallbackPayload = computed(() =>
  "payload" in props.extendedPostData ? props.extendedPostData.payload : undefined
);
const initialDisplayContent = computed(() => props.initialDisplayContent);
const {
  displayedTitle,
  displayedBody,
  translationPreview,
  setTranslationMode,
} = useConversationDisplayContent({
  conversationData: extendedConversation,
  initialDisplayContent,
  fallbackPayload,
});
</script>
