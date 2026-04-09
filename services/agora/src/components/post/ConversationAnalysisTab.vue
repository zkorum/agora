<template>
  <div>
    <AnalysisPage
      ref="analysisPageRef"
      :conversation-slug-id="conversationData.metadata.conversationSlugId"
      :participant-count="conversationData.metadata.participantCount"
      :analysis-query="analysisQuery"
      :survey-query="surveyResultsQuery"
      :has-survey="hasSurvey"
      :show-report-button="showReportButton"
      :navigate-to-discover-tab="props.navigateToDiscoverTab"
    />
  </div>
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
import { computed, inject, onActivated, onMounted, ref, watch } from "vue";

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
const hasSurvey = computed(() => props.conversationData.interaction.surveyGate?.hasSurvey === true);

// Load analysis data
const analysisQuery = useAnalysisQuery({
  conversationSlugId,
  voteCount,
  enabled: () => props.hasConversationData,
});

const surveyResultsQuery = useSurveyResultsAggregatedQuery({
  conversationSlugId,
  enabled: hasSurvey,
});

// Report loading state to parent (for spinner in PostActionBar)
const isLoading = computed(
  () =>
    analysisQuery.isPending.value ||
    analysisQuery.isRefetching.value ||
    surveyResultsQuery.isPending.value ||
    surveyResultsQuery.isRefetching.value
);

watch(isLoading, (loading) => {
  setCurrentTabLoading(loading);
});

async function handleChildRefresh(): Promise<void> {
  if (hasSurvey.value) {
    await Promise.all([analysisQuery.refetch(), surveyResultsQuery.refetch()]);
    return;
  }

  await analysisQuery.refetch();
}

registerChildRefreshHandler(handleChildRefresh);

onActivated(() => {
  registerChildRefreshHandler(handleChildRefresh);
});

onMounted(() => {
  // Report initial loading state to parent
  setCurrentTabLoading(isLoading.value);
});
</script>

<style scoped lang="scss"></style>
