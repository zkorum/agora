<template>
  <MaxDiffResultsTab
    v-if="conversationData.metadata.conversationType === 'maxdiff'"
    :conversation-data="conversationData"
  />
  <ConversationAnalysisTab
    v-else
    :conversation-data="conversationData"
    :has-conversation-data="hasConversationData"
    :navigate-to-discover-tab="navigateToDiscoverTab"
  />
</template>

<script setup lang="ts">
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import MaxDiffResultsTab from "src/components/post/maxdiff/MaxDiffResultsTab.vue";
import type { ExtendedConversation } from "src/shared/types/zod";

const { navigateToDiscoverTab } = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
  navigateToDiscoverTab: () => void;
}>();
</script>

<style scoped lang="scss"></style>
