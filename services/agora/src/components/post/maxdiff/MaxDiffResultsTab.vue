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
    </div>

    <ShortcutBar
      :model-value="currentTab"
      :items="maxdiffTabItems"
      :get-label="getTabLabel"
      :get-route="getMaxDiffTabRoute"
      :on-same-tab-click="handleSameTabClick"
      @update:model-value="onTabChange"
    />

    <div v-if="currentTab === 'Survey'" class="tabComponent">
      <SurveyTab
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
        <MaxDiffMeSection
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
        <MaxDiffItemListSection
          :conversation-slug-id="conversationSlugId"
          :section-title="t('title')"
          :subtitle="t('subtitle')"
          :items="activeResultItems"
          :is-loading="false"
          :no-items-message="t('noResults')"
          :score-label="t('score')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Results')"
          :on-learn-more="() => (learnMoreContext = 'community')"
        />
      </div>

      <div v-if="hasSurvey && currentTab === 'Summary'" class="tabComponent">
        <SurveyTab
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
        <MaxDiffItemListSection
          :conversation-slug-id="conversationSlugId"
          :section-title="t('tabCompleted')"
          :subtitle="null"
          :items="activeCompletedItems"
          :is-loading="isCompletedLoading"
          :no-items-message="t('noItems')"
          :score-label="t('score')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Completed')"
          :on-learn-more="() => openLifecycleLearnMore('completed')"
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
        <MaxDiffItemListSection
          :conversation-slug-id="conversationSlugId"
          :section-title="t('tabCanceled')"
          :subtitle="null"
          :items="activeCanceledItems"
          :is-loading="isCanceledLoading"
          :no-items-message="t('noItems')"
          :score-label="t('score')"
          :compact-mode="currentTab === 'Summary'"
          :on-click-item="openStatementDialog"
          :on-switch-tab="() => onTabChange('Canceled')"
          :on-learn-more="() => openLifecycleLearnMore('canceled')"
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
            <p>{{ t("communityLearnMoreCocm") }}</p>
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
              ·
              <a
                href="https://ssrn.com/abstract=4311507"
                target="_blank"
                rel="noopener noreferrer"
                class="learn-more-link"
                >COCM</a
              >
            </p>
          </template>
          <template v-else>
            <p>{{ t("meLearnMorePersonal") }}</p>
            <p>{{ t("meLearnMoreCounts") }}</p>
          </template>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <!-- Lifecycle learn-more dialog -->
    <q-dialog v-model="showLifecycleInfoDialog" position="bottom">
      <ZKBottomDialogContainer :title="lifecycleInfoTitle">
        <div class="learn-more-content">
          <p>{{ lifecycleInfoContent }}</p>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <MaxDiffStatementDialog
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
import ShortcutBar from "src/components/post/analysis/shortcutBar/ShortcutBar.vue";
import {
  type SurveyTabTranslations,
  surveyTabTranslations,
} from "src/components/post/analysis/surveyTab/SurveyTab.i18n";
import SurveyTab from "src/components/post/analysis/surveyTab/SurveyTab.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import type { ConversationActionBarStats } from "src/composables/conversation/useConversationActionBarStats";
import type {
  ConversationScrollContext,
  RegisterChildRefreshHandler,
} from "src/composables/conversation/useConversationParentState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTabNavigation } from "src/composables/ui/useTabNavigation";
import type {
  MaxDiffItem,
  MaxDiffLoadResponse,
  MaxDiffResultItem,
  RankingStatsCheckpointReason,
  RankingStatsCheckpointsResponse,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import type {
  ExtendedConversationDisplayData,
  RankingItemDisplayedContent,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import {
  getUpdatedAnalysisRouteQuery,
  parseCheckpointQuery,
} from "src/utils/analysis/analysisRoute";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import {
  useMaxDiffLoadQuery,
  useRankingStatsCheckpointsQuery,
} from "src/utils/api/maxdiff/useMaxDiffQueries";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
import {
  type MaxDiffShortcutItem,
  maxdiffShortcutItemSchema,
} from "src/utils/component/analysis/maxdiffShortcutBar";
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

import type { MaxDiffListItem } from "./MaxDiffItemListSection.vue";
import MaxDiffItemListSection from "./MaxDiffItemListSection.vue";
import MaxDiffMeSection from "./MaxDiffMeSection.vue";
import {
  type MaxDiffResultsTabTranslations,
  maxDiffResultsTabTranslations,
} from "./MaxDiffResultsTab.i18n";
import MaxDiffStatementDialog from "./MaxDiffStatementDialog.vue";

const props = defineProps<{
  conversationData: ExtendedConversationDisplayData;
  navigateToVotingTab: () => void;
  conversationScrollContext: ConversationScrollContext;
}>();
const emit = defineEmits<{
  analysisLivePauseStats: [stats: ConversationActionBarStats | undefined];
}>();

const { t } = useComponentI18n<MaxDiffResultsTabTranslations>(
  maxDiffResultsTabTranslations
);
const { t: tAnalysis } = useComponentI18n<AnalysisPageTranslations>(
  analysisPageTranslations
);
const { t: tSurvey } = useComponentI18n<SurveyTabTranslations>(
  surveyTabTranslations
);

const { getMaxDiffResults, fetchMaxDiffItems } = useMaxDiffApi();
const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());

const route = useRoute();
const router = useRouter();

const { currentTab, handleSameTabClick, setCurrentTabFromRoute } =
  useTabNavigation({
    schema: maxdiffShortcutItemSchema,
    defaultTab: "Summary",
  });

function getMaxDiffTabRoute(item: string): RouteLocationRaw {
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

const maxdiffTabItems = computed<MaxDiffShortcutItem[]>(() => {
  const baseItems: MaxDiffShortcutItem[] = ["Summary", "Me", "Results"];
  if (hasSurvey.value) {
    baseItems.push("Survey");
  }
  if (hasLifecycleTabs.value) {
    baseItems.push("Completed", "Canceled");
  }
  return baseItems;
});

function isLifecycleTab(item: MaxDiffShortcutItem): boolean {
  return item === "Completed" || item === "Canceled";
}

function isTabAvailable(item: MaxDiffShortcutItem): boolean {
  if (item === "Survey") {
    return hasSurvey.value;
  }
  return hasLifecycleTabs.value || !isLifecycleTab(item);
}

if (!isTabAvailable(currentTab.value)) {
  setCurrentTabFromRoute("Summary");
  void router.replace(getMaxDiffTabRoute("Summary"));
}

const tabTranslationKeys = {
  Summary: "tabSummary",
  Me: "tabMe",
  Results: "tabResults",
  Completed: "tabCompleted",
  Canceled: "tabCanceled",
} satisfies Record<
  Exclude<MaxDiffShortcutItem, "Survey">,
  keyof MaxDiffResultsTabTranslations
>;

function getTabLabel(item: string): string {
  const parsed = maxdiffShortcutItemSchema.safeParse(item);
  if (!parsed.success) {
    return item;
  }

  if (parsed.data === "Survey") {
    return tSurvey("surveyTitle");
  }

  return t(tabTranslationKeys[parsed.data]);
}

function onTabChange(value: string): void {
  const parsed = maxdiffShortcutItemSchema.safeParse(value);
  if (parsed.success) {
    const nextTab = isTabAvailable(parsed.data) ? parsed.data : "Summary";
    if (selectedCheckpointId.value !== undefined && nextTab !== "Results") {
      setCurrentTabFromRoute(nextTab);
      void router.replace(getMaxDiffTabRoute(nextTab));
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
  resultItems: MaxDiffListItem[];
  actionBarStats: ConversationActionBarStats;
}

interface PausedRankingFrame extends LoadedLiveRankingFrame {
  checkpoints: RankingStatsCheckpointsResponse;
  surveyResults: SurveyResultsAggregatedResponse | undefined;
  loadData: MaxDiffLoadResponse | undefined;
  completedItems: MaxDiffListItem[];
  canceledItems: MaxDiffListItem[];
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
  return metadata.conversationType === "ranking"
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
    latestCheckpointId.value !== undefined &&
    latestCheckpointId.value === activeLiveRankingStatsSnapshotId.value
);
const timelineLiveLabel = computed(() =>
  props.conversationData.metadata.isClosed
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

  await router.replace(getMaxDiffTabRoute(currentTab.value));
  return true;
}

// Results data
const isInitialLoading = ref(true);
const hasError = ref(false);
const resultItems = ref<MaxDiffListItem[]>([]);
const activeResultItems = computed(
  () => pausedLiveFrame.value?.resultItems ?? resultItems.value
);
const activeParticipantCount = computed(
  () =>
    pausedLiveFrame.value?.actionBarStats.participantCount ??
    props.conversationData.metadata.participantCount
);
let latestResultsRequestId = 0;
let latestCheckpointValidationId = 0;
let isResultsFetchInFlight = false;
let hasQueuedResultsFetch = false;
let queuedResultsFetchShowsLoading = false;

// Me tab: user's personal ranking (data passed to MaxDiffMeSection)
const loadQuery = useMaxDiffLoadQuery({
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
const completedItems = ref<MaxDiffListItem[]>([]);
const isCompletedLoading = ref(true);
const canceledItems = ref<MaxDiffListItem[]>([]);
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
const showLifecycleInfoDialog = ref(false);
const lifecycleInfoTitle = ref("");
const lifecycleInfoContent = ref("");
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

function openLifecycleLearnMore(lifecycle: "completed" | "canceled"): void {
  const keyMap: Record<
    "completed" | "canceled",
    {
      title: keyof MaxDiffResultsTabTranslations;
      manual: keyof MaxDiffResultsTabTranslations;
      github: keyof MaxDiffResultsTabTranslations;
    }
  > = {
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
  };

  const keys = keyMap[lifecycle];
  lifecycleInfoTitle.value = t(keys.title);
  lifecycleInfoContent.value = t(
    hasLifecycleTabs.value ? keys.github : keys.manual
  );
  showLifecycleInfoDialog.value = true;
}

function mapApiItemsToListItems({
  apiItems,
}: {
  apiItems: MaxDiffItem[];
}): MaxDiffListItem[] {
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
  apiItems: MaxDiffResultItem[];
}): MaxDiffListItem[] {
  return apiItems.map((item) => ({
    slugId: item.itemSlugId,
    ...getRankingItemDisplayText({
      displayContent: item.displayContent,
    }),
    displayContent: item.displayContent,
    score: item.score ?? null,
    externalUrl: item.externalUrl ?? null,
  }));
}

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

  const response = await fetchMaxDiffItems({
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
  if (isResultsFetchInFlight) {
    hasQueuedResultsFetch = true;
    queuedResultsFetchShowsLoading ||= showLoading;
    return;
  }

  isResultsFetchInFlight = true;
  let nextFetchShowsLoading = showLoading;
  try {
    while (
      isActive.value &&
      isRankingContentVisible.value &&
      !isLivePaused.value
    ) {
      hasQueuedResultsFetch = false;
      queuedResultsFetchShowsLoading = false;
      await performResultsFetch({ showLoading: nextFetchShowsLoading });
      if (!hasQueuedResultsFetch) {
        break;
      }
      nextFetchShowsLoading = queuedResultsFetchShowsLoading;
    }
  } finally {
    isResultsFetchInFlight = false;
  }
}

async function performResultsFetch({
  showLoading,
}: {
  showLoading: boolean;
}): Promise<void> {
  const requestedCheckpointId = selectedCheckpointId.value;
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
      ? await getMaxDiffResults({
          conversationSlugId,
          requestedRankingStatsSnapshotId: requestedLiveSnapshotId,
        })
      : await getMaxDiffResults({
          conversationSlugId,
          rankingStatsSnapshotId: requestedCheckpointId,
        });

  if (
    requestId !== latestResultsRequestId ||
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
      loadedLiveRankingFrame.value = {
        rankingStatsSnapshotId: requestedLiveSnapshotId,
        resultItems: loadedResultItems,
        actionBarStats: getActionBarStatsFromMetadata(),
      };
    }
    hasError.value = false;
  } else if (showLoading || resultItems.value.length === 0) {
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
    if (isClosed && isLivePaused.value) {
      void selectLive();
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
        MaxDiffShortcutItem,
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

watch(maxdiffTabItems, (availableTabs) => {
  if (availableTabs.includes(currentTab.value)) {
    return;
  }

  setCurrentTabFromRoute("Summary");
  void router.replace(getMaxDiffTabRoute("Summary"));
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
