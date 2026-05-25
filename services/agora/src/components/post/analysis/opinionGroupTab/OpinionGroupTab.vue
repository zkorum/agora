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
          {{ hasAiLabels ? t("groupsSubtitle") : t("groupsSubtitleNoAi") }}
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

          <template v-if="showGroupControls">
            <div ref="groupStickySentinel"></div>
            <div
              ref="groupStickyBarElement"
              class="group-sticky-bar"
              :class="{
                'group-sticky-bar--stuck': isGroupBarSticky,
              }"
              :style="groupStickyStyle"
            >
              <div class="group-sticky-row">
                <ZKDropdownSelectorButton
                  :label="selectedClusterLabel"
                  :accessibility-label="t('selectGroup')"
                  button-type="standardButton"
                  class="group-selector-trigger"
                  content-alignment="start"
                  icon-name="mdi-chevron-down"
                  icon-size="1rem"
                  label-overflow="truncate"
                  @click="showGroupDrawer = true"
                />

                <OpinionGroupScopeSelector
                  v-if="isScopeMerged"
                  class="group-sticky-row__scope"
                  :display-mode="displayMode"
                  variant="compact"
                  @previous="selectPreviousDisplayMode"
                  @next="selectNextDisplayMode"
                />
              </div>

            </div>
          </template>

          <div v-if="currentAiSummary" ref="groupContentFloorElement">
            <GroupConsensusSummary :summary="currentAiSummary" />
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

    <q-dialog v-model="showGroupDrawer" position="bottom">
      <ZKBottomDialogContainer :title="t('selectGroup')">
        <div class="group-drawer-list">
          <button
            v-for="cluster in clusterList"
            :key="cluster.key"
            type="button"
            class="group-drawer-option"
            :class="{
              'group-drawer-option--selected': cluster.key === currentClusterTab,
            }"
            :aria-pressed="cluster.key === currentClusterTab"
            @click="selectClusterFromDrawer(cluster.key)"
          >
            <span>{{ getClusterLabel(cluster) }}</span>
            <q-icon
              v-if="cluster.key === currentClusterTab"
              name="mdi-check"
              size="1.1rem"
            />
          </button>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <ClusterInformationDialog v-model="showClusterInformation" />
  </div>
</template>

<script setup lang="ts">
import {
  type VoteLegendTranslations,
  voteLegendTranslations,
} from "src/components/ui/VoteLegend.i18n";
import VoteLegend from "src/components/ui/VoteLegend.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDropdownSelectorButton from "src/components/ui-library/ZKDropdownSelectorButton.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { formatClusterLabel, isClustersImbalanced } from "src/utils/component/opinion";
import { getHeaderHeight } from "src/utils/html/scroll";
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUpdated,
  ref,
  watch,
} from "vue";

import AnalysisActionButton from "../common/AnalysisActionButton.vue";
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

const groupStickySentinel = ref<HTMLElement | null>(null);
const groupStickyBarElement = ref<HTMLElement | null>(null);
const groupContentFloorElement = ref<HTMLElement | null>(null);
interface OpinionGroupCommentsExposed {
  getHeaderElement: () => HTMLElement | null;
}

const commentsRef = ref<OpinionGroupCommentsExposed | null>(null);

const showClusterInformation = ref(false);
const showGroupDrawer = ref(false);
const isGroupBarSticky = ref(false);
const isScopeMerged = ref(false);
const stickyTopOffset = ref(0);
const displayMode = ref<OpinionGroupDisplayMode>("current");
const groupScrollPositions = new Map<PolisKey, number>();
let hasAppliedClusterDefault = false;
let lastDefaultAnalysisFrameKey: string | undefined;

let resizeObserver: ResizeObserver | undefined;
let removeScrollListener: (() => void) | undefined;
let layoutRafId: number | undefined;

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
  clusterList.value.some((cluster) => Boolean(cluster.aiLabel))
);

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

const currentRepresentativeItems = computed(
  () => currentCluster.value?.representative ?? []
);

