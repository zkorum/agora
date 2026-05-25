<template>
  <div class="container flexStyle">
    <CheckpointTimeline
      v-if="analysisCheckpoints.length > 0"
      :checkpoints="analysisCheckpoints"
      :selected-checkpoint-id="selectedRouteCheckpoint"
      :is-live-selected="isLiveAnalysis"
      :is-live-paused="isLivePaused"
      :is-latest-checkpoint-live="isLatestCheckpointLive"
      :title="t('checkpointTimelineLabel')"
      :start-label="t('checkpointTimelineStart')"
      :now-label="t('checkpointTimelineNow')"
      :previous-label="t('previousCheckpoint')"
      :next-label="t('nextCheckpoint')"
      :format-reason="formatCheckpointReason"
      @select-checkpoint="setCheckpointRoute"
      @select-live="goLive"
    />

    <AsyncStateHandler :query="analysisQuery" :config="asyncStateConfig">
      <div class="analysis-content">
        <div
          v-if="analysisViewOptions.length > 0 || showAnalysisPlaybackButton"
          class="analysis-controls"
        >
          <ZKDropdownSelectorButton
            v-if="analysisViewOptions.length > 0"
            :label="selectedAnalysisViewLabel"
            :accessibility-label="t('analysisViewTitle')"
            button-type="standardButton"
            class="analysis-view-selector"
            icon-name="mdi-chevron-down"
            icon-size="1rem"
            label-overflow="truncate"
            @click="showAnalysisViewDrawer = true"
          />

          <button
            v-if="showAnalysisPlaybackButton"
            type="button"
            class="analysis-playback-button"
            :class="{
              'analysis-playback-button--play': isLivePaused || !isLiveAnalysis,
            }"
            :aria-label="analysisPlaybackLabel"
            :title="analysisPlaybackLabel"
            @click="toggleAnalysisPlayback()"
          >
            <q-icon :name="analysisPlaybackIcon" size="1.3rem" />
          </button>
        </div>

        <div class="analysis-header">
          <ShortcutBar
            :model-value="currentTab"
            :items="polisTabItems"
            :get-label="getPolisTabLabel"
            :get-route="getPolisTabRoute"
            :on-same-tab-click="handleSameTabClick"
            @update:model-value="onTabChange"
          />
          <div class="analysis-actions">
            <SpaLink
              v-if="showReportButton"
              :to="{
                name: '/conversation/[conversationSlugId]/report',
                params: { conversationSlugId: props.conversationSlugId },
                query: reportRouteQuery,
              }"
              class="report-button"
              :title="t('generateReport')"
              :aria-label="t('generateReport')"
            >
              <q-icon name="mdi-file-chart-outline" size="1rem" />
              <div>{{ t("report") }}</div>
            </SpaLink>
          </div>
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
            :has-voted-on-all-available-opinions="
              activeAnalysisData?.hasVotedOnAllAvailableOpinions
            "
            :navigate-to-discover-tab="props.navigateToDiscoverTab"
            @update:model-value="onTabChange"
          />
        </div>

        <!-- Opinion groups -->
        <div
          v-if="
            currentTab === 'Summary' ||
            currentTab === 'Groups' ||
            currentTab === 'Me'
          "
          class="tabComponent"
        >
          <OpinionGroupTab
            :conversation-slug-id="props.conversationSlugId"
            :conversation-author-username="props.conversationAuthorUsername"
            :conversation-organization-name="props.conversationOrganizationName"
            :clusters="polisClusters"
            :total-participant-count="analysisParticipantCount"
            :analysis-frame-key="analysisFrameKey"
            :compact-mode="currentTab === 'Summary'"
            :conversation-scroll-context="props.conversationScrollContext"
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
            :conversation-author-username="props.conversationAuthorUsername"
            :conversation-organization-name="props.conversationOrganizationName"
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
            :conversation-author-username="props.conversationAuthorUsername"
            :conversation-organization-name="props.conversationOrganizationName"
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
            :conversation-author-username="props.conversationAuthorUsername"
            :conversation-organization-name="props.conversationOrganizationName"
            :item-list="controversialItems"
            :compact-mode="currentTab === 'Summary'"
            :clusters="polisClusters"
            :cluster-labels="clusterLabels"
            @update:model-value="onTabChange"
          />
        </div>

        <!-- Survey -->
        <div
          v-if="
            props.hasSurvey &&
            (currentTab === 'Summary' || currentTab === 'Survey')
          "
          class="tabComponent"
        >
          <SurveyTab
            :model-value="currentTab"
            :conversation-slug-id="props.conversationSlugId"
            :survey-gate="props.surveyGate"
            :survey-query="props.surveyQuery"
            :clusters="polisClusters"
            :total-participant-count="analysisParticipantCount"
            :compact-mode="currentTab === 'Summary'"
            @update:model-value="onTabChange"
          />
        </div>
      </div>
    </AsyncStateHandler>

    <q-dialog v-model="showAnalysisViewDrawer" position="bottom">
      <ZKBottomDialogContainer
        :title="t('analysisViewTitle')"
        :subtitle="t('analysisViewSortingCaption')"
      >
        <div class="analysis-view-drawer-list">
          <button
            v-for="option in analysisViewOptions"
            :key="option.view"
            type="button"
            class="analysis-view-drawer-option"
            :class="{
              'analysis-view-drawer-option--selected':
                option.view === selectedAnalysisView,
              'analysis-view-drawer-option--recommended':
                option.status === 'recommended',
              'analysis-view-drawer-option--muted':
                option.status === 'discouraged' || option.status === 'locked',
            }"
            :disabled="!option.enabled"
            @click="handleAnalysisViewSelect(option)"
          >
            <span class="analysis-view-drawer-option__text">
              <span class="analysis-view-drawer-option__label">
                <q-icon
                  v-if="option.status === 'recommended'"
                  name="mdi-star"
                  size="0.9rem"
                />
                <span>{{ getAnalysisViewLabel(option.view) }}</span>
              </span>
              <span
                v-if="getAnalysisViewCaption(option) !== undefined"
                class="analysis-view-drawer-option__caption"
              >
                {{ getAnalysisViewCaption(option) }}
              </span>
            </span>
            <q-icon
              v-if="option.view === selectedAnalysisView"
              name="mdi-check"
              size="1.1rem"
            />
          </button>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import type { UseQueryReturnType } from "@tanstack/vue-query";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDropdownSelectorButton from "src/components/ui-library/ZKDropdownSelectorButton.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type {
  AnalysisCheckpoint,
  FetchAnalysisCheckpointsResponse,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import type {
  AnalysisView,
  PolisClusters,
  PolisKey,
  SurveyGateSummary,
} from "src/shared/types/zod";
import {
  getUpdatedAnalysisRouteQuery,
  parseAnalysisViewQuery,
  parseCheckpointQuery,
} from "src/utils/analysis/analysisRoute";
import type { AnalysisData } from "src/utils/api/comment/comment";
import {
  type ShortcutItem,
  shortcutItemSchema,
} from "src/utils/component/analysis/shortcutBar";
import { getDisplayPolisClusters } from "src/utils/component/opinion";
import { computed, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useRoute, useRouter } from "vue-router";

