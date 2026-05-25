<template>
  <div>
    <AnalysisPage
      ref="analysisPageRef"
      :conversation-slug-id="conversationData.metadata.conversationSlugId"
      :conversation-author-username="conversationData.metadata.authorUsername"
      :conversation-organization-name="conversationData.metadata.organization?.name ?? ''"
      :analysis-query="analysisQuery"
      :survey-query="surveyResultsQuery"
      :has-survey="hasSurvey"
      :survey-gate="conversationData.interaction.surveyGate"
      :show-report-button="showReportButton"
      :is-active="isTabActive"
      :is-live-analysis-paused="isLiveAnalysisPaused"
      :navigate-to-discover-tab="props.navigateToDiscoverTab"
      :conversation-scroll-context="props.conversationScrollContext"
      @update:live-analysis-paused="setLiveAnalysisPaused"
    />
  </div>
</template>

<script setup lang="ts">
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversation } from "src/shared/types/zod";
import {
  parseAnalysisViewQuery,
  parseCheckpointQuery,
} from "src/utils/analysis/analysisRoute";
import { useAnalysisQuery } from "src/utils/api/comment/useCommentQueries";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";

import AnalysisPage from "./analysis/AnalysisPage.vue";

const props = withDefaults(
  defineProps<{
    conversationData: ExtendedConversation;
    hasConversationData: boolean;
    showReportButton?: boolean;
    navigateToDiscoverTab: () => void;
    conversationScrollContext: ConversationScrollContext;
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
const isTabActive = ref(true);
const isLiveAnalysisPaused = ref(false);
const route = useRoute();

// Create computed properties to ensure reactivity
const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);
const voteCount = computed(() => props.conversationData.metadata.voteCount);
const hasSurvey = computed(() => props.conversationData.interaction.surveyGate?.hasSurvey === true);
const analysisView = computed(() => parseAnalysisViewQuery({ query: route.query }));
const checkpointViewSnapshotId = computed(() =>
  parseCheckpointQuery({ query: route.query })
);

// Load analysis data
const analysisQuery = useAnalysisQuery({
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  voteCount,
  enabled: computed(
    () => props.hasConversationData && isTabActive.value && !isLiveAnalysisPaused.value
  ),
});

const surveyResultsQuery = useSurveyResultsAggregatedQuery({
  conversationSlugId,
  enabled: hasSurvey,
});

const isSurveyResultsLoading = computed(
  () =>
    hasSurvey.value &&
    (surveyResultsQuery.isPending.value || surveyResultsQuery.isRefetching.value)
);

// Report loading state to parent (for spinner in PostActionBar)
const isLoading = computed(
  () =>
    analysisQuery.isPending.value ||
    analysisQuery.isRefetching.value ||
    isSurveyResultsLoading.value
);

function setLiveAnalysisPaused(paused: boolean): void {
  isLiveAnalysisPaused.value = paused;
}

watch(isLoading, (loading) => {
  setCurrentTabLoading(loading);
});

async function handleChildRefresh(): Promise<void> {
  const checkpointRefresh = analysisPageRef.value?.refreshCheckpoints() ?? Promise.resolve();

  if (hasSurvey.value) {
    await Promise.all([
      analysisQuery.refetch(),
      surveyResultsQuery.refetch(),
      checkpointRefresh,
    ]);
    return;
  }

  await Promise.all([analysisQuery.refetch(), checkpointRefresh]);
}

registerChildRefreshHandler(handleChildRefresh);

onActivated(() => {
  isTabActive.value = true;
  registerChildRefreshHandler(handleChildRefresh);
});

onDeactivated(() => {
  isTabActive.value = false;
});

onMounted(() => {
  isTabActive.value = true;
  // Report initial loading state to parent
  setCurrentTabLoading(isLoading.value);
});
</script>

<style scoped lang="scss"></style>
