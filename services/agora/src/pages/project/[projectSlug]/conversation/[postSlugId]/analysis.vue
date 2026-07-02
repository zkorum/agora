<template>
  <MaxDiffResultsTab
    v-if="props.conversationData.metadata.conversationType === 'maxdiff'"
    :conversation-data="props.conversationData"
    :navigate-to-voting-tab="props.navigateToDiscoverTab"
  />
  <ConversationAnalysisTab
    v-else
    :conversation-data="props.conversationData"
    :has-conversation-data="props.hasConversationData"
    :navigate-to-discover-tab="props.navigateToDiscoverTab"
    :conversation-scroll-context="props.conversationScrollContext"
    :conversation-route-context="props.conversationRouteContext"
    @analysis-live-pause-stats="emit('analysisLivePauseStats', $event)"
  />
</template>

<script setup lang="ts">
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import MaxDiffResultsTab from "src/components/post/maxdiff/MaxDiffResultsTab.vue";
import type { ConversationActionBarStats } from "src/composables/conversation/useConversationActionBarStats";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversation } from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";

const props = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
  navigateToDiscoverTab: () => void;
  conversationScrollContext: ConversationScrollContext;
  conversationRouteContext: ConversationRouteContext;
}>();

const emit = defineEmits<{
  analysisLivePauseStats: [stats: ConversationActionBarStats | undefined];
}>();
</script>