import {
  type AnalysisPageTranslations,
  analysisPageTranslations,
} from "./AnalysisPage.i18n";
import type { CheckpointTimelineReasonPayload } from "./CheckpointTimeline.types";
import CheckpointTimeline from "./CheckpointTimeline.vue";
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

const props = defineProps<{
  conversationSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  analysisQuery: UseQueryReturnType<AnalysisData, Error>;
  analysisCheckpointsQuery: UseQueryReturnType<
    FetchAnalysisCheckpointsResponse,
    Error
  >;
  surveyQuery: UseQueryReturnType<SurveyResultsAggregatedResponse, Error>;
  hasSurvey: boolean;
  surveyGate: SurveyGateSummary | undefined;
  aiLabelingEnabled: boolean;
  showReportButton: boolean;
  isLiveAnalysisPaused: boolean;
  navigateToDiscoverTab: () => void;
  conversationScrollContext: ConversationScrollContext;
}>();

const emit = defineEmits<{
  "update:liveAnalysisPaused": [paused: boolean];
}>();

type AnalysisViewOption = NonNullable<
  AnalysisData["analysisViewState"]
>["options"][number];

const { t } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);
const { t: tShortcut } = useComponentI18n<ShortcutBarTranslations>(
  shortcutBarTranslations
);

