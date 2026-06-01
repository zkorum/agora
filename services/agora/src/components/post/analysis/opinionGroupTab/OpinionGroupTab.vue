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
          {{ groupsSubtitle }}
        </p>
        <EmptyStateMessage
          v-if="clusterList.length <= 1"
          :message="t('notEnoughGroupsMessage')"
        />
        <ClusterVisualization
          v-else
          :clusters="props.clusters"
          :total-participant-count="props.totalParticipantCount"
          :current-cluster-tab="currentClusterTab"
          @update:current-cluster-tab="handleClusterSelection"
        />

        <template v-if="clusterList.length > 1">
          <p v-if="isImbalanced" class="imbalance-notice">
            <q-icon name="mdi-information-outline" size="0.9rem" />
            {{ t("imbalanceNotice") }}
          </p>

          <AnalysisClusterSelectorBar
            v-if="showGroupControls"
            :clusters="props.clusters"
            :selected-cluster-key="currentClusterTab"
            :all-option="undefined"
            :accessibility-label="t('selectGroup')"
            :conversation-scroll-context="props.conversationScrollContext"
            :content-floor-element="groupContentFloorTarget"
            :secondary-content-merge-target="commentsHeaderElement"
            @update:selected-cluster-key="selectClusterFromSelector"
            @update:is-secondary-content-merged="isScopeMerged = $event"
          >
            <template #secondary>
              <OpinionGroupScopeSelector
                v-if="isScopeMerged"
                class="group-scope-selector"
                :display-mode="displayMode"
                variant="compact"
                @previous="selectPreviousDisplayMode"
                @next="selectNextDisplayMode"
              />
            </template>
          </AnalysisClusterSelectorBar>

          <div
            v-if="currentAiSummary !== undefined"
            ref="groupContentFloorElement"
          >
            <GroupConsensusSummary
              :summary="currentAiSummary"
              :title="undefined"
              summary-state="available"
            />
          </div>
          <div
            v-else-if="showCurrentGroupAiPendingNotice"
            ref="groupContentFloorElement"
          >
            <GroupConsensusSummary
              :summary="t('groupAiPendingNotice')"
              :title="undefined"
              summary-state="pending"
            />
          </div>

          <OpinionGroupComments
            ref="commentsRef"
            :conversation-slug-id="props.conversationSlugId"
            :conversation-author-username="props.conversationAuthorUsername"
            :conversation-organization-name="props.conversationOrganizationName"
            :item-list="currentRepresentativeItems"
            :current-cluster-tab="currentClusterTab"
            :cluster-labels="clusterLabels"
            :display-mode="displayMode"
            :show-scope-selector="showInlineScopeSelector"
            @previous-display-mode="selectPreviousDisplayMode"
            @next-display-mode="selectNextDisplayMode"
          >
            <template #after-header>
              <VoteLegend
                v-if="clusterList.length > 1"
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
import {
  type VoteLegendTranslations,
  voteLegendTranslations,
} from "src/components/ui/VoteLegend.i18n";
import VoteLegend from "src/components/ui/VoteLegend.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { isClustersImbalanced } from "src/utils/component/opinion";
import { computed, ref, watch } from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
import AnalysisClusterSelectorBar from "../common/AnalysisClusterSelectorBar.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import ClusterInformationDialog from "./ClusterInformationDialog.vue";
import ClusterVisualization from "./ClusterVisualization.vue";
import GroupConsensusSummary from "./GroupConsensusSummary.vue";
import OpinionGroupComments from "./OpinionGroupComments.vue";
import {
  getNextDisplayMode,
  getPreviousDisplayMode,
  type OpinionGroupDisplayMode,
} from "./opinionGroupDisplayMode";
import OpinionGroupScopeSelector from "./OpinionGroupScopeSelector.vue";
import {
  type OpinionGroupTabTranslations,
  opinionGroupTabTranslations,
} from "./OpinionGroupTab.i18n";

type ClusterItem = NonNullable<PolisClusters[PolisKey]>;

const props = withDefaults(
  defineProps<{
    conversationSlugId: string;
    conversationAuthorUsername: string;
    conversationOrganizationName: string;
    clusters: Partial<PolisClusters>;
    totalParticipantCount: number;
    analysisFrameKey: string | undefined;
    aiLabelingEnabled: boolean;
    compactMode?: boolean;
    conversationScrollContext: ConversationScrollContext;
  }>(),
  {
    compactMode: false,
  }
);

const { t } = useComponentI18n<OpinionGroupTabTranslations>(
  opinionGroupTabTranslations
);
const { t: tLegend } = useComponentI18n<VoteLegendTranslations>(
  voteLegendTranslations
);

const groupContentFloorElement = ref<HTMLElement | null>(null);
interface OpinionGroupCommentsExposed {
  getHeaderElement: () => HTMLElement | null;
}

const commentsRef = ref<OpinionGroupCommentsExposed | null>(null);

const showClusterInformation = ref(false);
const isScopeMerged = ref(false);
const displayMode = ref<OpinionGroupDisplayMode>("current");
let hasAppliedClusterDefault = false;
let lastDefaultAnalysisFrameKey: string | undefined;

