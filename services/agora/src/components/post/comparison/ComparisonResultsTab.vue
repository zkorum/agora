<template>
  <div class="container flexStyle">
    <div v-if="currentTab !== 'Survey'" class="checkpoint-section">
      <PageLoadingSpinner
        v-if="checkpointsQuery.isPending.value && !hasCheckpointData"
      />
      <ErrorRetryBlock
        v-else-if="hasBlockingCheckpointError"
        :title="t('loadingError')"
        :retry-label="t('retryButton')"
        @retry="retryFetchCheckpoints"
      />
      <CheckpointTimeline
        v-else
        :checkpoints="checkpointTimelineItems"
        :selected-checkpoint-id="selectedCheckpointId"
        :is-live-selected="selectedCheckpointId === undefined"
        :is-live-paused="isLivePaused"
        :is-latest-checkpoint-live="isLatestCheckpointLive"
        :is-live-closed="props.conversationData.metadata.isClosed"
        :is-finalizing="props.conversationData.metadata.isFinalizing === true"
        :title="tAnalysis('checkpointTimelineLabel')"
        :start-label="tAnalysis('checkpointTimelineStart')"
        :now-label="timelineLiveLabel"
        :previous-label="tAnalysis('previousCheckpoint')"
        :next-label="tAnalysis('nextCheckpoint')"
        :format-reason="formatCheckpointReason"
        @select-checkpoint="selectCheckpoint"
        @select-live="selectLive"
      />

      <div
        v-if="
          hasCheckpointData &&
          !hasBlockingCheckpointError &&
          !props.conversationData.metadata.isClosed
        "
        class="analysis-controls"
      >
        <AnalysisPlaybackButton
          :is-playing="selectedCheckpointId === undefined && !isLivePaused"
          :disabled="selectedCheckpointId === undefined && !canPauseLiveFrame"
          :pause-label="tAnalysis('pauseAtLatestCheckpoint')"
          :play-label="tAnalysis('returnToLiveAnalysis')"
          @click="toggleAnalysisPlayback()"
        />
      </div>
      <ClosedAnalysisInputControl
        v-if="closedSelection !== undefined"
        :selection="closedSelection"
        :can-switch="canSwitch"
        :saving="saving"
        :save-failed="saveFailed"
        @select-mode="selectMode"
      />
    </div>

    <ShortcutBar
      :model-value="currentTab"
      :items="comparisonTabItems"
      :get-label="getTabLabel"
      :get-route="getComparisonTabRoute"
      :on-same-tab-click="handleSameTabClick"
      @update:model-value="onTabChange"
    />

    <div v-if="currentTab === 'Survey'" class="tabComponent">
      <SurveyTab
        :polis-frame="undefined"
        :conversation-slug-id="conversationSlugId"
        :survey-gate="props.conversationData.interaction.surveyGate"
        :survey-query="surveyResultsQuery"
        :clusters="{}"
        :total-participant-count="activeParticipantCount"
        :conversation-scroll-context="props.conversationScrollContext"
      />
    </div>

    <PageLoadingSpinner
      v-else-if="isInitialLoading && !hasBlockingCheckpointError"
    />

    <!-- Error -->
    <ErrorRetryBlock
      v-else-if="hasError"
      :title="t('loadingError')"
      :retry-label="t('retryButton')"
      @retry="retryFetchResults"
    />

    <template v-else-if="!hasBlockingCheckpointError">
      <!-- Me section (above community ranking in Summary) -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Me'"
        class="tabComponent"
      >
        <ComparisonMeSection
          :is-closed="props.conversationData.metadata.isClosed"
          :conversation-slug-id="conversationSlugId"
          :load-data="activeLoadData"
          :all-items="activeResultItems"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Me')"
          :on-learn-more="() => (learnMoreContext = 'me')"
          :navigate-to-voting-tab="props.navigateToVotingTab"
        />
      </div>

      <!-- Community Rankings -->
      <div
        v-if="currentTab === 'Summary' || currentTab === 'Results'"
        class="tabComponent"
      >
        <ComparisonItemListSection
          :conversation-slug-id="conversationSlugId"
          :section-title="t('title')"
          :subtitle="t('subtitle')"
          :items="activeResultItems"
          :is-loading="false"
          :no-items-message="t('noResults')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Results')"
          :on-learn-more="() => (learnMoreContext = 'community')"
        >
          <template #item-action="{ item }">
            <q-btn
              v-if="
                canModerateItems &&
                item.participantSubmitted &&
                selectedCheckpointId === undefined &&
                !isLivePaused
              "
              flat
              dense
              round
              icon="mdi-dots-vertical"
              :aria-label="moderationLabels('moderate')"
              @click.stop="moderationTarget = item.slugId"
            />
          </template>
        </ComparisonItemListSection>
        <ComparisonModeration
          v-model:target="moderationTarget"
          :conversation-slug-id="conversationSlugId"
          :can-moderate="canModerateItems"
          :site-moderator="profileData.isSiteModerator"
          @changed="refreshClose"
        />
      </div>

      <div v-if="hasSurvey && currentTab === 'Summary'" class="tabComponent">
        <SurveyTab
          :polis-frame="undefined"
          :conversation-slug-id="conversationSlugId"
          :survey-gate="props.conversationData.interaction.surveyGate"
          :survey-query="surveyResultsQuery"
          :survey-results-override="pausedLiveFrame?.surveyResults"
          :clusters="{}"
          :total-participant-count="activeParticipantCount"
          :compact-mode="true"
          :conversation-scroll-context="props.conversationScrollContext"
          @switch-to-survey="onTabChange('Survey')"
        />
      </div>

      <!-- Completed items -->
      <div
        v-if="
          hasLifecycleTabs &&
          (currentTab === 'Summary' || currentTab === 'Completed')
        "
        class="tabComponent"
      >
        <ComparisonItemListSection
          :conversation-slug-id="conversationSlugId"
          :section-title="t('tabCompleted')"
          :subtitle="null"
          :items="activeCompletedItems"
          :is-loading="isCompletedLoading"
          :no-items-message="t('noItems')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Completed')"
          :on-learn-more="() => (lifecycleHelp = 'completed')"
        />
      </div>

      <!-- Canceled items -->
      <div
        v-if="
          hasLifecycleTabs &&
          (currentTab === 'Summary' || currentTab === 'Canceled')
        "
        class="tabComponent"
      >
        <ComparisonItemListSection
          :conversation-slug-id="conversationSlugId"
          :section-title="t('tabCanceled')"
          :subtitle="null"
          :items="activeCanceledItems"
          :is-loading="isCanceledLoading"
          :no-items-message="t('noItems')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Canceled')"
          :on-learn-more="() => (lifecycleHelp = 'canceled')"
        />
      </div>
    </template>

    <!-- Learn more dialog -->
    <q-dialog v-model="showInfoDialog" position="bottom">
      <ZKBottomDialogContainer
        :title="learnMoreContext === 'community' ? t('title') : t('meTitle')"
      >
        <div class="learn-more-content">
          <template v-if="learnMoreContext === 'community'">
            <p>{{ t("communityLearnMoreHow") }}</p>
            <p>{{ t("scoreScaleExplanation") }}</p>
            <p>{{ t("communityLearnMoreDiversity") }}</p>
            <p>
              {{
                hasLifecycleTabs
                  ? t("communityLearnMoreSourceGitHub")
                  : t("communityLearnMoreSourceManual")
              }}
            </p>
            <p class="learn-more-reference">
              {{ t("communityLearnMoreReference") }}
              <a
                href="https://github.com/tournesol-app/tournesol/tree/main/solidago"
                target="_blank"
                rel="noopener noreferrer"
                class="learn-more-link"
                >Solidago</a
              >
              ·
              <a
                href="https://en.wikipedia.org/wiki/Best%E2%80%93worst_scaling"
                target="_blank"
                rel="noopener noreferrer"
                class="learn-more-link"
                >Best-Worst Scaling</a
              >
            </p>
          </template>
          <template v-else>
            <p>{{ t("meLearnMorePersonal") }}</p>
            <p>{{ t("scoreScaleExplanation") }}</p>
            <p v-if="!props.conversationData.metadata.isClosed">
              {{ t("meLearnMoreCounts") }}
            </p>
          </template>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <!-- Lifecycle learn-more dialog -->
    <q-dialog
      :model-value="lifecycleHelp !== undefined"
      position="bottom"
      @update:model-value="lifecycleHelp = undefined"
    >
      <ZKBottomDialogContainer
        v-if="lifecycleInfo"
        :title="t(lifecycleInfo.title)"
      >
        <div class="learn-more-content">
          <p>
            {{
              t(hasLifecycleTabs ? lifecycleInfo.github : lifecycleInfo.manual)
            }}
          </p>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <ComparisonStatementDialog
      v-model="showStatementDialog"
      :conversation-slug-id="conversationSlugId"
      :item-slug-id="expandedItemSlugId"
      :display-content="expandedDisplayContent"
      :external-url="expandedExternalUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
  type AnalysisPageTranslations,
  analysisPageTranslations,
} from "src/components/post/analysis/AnalysisPage.i18n";
import type { CheckpointTimelineItem } from "src/components/post/analysis/CheckpointTimeline.types";
import CheckpointTimeline from "src/components/post/analysis/CheckpointTimeline.vue";
import AnalysisPlaybackButton from "src/components/post/analysis/common/AnalysisPlaybackButton.vue";
import ClosedAnalysisInputControl from "src/components/post/analysis/common/ClosedAnalysisInputControl.vue";
import ShortcutBar from "src/components/post/analysis/shortcutBar/ShortcutBar.vue";
import {
  type SurveyTabTranslations,
  surveyTabTranslations,
} from "src/components/post/analysis/surveyTab/SurveyTab.i18n";
import SurveyTab from "src/components/post/analysis/surveyTab/SurveyTab.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useClosedAnalysisSelection } from "src/composables/conversation/useClosedAnalysisSelection";
import type { ConversationActionBarStats } from "src/composables/conversation/useConversationActionBarStats";
import type {
  ConversationScrollContext,
  RegisterChildRefreshHandler,
} from "src/composables/conversation/useConversationParentState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type {
  ClosedAnalysisSelection,
  ComparisonLoadResponse,
  ComparisonResultItem,
  PrioritizationItem,
  RankingStatsCheckpointReason,
  RankingStatsCheckpointsResponse,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import type {
  ExtendedConversationDisplayData,
  RankingItemDisplayedContent,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import { useOpinionRedactionStore } from "src/stores/opinionRedaction";
import { useUserStore } from "src/stores/user";
import {
  getUpdatedAnalysisRouteQuery,
  parseCheckpointQuery,
} from "src/utils/analysis/analysisRoute";
import { useComparisonApi } from "src/utils/api/comparison/comparison";
import { useComparisonCloseRefresh } from "src/utils/api/comparison/comparisonCloseRefresh";
import {
  useComparisonLoadQuery,
  useRankingStatsCheckpointsQuery,
} from "src/utils/api/comparison/useComparisonQueries";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
import {
  type ComparisonShortcutItem,
  comparisonShortcutItemSchema,
} from "src/utils/component/analysis/comparisonShortcutBar";
import { subscribeToContentTranslationEvents } from "src/utils/translation/contentTranslationEvents";
import { getRankingItemDisplayText } from "src/utils/translation/rankingItemDisplayText";
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useRoute, useRouter } from "vue-router";

