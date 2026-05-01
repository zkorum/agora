<template>
  <AsyncStateHandler :query="analysisQuery" :config="asyncStateConfig">
    <div class="container flexStyle">
      <div class="analysis-header">
        <ShortcutBar
          :model-value="currentTab"
          :items="polisTabItems"
          :get-label="getPolisTabLabel"
          :get-route="getPolisTabRoute"
          :on-same-tab-click="handleSameTabClick"
          @update:model-value="onTabChange"
        />
        <router-link
          v-if="showReportButton"
          :to="{
            name: '/conversation/[conversationSlugId]/report',
            params: { conversationSlugId: props.conversationSlugId },
          }"
          class="report-button"
          :title="t('generateReport')"
          :aria-label="t('generateReport')"
        >
          <q-icon name="mdi-file-chart-outline" size="1rem" />
          <div>{{ t("report") }}</div>
        </router-link>
      </div>

      <!-- Me tab -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Me'"
        class="tabComponent"
      >
        <MeTab
          :model-value="currentTab"
          :cluster-key="userClusterData.clusterKey"
          :ai-label="userClusterData.aiLabel"
          :ai-summary="userClusterData.aiSummary"
          :has-voted-on-all-available-opinions="analysisQuery.data.value?.hasVotedOnAllAvailableOpinions"
          :navigate-to-discover-tab="props.navigateToDiscoverTab"
          @update:model-value="onTabChange"
        />
      </div>

      <!-- Opinion groups -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Groups' || currentTab === 'Me'"
        class="tabComponent"
      >
        <OpinionGroupTab
          :conversation-slug-id="props.conversationSlugId"
          :clusters="polisClusters"
          :total-participant-count="props.participantCount"
          :compact-mode="currentTab === 'Summary'"
        />
      </div>

      <!-- Agreements -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Agreements'"
        class="tabComponent"
      >
        <ConsensusTab
          :model-value="currentTab"
          direction="agree"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="agreementItems"
          :compact-mode="currentTab === 'Summary'"
          :clusters="polisClusters"
          :cluster-labels="clusterLabels"
          @update:model-value="onTabChange"
        />
      </div>

      <!-- Disagreements -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Disagreements'"
        class="tabComponent"
      >
        <ConsensusTab
          :model-value="currentTab"
          direction="disagree"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="disagreementItems"
          :compact-mode="currentTab === 'Summary'"
          :clusters="polisClusters"
          :cluster-labels="clusterLabels"
          @update:model-value="onTabChange"
        />
      </div>

      <!-- Divisive -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Divisive'"
        class="tabComponent"
      >
        <DivisiveTab
          :model-value="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="controversialItems"
          :compact-mode="currentTab === 'Summary'"
          :clusters="polisClusters"
          :cluster-labels="clusterLabels"
          @update:model-value="onTabChange"
        />
      </div>

      <!-- Survey -->
      <div
        v-if="props.hasSurvey && (currentTab === 'Summary' || currentTab === 'Survey')"
        class="tabComponent"
      >
        <SurveyTab
          :model-value="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :survey-gate="props.surveyGate"
          :survey-query="props.surveyQuery"
          :clusters="polisClusters"
          :total-participant-count="props.participantCount"
          :compact-mode="currentTab === 'Summary'"
          @update:model-value="onTabChange"
        />
      </div>
    </div>
  </AsyncStateHandler>
</template>

<script setup lang="ts">
import type { UseQueryReturnType } from "@tanstack/vue-query";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type { SurveyResultsAggregatedResponse } from "src/shared/types/dto";
import type {
  AnalysisOpinionItem,
  PolisClusters,
  PolisKey,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { type ShortcutItem, shortcutItemSchema } from "src/utils/component/analysis/shortcutBar";
import { computed, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useRoute } from "vue-router";

import {
  type AnalysisPageTranslations,
  analysisPageTranslations,
} from "./AnalysisPage.i18n";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import DivisiveTab from "./divisivenessTab/DivisiveTab.vue";
import MeTab from "./meTab/MeTab.vue";
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import {
  type ShortcutBarTranslations,
  shortcutBarTranslations,
} from "./shortcutBar/ShortcutBar.i18n";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";
import SurveyTab from "./surveyTab/SurveyTab.vue";

const props = withDefaults(
  defineProps<{
    participantCount: number;
    conversationSlugId: string;
    analysisQuery: UseQueryReturnType<AnalysisData, Error>;
    surveyQuery: UseQueryReturnType<SurveyResultsAggregatedResponse, Error>;
    hasSurvey: boolean;
    surveyGate?: SurveyGateSummary;
    showReportButton?: boolean;
    navigateToDiscoverTab: () => void;
  }>(),
  {
    showReportButton: true,
    surveyGate: undefined,
  }
);

type AnalysisData = {
  consensusAgree: AnalysisOpinionItem[];
  consensusDisagree: AnalysisOpinionItem[];
  controversial: AnalysisOpinionItem[];
  polisClusters: Partial<PolisClusters>;
  hasVotedOnAllAvailableOpinions?: boolean;
};

const { t } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);
const { t: tShortcut } = useComponentI18n<ShortcutBarTranslations>(
  shortcutBarTranslations
);

