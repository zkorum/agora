<template>
  <ConversationAnalysisTab
    :conversation-data="props.conversationData"
    :has-conversation-data="props.hasConversationData"
    :show-report-button="false"
    :navigate-to-discover-tab="props.navigateToDiscoverTab"
    :conversation-scroll-context="props.conversationScrollContext"
    @update:analysis-action-bar-snapshot="
      emit('update:analysisActionBarSnapshot', $event)
    "
  />
</template>

<script setup lang="ts">
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { AnalysisConversationViewSnapshot } from "src/shared/types/dto";
import type { ExtendedConversation } from "src/shared/types/zod";

const props = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
  navigateToDiscoverTab: () => void;
  conversationScrollContext: ConversationScrollContext;
}>();

const emit = defineEmits<{
  "update:analysisActionBarSnapshot": [
    snapshot: AnalysisConversationViewSnapshot | undefined,
  ];
}>();
</script>

<style scoped lang="scss"></style>