import type { ComparisonListItem } from "./ComparisonItemListSection.vue";
import ComparisonItemListSection from "./ComparisonItemListSection.vue";
import ComparisonMeSection from "./ComparisonMeSection.vue";
import { comparisonModerationTranslations } from "./ComparisonModeration.i18n";
import ComparisonModeration from "./ComparisonModeration.vue";
import {
  type ComparisonResultsTabTranslations,
  comparisonResultsTabTranslations,
} from "./ComparisonResultsTab.i18n";
import ComparisonStatementDialog from "./ComparisonStatementDialog.vue";

const props = defineProps<{
  conversationData: ExtendedConversationDisplayData;
  navigateToVotingTab: () => void;
  conversationScrollContext: ConversationScrollContext;
}>();
const emit = defineEmits<{
  analysisLivePauseStats: [stats: ConversationActionBarStats | undefined];
}>();
const { profileData } = storeToRefs(useUserStore());
const canModerateItems = computed(
  () =>
    profileData.value.isSiteModerator ||
    props.conversationData.interaction.conversationCapabilities.canModerate
);
const moderationTarget = ref<string>();
const { t: moderationLabels } = useComponentI18n(
  comparisonModerationTranslations
);

const { t } = useComponentI18n<ComparisonResultsTabTranslations>(
  comparisonResultsTabTranslations
);
const { t: tAnalysis } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);
const { t: tSurvey } = useComponentI18n<SurveyTabTranslations>(
  surveyTabTranslations
);

