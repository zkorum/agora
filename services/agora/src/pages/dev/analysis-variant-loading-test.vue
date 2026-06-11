<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar title="Analysis variant loading" :center-content="true" />
  </Teleport>

  <div class="page-layout">
    <PrimeCard class="control-card">
      <template #title>
        <div class="section-header">
          <i class="pi pi-sync section-icon"></i>
          <span>Slow variant switching</span>
        </div>
      </template>
      <template #content>
        <p class="section-description">
          Click the button, then open the group-count drawer and switch to a
          different variant. The next uncached selection waits
          {{ latencySeconds }}s and should show the loader below the selector
          without showing stale content.
        </p>
        <div class="button-container">
          <PrimeButton
            label="Reset cache and test again"
            icon="pi pi-refresh"
            @click="resetMockAnalysisCache"
          />
        </div>
      </template>
    </PrimeCard>

    <AnalysisPage
      conversation-slug-id="dev-analysis-variant-loading"
      conversation-author-username="dev-user"
      conversation-organization-name=""
      :analysis-query="analysisQuery"
      :analysis-checkpoints-query="analysisCheckpointsQuery"
      :live-conversation-view-snapshot-id="100"
      :survey-query="surveyQuery"
      :has-survey="false"
      :survey-gate="undefined"
      :ai-labeling-enabled="true"
      :show-report-button="false"
      :is-live-analysis-paused="false"
      :is-conversation-closed="false"
      :navigate-to-discover-tab="noop"
      :conversation-scroll-context="conversationScrollContext"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import Button from "primevue/button";
import Card from "primevue/card";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AnalysisPage from "src/components/post/analysis/AnalysisPage.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type {
  AnalysisCheckpoint,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import { parseAnalysisViewQuery } from "src/utils/analysis/analysisRoute";
import type { AnalysisData } from "src/utils/api/comment/comment";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
  buildMockAnalysisCheckpoints,
  buildMockAnalysisData,
} from "./analysisTestData";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
  },
});

const route = useRoute();
const queryClient = useQueryClient();
const latencyMs = 1800;

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});

const latencySeconds = computed(() => (latencyMs / 1000).toFixed(1));

const selectedAnalysisView = computed(
  () => parseAnalysisViewQuery({ query: route.query }) ?? "auto"
);

const conversationScrollContext: ConversationScrollContext = {
  actionBarElement: null,
  scrollContainerElement: null,
  getScrollPosition: () => window.scrollY,
  getElementScrollPosition: ({ element }) =>
    element.getBoundingClientRect().top,
  scrollToPosition: ({ top, behavior }) => {
    window.scrollTo({ top, behavior });
  },
};

function noop(): void {
  /* dev preview only */
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resetMockAnalysisCache(): void {
  queryClient.removeQueries({
    predicate: (query) =>
      query.queryKey[0] === "dev-analysis-variant-loading" && !query.isActive(),
  });
}

const analysisQuery = useQuery<AnalysisData, Error>({
  queryKey: computed(() => [
    "dev-analysis-variant-loading",
    selectedAnalysisView.value,
  ]),
  queryFn: async () => {
    const view = selectedAnalysisView.value;
    await wait(latencyMs);
    return buildMockAnalysisData({ view });
  },
  staleTime: Infinity,
  retry: false,
});

const analysisCheckpointsQuery = useQuery<AnalysisCheckpoint[], Error>({
  queryKey: ["dev-analysis-variant-loading-checkpoints"],
  queryFn: async () => {
    await wait(800);
    return buildMockAnalysisCheckpoints();
  },
  staleTime: Infinity,
  retry: false,
});

const surveyQuery = useQuery<SurveyResultsAggregatedResponse, Error>({
  queryKey: ["dev-analysis-variant-loading-survey"],
  queryFn: () => ({
    hasSurvey: false,
    accessLevel: "public",
    suppressionThreshold: 5,
    suppressedRows: [],
  }),
  staleTime: Infinity,
  retry: false,
});
</script>

<style scoped lang="scss">
.page-layout {
  padding: 1rem;
}

.control-card {
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
}

.section-icon {
  color: $primary;
}

.section-description {
  margin: 0 0 1.25rem;
  color: $grey-8;
  line-height: 1.5;
}

.button-container {
  display: flex;
  justify-content: flex-start;
}
</style>
