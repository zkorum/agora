<template>
  <MaxDiffVotingTab
    v-if="isMaxDiffConversation"
    :conversation-data="conversationData"
    :has-conversation-data="hasConversationData"
    :on-view-analysis="onViewAnalysis"
  />
  <ConversationCommentTab
    v-else
    :conversation-data="conversationData"
    :has-conversation-data="hasConversationData"
    :moderation-history-trigger="moderationHistoryTrigger"
    :comment-filter="commentFilter"
    :on-view-analysis="onViewAnalysis"
    :conversation-route-context="conversationRouteContext"
    @update:comment-filter="
      (filter: CommentFilterOptions) => emit('update:commentFilter', filter)
    "
  />
</template>

<script setup lang="ts">
import ConversationCommentTab from "src/components/post/ConversationCommentTab.vue";
import MaxDiffVotingTab from "src/components/post/maxdiff/MaxDiffVotingTab.vue";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { computed } from "vue";

const {
  conversationData,
  hasConversationData,
  moderationHistoryTrigger,
  commentFilter,
  onViewAnalysis,
  conversationRouteContext,
} = defineProps<{
  conversationData: ExtendedConversationDisplayData;
  hasConversationData: boolean;
  moderationHistoryTrigger: number;
  commentFilter: CommentFilterOptions;
  onViewAnalysis: () => void;
  conversationRouteContext: ConversationRouteContext;
}>();

const emit = defineEmits<{
  "update:commentFilter": [filter: CommentFilterOptions];
}>();

const isMaxDiffConversation = computed(
  () =>
    conversationData.metadata.conversationType === "ranking" &&
    conversationData.metadata.rankingMode === "maxdiff"
);

</script>