const { getComparisonResults, fetchComparisonItems } = useComparisonApi();
const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
const opinionRedactionStore = useOpinionRedactionStore();

const route = useRoute();
const router = useRouter();

const { currentTab, handleSameTabClick, setCurrentTabFromRoute } =
  useTabNavigation({
    schema: comparisonShortcutItemSchema,
    defaultTab: "Summary",
  });

function getComparisonTabRoute(item: string): RouteLocationRaw {
  const query = { ...route.query };
  if (item === "Summary") {
    delete query.tab;
  } else {
    query.tab = item;
  }
  if (item !== "Results") {
    delete query.checkpoint;
  }
  return { path: route.path, query };
}

const hasLifecycleTabs = computed(
  () => props.conversationData.metadata.externalSourceConfig !== null
);
const hasSurvey = computed(
  () => props.conversationData.interaction.surveyGate?.hasSurvey === true
);

const comparisonTabItems = computed<ComparisonShortcutItem[]>(() => {
  const baseItems: ComparisonShortcutItem[] = ["Summary", "Me", "Results"];
  if (hasSurvey.value) {
    baseItems.push("Survey");
  }
  if (hasLifecycleTabs.value) {
    baseItems.push("Completed", "Canceled");
  }
  return baseItems;
});

function isLifecycleTab(item: ComparisonShortcutItem): boolean {
  return item === "Completed" || item === "Canceled";
}

function isTabAvailable(item: ComparisonShortcutItem): boolean {
  if (item === "Survey") {
    return hasSurvey.value;
  }
  return hasLifecycleTabs.value || !isLifecycleTab(item);
}

if (!isTabAvailable(currentTab.value)) {
  setCurrentTabFromRoute("Summary");
  void router.replace(getComparisonTabRoute("Summary"));
}

const tabTranslationKeys = {
  Summary: "tabSummary",
  Me: "tabMe",
  Results: "tabResults",
  Completed: "tabCompleted",
  Canceled: "tabCanceled",
} satisfies Record<
  Exclude<ComparisonShortcutItem, "Survey">,
  keyof ComparisonResultsTabTranslations
>;

function getTabLabel(item: string): string {
  const parsed = comparisonShortcutItemSchema.safeParse(item);
  if (!parsed.success) {
    return item;
  }

  if (parsed.data === "Survey") {
    return tSurvey("surveyTitle");
  }

  return t(tabTranslationKeys[parsed.data]);
}

function onTabChange(value: string): void {
  const parsed = comparisonShortcutItemSchema.safeParse(value);
  if (parsed.success) {
    const nextTab = isTabAvailable(parsed.data) ? parsed.data : "Summary";
    if (selectedCheckpointId.value !== undefined && nextTab !== "Results") {
      setCurrentTabFromRoute(nextTab);
      void router.replace(getComparisonTabRoute(nextTab));
      return;
    }
    currentTab.value = nextTab;
  }
}

// Inject parent refresh handler (same pattern as ConversationAnalysisTab)
const registerChildRefreshHandler = inject<RegisterChildRefreshHandler>(
  "registerChildRefreshHandler",
  () => {
    /* noop */
    return () => {
      /* noop */
    };
  }
);
let unregisterChildRefreshHandler: (() => void) | undefined;
let unregisterTranslationUpdateHandler: (() => void) | undefined;
let translationRefreshTimeout: ReturnType<typeof setTimeout> | undefined;
const isActive = ref(true);

interface LoadedLiveRankingFrame {
  rankingStatsSnapshotId: number | undefined;
  resultItems: ComparisonListItem[];
  actionBarStats: ConversationActionBarStats;
}

