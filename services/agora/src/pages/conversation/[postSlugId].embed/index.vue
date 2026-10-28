<template>
  <ConversationCommentTab
    v-if="conversationData !== undefined"
    :conversation-data="conversationData"
    :opinion-state="opinionState"
    :on-view-analysis="onViewAnalysis"
    :conversation-route-context="conversationRouteContext"
    :editing-opinion="undefined"
  />
</template>

<script setup lang="ts">
import ConversationCommentTab from "src/components/post/ConversationCommentTab.vue";
import type { OpinionListState } from "src/composables/opinion/useOpinionListState";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";

const { onViewAnalysis } = defineProps<{
  // Dynamic route props can briefly clear during navigation teardown.
  conversationData: ExtendedConversationDisplayData | undefined;
  opinionState: OpinionListState;
  onViewAnalysis: () => void;
  conversationRouteContext: ConversationRouteContext;
}>();
</script>

<style scoped lang="scss"></style>
