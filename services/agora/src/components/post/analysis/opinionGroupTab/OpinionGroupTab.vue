<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('groupsTitle')"
        >
          <template #action-button>
            <AnalysisActionButton
              type="learnMore"
              @action-click="showClusterInformation = true"
            />
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <p v-if="!compactMode" class="groups-subtitle">
          {{ hasAiLabels ? t('groupsSubtitle') : t('groupsSubtitleNoAi') }}
        </p>
        <EmptyStateMessage
          v-if="Object.keys(props.clusters).length <= 1"
          :message="t('notEnoughGroupsMessage')"
        />
        <ClusterVisualization
          v-else
          :clusters="props.clusters"
          :total-participant-count="props.totalParticipantCount"
          :current-cluster-tab="currentClusterTab"
          @update:current-cluster-tab="currentClusterTab = $event"
        />

        <template v-if="Object.keys(props.clusters).length > 1">
          <p v-if="isImbalanced" class="imbalance-notice">
            <q-icon name="mdi-information-outline" size="0.9rem" />
            {{ t("imbalanceNotice") }}
          </p>

          <OpinionGroupSelector
            v-if="drawerBehavior == 'desktop'"
            :cluster-metadata-list="props.clusters"
            :selected-cluster-key="currentClusterTab"
            @changed-cluster-key="currentClusterTab = $event"
          />

          <GroupConsensusSummary
            v-if="currentAiSummary"
            :summary="currentAiSummary"
          />

          <OpinionGroupComments
            :conversation-slug-id="props.conversationSlugId"
            :item-list="props.clusters[currentClusterTab]?.representative ?? []"
            :current-cluster-tab="currentClusterTab"
            :has-ungrouped-participants="hasUngroupedParticipants"
            :cluster-labels="clusterLabels"
          >
            <template #after-header>
              <VoteLegend
                v-if="Object.keys(props.clusters).length > 1"
                :items="analysisLegendItems"

              />
            </template>
          </OpinionGroupComments>
        </template>
      </template>
    </AnalysisSectionWrapper>

    <ClusterInformationDialog v-model="showClusterInformation" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
  type VoteLegendTranslations,
  voteLegendTranslations,
} from "src/components/ui/VoteLegend.i18n";
import VoteLegend from "src/components/ui/VoteLegend.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { useNavigationStore } from "src/stores/navigation";
import { isClustersImbalanced } from "src/utils/component/opinion";
import { computed, ref } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import ClusterInformationDialog from "./ClusterInformationDialog.vue";
import ClusterVisualization from "./ClusterVisualization.vue";
import GroupConsensusSummary from "./GroupConsensusSummary.vue";
import OpinionGroupComments from "./OpinionGroupComments.vue";
import OpinionGroupSelector from "./OpinionGroupSelector.vue";
import {
  type OpinionGroupTabTranslations,
  opinionGroupTabTranslations,
} from "./OpinionGroupTab.i18n";

const props = withDefaults(
  defineProps<{
    conversationSlugId: string;
    clusters: Partial<PolisClusters>;
    totalParticipantCount: number;
    compactMode?: boolean;
  }>(),
  {
    compactMode: false,
  },
);

const { t } = useComponentI18n<OpinionGroupTabTranslations>(
  opinionGroupTabTranslations
);

const { drawerBehavior } = storeToRefs(useNavigationStore());

const hasUngroupedParticipants = computed(() => {
  if (Object.keys(props.clusters).length === 0) {
    return false;
  }
  const totalGroupParticipants = Object.values(props.clusters).reduce(
    (sum, cluster) => sum + cluster.numUsers,
    0
  );
  return props.totalParticipantCount > totalGroupParticipants;
});

const isImbalanced = computed(() => {
  const sizes = Object.values(props.clusters).map((c) => c.numUsers);
  return isClustersImbalanced(sizes);
});

const hasAiLabels = computed(() =>
  Object.values(props.clusters).some((cluster) => Boolean(cluster?.aiLabel)),
);

const { t: tLegend } = useComponentI18n<VoteLegendTranslations>(
  voteLegendTranslations
);

const analysisLegendItems = computed(() => [
  { label: tLegend("agree"), type: "agree" as const },
  { label: tLegend("unsure"), type: "unsure" as const },
  { label: tLegend("disagree"), type: "disagree" as const },
  { label: tLegend("noVote"), type: "noVote" as const },
]);

const currentClusterTab = ref<PolisKey>("0");
const showClusterInformation = ref(false);

const currentAiSummary = computed(() => {
  if (currentClusterTab.value in props.clusters) {
    return props.clusters[currentClusterTab.value]?.aiSummary;
  }
  return undefined;
});

// Extract only cluster labels for optimal performance
const clusterLabels = computed(() => {
  const labels: Partial<Record<PolisKey, string>> = {};
  for (const [key, cluster] of Object.entries(props.clusters)) {
    if (cluster?.aiLabel) {
      labels[key as PolisKey] = cluster.aiLabel;
    }
  }
  return labels;
});
</script>

<style lang="scss" scoped>
.groups-subtitle {
  font-size: 0.85rem;
  color: #6d6a74;
  margin: 0 0 0.5rem 0;
  font-weight: normal;
}

.imbalance-notice {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #9e9ba5;
  margin: 0 0 0.5rem 0;
  font-weight: normal;
}
</style>