interface PausedRankingFrame extends LoadedLiveRankingFrame {
  checkpoints: RankingStatsCheckpointsResponse;
  surveyResults: SurveyResultsAggregatedResponse | undefined;
  loadData: ComparisonLoadResponse | undefined;
  completedItems: ComparisonListItem[];
  canceledItems: ComparisonListItem[];
}

const loadedLiveRankingFrame = ref<LoadedLiveRankingFrame | undefined>();
const pausedLiveFrame = ref<PausedRankingFrame | undefined>();
const isLivePaused = computed(() => pausedLiveFrame.value !== undefined);
const isRankingContentVisible = computed(() => currentTab.value !== "Survey");
const isSurveyContentVisible = computed(
  () => currentTab.value === "Summary" || currentTab.value === "Survey"
);

const conversationSlugId = props.conversationData.metadata.conversationSlugId;
const surveyResultsQuery = useSurveyResultsAggregatedQuery({
  conversationSlugId,
  enabled: computed(
    () =>
      hasSurvey.value &&
      isActive.value &&
      isSurveyContentVisible.value &&
      !isLivePaused.value
  ),
});
const selectedCheckpointId = computed(() =>
  parseCheckpointQuery({ query: route.query })
);
const liveRankingStatsSnapshotId = computed(() => {
  const metadata = props.conversationData.metadata;
  return metadata.conversationType === "prioritizing" &&
    metadata.prioritizationType === "comparisons"
    ? metadata.rankingStatsSnapshotId
    : undefined;
});
const requestedRankingStatsSnapshotId = computed(() => {
  const selectedSnapshotId = selectedCheckpointId.value;
  const liveSnapshotId = liveRankingStatsSnapshotId.value;
  if (selectedSnapshotId === undefined) {
    return liveSnapshotId;
  }
  if (liveSnapshotId === undefined) {
    return selectedSnapshotId;
  }
  return Math.max(selectedSnapshotId, liveSnapshotId);
});
const checkpointsQuery = useRankingStatsCheckpointsQuery({
  conversationSlugId,
  requestedRankingStatsSnapshotId,
  enabled: computed(
    () => isActive.value && isRankingContentVisible.value && !isLivePaused.value
  ),
});
const rankingCheckpoints = computed<RankingStatsCheckpointsResponse>(
  () => checkpointsQuery.data.value ?? []
);
const activeRankingCheckpoints = computed<RankingStatsCheckpointsResponse>(
  () => pausedLiveFrame.value?.checkpoints ?? rankingCheckpoints.value
);
const hasCheckpointData = computed(
  () => checkpointsQuery.data.value !== undefined
);
const hasBlockingCheckpointError = computed(
  () => checkpointsQuery.isError.value && !hasCheckpointData.value
);
const checkpointTimelineItems = computed<
  CheckpointTimelineItem<RankingStatsCheckpointReason>[]
>(() =>
  activeRankingCheckpoints.value.map((checkpoint) => ({
    checkpointId: checkpoint.rankingStatsSnapshotId,
    activatedAt: checkpoint.createdAt,
    reasons: checkpoint.reasons,
  }))
);
const latestCheckpointId = computed(
  () => activeRankingCheckpoints.value.at(-1)?.rankingStatsSnapshotId
);
const activeLiveRankingStatsSnapshotId = computed(() =>
  pausedLiveFrame.value === undefined
    ? liveRankingStatsSnapshotId.value
    : pausedLiveFrame.value.rankingStatsSnapshotId
);
const isLatestCheckpointLive = computed(
  () =>
    props.conversationData.metadata.isFinalizing !== true &&
    latestCheckpointId.value !== undefined &&
    latestCheckpointId.value === activeLiveRankingStatsSnapshotId.value
);
const timelineLiveLabel = computed(() =>
  props.conversationData.metadata.isFinalizing === true
    ? tAnalysis("checkpointTimelineFinalizing")
    : props.conversationData.metadata.isClosed
      ? tAnalysis("checkpointReasonConversationClosed")
      : tAnalysis("checkpointTimelineNow")
);

function formatCheckpointReason(
  reason: RankingStatsCheckpointReason
): string | undefined {
  switch (reason.reason) {
    case "major_participation_milestone":
      return tAnalysis("checkpointReasonParticipationMilestone", {
        count: new Intl.NumberFormat(displayLanguage.value).format(
          reason.participantMilestone
        ),
      });
    case "major_vote_milestone":
      return tAnalysis("checkpointReasonVoteMilestone", {
        count: new Intl.NumberFormat(displayLanguage.value).format(
          reason.voteMilestone
        ),
      });
    case "conversation_closed":
      return tAnalysis("checkpointReasonConversationClosed");
  }
}

async function selectCheckpoint(checkpointId: number): Promise<void> {
  clearLivePause();
  setCurrentTabFromRoute("Results");
  const query = getUpdatedAnalysisRouteQuery({
    query: route.query,
    checkpointViewSnapshotId: checkpointId,
  });
  query.tab = "Results";
  await router.replace({
    path: route.path,
    query,
  });
}

async function selectLive(): Promise<void> {
  const resumedPlayback = clearLivePause();
  await router.replace({
    path: route.path,
    query: getUpdatedAnalysisRouteQuery({
      query: route.query,
      checkpointViewSnapshotId: undefined,
    }),
  });

  if (resumedPlayback) {
    await nextTick();
    await handleChildRefresh();
  }
}

async function toggleAnalysisPlayback(): Promise<void> {
  if (isLivePaused.value) {
    await selectLive();
    return;
  }

  if (selectedCheckpointId.value !== undefined) {
    await selectLive();
    return;
  }

  pauseLiveAtCurrentFrame();
}

