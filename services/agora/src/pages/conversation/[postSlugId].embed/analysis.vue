<template>
  <ConversationAnalysisTab
    :conversation-data="conversationData"
    :has-conversation-data="hasConversationData"
    :show-report-button="false"
  />
</template>

<script setup lang="ts">
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import type { ExtendedConversation } from "src/shared/types/zod";

defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
}>();
</script>

<style scoped lang="scss"></style>
