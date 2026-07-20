<template>
  <ConversationAnalysisTab
    v-if="props.conversationData !== undefined"
    :conversation-data="props.conversationData"
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
  // Dynamic route props can briefly clear during navigation teardown.
  conversationData: ExtendedConversationDisplayData | undefined;
  navigateToDiscoverTab: () => void;
  conversationScrollContext: ConversationScrollContext;
  conversationRouteContext: ConversationRouteContext;
}>();
</script>

<style scoped lang="scss"></style>
