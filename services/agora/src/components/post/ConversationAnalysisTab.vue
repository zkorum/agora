<template>
  <div>
    <AnalysisPage
      ref="analysisPageRef"
      :conversation-slug-id="conversationData.metadata.conversationSlugId"
      :participant-count="conversationData.metadata.participantCount"
      :analysis-query="analysisQuery"
      :show-report-button="showReportButton"
      :navigate-to-discover-tab="props.navigateToDiscoverTab"
    />
  </div>
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { computed, inject, onMounted, ref, watch } from "vue";

import AnalysisPage from "./analysis/AnalysisPage.vue";

const props = withDefaults(
  defineProps<{
    conversationData: ExtendedConversation;
    hasConversationData: boolean;
    showReportButton?: boolean;
    navigateToDiscoverTab: () => void;
  }>(),
  {
    showReportButton: true,
  }
);

// Inject parent function to report loading state
const setCurrentTabLoading = inject<(loading: boolean) => void>(
  "setCurrentTabLoading",
  () => {
    /* noop */
  }
);
const registerChildRefreshHandler = inject<
  (handler: () => Promise<void>) => void
>(
  "registerChildRefreshHandler",
  () => {
    /* noop */
  }
);

const analysisPageRef = ref<InstanceType<typeof AnalysisPage>>();

// Create computed properties to ensure reactivity
const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);
const voteCount = computed(() => props.conversationData.metadata.voteCount);

// Load analysis data
const analysisQuery = useAnalysisQuery({
  conversationSlugId,
  voteCount,
  enabled: () => props.hasConversationData,
});

// Report loading state to parent (for spinner in PostActionBar)
const isLoading = computed(
  () => analysisQuery.isPending.value || analysisQuery.isRefetching.value
);

watch(isLoading, (loading) => {
  setCurrentTabLoading(loading);
});

// Register pull-to-refresh handler: refetch analysis data
registerChildRefreshHandler(async () => {
  await analysisQuery.refetch();
});

onMounted(() => {
  // Report initial loading state to parent
  setCurrentTabLoading(isLoading.value);
});
</script>

<style scoped lang="scss"></style>
