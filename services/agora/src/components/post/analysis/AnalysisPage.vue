<template>
  <div class="container flexStyle">
    <div v-if="isInitialAnalysisLoading" class="analysis-initial-loading">
      <PageLoadingSpinner />
      <div class="analysis-initial-loading__text">
        {{ t("loadingAnalysis") }}
      </div>
    </div>
    <template v-else>
      <div
        v-if="isCheckpointTimelineLoading"
        class="checkpoint-timeline-loading"
      >
        <PageLoadingSpinner />
      </div>
      <CheckpointTimeline
        v-else
        :checkpoints="analysisCheckpoints"
        :selected-checkpoint-id="selectedRouteCheckpoint"
        :is-live-selected="isLiveAnalysis"
        :is-live-paused="isLivePaused"
        :is-latest-checkpoint-live="isLatestCheckpointLive"
        :is-live-closed="props.isConversationClosed"
        :title="t('checkpointTimelineLabel')"
        :start-label="t('checkpointTimelineStart')"
        :now-label="timelineLiveLabel"
        :previous-label="t('previousCheckpoint')"
        :next-label="t('nextCheckpoint')"
        :format-reason="formatCheckpointReason"
        :format-reasons="formatCheckpointReasons"
        :max-reason-count="6"
        @select-checkpoint="setCheckpointRoute"
        @select-live="goLive"
      />

      <div class="analysis-content">
        <div
          v-if="showAnalysisControls"
          class="analysis-controls"
          :class="{
            'analysis-controls--playback-only':
              analysisViewOptions.length === 0,
          }"
        >
          <div
            v-if="analysisViewOptions.length > 0"
            class="analysis-view-selector-group"
          >
            <ZKDropdownSelectorButton
              :label="selectedAnalysisViewLabel"
              :accessibility-label="t('analysisViewTitle')"
              button-type="standardButton"
              class="analysis-view-selector"
              content-alignment="start"
              icon-name="mdi-chevron-down"
              icon-size="1rem"
              label-overflow="truncate"
              @click="showAnalysisViewDrawer = true"
            />
          </div>

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

        <div
          v-if="isAnalysisForegroundLoading"
          class="analysis-transition-loading"
        >
          <PageLoadingSpinner />
          <div class="analysis-transition-loading__text">
            {{ t("loadingAnalysis") }}
          </div>
        </div>

        <AsyncStateHandler
          v-else
          :query="analysisQuery"
          :config="asyncStateConfig"
        >
          <div class="analysis-loaded-content">
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
                  :to="effectiveReportRoute"
                  class="report-button"
                  :title="t('generateReport')"
                  :aria-label="t('generateReport')"
                >
                  <q-icon name="mdi-file-chart-outline" size="1rem" />
                  <span class="report-button__label">{{ t("report") }}</span>
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
                :conversation-organization-name="
                  props.conversationOrganizationName
                "
                :clusters="polisClusters"
                :total-participant-count="analysisParticipantCount"
                :analysis-frame-key="analysisFrameKey"
                :ai-labeling-enabled="props.aiLabelingEnabled"
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
                :conversation-organization-name="
                  props.conversationOrganizationName
                "
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
                :conversation-organization-name="
                  props.conversationOrganizationName
                "
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
                :conversation-organization-name="
                  props.conversationOrganizationName
                "
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
                :survey-results-override="pausedLiveSurveyResults"
                :clusters="polisClusters"
                :total-participant-count="analysisParticipantCount"
                :compact-mode="currentTab === 'Summary'"
                :conversation-scroll-context="props.conversationScrollContext"
                @update:model-value="onTabChange"
              />
            </div>
          </div>
        </AsyncStateHandler>
      </div>
    </template>

    <q-dialog v-model="showAnalysisViewDrawer" position="bottom">
      <ZKBottomDialogContainer
        :title="t('analysisViewTitle')"
        :subtitle="t('analysisViewSortingCaption')"
      >
        <template #subtitleAction>
          <button
            type="button"
            class="analysis-view-drawer-learn-more"
            @click="openAnalysisViewLearnMore"
          >
            {{ t("learnMore") }}
          </button>
        </template>

        <div class="analysis-view-drawer-list">
          <div class="analysis-view-drawer-section">
            <div class="analysis-view-drawer-section-title">
              {{ t("analysisViewModesSection") }}
            </div>
            <button
              v-for="option in modeAnalysisViewOptions"
              :key="option.view"
              type="button"
              class="analysis-view-drawer-option"
              :class="getAnalysisViewOptionClasses(option)"
              :disabled="!isAnalysisViewOptionSelectable(option)"
              @click="handleAnalysisViewSelect(option)"
            >
              <span class="analysis-view-drawer-option__text">
                <span class="analysis-view-drawer-option__label">
                  <span>{{ getAnalysisViewLabel(option.view) }}</span>
                </span>
                <span class="analysis-view-drawer-option__caption">
                  {{ getAnalysisViewCaption(option) }}
                </span>
                <span class="analysis-view-drawer-option__meta-row">
                  <ZKChip
                    v-for="chip in getAnalysisViewOptionChips(option)"
                    :key="chip"
                    :color="getAnalysisViewChipColor(option)"
                  >
                    {{ chip }}
                  </ZKChip>
                </span>
              </span>
              <q-icon
                v-if="option.view === selectedAnalysisView"
                name="mdi-check"
                size="1.1rem"
              />
            </button>
          </div>

          <div class="analysis-view-drawer-section">
            <div class="analysis-view-drawer-section-title">
              {{ t("analysisViewGroupCountsSection") }}
            </div>
            <button
              v-for="option in fixedAnalysisViewOptions"
              :key="option.view"
              type="button"
              class="analysis-view-drawer-option"
              :class="getAnalysisViewOptionClasses(option)"
              :disabled="!isAnalysisViewOptionSelectable(option)"
              @click="handleAnalysisViewSelect(option)"
            >
              <span class="analysis-view-drawer-option__text">
                <span class="analysis-view-drawer-option__label">
                  <span>{{ getAnalysisViewLabel(option.view) }}</span>
                </span>
                <span
                  v-if="getAnalysisViewCaption(option) !== undefined"
                  class="analysis-view-drawer-option__caption"
                >
                  {{ getAnalysisViewCaption(option) }}
                </span>
                <span class="analysis-view-drawer-option__meta-row">
                  <ZKChip
                    v-for="chip in getAnalysisViewOptionChips(option)"
                    :key="chip"
                    :color="getAnalysisViewChipColor(option)"
                  >
                    {{ chip }}
                  </ZKChip>
                </span>
              </span>
              <q-icon
                v-if="option.view === selectedAnalysisView"
                name="mdi-check"
                size="1.1rem"
              />
            </button>
          </div>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <q-dialog v-model="showAnalysisViewLearnMoreDrawer" position="bottom">
      <ZKBottomDialogContainer :title="t('analysisViewLearnMoreTitle')">
        <template #leadingAction>
          <ZKBottomDialogBackButton @click="goBackToAnalysisViewOptions" />
        </template>

        <div class="analysis-view-learn-more-content">
          <div
            v-for="item in analysisViewLearnMoreItems"
            :key="item.title"
            class="analysis-view-learn-more-item"
          >
            <div class="analysis-view-learn-more-title">{{ item.title }}</div>
            <div class="analysis-view-learn-more-body">{{ item.body }}</div>
          </div>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import type { UseQueryReturnType } from "@tanstack/vue-query";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKBottomDialogBackButton from "src/components/ui-library/ZKBottomDialogBackButton.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKChip from "src/components/ui-library/ZKChip.vue";