const route = useRoute();
const router = useRouter();
const showAnalysisViewDrawer = ref(false);
const pausedLiveAnalysisData = ref<AnalysisData | undefined>();
const pausedLiveCheckpoints = ref<AnalysisCheckpoint[] | undefined>();

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
  const query = { ...route.query };
  if (item === "Summary") {
    delete query.tab;
    return { path: route.path, query };
  }

  query.tab = item;
  return { path: route.path, query };
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

const isLivePaused = computed(
  () => props.isLiveAnalysisPaused && pausedLiveAnalysisData.value !== undefined
);

const activeAnalysisData = computed<AnalysisData | undefined>(() => {
  if (isLivePaused.value) {
    return pausedLiveAnalysisData.value;
  }

  return analysisQuery.data.value;
});

const analysisParticipantCount = computed(
  () =>
    activeAnalysisData.value?.conversationViewSnapshot?.participantCount ?? 0
);

const selectedRouteAnalysisView = computed(() =>
  parseAnalysisViewQuery({ query: route.query })
);

const selectedRouteCheckpoint = computed(() =>
  parseCheckpointQuery({ query: route.query })
);

const loadedAnalysisCheckpoints = computed<AnalysisCheckpoint[]>(
  () =>
    pausedLiveCheckpoints.value ?? props.analysisCheckpointsQuery.data.value ?? []
);

const analysisCheckpoints = computed<AnalysisCheckpoint[]>(() => {
  if (!isLiveAnalysis.value) {
    return loadedAnalysisCheckpoints.value;
  }

  const liveViewSnapshotId =
    activeAnalysisData.value?.conversationViewSnapshotId;
  if (liveViewSnapshotId === undefined) {
    return loadedAnalysisCheckpoints.value;
  }

  return loadedAnalysisCheckpoints.value.filter(
    (checkpoint) => checkpoint.conversationViewSnapshotId <= liveViewSnapshotId
  );
});

const latestCheckpoint = computed(() => {
  if (analysisCheckpoints.value.length === 0) {
    return undefined;
  }

  return analysisCheckpoints.value[analysisCheckpoints.value.length - 1];
});

const isLiveAnalysis = computed(
  () => selectedRouteCheckpoint.value === undefined
);

const isLatestCheckpointLive = computed(() => {
  const checkpoint = latestCheckpoint.value;
  const liveViewSnapshotId =
    activeAnalysisData.value?.conversationViewSnapshotId;
  if (checkpoint === undefined || liveViewSnapshotId === undefined) {
    return false;
  }

  return (
    isLiveAnalysis.value &&
    checkpoint.conversationViewSnapshotId === liveViewSnapshotId
  );
});

const showAnalysisPlaybackButton = computed(
  () => latestCheckpoint.value !== undefined
);

const analysisPlaybackIcon = computed(() =>
  isLiveAnalysis.value && !isLivePaused.value
    ? "mdi-pause-circle-outline"
    : "mdi-play-circle-outline"
);

const analysisPlaybackLabel = computed(() =>
  isLiveAnalysis.value && !isLivePaused.value
    ? t("pauseAtLatestCheckpoint")
    : t("returnToLiveAnalysis")
);

const analysisViewState = computed(
  () => activeAnalysisData.value?.analysisViewState
);

const analysisFrameKey = computed(() => {
  const data = activeAnalysisData.value;
  if (data === undefined) {
    return undefined;
  }

  return [
    data.conversationViewSnapshotId ?? "live",
    data.analysisSnapshotId ?? "none",
    data.analysisViewState?.resolvedCandidateId ?? "none",
  ].join(":");
});

const analysisViewOptions = computed(
  () => analysisViewState.value?.options ?? []
);

const selectedAnalysisView = computed(
  () =>
    selectedRouteAnalysisView.value ??
    analysisViewState.value?.requestedView ??
    "facilitator_preference"
);