function pauseLiveAtCurrentFrame(): void {
  const liveFrame = loadedLiveRankingFrame.value;
  if (!canPauseLiveFrame.value || liveFrame === undefined) {
    return;
  }

  pausedLiveFrame.value = {
    ...liveFrame,
    checkpoints: rankingCheckpoints.value,
    surveyResults: surveyResultsQuery.data.value,
    loadData: loadQuery.data.value,
    completedItems: completedItems.value,
    canceledItems: canceledItems.value,
  };
  emit("analysisLivePauseStats", liveFrame.actionBarStats);
}

function clearLivePause(): boolean {
  if (pausedLiveFrame.value === undefined) {
    return false;
  }

  pausedLiveFrame.value = undefined;
  emit("analysisLivePauseStats", undefined);
  return true;
}

function getActionBarStatsFromMetadata(): ConversationActionBarStats {
  const metadata = props.conversationData.metadata;
  return {
    opinionCount: metadata.opinionCount,
    participantCount: metadata.participantCount,
    voteCount: metadata.voteCount,
    totalParticipantCount: metadata.totalParticipantCount,
    totalVoteCount: metadata.totalVoteCount,
  };
}

async function normalizeCheckpointForCurrentTab(): Promise<boolean> {
  if (currentTab.value === "Results" || route.query.checkpoint === undefined) {
    return false;
  }

  await router.replace(getComparisonTabRoute(currentTab.value));
  return true;
}

// Results data
const isInitialLoading = ref(true);
const hasError = ref(false);
const resultItems = ref<ComparisonListItem[]>([]);
const receivedSelection = ref<ClosedAnalysisSelection>();
const closedSelection = computed(() =>
  selectedCheckpointId.value === undefined &&
  props.conversationData.metadata.isClosed &&
  props.conversationData.metadata.isFinalizing !== true
    ? receivedSelection.value
    : undefined
);
const closeRefresh = useComparisonCloseRefresh(conversationSlugId);
const { canSwitch, saving, saveFailed, selectMode } =
  useClosedAnalysisSelection({
    slug: conversationSlugId,
    selection: closedSelection,
    canEdit: () =>
      props.conversationData.interaction.conversationCapabilities.canEdit,
    refresh: refreshClose,
  });
const activeResultItems = computed(
  () => pausedLiveFrame.value?.resultItems ?? resultItems.value
);
const activeParticipantCount = computed(
  () =>
    pausedLiveFrame.value?.actionBarStats.participantCount ??
    (closedSelection.value === undefined
      ? undefined
      : loadedLiveRankingFrame.value?.actionBarStats.participantCount) ??
    props.conversationData.metadata.participantCount
);
let latestResultsRequestId = 0;
let latestCheckpointValidationId = 0;
let resultsFetchInFlight: Promise<void> | undefined;
let hasQueuedResultsFetch = false;
let queuedResultsFetchShowsLoading = false;
watch(closeRefresh, refreshClose);

async function refreshClose(): Promise<void> {
  latestResultsRequestId += 1;
  await fetchResults({ showLoading: false });
}

// Me tab: user's personal ranking (data passed to ComparisonMeSection)
const loadQuery = useComparisonLoadQuery({
  conversationSlugId,
  enabled: computed(
    () => isActive.value && isRankingContentVisible.value && !isLivePaused.value
  ),
});
const activeLoadData = computed(() =>
  pausedLiveFrame.value === undefined
    ? loadQuery.data.value
    : pausedLiveFrame.value.loadData
);

// Lifecycle data
const completedItems = ref<ComparisonListItem[]>([]);
const isCompletedLoading = ref(true);
const canceledItems = ref<ComparisonListItem[]>([]);
const isCanceledLoading = ref(true);
const activeCompletedItems = computed(
  () => pausedLiveFrame.value?.completedItems ?? completedItems.value
);
const activeCanceledItems = computed(
  () => pausedLiveFrame.value?.canceledItems ?? canceledItems.value
);
const lifecycleRequestIds = {
  completed: 0,
  canceled: 0,
};

const canPauseLiveFrame = computed(() => {
  const liveFrame = loadedLiveRankingFrame.value;
  if (
    liveFrame === undefined ||
    liveFrame.rankingStatsSnapshotId !== liveRankingStatsSnapshotId.value ||
    isInitialLoading.value ||
    hasError.value
  ) {
    return false;
  }

  switch (currentTab.value) {
    case "Summary":
      return (
        loadQuery.data.value !== undefined &&
        (!hasSurvey.value || surveyResultsQuery.data.value !== undefined) &&
        (!hasLifecycleTabs.value ||
          (!isCompletedLoading.value && !isCanceledLoading.value))
      );
    case "Me":
      return loadQuery.data.value !== undefined;
    case "Results":
      return true;
    case "Completed":
      return !isCompletedLoading.value;
    case "Canceled":
      return !isCanceledLoading.value;
    case "Survey":
      return false;
  }

  return false;
});

// Dialog state
const learnMoreContext = ref<"community" | "me" | null>(null);
const showInfoDialog = computed({
  get: () => learnMoreContext.value !== null,
  set: (val: boolean) => {
    if (!val) learnMoreContext.value = null;
  },
});
const lifecycleHelpKeys = {
  completed: {
    title: "tabCompleted",
    manual: "completedLearnMoreManual",
    github: "completedLearnMoreGitHub",
  },
  canceled: {
    title: "tabCanceled",
    manual: "canceledLearnMoreManual",
    github: "canceledLearnMoreGitHub",
  },
} as const;
const lifecycleHelp = ref<keyof typeof lifecycleHelpKeys>();
const lifecycleInfo = computed(() =>
  lifecycleHelp.value === undefined
    ? undefined
    : lifecycleHelpKeys[lifecycleHelp.value]
);
const showStatementDialog = ref(false);
const expandedItemSlugId = ref<string | undefined>(undefined);
const expandedDisplayContent = ref<RankingItemDisplayedContent | undefined>(
  undefined
);
const expandedExternalUrl = ref<string | null>(null);

