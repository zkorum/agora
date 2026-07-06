<template>
  <ConversationAnalysisTab
    :conversation-data="props.conversationData"
    :has-conversation-data="props.hasConversationData"
    :show-report-button="false"
    :navigate-to-discover-tab="props.navigateToDiscoverTab"
    :conversation-scroll-context="props.conversationScrollContext"
    :conversation-route-context="props.conversationRouteContext"
    :report-route-override="undefined"
  />
</template>

<script setup lang="ts">
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";

const props = defineProps<{
  conversationData: ExtendedConversationDisplayData;
  hasConversationData: boolean;
  navigateToDiscoverTab: () => void;
  conversationScrollContext: ConversationScrollContext;
  conversationRouteContext: ConversationRouteContext;
}>();

</script>

<style scoped lang="scss"></style>