const selectedClusterLabel = computed(() => {
  const cluster = currentCluster.value;
  if (cluster === undefined) return formatClusterLabel(currentClusterTab.value, false);
  return getClusterLabel(cluster);
});

const clusterLabels = computed(() => {
  const labels: Partial<Record<PolisKey, string>> = {};
  for (const cluster of clusterList.value) {
    if (cluster.aiLabel) {
      labels[cluster.key] = cluster.aiLabel;
    }
  }
  return labels;
});

const groupStickyStyle = computed(() => ({
  "--group-sticky-top": `${stickyTopOffset.value}px`,
}));

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
    groupScrollPositions.clear();
    hasAppliedClusterDefault = true;
    lastDefaultAnalysisFrameKey = analysisFrameKey;
  },
  { immediate: true }
);

watch(currentClusterTab, () => {
  displayMode.value = "current";
});

watch(
  [clusterList, selectedClusterLabel, displayMode],
  () => {
    void nextTick(() => {
      resetResizeObserver();
      requestLayoutUpdate();
    });
  },
  { deep: true }
);

watch(
  () => props.conversationScrollContext.scrollContainerElement,
  () => {
    bindScrollListener();
    void nextTick(() => {
      resetResizeObserver();
      requestLayoutUpdate();
    });
  }
);

watch(
  () => props.conversationScrollContext.actionBarElement,
  () => {
    void nextTick(() => {
      resetResizeObserver();
      requestLayoutUpdate();
    });
  }
);

onMounted(async () => {
  await nextTick();
  resetResizeObserver();
  bindScrollListener();
  requestLayoutUpdate();
});

onActivated(() => {
  bindScrollListener();
  requestLayoutUpdate();
});

onUpdated(() => {
  resetResizeObserver();
  requestLayoutUpdate();
});

onDeactivated(() => {
  removeActiveScrollListener();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  removeActiveScrollListener();
  if (layoutRafId !== undefined) {
    cancelAnimationFrame(layoutRafId);
  }
});

function getClusterLabel(cluster: ClusterItem): string {
  return formatClusterLabel(cluster.key, false, cluster.aiLabel);
}

function handleClusterSelection(clusterKey: PolisKey): void {
  void selectCluster({ clusterKey, shouldRestoreScroll: false });
}

function selectClusterFromDrawer(clusterKey: PolisKey): void {
  showGroupDrawer.value = false;
  void selectCluster({ clusterKey, shouldRestoreScroll: true });
}

async function selectCluster({
  clusterKey,
  shouldRestoreScroll,
}: {
  clusterKey: PolisKey;
  shouldRestoreScroll: boolean;
}): Promise<void> {
  if (clusterKey === currentClusterTab.value) {
    return;
  }

  if (shouldRestoreScroll) {
    saveCurrentGroupScrollPosition();
  }

  currentClusterTab.value = clusterKey;

  await nextTick();

  if (shouldRestoreScroll) {
    restoreSelectedGroupScrollPosition();
  }

  requestLayoutUpdate();
}

function saveCurrentGroupScrollPosition(): void {
  if (!showGroupControls.value) {
    return;
  }

  groupScrollPositions.set(
    currentClusterTab.value,
    props.conversationScrollContext.getScrollPosition()
  );
}

function restoreSelectedGroupScrollPosition(): void {
  if (!showGroupControls.value) {
    return;
  }

  const floorScroll = getGroupContentFloorScroll();
  const savedScroll = groupScrollPositions.get(currentClusterTab.value);
  const targetScroll = Math.max(savedScroll ?? floorScroll, floorScroll);

  props.conversationScrollContext.scrollToPosition({
    top: targetScroll,
    behavior: "smooth",
  });
}

