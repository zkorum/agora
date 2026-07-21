<template>
  <!-- RouterView/KeepAlive can briefly clear route props while switching tabs. -->
  <template v-if="props.conversationData !== undefined">
    <MaxDiffResultsTab
      v-if="
        props.conversationData.metadata.conversationType === 'ranking' &&
        props.conversationData.metadata.rankingMode === 'bws'
      "
      :conversation-data="props.conversationData"
      :navigate-to-voting-tab="props.navigateToDiscoverTab"
    />
    <ConversationAnalysisTab
      v-else
      :conversation-data="props.conversationData"
      :navigate-to-discover-tab="props.navigateToDiscoverTab"
      :conversation-scroll-context="props.conversationScrollContext"
      :conversation-route-context="props.conversationRouteContext"
      :report-route-override="props.reportRouteOverride"
      @analysis-live-pause-stats="emit('analysisLivePauseStats', $event)"
    />
  </template>
</template>

<script setup lang="ts">
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import MaxDiffResultsTab from "src/components/post/maxdiff/MaxDiffResultsTab.vue";
import type { ConversationActionBarStats } from "src/composables/conversation/useConversationActionBarStats";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import type { RouteLocationRaw } from "vue-router";

const props = withDefaults(
  defineProps<{
    // Dynamic route props can briefly clear during navigation teardown.
    conversationData: ExtendedConversationDisplayData | undefined;
    navigateToDiscoverTab: () => void;
    conversationScrollContext: ConversationScrollContext;
    conversationRouteContext: ConversationRouteContext;
    reportRouteOverride?: RouteLocationRaw;
  }>(),
  {
    reportRouteOverride: undefined,
  }
);

const emit = defineEmits<{
  analysisLivePauseStats: [stats: ConversationActionBarStats | undefined];
}>();
</script>

<style scoped lang="scss"></style>