const selectedAnalysisViewLabel = computed(() =>
  getAnalysisViewLabel(selectedAnalysisView.value)
);

function formatCheckpointReason(
  reason: CheckpointTimelineReasonPayload
): string | undefined {
  switch (reason.reason) {
    case "first_displayable_analysis":
      return t("checkpointReasonFirstDisplayableAnalysis");
    case "first_group_count_available":
      return undefined;
    case "default_group_count_changed":
      return reason.groupCount === null
        ? undefined
        : t("groupsLabel", { count: reason.groupCount });
    case "major_participation_milestone":
      return reason.participantCount === null
        ? undefined
        : t("checkpointReasonParticipantCount", {
            count: String(reason.participantCount),
          });
    case "major_vote_milestone":
      return reason.voteCount === null
        ? undefined
        : t("checkpointReasonVoteCount", { count: String(reason.voteCount) });
    case "conversation_closed":
      return t("checkpointReasonConversationClosed");
  }
}

watch(
  () => analysisViewState.value,
  async (state) => {
    if (state?.resolvedBy !== "locked_fallback") {
      return;
    }

    if (selectedRouteAnalysisView.value === state.canonicalView) {
      return;
    }

    await router.replace({
      path: route.path,
      query: getUpdatedAnalysisRouteQuery({
        query: route.query,
        analysisView: state.canonicalView,
        checkpointViewSnapshotId: selectedRouteCheckpoint.value,
      }),
    });
  },
  { immediate: true }
);

const reportRouteQuery = computed(() =>
  getUpdatedAnalysisRouteQuery({
    query: {},
    analysisView: selectedAnalysisView.value,
    checkpointViewSnapshotId: selectedRouteCheckpoint.value,
  })
);

watch(
  () => props.isLiveAnalysisPaused,
  (isPaused) => {
    if (isPaused) {
      return;
    }

    pausedLiveAnalysisData.value = undefined;
    pausedLiveCheckpoints.value = undefined;
  }
);

watch(
  () => ({
    analysisView: selectedAnalysisView.value,
    checkpoint: selectedRouteCheckpoint.value,
    conversationSlugId: props.conversationSlugId,
  }),
  () => {
    clearLivePause();
  }
);

function getAnalysisViewLabel(view: AnalysisView): string {
  switch (view) {
    case "facilitator_preference":
      return t("facilitatorPreference");
    case "system_default":
      return t("recommendedDefault");
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
      return t("groupsLabel", { count: view });
  }
}

function getAnalysisViewGroupCount(view: AnalysisView): string | undefined {
  switch (view) {
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
      return view;
    case "facilitator_preference":
    case "system_default":
      return undefined;
  }
}

function getAnalysisViewReasonCaption(
  option: AnalysisViewOption
): string | undefined {
  if (!("reason" in option)) {
    return undefined;
  }

  switch (option.reason) {
    case "analysis_variants_not_available":
      return t("analysisVariantsNotAvailable");
    case "fixed_group_count_unavailable":
      return t("fixedGroupCountUnavailable", { count: option.groupCount });
    case "recommended_default_unavailable":
      return t("recommendedDefaultUnavailable");
  }
}

function getFacilitatorPreferenceCaption(
  option: AnalysisViewOption
): string | undefined {
  const resolvesToView = option.resolvesToView;
  if (resolvesToView === undefined) {
    return undefined;
  }

  if (resolvesToView === "system_default") {
    return t("sameAsRecommendedDefault");
  }

  const groupCount = getAnalysisViewGroupCount(resolvesToView);
  return groupCount === undefined
    ? undefined
    : t("usesGroups", { count: groupCount });
}

function getAnalysisViewCaption(
  option: AnalysisViewOption
): string | undefined {
  const reasonCaption = getAnalysisViewReasonCaption(option);
  if (reasonCaption !== undefined) {
    return reasonCaption;
  }

  if (option.view === "facilitator_preference") {
    return getFacilitatorPreferenceCaption(option);
  }

  if (option.view === "system_default") {
    return t("systemDefaultCaption");
  }

  if (option.status === "recommended") {
    return t("recommendedOptionCaption");
  }

  return undefined;
}