function openStatementDialog({
  itemSlugId,
  displayContent,
  externalUrl,
}: {
  itemSlugId: string;
  displayContent: RankingItemDisplayedContent;
  externalUrl: string | null;
}): void {
  expandedItemSlugId.value = itemSlugId;
  expandedDisplayContent.value = displayContent;
  expandedExternalUrl.value = externalUrl;
  showStatementDialog.value = true;
}

function mapApiItemsToListItems({
  apiItems,
}: {
  apiItems: PrioritizationItem[];
}): ComparisonListItem[] {
  return apiItems.map((item) => ({
    slugId: item.slugId,
    ...getRankingItemDisplayText({
      displayContent: item.displayContent,
    }),
    displayContent: item.displayContent,
    score: item.snapshotScore ?? null,
    externalUrl: item.externalUrl ?? null,
  }));
}

function mapApiResultItemsToListItems({
  apiItems,
}: {
  apiItems: ComparisonResultItem[];
}): ComparisonListItem[] {
  return apiItems.map((item) =>
    item.isDeleted
      ? {
          slugId: item.itemSlugId,
          title: "",
          body: null,
          displayContent: undefined,
          score: item.score,
          externalUrl: null,
        }
      : {
          slugId: item.itemSlugId,
          ...getRankingItemDisplayText({ displayContent: item.displayContent }),
          participantSubmitted: item.participantSubmitted,
          displayContent: item.displayContent,
          score: item.score,
          externalUrl: item.externalUrl,
        }
  );
}

watch(
  () => opinionRedactionStore.resyncVersion,
  async () => {
    latestResultsRequestId += 1;
    lifecycleRequestIds.completed += 1;
    lifecycleRequestIds.canceled += 1;
    clearLivePause();
    loadedLiveRankingFrame.value = undefined;
    resultItems.value = [];
    completedItems.value = [];
    canceledItems.value = [];
    expandedDisplayContent.value = undefined;
    expandedExternalUrl.value = null;
    expandedItemSlugId.value = undefined;
    showStatementDialog.value = false;
    if (isActive.value) await handleChildRefresh();
  }
);

async function fetchLifecycleItems({
  lifecycle,
  itemsRef,
  loadingRef,
  showLoading,
}: {
  lifecycle: "completed" | "canceled";
  itemsRef: typeof completedItems;
  loadingRef: typeof isCompletedLoading;
  showLoading: boolean;
}): Promise<void> {
  const requestId = ++lifecycleRequestIds[lifecycle];
  if (showLoading) {
    loadingRef.value = true;
  }

  const response = await fetchComparisonItems({
    conversationSlugId,
    lifecycleFilter: lifecycle,
  });

  if (
    requestId === lifecycleRequestIds[lifecycle] &&
    response.status === "success"
  ) {
    itemsRef.value = mapApiItemsToListItems({ apiItems: response.data.items });
  }

  if (requestId === lifecycleRequestIds[lifecycle]) {
    loadingRef.value = false;
  }
}

function retryFetchResults(): void {
  void fetchResults({ showLoading: true });
}

async function fetchResults({
  showLoading,
}: {
  showLoading: boolean;
}): Promise<void> {
  if (!isActive.value || !isRankingContentVisible.value || isLivePaused.value) {
    return;
  }
  if (resultsFetchInFlight !== undefined) {
    hasQueuedResultsFetch = true;
    queuedResultsFetchShowsLoading ||= showLoading;
    return await resultsFetchInFlight;
  }

  resultsFetchInFlight = drainResultsFetches(showLoading);
  try {
    await resultsFetchInFlight;
  } finally {
    resultsFetchInFlight = undefined;
  }
}

async function drainResultsFetches(showLoading: boolean): Promise<void> {
  let nextFetchShowsLoading = showLoading;
  while (
    isActive.value &&
    isRankingContentVisible.value &&
    !isLivePaused.value
  ) {
    hasQueuedResultsFetch = false;
    queuedResultsFetchShowsLoading = false;
    await performResultsFetch({ showLoading: nextFetchShowsLoading });
    if (!hasQueuedResultsFetch) return;
    nextFetchShowsLoading = queuedResultsFetchShowsLoading;
  }
}

