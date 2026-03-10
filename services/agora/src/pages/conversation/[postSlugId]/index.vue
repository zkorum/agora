<template>
  <ConversationCommentTab
    :conversation-data="conversationData"
    :has-conversation-data="hasConversationData"
    :moderation-history-trigger="moderationHistoryTrigger"
    :comment-filter="commentFilter"
    :on-view-analysis="onViewAnalysis"
    @update:comment-filter="
      (filter: CommentFilterOptions) => emit('update:commentFilter', filter)
    "
  />
</template>

<script setup lang="ts">
import ConversationCommentTab from "src/components/post/ConversationCommentTab.vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";

const { onViewAnalysis } = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
  moderationHistoryTrigger: number;
  commentFilter: CommentFilterOptions;
  onViewAnalysis: () => void;
}>();

const emit = defineEmits<{
  "update:commentFilter": [filter: CommentFilterOptions];
}>();
</script>

<style scoped lang="scss"></style>