async function handleAnalysisViewSelect(
  option: AnalysisViewOption
): Promise<void> {
  if (!option.enabled) {
    return;
  }

  showAnalysisViewDrawer.value = false;
  await router.replace({
    path: route.path,
    query: getUpdatedAnalysisRouteQuery({
      query: route.query,
      analysisView: option.view,
      checkpointViewSnapshotId: selectedRouteCheckpoint.value,
    }),
  });
}

async function setCheckpointRoute(
  checkpointViewSnapshotId: number | undefined
): Promise<void> {
  clearLivePause();
  await router.replace({
    path: route.path,
    query: getUpdatedAnalysisRouteQuery({
      query: route.query,
      analysisView: selectedAnalysisView.value,
      checkpointViewSnapshotId,
    }),
  });
}

async function goLive(): Promise<void> {
  await setCheckpointRoute(undefined);
}

async function toggleAnalysisPlayback(): Promise<void> {
  if (isLivePaused.value) {
    clearLivePause();
    return;
  }

  if (!isLiveAnalysis.value) {
    await goLive();
    return;
  }

  pauseLiveAtCurrentFrame();
}

function pauseLiveAtCurrentFrame(): void {
  const data = analysisQuery.data.value;
  if (data === undefined) {
    return;
  }

  pausedLiveAnalysisData.value = data;
  pausedLiveCheckpoints.value = analysisCheckpoints.value;
  emit("update:liveAnalysisPaused", true);
}

function clearLivePause(): void {
  pausedLiveAnalysisData.value = undefined;
  pausedLiveCheckpoints.value = undefined;

  if (props.isLiveAnalysisPaused) {
    emit("update:liveAnalysisPaused", false);
  }
}

const polisClusters = computed<Partial<PolisClusters>>(
  () =>
    getDisplayPolisClusters({
      clusters: activeAnalysisData.value?.polisClusters ?? {},
      aiLabelingEnabled: props.aiLabelingEnabled,
    })
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
  () => activeAnalysisData.value?.consensusAgree ?? []
);

const disagreementItems = computed(
  () => activeAnalysisData.value?.consensusDisagree ?? []
);

// Only show opinions where the math pipeline has run (divisiveScore > 0).
// Pre-math opinions default to divisiveScore=0 and have no meaningful divisiveness signal.
const controversialItems = computed(() =>
  (activeAnalysisData.value?.controversial ?? []).filter(
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

async function refreshCheckpoints(): Promise<void> {
  if (isLivePaused.value) {
    return;
  }

  await props.analysisCheckpointsQuery.refetch();
}

defineExpose({
  isLoading: computed(
    () =>
      analysisQuery.isPending.value ||
      analysisQuery.isRefetching.value ||
      props.analysisCheckpointsQuery.isPending.value ||
      props.analysisCheckpointsQuery.isRefetching.value
  ),
  refreshCheckpoints,
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
  gap: 0.85rem;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
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

.analysis-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.analysis-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.analysis-view-selector {
  min-width: 8rem;
  max-width: 14rem;
}

.analysis-playback-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: 1px solid #d8d6de;
  border-radius: 8px;
  background: white;
  color: #6d6a74;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: #f5f5f7;
  }
}

.analysis-playback-button--play {
  border-color: #24966d;
  color: #137a55;

  &:hover,
  &:focus-visible {
    background: #edf8f4;
  }
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

.analysis-view-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.analysis-view-drawer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  border: 1px solid #e9e9f1;
  border-radius: 14px;
  background: white;
  color: #333238;
  padding: 0.75rem;
  text-align: start;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.analysis-view-drawer-option--selected {
  border-color: #6b4eff;
  color: #6b4eff;
}

.analysis-view-drawer-option--recommended {
  border-color: #c6c4ff;
}

.analysis-view-drawer-option--muted {
  background: #fafafa;
  color: #7b7884;
}

.analysis-view-drawer-option__text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.analysis-view-drawer-option__label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.analysis-view-drawer-option__caption {
  color: #6d6a74;
  font-size: 0.8rem;
  line-height: 1.3;
}
</style>