const route = useRoute();

const { currentTab, handleSameTabClick } = useTabNavigation({
  schema: shortcutItemSchema,
  defaultTab: "Summary",
});

watch(
  () => props.hasSurvey,
  (hasSurvey) => {
    if (!hasSurvey && currentTab.value === "Survey") {
      currentTab.value = "Summary";
    }
  },
  { immediate: true }
);

function getPolisTabRoute(item: string): RouteLocationRaw {
  if (item === "Summary") {
    return { path: route.path };
  }
  return { path: route.path, query: { tab: item } };
}

const polisTabItems = computed<ShortcutItem[]>(() => [
  "Summary",
  "Me",
  "Groups",
  "Agreements",
  "Disagreements",
  "Divisive",
  ...(props.hasSurvey ? (["Survey"] as ShortcutItem[]) : []),
]);

const polisTabLabelMap: Record<string, string> = {
  Summary: tShortcut("summary"),
  Me: tShortcut("me"),
  Groups: tShortcut("groups"),
  Agreements: tShortcut("agreements"),
  Disagreements: tShortcut("disagreements"),
  Divisive: tShortcut("divisive"),
  Survey: tShortcut("survey"),
};

function getPolisTabLabel(item: string): string {
  return polisTabLabelMap[item] ?? item;
}

function onTabChange(value: string): void {
  const parsed = shortcutItemSchema.safeParse(value);
  if (parsed.success) {
    if (parsed.data === "Survey" && !props.hasSurvey) {
      currentTab.value = "Summary";
      return;
    }

    currentTab.value = parsed.data;
  }
}

// Use the passed-in analysis query instead of creating our own
const analysisQuery = props.analysisQuery;

const polisClusters = computed<Partial<PolisClusters>>(
  () => analysisQuery.data.value?.polisClusters ?? {}
);

// Extract only cluster labels for optimal performance (300 bytes instead of 300KB)
const clusterLabels = computed(() => {
  const labels: Partial<Record<PolisKey, string>> = {};

  for (const [key, cluster] of Object.entries(polisClusters.value)) {
    if (cluster?.aiLabel) {
      labels[key as PolisKey] = cluster.aiLabel;
    }
  }
  return labels;
});

// Full ranked lists — already sorted by the backend (ga_agree DESC / ga_disagree DESC).
// ConsensusTab handles the GA > 0.5 threshold filter and "load more" internally.
const agreementItems = computed(
  () => analysisQuery.data.value?.consensusAgree ?? []
);

const disagreementItems = computed(
  () => analysisQuery.data.value?.consensusDisagree ?? []
);

// Only show opinions where the math pipeline has run (divisiveScore > 0).
// Pre-math opinions default to divisiveScore=0 and have no meaningful divisiveness signal.
const controversialItems = computed(() =>
  (analysisQuery.data.value?.controversial ?? []).filter(
    (item) => item.divisiveScore > 0
  )
);


// Find the cluster the user belongs to
const userClusterData = computed(() => {
  for (const [key, cluster] of Object.entries(polisClusters.value)) {
    if (cluster?.isUserInCluster) {
      return {
        clusterKey: key as PolisKey,
        aiLabel: cluster.aiLabel,
        aiSummary: cluster.aiSummary,
      };
    }
  }

  return { clusterKey: undefined, aiLabel: undefined, aiSummary: undefined };
});

const asyncStateConfig = {
  loading: {
    text: t("loadingAnalysis"),
  },
  retrying: {
    text: t("retryingAnalysis"),
  },
  error: {
    title: t("analysisErrorTitle"),
    message: t("analysisErrorMessage"),
    retryButtonText: t("retryAnalysis"),
  },
  empty: {
    text: t("noAnalysisData"),
  },
};

defineExpose({
  isLoading: computed(
    () => analysisQuery.isPending.value || analysisQuery.isRefetching.value
  ),
});
</script>

<style lang="scss" scoped>
.container {
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border-color: #e9e9f1;
  border-width: 1px;
  margin-bottom: 10rem;
  color: #333238;
}

.flexStyle {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tabComponent {
  border-radius: 12px;
  padding: 0.5rem;
}

.analysis-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}

.report-button {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid #d8d6de;
  background-color: white;
  color: #6d6a74;
  padding: 0.4rem 0.5rem;
  gap: 0.3rem;
  cursor: pointer;

  &:hover {
    background-color: #c6c4ff;
    border-color: #6b4eff;
    color: #6b4eff;
  }

  @media (max-width: $breakpoint-xs-max) {
    display: none;
  }
}
</style>
