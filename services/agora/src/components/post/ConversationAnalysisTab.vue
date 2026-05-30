<template>
  <div>
    <AnalysisPage
      ref="analysisPageRef"
      :conversation-slug-id="conversationData.metadata.conversationSlugId"
      :conversation-author-username="conversationData.metadata.authorUsername"
      :conversation-organization-name="
        conversationData.metadata.organization?.name ?? ''
      "
      :analysis-query="analysisQuery"
      :analysis-checkpoints-query="analysisCheckpointsQuery"
      :live-conversation-view-snapshot-id="
        conversationData.metadata.conversationViewSnapshotId
      "
      :survey-query="surveyResultsQuery"
      :has-survey="hasSurvey"
      :survey-gate="conversationData.interaction.surveyGate"
      :ai-labeling-enabled="conversationData.metadata.aiLabelingEnabled"
      :show-report-button="showReportButton"
      :is-live-analysis-paused="isLiveAnalysisPaused"
      :is-conversation-closed="conversationData.metadata.isClosed"
      :navigate-to-discover-tab="props.navigateToDiscoverTab"
      :conversation-scroll-context="props.conversationScrollContext"
      @update:live-analysis-paused="setLiveAnalysisPaused"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  ConversationScrollContext,
  RegisterChildRefreshHandler,
} from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversation } from "src/shared/types/zod";
import {
  parseAnalysisViewQuery,
  parseCheckpointQuery,
} from "src/utils/analysis/analysisRoute";
import {
  useAnalysisCheckpointsQuery,
  useAnalysisQuery,
} from "src/utils/api/comment/useCommentQueries";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
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
const registerChildRefreshHandler = inject<RegisterChildRefreshHandler>("registerChildRefreshHandler", () => {
  /* noop */
  return () => {
    /* noop */
  };
});

const analysisPageRef = ref<InstanceType<typeof AnalysisPage>>();
const isTabActive = ref(true);
const isLiveAnalysisPaused = ref(false);
const route = useRoute();
let unregisterChildRefreshHandler: (() => void) | undefined;

// Create computed properties to ensure reactivity
const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);
const voteCount = computed(() => props.conversationData.metadata.voteCount);
const aiLabelingEnabled = computed(
  () => props.conversationData.metadata.aiLabelingEnabled
);
const hasSurvey = computed(
  () => props.conversationData.interaction.surveyGate?.hasSurvey === true
);
const analysisView = computed(() =>
  parseAnalysisViewQuery({ query: route.query })
);
const checkpointViewSnapshotId = computed(() =>
  parseCheckpointQuery({ query: route.query })
);

// Load analysis data
const analysisQuery = useAnalysisQuery({
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  voteCount,
  aiLabelingEnabled,
  enabled: computed(
    () =>
      props.hasConversationData &&
      isTabActive.value &&
      !isLiveAnalysisPaused.value
  ),
});

const analysisCheckpointsQuery = useAnalysisCheckpointsQuery({
  conversationSlugId,
  enabled: computed(
    () =>
      props.hasConversationData &&
      isTabActive.value &&
      !isLiveAnalysisPaused.value
  ),
});

const surveyResultsQuery = useSurveyResultsAggregatedQuery({
  conversationSlugId,
  analysisView,
  checkpointViewSnapshotId,
  enabled: hasSurvey,
});

const isSurveyResultsLoading = computed(
  () =>
    hasSurvey.value &&
    (surveyResultsQuery.isPending.value ||
      surveyResultsQuery.isRefetching.value) &&
    surveyResultsQuery.data.value === undefined
);

// Report loading state to parent (for spinner in PostActionBar)
const isLoading = computed(
  () =>
    isTabActive.value &&
    (analysisQuery.isPending.value ||
      analysisQuery.isRefetching.value ||
      analysisCheckpointsQuery.isPending.value ||
      analysisCheckpointsQuery.isRefetching.value ||
      isSurveyResultsLoading.value)
);

function setLiveAnalysisPaused(paused: boolean): void {
  isLiveAnalysisPaused.value = paused;
}

watch(isLoading, (loading) => {
  setCurrentTabLoading(loading);
});

async function handleChildRefresh(): Promise<void> {
  const analysisRefresh =
    analysisPageRef.value?.refreshLatestAnalysis() ??
    Promise.all([analysisQuery.refetch(), analysisCheckpointsQuery.refetch()]);

  if (hasSurvey.value) {
    await Promise.all([analysisRefresh, surveyResultsQuery.refetch()]);
    return;
  }

  await analysisRefresh;
}

function registerRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = registerChildRefreshHandler(handleChildRefresh);
}

function unregisterRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = undefined;
}

registerRefreshHandler();

onActivated(() => {
  isTabActive.value = true;
  registerRefreshHandler();
});

onDeactivated(() => {
  isTabActive.value = false;
  unregisterRefreshHandler();
});

onUnmounted(unregisterRefreshHandler);

onMounted(() => {
  isTabActive.value = true;
  // Report initial loading state to parent
  setCurrentTabLoading(isLoading.value);
});
</script>

<style scoped lang="scss"></style>