async function performResultsFetch({
  showLoading,
}: {
  showLoading: boolean;
}): Promise<void> {
  const requestedCheckpointId = selectedCheckpointId.value;
  const requestedClosed = props.conversationData.metadata.isClosed;
  const requestedLiveSnapshotId =
    requestedCheckpointId === undefined
      ? liveRankingStatsSnapshotId.value
      : undefined;
  const requestId = ++latestResultsRequestId;
  if (showLoading) {
    isInitialLoading.value = true;
    hasError.value = false;
  }

  const response =
    requestedCheckpointId === undefined
      ? await getComparisonResults({
          conversationSlugId,
          requestedRankingStatsSnapshotId: requestedLiveSnapshotId,
        })
      : await getComparisonResults({
          conversationSlugId,
          rankingStatsSnapshotId: requestedCheckpointId,
        });

  if (
    requestId !== latestResultsRequestId ||
    requestedClosed !== props.conversationData.metadata.isClosed ||
    requestedCheckpointId !== selectedCheckpointId.value ||
    (requestedCheckpointId === undefined &&
      requestedLiveSnapshotId !== liveRankingStatsSnapshotId.value) ||
    !isActive.value ||
    !isRankingContentVisible.value ||
    isLivePaused.value
  ) {
    return;
  }

  if (response.status === "success") {
    const loadedResultItems = mapApiResultItemsToListItems({
      apiItems: response.data.rankings,
    });
    resultItems.value = loadedResultItems;
    if (requestedCheckpointId === undefined) {
      receivedSelection.value = response.data.closedAnalysisSelection;
      loadedLiveRankingFrame.value = {
        rankingStatsSnapshotId: requestedLiveSnapshotId,
        resultItems: loadedResultItems,
        actionBarStats:
          response.data.counters ?? getActionBarStatsFromMetadata(),
      };
      if (receivedSelection.value !== undefined)
        emit(
          "analysisLivePauseStats",
          loadedLiveRankingFrame.value.actionBarStats
        );
    }
    hasError.value = false;
  } else if (
    showLoading ||
    (resultItems.value.length === 0 && receivedSelection.value === undefined)
  ) {
    hasError.value = true;
  }

  isInitialLoading.value = false;
}

async function validateCheckpointRoute({
  checkpoints = rankingCheckpoints.value,
  refetchIfMissing = true,
}: {
  checkpoints?: RankingStatsCheckpointsResponse;
  refetchIfMissing?: boolean;
} = {}): Promise<boolean> {
  const validationId = ++latestCheckpointValidationId;
  if (route.query.checkpoint === undefined) {
    return true;
  }
  const checkpointId = selectedCheckpointId.value;
  if (checkpointId === undefined) {
    if (validationId !== latestCheckpointValidationId || !isActive.value) {
      return false;
    }
    await selectLive();
    return false;
  }
  if (currentTab.value !== "Results") {
    setCurrentTabFromRoute("Results");
    await router.replace({
      path: route.path,
      query: { ...route.query, tab: "Results" },
    });
    if (
      validationId !== latestCheckpointValidationId ||
      checkpointId !== selectedCheckpointId.value ||
      !isActive.value
    ) {
      return false;
    }
  }
  if (
    checkpoints.some(
      (checkpoint) => checkpoint.rankingStatsSnapshotId === checkpointId
    )
  ) {
    return true;
  }
  if (!refetchIfMissing) {
    await selectLive();
    return false;
  }
  const result = await checkpointsQuery.refetch();
  if (
    validationId !== latestCheckpointValidationId ||
    checkpointId !== selectedCheckpointId.value ||
    !isActive.value ||
    result.status !== "success"
  ) {
    return false;
  }
  if (
    !result.data.some(
      (checkpoint) => checkpoint.rankingStatsSnapshotId === checkpointId
    )
  ) {
    await selectLive();
    return false;
  }
  return true;
}

async function retryFetchCheckpoints(): Promise<void> {
  const result = await checkpointsQuery.refetch();
  if (result.status !== "success" || !isActive.value) {
    return;
  }
  if (
    await validateCheckpointRoute({
      checkpoints: result.data,
      refetchIfMissing: false,
    })
  ) {
    await fetchResults({ showLoading: true });
  }
}

watch(
  () => route.query.checkpoint,
  async () => {
    emit("analysisLivePauseStats", undefined);
    clearLivePause();
    if (await normalizeCheckpointForCurrentTab()) {
      return;
    }
    if (
      !isActive.value ||
      !isRankingContentVisible.value ||
      !(await validateCheckpointRoute())
    ) {
      return;
    }
    await fetchResults({ showLoading: true });
  }
);
watch(liveRankingStatsSnapshotId, async (snapshotId, previousSnapshotId) => {
  if (snapshotId === previousSnapshotId) {
    return;
  }
  if (
    isActive.value &&
    isRankingContentVisible.value &&
    !isLivePaused.value &&
    selectedCheckpointId.value === undefined
  ) {
    await fetchResults({ showLoading: false });
  }
});

watch(
  () => props.conversationData.metadata.isClosed,
  (isClosed) => {
    receivedSelection.value = undefined;
    emit("analysisLivePauseStats", undefined);
    if (isClosed && isLivePaused.value) {
      void selectLive();
    } else if (selectedCheckpointId.value === undefined) {
      void refreshClose();
    }
  }
);

async function fetchAllLifecycleItems({
  showLoading,
}: {
  showLoading: boolean;
}): Promise<void> {
  if (!hasLifecycleTabs.value) {
    return;
  }

  await Promise.all([
    fetchLifecycleItems({
      lifecycle: "completed",
      itemsRef: completedItems,
      loadingRef: isCompletedLoading,
      showLoading,
    }),
    fetchLifecycleItems({
      lifecycle: "canceled",
      itemsRef: canceledItems,
      loadingRef: isCanceledLoading,
      showLoading,
    }),
  ]);
}

