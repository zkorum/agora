<template>
  <AsyncStateHandler :query="analysisQuery" :config="asyncStateConfig">
    <div class="container flexStyle">
      <ShortcutBar v-model="currentTab" />

      <!-- Me tab -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Me'"
        class="tabComponent"
      >
        <MeTab
          v-model="currentTab"
          :cluster-key="userClusterData.clusterKey"
          :ai-label="userClusterData.aiLabel"
          :ai-summary="userClusterData.aiSummary"
        />
      </div>

      <!-- Opinion groups -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Groups' || currentTab === 'Me'"
        class="tabComponent"
      >
        <OpinionGroupTab
          :conversation-slug-id="props.conversationSlugId"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
          :total-participant-count="props.participantCount"
        />
      </div>

      <!-- Agreements -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Agreements'"
        class="tabComponent"
      >
        <ConsensusTab
          v-model="currentTab"
          direction="agree"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="agreementItems"
          :compact-mode="currentTab === 'Summary'"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
          :cluster-labels="clusterLabels"
        />
      </div>

      <!-- Disagreements -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Disagreements'"
        class="tabComponent"
      >
        <ConsensusTab
          v-model="currentTab"
          direction="disagree"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="disagreementItems"
          :compact-mode="currentTab === 'Summary'"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
          :cluster-labels="clusterLabels"
        />
      </div>

      <!-- Divisive -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Divisive'"
        class="tabComponent"
      >
        <DivisiveTab
          v-model="currentTab"
          :conversation-slug-id="props.conversationSlugId"
          :item-list="controversialItems"
          :compact-mode="currentTab === 'Summary'"
          :clusters="analysisQuery.data.value?.polisClusters || {}"
          :cluster-labels="clusterLabels"
        />
      </div>
    </div>
  </AsyncStateHandler>
</template>

<script setup lang="ts">
import type { UseQueryReturnType } from "@tanstack/vue-query";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisOpinionItem,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import { computed,ref } from "vue";

import {
  type AnalysisPageTranslations,
  analysisPageTranslations,
} from "./AnalysisPage.i18n";
import ConsensusTab from "./consensusTab/ConsensusTab.vue";
import DivisiveTab from "./divisivenessTab/DivisiveTab.vue";
import MeTab from "./meTab/MeTab.vue";
import OpinionGroupTab from "./opinionGroupTab/OpinionGroupTab.vue";
import ShortcutBar from "./shortcutBar/ShortcutBar.vue";

type AnalysisData = {
  consensusAgree: AnalysisOpinionItem[];
  consensusDisagree: AnalysisOpinionItem[];
  controversial: AnalysisOpinionItem[];
  polisClusters: Partial<PolisClusters>;
};

const props = defineProps<{
  participantCount: number;
  conversationSlugId: string;
  analysisQuery: UseQueryReturnType<AnalysisData, Error>;
}>();

const { t } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);

const currentTab = ref<ShortcutItem>("Summary");

// Use the passed-in analysis query instead of creating our own
const analysisQuery = props.analysisQuery;

// Extract only cluster labels for optimal performance (300 bytes instead of 300KB)
const clusterLabels = computed(() => {
  const labels: Partial<Record<PolisKey, string>> = {};
  if (!analysisQuery.data.value?.polisClusters) return labels;

  for (const [key, cluster] of Object.entries(analysisQuery.data.value.polisClusters)) {
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
  if (!analysisQuery.data.value?.polisClusters) {
    return { clusterKey: undefined, aiLabel: undefined, aiSummary: undefined };
  }

  for (const [key, cluster] of Object.entries(analysisQuery.data.value.polisClusters)) {
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
</style>