const clusterList = computed<ClusterItem[]>(() =>
  Object.values(props.clusters)
    .filter((cluster): cluster is ClusterItem => cluster !== undefined)
    .sort((a, b) => Number(a.key) - Number(b.key))
);

function findInitialClusterKey(clusters: ClusterItem[]): PolisKey {
  for (const cluster of clusters) {
    if (cluster.isUserInCluster) return cluster.key;
  }

  const firstCluster = clusters[0];
  return firstCluster?.key ?? "0";
}

const currentClusterTab = ref<PolisKey>(
  findInitialClusterKey(clusterList.value)
);

const showGroupControls = computed(
  () => !props.compactMode && clusterList.value.length > 1
);

const showInlineScopeSelector = computed(
  () => !showGroupControls.value || !isScopeMerged.value
);

const hasUngroupedParticipants = computed(() => {
  if (clusterList.value.length === 0) {
    return false;
  }

  const totalGroupParticipants = clusterList.value.reduce(
    (sum, cluster) => sum + cluster.numUsers,
    0
  );
  return props.totalParticipantCount > totalGroupParticipants;
});

const isImbalanced = computed(() => {
  const sizes = clusterList.value.map((cluster) => cluster.numUsers);
  return isClustersImbalanced(sizes);
});

const hasAiLabels = computed(() =>
  clusterList.value.some((cluster) => cluster.aiLabel !== undefined)
);

const hasMissingAiGeneratedContent = computed(() =>
  clusterList.value.some(
    (cluster) =>
      cluster.aiLabel === undefined || cluster.aiSummary === undefined
  )
);

const groupsSubtitle = computed(() => {
  if (!props.aiLabelingEnabled) {
    return t("groupsSubtitleNoAi");
  }

  if (hasMissingAiGeneratedContent.value) {
    return t("groupsSubtitlePendingAi");
  }

  return hasAiLabels.value ? t("groupsSubtitle") : t("groupsSubtitleNoAi");
});

const analysisLegendItems = computed(() => [
  { label: tLegend("agree"), type: "agree" as const },
  { label: tLegend("unsure"), type: "unsure" as const },
  { label: tLegend("disagree"), type: "disagree" as const },
  { label: tLegend("noVote"), type: "noVote" as const },
]);

const currentCluster = computed(() =>
  clusterList.value.find((cluster) => cluster.key === currentClusterTab.value)
);

const currentAiSummary = computed(() => currentCluster.value?.aiSummary);

const showCurrentGroupAiPendingNotice = computed(() => {
  const cluster = currentCluster.value;
  if (!props.aiLabelingEnabled || cluster === undefined) {
    return false;
  }

  return cluster.aiLabel === undefined || cluster.aiSummary === undefined;
});

const currentRepresentativeItems = computed(
  () => currentCluster.value?.representative ?? []
);

const clusterLabels = computed(() => {
  const labels: Partial<Record<PolisKey, string>> = {};
  for (const cluster of clusterList.value) {
    if (cluster.aiLabel) {
      labels[cluster.key] = cluster.aiLabel;
    }
  }
  return labels;
});

const commentsHeaderElement = computed(
  () => commentsRef.value?.getHeaderElement() ?? null
);

const groupContentFloorTarget = computed(
  () => groupContentFloorElement.value ?? commentsHeaderElement.value
);

watch(
  clusterList,
  (clusters) => {
    const stillExists = clusters.some(
      (cluster) => cluster.key === currentClusterTab.value
    );
    if (stillExists) return;

    const firstCluster = clusters[0];
    if (firstCluster !== undefined) {
      currentClusterTab.value = firstCluster.key;
    }
  },
  { immediate: true }
);

watch(
  [() => props.analysisFrameKey, clusterList],
  ([analysisFrameKey, clusters]) => {
    if (clusters.length === 0) {
      return;
    }

    if (
      hasAppliedClusterDefault &&
      analysisFrameKey === lastDefaultAnalysisFrameKey
    ) {
      return;
    }

    currentClusterTab.value = findInitialClusterKey(clusters);
    displayMode.value = "current";
    hasAppliedClusterDefault = true;
    lastDefaultAnalysisFrameKey = analysisFrameKey;
  },
  { immediate: true }
);

watch(currentClusterTab, () => {
  displayMode.value = "current";
});

function handleClusterSelection(clusterKey: PolisKey): void {
  if (clusterKey === currentClusterTab.value) {
    return;
  }

  currentClusterTab.value = clusterKey;
}

function selectClusterFromSelector(clusterKey: PolisKey | undefined): void {
  if (clusterKey === undefined) {
    return;
  }

  currentClusterTab.value = clusterKey;
}

function selectNextDisplayMode(): void {
  displayMode.value = getNextDisplayMode({
    displayMode: displayMode.value,
    hasUngroupedParticipants: hasUngroupedParticipants.value,
  });
}

function selectPreviousDisplayMode(): void {
  displayMode.value = getPreviousDisplayMode({
    displayMode: displayMode.value,
    hasUngroupedParticipants: hasUngroupedParticipants.value,
  });
}
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

.group-scope-selector {
  flex: 0 1 auto;
  margin-inline-start: auto;
  max-width: 54%;
  min-width: 0;
}
</style>