function getGroupContentFloorScroll(): number {
  const targetElement =
    groupContentFloorElement.value ??
    commentsRef.value?.getHeaderElement() ??
    null;

  if (targetElement === null) {
    return props.conversationScrollContext.getScrollPosition();
  }

  const elementTop = props.conversationScrollContext.getElementScrollPosition({
    element: targetElement,
  });
  const stickyStackHeight = getStickyTopOffset() + getStickyGroupBarHeight();

  return Math.max(0, elementTop - stickyStackHeight);
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

function getContainerTop(): number {
  return (
    props.conversationScrollContext.scrollContainerElement?.getBoundingClientRect()
      .top ?? 0
  );
}

function getStickyTopOffset(): number {
  const actionBarElement = props.conversationScrollContext.actionBarElement;
  if (actionBarElement === null) {
    return getHeaderHeight();
  }

  const containerTop = getContainerTop();
  const actionBarRect = actionBarElement.getBoundingClientRect();
  const actionBarTop = actionBarRect.top - containerTop;
  const stickyActionBarTop = Math.max(
    0,
    Math.min(actionBarTop, getHeaderHeight())
  );

  return stickyActionBarTop + actionBarRect.height;
}

function requestLayoutUpdate(): void {
  if (layoutRafId !== undefined) {
    return;
  }

  layoutRafId = requestAnimationFrame(() => {
    layoutRafId = undefined;
    updateStickyState();
  });
}

function updateStickyState(): void {
  const sentinel = groupStickySentinel.value;
  const stickyBar = groupStickyBarElement.value;
  const commentsHeader = commentsRef.value?.getHeaderElement() ?? null;
  const nextStickyTopOffset = getStickyTopOffset();

  stickyTopOffset.value = nextStickyTopOffset;

  if (!showGroupControls.value || sentinel === null || stickyBar === null) {
    isGroupBarSticky.value = false;
    isScopeMerged.value = false;
    return;
  }

  const stickyViewportTop = getContainerTop() + nextStickyTopOffset;
  isGroupBarSticky.value =
    sentinel.getBoundingClientRect().top <= stickyViewportTop + 1;

  if (!isGroupBarSticky.value || commentsHeader === null) {
    isScopeMerged.value = false;
    return;
  }

  isScopeMerged.value =
    commentsHeader.getBoundingClientRect().top <=
    stickyViewportTop + getStickyGroupBarHeight() + 1;
}

function resetResizeObserver(): void {
  resizeObserver?.disconnect();
  if (typeof ResizeObserver === "undefined") {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    requestLayoutUpdate();
  });

  observeElement({ element: groupStickyBarElement.value });
  observeElement({ element: props.conversationScrollContext.actionBarElement });
  observeElement({ element: commentsRef.value?.getHeaderElement() ?? null });
}

function observeElement({ element }: { element: HTMLElement | null }): void {
  if (element === null || resizeObserver === undefined) {
    return;
  }

  resizeObserver.observe(element);
}

function bindScrollListener(): void {
  removeActiveScrollListener();

  const scrollTarget =
    props.conversationScrollContext.scrollContainerElement ?? window;
  scrollTarget.addEventListener("scroll", requestLayoutUpdate, {
    passive: true,
  });
  removeScrollListener = () => {
    scrollTarget.removeEventListener("scroll", requestLayoutUpdate);
  };
}

function removeActiveScrollListener(): void {
  removeScrollListener?.();
  removeScrollListener = undefined;
}

function getStickyGroupBarHeight(): number {
  const element = groupStickyBarElement.value;
  if (element === null) {
    return 0;
  }

  return Math.max(element.offsetHeight, element.scrollHeight);
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

.group-sticky-bar {
  position: sticky;
  top: var(--group-sticky-top, 0px);
  z-index: 9;
  background-color: white;
  padding: 0.125rem 0;
  transition: top 0.12s ease;
}

.group-sticky-bar--stuck {
  box-shadow: 0 1px 0 #e9e9f1;
}

.group-sticky-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 0.35rem;
  min-width: 0;
  overflow: hidden;
}

.group-selector-trigger {
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
}

.group-sticky-row__scope {
  flex: 0 1 auto;
  margin-inline-start: auto;
  max-width: 54%;
  min-width: 0;
}

.group-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-drawer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 10px;
  background: white;
  color: #333238;
  padding: 0.9rem 1rem;
  text-align: start;
  font: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.group-drawer-option--selected {
  background: #e8f1ff;
  color: #6b4eff;
}
</style>
