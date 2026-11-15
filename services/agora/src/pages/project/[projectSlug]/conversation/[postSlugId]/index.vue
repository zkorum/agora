<template>
  <QvVotingTab
    v-if="
      conversationData?.metadata.conversationType === 'prioritizing' &&
      conversationData.metadata.prioritizationType === 'qv'
    "
    :key="conversationData.metadata.conversationSlugId"
    :conversation-metadata="conversationData.metadata"
  />
  <ComparisonVotingTab
    v-else-if="
      conversationData !== undefined &&
      conversationData.metadata.conversationType === 'prioritizing' &&
      conversationData.metadata.prioritizationType === 'comparisons'
    "
    :key="
      conversationData?.metadata.conversationType === 'prioritizing' &&
      conversationData.metadata.prioritizationType === 'comparisons'
        ? conversationData.metadata.comparisonMethod
        : 'comparisons'
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
import ComparisonVotingTab from "src/components/post/comparison/ComparisonVotingTab.vue";
import ConversationCommentTab from "src/components/post/ConversationCommentTab.vue";
import QvVotingTab from "src/components/post/qv/QvVotingTab.vue";
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