// Pull-to-refresh handler: silently refetch without toggling loading spinners
// (the pull-to-refresh spinner already indicates activity)
async function handleChildRefresh({
  refetchCheckpoints = true,
}: {
  refetchCheckpoints?: boolean;
} = {}): Promise<void> {
  if (isLivePaused.value) {
    return;
  }

  if (currentTab.value === "Survey") {
    await surveyResultsQuery.refetch();
    return;
  }

  let checkpoints = rankingCheckpoints.value;
  if (refetchCheckpoints) {
    const result = await checkpointsQuery.refetch();
    if (result.status === "success") {
      checkpoints = result.data;
    } else if (selectedCheckpointId.value !== undefined) {
      return;
    }
  }
  if (
    await validateCheckpointRoute({
      checkpoints,
      refetchIfMissing: false,
    })
  ) {
    await fetchResults({ showLoading: false });
  }
  await Promise.all([
    loadQuery.refetch(),
    fetchAllLifecycleItems({ showLoading: false }),
    ...(hasSurvey.value && isSurveyContentVisible.value
      ? [surveyResultsQuery.refetch()]
      : []),
  ]);
}

function queueTranslationRefresh(): void {
  if (translationRefreshTimeout !== undefined) {
    return;
  }

  translationRefreshTimeout = setTimeout(() => {
    translationRefreshTimeout = undefined;
    void handleChildRefresh({ refetchCheckpoints: false });
  }, 250);
}

function registerRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = registerChildRefreshHandler(async () => {
    if (isLivePaused.value) {
      await selectLive();
      return;
    }

    await handleChildRefresh();
  });
}

function unregisterRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = undefined;
}

function registerTranslationHandler(): void {
  unregisterTranslationHandler();
  unregisterTranslationUpdateHandler = subscribeToContentTranslationEvents(
    (data) => {
      if (
        data.targetLanguageCode === displayLanguage.value &&
        data.subject.kind === "ranking_item" &&
        data.subject.conversationSlugId === conversationSlugId
      ) {
        queueTranslationRefresh();
      }
    }
  );
}

function unregisterTranslationHandler(): void {
  unregisterTranslationUpdateHandler?.();
  unregisterTranslationUpdateHandler = undefined;
  if (translationRefreshTimeout !== undefined) {
    clearTimeout(translationRefreshTimeout);
    translationRefreshTimeout = undefined;
  }
}

// Register on initial setup and re-register on KeepAlive reactivation
// (whichever tab activates last must own the handler)
registerRefreshHandler();
registerTranslationHandler();

const hasInitiallyLoaded = ref(false);

async function loadRankingContent({
  showLoading,
}: {
  showLoading: boolean;
}): Promise<void> {
  if (await validateCheckpointRoute()) {
    await fetchResults({ showLoading });
  }
  await fetchAllLifecycleItems({ showLoading });
}

onMounted(async () => {
  await normalizeCheckpointForCurrentTab();
  if (isRankingContentVisible.value) {
    await loadRankingContent({ showLoading: true });
  }
  hasInitiallyLoaded.value = true;
});

// Silently refresh data when reactivated from KeepAlive (tab switch back)
// Shows stale cached data immediately, then updates in background
onActivated(async () => {
  isActive.value = true;
  registerRefreshHandler();
  registerTranslationHandler();
  if (!hasInitiallyLoaded.value) return;
  await normalizeCheckpointForCurrentTab();
  await handleChildRefresh();
});

onDeactivated(() => {
  isActive.value = false;
  clearLivePause();
  latestResultsRequestId += 1;
  latestCheckpointValidationId += 1;
  unregisterRefreshHandler();
  unregisterTranslationHandler();
});

onUnmounted(() => {
  isActive.value = false;
  clearLivePause();
  unregisterRefreshHandler();
  unregisterTranslationHandler();
});

watch(currentTab, async (newTab, oldTab) => {
  const resumedPlayback = clearLivePause();
  await normalizeCheckpointForCurrentTab();
  if (resumedPlayback) {
    await nextTick();
    await handleChildRefresh();
    return;
  }
  if (oldTab === "Survey" && newTab !== "Survey") {
    await loadRankingContent({ showLoading: true });
    return;
  }

  if (oldTab === "Summary" && newTab !== "Summary") {
    const tabLifecycleMap: Partial<
      Record<
        ComparisonShortcutItem,
        {
          lifecycle: "completed" | "canceled";
          itemsRef: typeof completedItems;
          loadingRef: typeof isCompletedLoading;
        }
      >
    > = {
      Completed: {
        lifecycle: "completed",
        itemsRef: completedItems,
        loadingRef: isCompletedLoading,
      },
      Canceled: {
        lifecycle: "canceled",
        itemsRef: canceledItems,
        loadingRef: isCanceledLoading,
      },
    };

    const config = tabLifecycleMap[newTab];
    if (config !== undefined) {
      await fetchLifecycleItems({ ...config, showLoading: true });
    }
  }
});

watch(comparisonTabItems, (availableTabs) => {
  if (availableTabs.includes(currentTab.value)) {
    return;
  }

  setCurrentTabFromRoute("Summary");
  void router.replace(getComparisonTabRoute("Summary"));
});

watch(
  computed(() => `${displayLanguage.value}:${spokenLanguages.value.join(",")}`),
  async () => {
    if (!isActive.value) return;
    loadedLiveRankingFrame.value = undefined;
    if (isLivePaused.value) {
      await selectLive();
      return;
    }
    await handleChildRefresh({ refetchCheckpoints: false });
  }
);
</script>

<style scoped lang="scss">
.container {
  background-color: white;
  padding: 1rem;
  border-radius: 25px;
  border-color: #e9e9f1;
  border-width: 1px;
  margin-bottom: 5rem;
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

.checkpoint-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.analysis-controls {
  display: flex;
  justify-content: flex-end;
}

.learn-more-content {
  font-size: 0.9rem;
  line-height: 1.5;
  color: $color-text-weak;

  p {
    margin: 0 0 0.75rem;
  }
}

.learn-more-reference {
  font-size: 0.85rem;
}

.learn-more-link {
  color: $primary;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