import ZKDropdownSelectorButton from "src/components/ui-library/ZKDropdownSelectorButton.vue";
import type { ConversationActionBarStats } from "src/composables/conversation/useConversationActionBarStats";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type {
  AnalysisCheckpoint,
  AnalysisViewState,
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
import { getLiveAnalysisClosedTransitionAction } from "src/utils/analysis/liveAnalysisClosedTransition";
import type { AnalysisData } from "src/utils/api/comment/comment";
import {
  getAnalysisViewGroupCount,
  getDisplayedAnalysisView,
  getFacilitatorPreferenceCaption as getFacilitatorPreferenceCaptionState,
  isAnalysisViewOptionMuted,
  isAnalysisViewOptionSelectable as getIsAnalysisViewOptionSelectable,
  shouldShowAnalysisViewOptionStats,
} from "src/utils/component/analysis/analysisViewPicker";
import {
  type ShortcutItem,
  shortcutItemSchema,
} from "src/utils/component/analysis/shortcutBar";
import { getDisplayPolisClusters } from "src/utils/component/opinion";
import {
  type ConversationRouteContext,
  getConversationReportPath,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { computed, nextTick, ref, watch } from "vue";
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

const props = withDefaults(
  defineProps<{
    conversationSlugId: string;
    conversationAuthorUsername: string;
    conversationOrganizationName: string;
    analysisQuery: UseQueryReturnType<AnalysisData, Error>;
    analysisCheckpointsQuery: UseQueryReturnType<
      FetchAnalysisCheckpointsResponse,
      Error
    >;
    liveConversationViewSnapshotId: number | undefined;
    surveyQuery: UseQueryReturnType<SurveyResultsAggregatedResponse, Error>;
    hasSurvey: boolean;
    surveyGate: SurveyGateSummary | undefined;
    aiLabelingEnabled: boolean;
    showReportButton: boolean;
    reportRouteOverride?: RouteLocationRaw;
    isLiveAnalysisPaused: boolean;
    isConversationClosed: boolean;
    navigateToDiscoverTab: () => void;
    conversationScrollContext: ConversationScrollContext;
    conversationRouteContext?: ConversationRouteContext;
  }>(),
  {
    reportRouteOverride: undefined,
    conversationRouteContext: () => normalConversationRouteContext,
  }
);

const emit = defineEmits<{
  "update:liveAnalysisPaused": [paused: boolean];
  livePauseStats: [stats: ConversationActionBarStats | undefined];
}>();

type AnalysisViewOption = NonNullable<
  AnalysisData["analysisViewState"]
>["options"][number];

const { t, locale: displayLocale } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);
const { t: tShortcut } = useComponentI18n<ShortcutBarTranslations>(
  shortcutBarTranslations
);

const route = useRoute();
const router = useRouter();
const showAnalysisViewDrawer = ref(false);
const showAnalysisViewLearnMoreDrawer = ref(false);
const pausedLiveAnalysisData = ref<AnalysisData | undefined>();
const pausedLiveCheckpoints = ref<AnalysisCheckpoint[] | undefined>();
const pausedLiveSurveyResults = ref<
  SurveyResultsAggregatedResponse | undefined
>();
const lastLoadedAnalysisViewState = ref<AnalysisViewState | undefined>();

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

const polisTabTranslationKeys = {
  Summary: "summary",
  Me: "me",
  Groups: "groups",
  Agreements: "agreements",
  Disagreements: "disagreements",
  Divisive: "divisive",
  Survey: "survey",
} satisfies Record<ShortcutItem, keyof ShortcutBarTranslations>;

function getPolisTabLabel(item: string): string {
  const parsed = shortcutItemSchema.safeParse(item);
  if (!parsed.success) {
    return item;
  }

  return tShortcut(polisTabTranslationKeys[parsed.data]);
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

const isLivePaused = computed(() => props.isLiveAnalysisPaused);

const showAnalysisPlaybackButton = computed(() => !props.isConversationClosed);

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

const hasInvalidRouteAnalysisView = computed(
  () =>
    route.query.analysisView !== undefined &&
    selectedRouteAnalysisView.value === undefined
);

const selectedRouteCheckpoint = computed(() =>
  parseCheckpointQuery({ query: route.query })
);

const loadedAnalysisCheckpoints = computed<AnalysisCheckpoint[]>(
  () =>
    pausedLiveCheckpoints.value ??
    props.analysisCheckpointsQuery.data.value ??
    []
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
  const liveViewSnapshotId = props.liveConversationViewSnapshotId;
  if (checkpoint === undefined) {
    return false;
  }

  if (props.isConversationClosed && checkpoint.isClosed) {
    return true;
  }

  if (liveViewSnapshotId === undefined) {
    return false;
  }

  return checkpoint.conversationViewSnapshotId === liveViewSnapshotId;
});

const timelineLiveLabel = computed(() =>
  props.isConversationClosed
    ? t("checkpointReasonConversationClosed")
    : t("checkpointTimelineNow")
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

watch(
  analysisViewState,
  (state) => {
    if (state !== undefined) {
      lastLoadedAnalysisViewState.value = state;
    }
  },
  { immediate: true }
);

const analysisViewStateForControls = computed(
  () => analysisViewState.value ?? lastLoadedAnalysisViewState.value
);

const isAnalysisForegroundLoading = computed(
  () =>
    !analysisQuery.isError.value &&
    (analysisQuery.isPending.value || analysisQuery.isRefetching.value) &&
    analysisQuery.data.value === undefined
);

const isCheckpointTimelineLoading = computed(
  () =>
    !props.analysisCheckpointsQuery.isError.value &&
    (props.analysisCheckpointsQuery.isPending.value ||
      props.analysisCheckpointsQuery.isRefetching.value) &&
    props.analysisCheckpointsQuery.data.value === undefined &&
    pausedLiveCheckpoints.value === undefined
);

const hasLoadedCheckpoints = computed(
  () =>
    props.analysisCheckpointsQuery.data.value !== undefined ||
    pausedLiveCheckpoints.value !== undefined
);

const isInitialAnalysisLoading = computed(
  () =>
    (lastLoadedAnalysisViewState.value === undefined &&
      isAnalysisForegroundLoading.value) ||
    (!hasLoadedCheckpoints.value && isCheckpointTimelineLoading.value)
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

const noAnalysisViewOptions = computed<AnalysisViewOption[]>(() => {
  const variantsEnabled =
    analysisViewStateForControls.value?.variantsEnabled === true;
  const options: AnalysisViewOption[] = [];

  if (variantsEnabled) {
    options.push({
      view: "facilitator_preference",
      status: "unavailable",
      reason: "recommended_default_unavailable",
      resolvesToView: "auto",
    });
  } else {
    options.push({
      view: "facilitator_preference",
      status: "locked",
      reason: "analysis_variants_not_available",
      resolvesToView: "auto",
    });
  }

  options.push({
    view: "auto",
    status: "unavailable",
    reason: "recommended_default_unavailable",
  });

  for (const view of ["2", "3", "4", "5", "6"] as const) {
    options.push(
      variantsEnabled
        ? {
            view,
            status: "unavailable",
            reason: "fixed_group_count_unavailable",
            groupCount: Number(view),
          }
        : {
            view,
            status: "locked",
            reason: "analysis_variants_not_available",
          }
    );
  }

  return options;
});

const analysisViewOptions = computed(() => {
  const options = analysisViewStateForControls.value?.options ?? [];
  if (options.length > 0) {
    return options;
  }

  return analysisViewStateForControls.value?.resolvedBy === "no_analysis"
    ? noAnalysisViewOptions.value
    : options;
});

const showAnalysisControls = computed(
  () => analysisViewOptions.value.length > 0 || showAnalysisPlaybackButton.value
);

const modeAnalysisViewOptions = computed(() =>
  analysisViewOptions.value.filter(
    (option) =>
      option.view === "facilitator_preference" || option.view === "auto"
  )
);

const fixedAnalysisViewOptions = computed(() =>
  analysisViewOptions.value.filter(
    (option) =>
      option.view === "2" ||
      option.view === "3" ||
      option.view === "4" ||
      option.view === "5" ||
      option.view === "6"
  )
);

const analysisViewLearnMoreItems = computed(() => [
  {
    title: t("recommendedDefault"),
    body: t("systemDefaultCaption"),
  },
  {
    title: t("facilitatorPreference"),
    body: t("facilitatorPreferenceCaption"),
  },
  {
    title: t("recommendedOption"),
    body: t("recommendedOptionDescription"),
  },
  {
    title: t("fixedGroupCountOption"),
    body: t("fixedGroupCountOptionDescription"),
  },
  {
    title: t("discouragedOption"),
    body: t("discouragedOptionDescription"),
  },
  {
    title: t("unavailableOption"),
    body: t("unavailableOptionDescription"),
  },
  {
    title: t("overallScoreTitle"),
    body: t("overallScoreDescription"),
  },
  {
    title: t("clarityScoreTitle"),
    body: t("clarityScoreDescription"),
  },
  {
    title: t("balanceScoreTitle"),
    body: t("balanceScoreDescription"),
  },
]);

const selectedAnalysisView = computed(() =>
  getDisplayedAnalysisView({
    routeView: selectedRouteAnalysisView.value,
    viewState: analysisViewStateForControls.value,
  })
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
      return reason.groupCount === null
        ? undefined
        : t("checkpointReasonFirstGroupCountAvailable", {
            count: String(reason.groupCount),
          });
    case "default_group_count_changed":
      return reason.groupCount === null
        ? undefined
        : t("checkpointReasonDefaultGroupCountChanged", {
            count: String(reason.groupCount),
          });
    case "major_participation_milestone":
      return reason.participantMilestone === null
        ? undefined
        : t("checkpointReasonParticipationMilestone", {
            count: formatCheckpointNumber(reason.participantMilestone),
          });
    case "major_vote_milestone":
      return reason.voteMilestone === null
        ? undefined
        : t("checkpointReasonVoteMilestone", {
            count: formatCheckpointNumber(reason.voteMilestone),
          });
    case "conversation_closed":
      return t("checkpointReasonConversationClosed");
  }
}

function formatCheckpointReasons(
  reasons: AnalysisCheckpoint["reasons"]
): string[] {
  if (
    reasons.some((reason) => reason.reason === "first_displayable_analysis")
  ) {
    return [t("checkpointReasonFirstDisplayableAnalysis")];
  }

  const autoGroupCounts = groupCountsForReasons({
    reasons,
    reasonType: "default_group_count_changed",
  });
  const availableGroupCounts = groupCountsForReasons({
    reasons,
    reasonType: "first_group_count_available",
  }).filter((groupCount) => !autoGroupCounts.includes(groupCount));
  const participantMilestones = milestoneCountsForReasons({
    reasons,
    reasonType: "major_participation_milestone",
    field: "participantMilestone",
  });
  const voteMilestones = milestoneCountsForReasons({
    reasons,
    reasonType: "major_vote_milestone",
    field: "voteMilestone",
  });

  const labels: string[] = [];
  labels.push(
    ...autoGroupCounts.map((groupCount) =>
      t("checkpointReasonDefaultGroupCountChanged", {
        count: String(groupCount),
      })
    )
  );
  if (availableGroupCounts.length > 0) {
    labels.push(
      t("checkpointReasonFirstGroupCountAvailable", {
        count: formatGroupCountSummary(availableGroupCounts),
      })
    );
  }
  labels.push(
    ...participantMilestones.map((milestone) =>
      t("checkpointReasonParticipationMilestone", {
        count: formatCheckpointNumber(milestone),
      })
    )
  );
  labels.push(
    ...voteMilestones.map((milestone) =>
      t("checkpointReasonVoteMilestone", {
        count: formatCheckpointNumber(milestone),
      })
    )
  );
  if (reasons.some((reason) => reason.reason === "conversation_closed")) {
    labels.push(t("checkpointReasonConversationClosed"));
  }

  return labels;
}

function groupCountsForReasons({
  reasons,
  reasonType,
}: {
  reasons: AnalysisCheckpoint["reasons"];
  reasonType: "default_group_count_changed" | "first_group_count_available";
}): number[] {
  return sortedUniqueNumbers(
    reasons
      .filter((reason) => reason.reason === reasonType)
      .map((reason) => reason.groupCount)
      .filter((groupCount) => groupCount !== null)
  );
}

function milestoneCountsForReasons({
  reasons,
  reasonType,
  field,
}: {
  reasons: AnalysisCheckpoint["reasons"];
  reasonType: "major_participation_milestone" | "major_vote_milestone";
  field: "participantMilestone" | "voteMilestone";
}): number[] {
  return sortedUniqueNumbers(
    reasons
      .filter((reason) => reason.reason === reasonType)
      .map((reason) => reason[field])
      .filter((milestone) => milestone !== null)
  );
}

function sortedUniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function formatGroupCountSummary(groupCounts: number[]): string {
  const firstGroupCount = groupCounts[0];
  const lastGroupCount = groupCounts[groupCounts.length - 1];
  if (firstGroupCount === undefined || lastGroupCount === undefined) {
    return "";
  }
  const isConsecutiveRange = groupCounts.every(
    (groupCount, index) => groupCount === firstGroupCount + index
  );
  if (groupCounts.length > 1 && isConsecutiveRange) {
    const separator = displayLocale.value === "fr" ? " à " : "-";
    return `${String(firstGroupCount)}${separator}${String(lastGroupCount)}`;
  }

  return groupCounts.map((groupCount) => String(groupCount)).join(", ");
}

function formatCheckpointNumber(value: number): string {
  return new Intl.NumberFormat(displayLocale.value).format(value);
}

watch(
  hasInvalidRouteAnalysisView,
  async (hasInvalidAnalysisView) => {
    if (!hasInvalidAnalysisView) {
      return;
    }

    await replaceAnalysisRoutePreservingScroll({
      analysisView: undefined,
      checkpointViewSnapshotId: selectedRouteCheckpoint.value,
    });
  },
  { immediate: true }
);

watch(
  () => analysisViewState.value,
  async (state) => {
    if (state === undefined) {
      return;
    }

    const shouldUseCanonicalView =
      state.resolvedBy === "locked_fallback" ||
      (!state.variantsEnabled && state.requestedView !== state.canonicalView);

    if (!shouldUseCanonicalView) {
      return;
    }

    if (selectedRouteAnalysisView.value === state.canonicalView) {
      return;
    }

    await replaceAnalysisRoutePreservingScroll({
      analysisView: state.canonicalView,
      checkpointViewSnapshotId: selectedRouteCheckpoint.value,
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
const reportRoute = computed<RouteLocationRaw>(() => ({
  path: getConversationReportPath({
    conversationSlugId: props.conversationSlugId,
    routeContext: props.conversationRouteContext,
  }),
  query: reportRouteQuery.value,
}));
const effectiveReportRoute = computed(
  () => props.reportRouteOverride ?? reportRoute.value
);

watch(
  () => ({
    checkpoint: selectedRouteCheckpoint.value,
    checkpoints: loadedAnalysisCheckpoints.value,
    hasLoadedCheckpoints:
      pausedLiveCheckpoints.value !== undefined ||
      props.analysisCheckpointsQuery.data.value !== undefined,
  }),
  async ({ checkpoint, checkpoints, hasLoadedCheckpoints }) => {
    if (checkpoint === undefined || !hasLoadedCheckpoints) {
      return;
    }

    if (
      checkpoints.some((item) => item.conversationViewSnapshotId === checkpoint)
    ) {
      return;
    }

    await setCheckpointRoute(undefined);
  },
  { immediate: true }
);

watch(
  () => props.isLiveAnalysisPaused,
  (isPaused) => {
    if (isPaused) {
      return;
    }

    pausedLiveAnalysisData.value = undefined;
    pausedLiveCheckpoints.value = undefined;
    pausedLiveSurveyResults.value = undefined;
    emit("livePauseStats", undefined);
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

watch(
  () => props.isConversationClosed,
  async (isClosed, wasClosed) => {
    const action = getLiveAnalysisClosedTransitionAction({
      isClosed,
      wasClosed,
      isLiveAnalysis: isLiveAnalysis.value,
    });

    switch (action) {
      case "refresh-latest-analysis":
        await refreshLatestAnalysis();
        return;

      case "refresh-checkpoints":
        await refreshCheckpoints({ includePaused: true });
        return;

      case "clear-live-pause":
        clearLivePause();
        return;

      case "none":
        return;
    }
  }
);

function getAnalysisViewLabel(view: AnalysisView): string {
  switch (view) {
    case "facilitator_preference":
      return t("facilitatorPreference");
    case "auto":
      return t("recommendedDefault");
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
      return t("groupsLabel", { count: view });
  }
}

function getAnalysisViewReasonCaption(
  option: AnalysisViewOption
): string | undefined {
  if (
    "reason" in option &&
    option.reason === "analysis_variants_not_available"
  ) {
    return t("analysisVariantsNotAvailable");
  }

  if (getAnalysisViewGroupCount(option.view) === undefined) {
    return undefined;
  }

  if (!("reason" in option)) {
    return undefined;
  }

  if (
    analysisViewStateForControls.value?.resolvedBy === "no_analysis" &&
    option.reason === "recommended_default_unavailable"
  ) {
    return (
      activeAnalysisData.value?.emptyReason ??
      t("recommendedDefaultUnavailable")
    );
  }

  switch (option.reason) {
    case "fixed_group_count_unavailable":
      return t("fixedGroupCountUnavailable", { count: option.groupCount });
    case "recommended_default_unavailable":
      return t("recommendedDefaultUnavailable");
  }
}

function getFacilitatorPreferenceCaption(
  option: AnalysisViewOption
): string | undefined {
  const caption = getFacilitatorPreferenceCaptionState({ option });
  switch (caption.kind) {
    case "none":
      return undefined;
    case "sameAsAuto":
      return t("sameAsRecommendedDefault");
    case "usesGroups":
      return t("usesGroups", { count: caption.groupCount });
  }
}

function getAnalysisViewCaption(
  option: AnalysisViewOption
): string | undefined {
  const reasonCaption = getAnalysisViewReasonCaption(option);
  if (reasonCaption !== undefined) {
    return reasonCaption;
  }

  if (option.view === "facilitator_preference") {
    return (
      getFacilitatorPreferenceCaption(option) ??
      t("facilitatorPreferenceCaption")
    );
  }

  if (option.view === "auto") {
    return t("systemDefaultCaption");
  }

  return undefined;
}

function isAnalysisViewOptionSelectable(option: AnalysisViewOption): boolean {
  return getIsAnalysisViewOptionSelectable({
    option,
    variantsEnabled: analysisViewStateForControls.value?.variantsEnabled,
  });
}

function getAnalysisViewOptionClasses(
  option: AnalysisViewOption
): Record<string, boolean> {
  return {
    "analysis-view-drawer-option--selected":
      option.view === selectedAnalysisView.value,
    "analysis-view-drawer-option--recommended":
      option.status === "recommended" &&
      shouldShowAnalysisViewOptionStats(option),
    "analysis-view-drawer-option--muted": isAnalysisViewOptionMuted({
      option,
      variantsEnabled: analysisViewStateForControls.value?.variantsEnabled,
    }),
  };
}

function formatScoreChipValue(
  score: number | null | undefined
): string | undefined {
  return score === null || score === undefined
    ? undefined
    : String(Math.round(score * 100));
}

function formatClarityScore(score: number | null): string | undefined {
  if (score === null) {
    return undefined;
  }

  return String(Math.round(Math.max(0, Math.min(1, (score + 1) / 2)) * 100));
}

function getAnalysisViewOptionChips(option: AnalysisViewOption): string[] {
  const chips: string[] = [];
  const showStats = shouldShowAnalysisViewOptionStats(option);

  if (showStats) {
    switch (option.status) {
      case "recommended":
        chips.push(t("recommendedOption"));
        break;
      case "discouraged":
        chips.push(t("discouragedOption"));
        break;
      case "unavailable":
        chips.push(t("unavailableOption"));
        break;
      case "locked":
        chips.push(t("lockedOption"));
        break;
      case "available":
        break;
    }
  } else if (option.status === "locked") {
    chips.push(t("lockedOption"));
  }

  if (!showStats || !("candidate" in option)) {
    return chips;
  }

  const assessment = option.candidate.assessment;
  const overallScore = formatScoreChipValue(assessment.selectionScore);
  const clarityScore = formatClarityScore(assessment.silhouetteScore);
  const balanceScore = formatScoreChipValue(assessment.balanceScore);

  if (overallScore !== undefined) {
    chips.push(t("overallScoreLabel", { score: overallScore }));
  }

  if (clarityScore !== undefined) {
    chips.push(t("clarityScoreLabel", { score: clarityScore }));
  }

  if (balanceScore !== undefined) {
    chips.push(t("balanceScoreLabel", { score: balanceScore }));
  }

  return chips;
}

function getAnalysisViewChipColor(
  option: AnalysisViewOption
): "neutral" | "primary" | "warning" | "muted" {
  switch (option.status) {
    case "recommended":
      return "primary";
    case "discouraged":
      return "warning";
    case "unavailable":
      return "warning";
    case "locked":
      return "muted";
    case "available":
      return "neutral";
  }
}

function openAnalysisViewLearnMore(): void {
  showAnalysisViewDrawer.value = false;
  showAnalysisViewLearnMoreDrawer.value = true;
}

function goBackToAnalysisViewOptions(): void {
  showAnalysisViewLearnMoreDrawer.value = false;
  showAnalysisViewDrawer.value = true;
}

async function handleAnalysisViewSelect(
  option: AnalysisViewOption
): Promise<void> {
  if (!isAnalysisViewOptionSelectable(option)) {
    return;
  }

  showAnalysisViewDrawer.value = false;
  await replaceAnalysisRoutePreservingScroll({
    analysisView: option.view,
    checkpointViewSnapshotId: selectedRouteCheckpoint.value,
  });
}

async function setCheckpointRoute(
  checkpointViewSnapshotId: number | undefined
): Promise<void> {
  clearLivePause();
  await replaceAnalysisRoutePreservingScroll({
    analysisView: selectedAnalysisView.value,
    checkpointViewSnapshotId,
  });
}

function restoreAnalysisScrollPosition({ top }: { top: number }): void {
  requestAnimationFrame(() => {
    props.conversationScrollContext.scrollToPosition({
      top,
      behavior: "auto",
    });
  });
}

async function replaceAnalysisRoutePreservingScroll({
  analysisView,
  checkpointViewSnapshotId,
}: {
  analysisView: AnalysisView | undefined;
  checkpointViewSnapshotId: number | undefined;
}): Promise<void> {
  const top = props.conversationScrollContext.getScrollPosition();

  await router.replace({
    path: route.path,
    query: getUpdatedAnalysisRouteQuery({
      query: route.query,
      analysisView,
      checkpointViewSnapshotId,
    }),
  });

  restoreAnalysisScrollPosition({ top });
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
  pausedLiveAnalysisData.value = analysisQuery.data.value;
  pausedLiveCheckpoints.value = analysisCheckpoints.value;
  pausedLiveSurveyResults.value = props.surveyQuery.data.value;
  emit("update:liveAnalysisPaused", true);
  emit("livePauseStats", actionBarStatsFromAnalysis(analysisQuery.data.value));
}

function clearLivePause(): void {
  pausedLiveAnalysisData.value = undefined;
  pausedLiveCheckpoints.value = undefined;
  pausedLiveSurveyResults.value = undefined;
  emit("livePauseStats", undefined);

  if (props.isLiveAnalysisPaused) {
    emit("update:liveAnalysisPaused", false);
  }
}

function actionBarStatsFromAnalysis(
  analysis: AnalysisData | undefined
): ConversationActionBarStats | undefined {
  const snapshot = analysis?.conversationViewSnapshot;
  if (snapshot === undefined) {
    return undefined;
  }

  return {
    opinionCount: snapshot.opinionCount,
    participantCount: snapshot.participantCount,
    voteCount: snapshot.voteCount,
    totalParticipantCount: snapshot.totalParticipantCount,
    totalVoteCount: snapshot.totalVoteCount,
  };
}

const polisClusters = computed<Partial<PolisClusters>>(() =>
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

async function refreshCheckpoints({
  includePaused = false,
}: {
  includePaused?: boolean;
} = {}): Promise<void> {
  if (isLivePaused.value && !includePaused) {
    return;
  }

  await props.analysisCheckpointsQuery.refetch();
}

async function refreshLatestAnalysis(): Promise<void> {
  clearLivePause();

  if (!isLiveAnalysis.value) {
    await goLive();
  }

  await nextTick();

  await Promise.all([
    props.analysisQuery.refetch(),
    props.analysisCheckpointsQuery.refetch(),
  ]);
}

defineExpose({
  isLoading: computed(
    () =>
      ((analysisQuery.isPending.value || analysisQuery.isRefetching.value) &&
        analysisQuery.data.value === undefined) ||
      ((props.analysisCheckpointsQuery.isPending.value ||
        props.analysisCheckpointsQuery.isRefetching.value) &&
        props.analysisCheckpointsQuery.data.value === undefined)
  ),
  refreshCheckpoints,
  refreshLatestAnalysis,
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

.analysis-loaded-content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.checkpoint-timeline-loading,
.analysis-initial-loading,
.analysis-transition-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 7rem;
}

.analysis-initial-loading,
.analysis-transition-loading {
  flex-direction: column;
  gap: 0.75rem;
  color: #6d6a74;
}

.analysis-initial-loading__text,
.analysis-transition-loading__text {
  font-size: 1rem;
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
  container-type: inline-size;
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

.analysis-view-selector-group {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0.5rem;
}

.analysis-controls--playback-only {
  justify-content: flex-end;
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
}

@container (max-width: 34rem) {
  .report-button__label {
    display: none;
  }
}

.analysis-view-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.analysis-view-drawer-learn-more {
  flex-shrink: 0;
  width: fit-content;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6d6a74;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
  padding: 0.2rem 0.35rem;

  &:hover,
  &:focus-visible {
    background: #f5f5f7;
  }
}

.analysis-view-drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.analysis-view-drawer-section-title {
  color: #7b7884;
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
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

.analysis-view-drawer-option__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
}

.analysis-view-drawer-option__status,
.analysis-view-drawer-option__score {
  width: fit-content;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  font-size: 0.7rem;
  line-height: 1.3;
}

.analysis-view-drawer-option__status--recommended {
  background: #eeeaff;
  color: #4d36d8;
}

.analysis-view-drawer-option__status--available {
  background: #eef7f2;
  color: #137a55;
}

.analysis-view-drawer-option__status--discouraged {
  background: #fff4df;
  color: #8a5a00;
}

.analysis-view-drawer-option__status--locked {
  background: #f2f2f4;
  color: #6d6a74;
}

.analysis-view-drawer-option__score {
  background: #f5f5f7;
  color: #6d6a74;
}

.analysis-view-drawer-option__score--recommended {
  background: #eeeaff;
  color: #4d36d8;
}

.analysis-view-drawer-option__score--discouraged {
  background: #fff4df;
  color: #8a5a00;
}

.analysis-view-drawer-option__score--unavailable,
.analysis-view-drawer-option__score--locked {
  background: #f2f2f4;
  color: #6d6a74;
}

.analysis-view-learn-more-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.analysis-view-learn-more-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.analysis-view-learn-more-title {
  color: #333238;
  font-weight: var(--font-weight-semibold);
}

.analysis-view-learn-more-body {
  color: #6d6a74;
  font-size: 0.85rem;
  line-height: 1.35;
}

.analysis-view-drawer-option__details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.55rem;
  color: #7b7884;
  font-size: 0.72rem;
  line-height: 1.35;
}
</style>
