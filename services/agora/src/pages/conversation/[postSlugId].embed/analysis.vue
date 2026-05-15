<template>
  <ConversationAnalysisTab
    :conversation-data="props.conversationData"
    :has-conversation-data="props.hasConversationData"
    :show-report-button="false"
    :navigate-to-discover-tab="props.navigateToDiscoverTab"
    :conversation-scroll-context="props.conversationScrollContext"
  />
</template>

<script setup lang="ts">
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversation } from "src/shared/types/zod";

const props = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
  navigateToDiscoverTab: () => void;
  conversationScrollContext: ConversationScrollContext;
}>();
</script>

<style scoped lang="scss"></style>
