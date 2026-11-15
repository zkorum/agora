<template>
  <!-- RouterView/KeepAlive can briefly clear route props while switching tabs. -->
  <template v-if="props.conversationData !== undefined">
    <QvAnalysisTab
      v-if="
        props.conversationData.metadata.conversationType === 'prioritizing' &&
        props.conversationData.metadata.prioritizationType === 'qv'
      "
      :conversation-slug-id="props.conversationData.metadata.conversationSlugId"
      :is-closed="props.conversationData.metadata.isClosed"
      :on-view-statements="props.navigateToDiscoverTab"
    />
    <ComparisonResultsTab
      v-else-if="
        props.conversationData.metadata.conversationType === 'prioritizing' &&
        props.conversationData.metadata.prioritizationType === 'comparisons'
      "
      :conversation-data="props.conversationData"
      :navigate-to-voting-tab="props.navigateToDiscoverTab"
      :conversation-scroll-context="props.conversationScrollContext"
      @analysis-live-pause-stats="emit('analysisLivePauseStats', $event)"
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
import ComparisonResultsTab from "src/components/post/comparison/ComparisonResultsTab.vue";
import ConversationAnalysisTab from "src/components/post/ConversationAnalysisTab.vue";
import QvAnalysisTab from "src/components/post/qv/QvAnalysisTab.vue";
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
