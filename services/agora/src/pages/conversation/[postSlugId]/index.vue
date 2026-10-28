<template>
  <MaxDiffVotingTab
    v-if="
      conversationData !== undefined &&
      conversationData.metadata.conversationType === 'ranking' &&
      conversationData.metadata.rankingMode === 'bws'
    "
    :conversation-data="conversationData"
    :on-view-analysis="onViewAnalysis"
  />
  <ConversationCommentTab
    v-else-if="conversationData !== undefined"
    :conversation-data="conversationData"
    :opinion-state="opinionState"
    :on-view-analysis="onViewAnalysis"
    :conversation-route-context="conversationRouteContext"
    :editing-opinion="editingOpinion"
    @edit-opinion="emit('editOpinion', $event)"
  />
</template>

<script setup lang="ts">
import ConversationCommentTab from "src/components/post/ConversationCommentTab.vue";
import MaxDiffVotingTab from "src/components/post/maxdiff/MaxDiffVotingTab.vue";
import type { OpinionEditRequest } from "src/composables/opinion/types";
import type { OpinionListState } from "src/composables/opinion/useOpinionListState";
import type {
  DisplayedOpinionItem,
  ExtendedConversationDisplayData,
} from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";

const {
  conversationData,
  opinionState,
  onViewAnalysis,
  conversationRouteContext,
  editingOpinion,
} = defineProps<{
  // Dynamic route props can briefly clear during navigation teardown.
  conversationData: ExtendedConversationDisplayData | undefined;
  opinionState: OpinionListState;
  onViewAnalysis: () => void;
  conversationRouteContext: ConversationRouteContext;
  editingOpinion: DisplayedOpinionItem | undefined;
}>();

const emit = defineEmits<{
  editOpinion: [request: OpinionEditRequest];
}>();
</script>

<style scoped lang="scss"></style>
