<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('analysisTabTest')" :center-content="true" />
  </Teleport>

  <div class="page-container">
    <PrimeCard class="control-card">
      <template #title>
        <div class="section-header">
          <i class="pi pi-cog section-icon"></i>
          <span>{{ t("controls") }}</span>
        </div>
      </template>
      <template #content>
        <div class="controls-row">
          <div class="control-item">
            <label for="cluster-count" class="control-label">
              {{ t("clusterCountLabel") }}
            </label>
            <PrimeSelect
              id="cluster-count"
              v-model="selectedClusterCount"
              :options="clusterCountOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="variant-entitlement" class="control-label">
              Variant entitlement
            </label>
            <PrimeSelect
              id="variant-entitlement"
              v-model="analysisVariantsMode"
              :options="analysisVariantsOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="analysis-availability" class="control-label">
              Analysis availability
            </label>
            <PrimeSelect
              id="analysis-availability"
              v-model="analysisAvailabilityMode"
              :options="analysisAvailabilityOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="recommended-variant" class="control-label">
              Auto
            </label>
            <PrimeSelect
              id="recommended-variant"
              v-model="recommendedDefaultMode"
              :options="variantSelectionOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="facilitator-variant" class="control-label">
              Facilitator preference
            </label>
            <PrimeSelect
              id="facilitator-variant"
              v-model="facilitatorPreferenceMode"
              :options="variantSelectionOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="group-state-override" class="control-label">
              Group state override
            </label>
            <PrimeSelect
              id="group-state-override"
              v-model="groupStateOverride"
              :options="groupStateOverrideOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="ai-feature" class="control-label">LLM feature</label>
            <PrimeSelect
              id="ai-feature"
              v-model="aiFeatureMode"
              :options="aiFeatureOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="ai-labels" class="control-label">
              {{ t("aiLabelsLabel") }}
            </label>
            <PrimeSelect
              id="ai-labels"
              v-model="aiLabelMode"
              :options="aiLabelOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="distribution" class="control-label">
              Group-size scenario
            </label>
            <PrimeSelect
              id="distribution"
              v-model="distributionMode"
              :options="distributionOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="score-profile" class="control-label">
              Variant scores
            </label>
            <PrimeSelect
              id="score-profile"
              v-model="scoreProfileMode"
              :options="scoreProfileOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="number-scale" class="control-label">
              {{ tSurveyControls("numberScaleLabel") }}
            </label>
            <PrimeSelect
              id="number-scale"
              v-model="numberScale"
              :options="numberScaleOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="ungrouped" class="control-label">
              {{ t("ungroupedLabel") }}
            </label>
            <PrimeSelect
              id="ungrouped"
              v-model="ungroupedMode"
              :options="ungroupedOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="empty-sections" class="control-label">
              {{ t("emptySectionsLabel") }}
            </label>
            <PrimeSelect
              id="empty-sections"
              v-model="emptySectionsMode"
              :options="emptySectionsOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="vote-completion" class="control-label">
              Vote completion
            </label>
            <PrimeSelect
              id="vote-completion"
              v-model="voteCompletionMode"
              :options="voteCompletionOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="mock-latency" class="control-label">
              Mock backend latency
            </label>
            <PrimeSelect
              id="mock-latency"
              v-model="mockBackendLatencyMs"
              :options="mockBackendLatencyOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
            <label class="checkbox-row">
              <input v-model="mockLatencyAppliesToAuto" type="checkbox" />
              <span>Apply latency to auto mock</span>
            </label>
          </div>

          <div class="control-item">
            <label for="viewer-access" class="control-label">
              {{ tSurveyControls("viewerAccessLabel") }}
            </label>
            <PrimeSelect
              id="viewer-access"
              v-model="surveyViewerAccess"
              :options="viewerAccessOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="survey-scenario" class="control-label">
              {{ tSurveyControls("reportSurveyDataLabel") }}
            </label>
            <PrimeSelect
              id="survey-scenario"
              v-model="surveyScenario"
              :options="surveyScenarioOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>

          <div class="control-item">
            <label for="survey-status" class="control-label">
              Survey status
            </label>
            <PrimeSelect
              id="survey-status"
              v-model="surveyGateScenario"
              :options="surveyStatusOptions"
              option-label="label"
              option-value="value"
              class="control-select"
            />
          </div>
        </div>

        <div class="control-section">
          <div class="control-section-title">Checkpoints</div>
          <div class="control-buttons">
            <PrimeButton
              label="Small set"
              size="small"
              @click="setCheckpointCount(4)"
            />
            <PrimeButton
              label="Many checkpoints"
              size="small"
              @click="setCheckpointCount(40)"
            />
            <PrimeButton
              label="Add checkpoint"
              size="small"
              @click="addCheckpoint"
            />
            <PrimeButton
              label="Remove checkpoint"
              size="small"
              severity="secondary"
              @click="removeCheckpoint"
            />
            <PrimeButton
              label="Live"
              size="small"
              @click="selectCheckpoint(undefined)"
            />
            <PrimeButton
              label="Freeze latest"
              size="small"
              severity="info"
              @click="freezeLatestCheckpoint"
            />
          </div>

          <label class="checkbox-row">
            <input v-model="latestIsCurrent" type="checkbox" />
            <span>Latest checkpoint is current live frame</span>
          </label>

          <div class="reason-controls">
            <div class="control-label">Checkpoint reasons</div>
            <label
              v-for="reasonOption in reasonOptions"
              :key="reasonOption.reason"
              class="checkbox-row"
            >
              <input
                :checked="selectedReasons.includes(reasonOption.reason)"
                type="checkbox"
                @change="toggleReason(reasonOption.reason)"
              />
              <span>{{ reasonOption.label }}</span>
            </label>
          </div>
        </div>

        <p class="control-section section-description">
          Use the floating live-event dock while looking at the preview. It
          mutates the mock query data without moving your scroll position.
        </p>
      </template>
    </PrimeCard>

    <PrimeCard class="preview-card">
      <template #title>
        <div class="section-header">
          <i class="pi pi-chart-bar section-icon"></i>
          <span>{{ t("analysisPreview") }}</span>
        </div>
      </template>
      <template #content>
        <div
          ref="actionBarElement"
          class="sticky-below-header sticky-action-bar dev-action-bar"
          :style="{ '--header-height': `${actionBarHeaderOffset}px` }"
        >
          <PostActionBar
            v-model="conversationTab"
            :compact-mode="false"
            :opinion-count="mockOpinionCount"
            :participant-count="mockParticipantCount"
            :vote-count="mockVoteCount"
            :total-participant-count="mockParticipantCount"
            :total-vote-count="mockVoteCount"
            :is-loading="isDevAnalysisLoading"
            :conversation-slug-id="mockConversationSlugId"
            :conversation-title="t('devConversationTitle')"
            author-username="dev"
            :conversation-type-config="{ conversationType: 'polis' }"
            :has-survey="hasMockSurvey"
            :enable-route-navigation="false"
            :on-same-tab-click="scrollToDevActionBar"
          />
        </div>

        <div v-if="conversationTab === 'comment'" class="comment-placeholder">
          {{ t("commentPlaceholder") }}
        </div>

        <AnalysisPage
          v-else
          :conversation-slug-id="mockConversationSlugId"
          conversation-author-username="dev"
          conversation-organization-name=""
          :analysis-query="analysisQuery"
          :analysis-checkpoints-query="analysisCheckpointsQuery"
          :live-conversation-view-snapshot-id="liveSnapshotId"
          :survey-query="surveyResultsQuery"
          :has-survey="hasMockSurvey"
          :survey-gate="mockSurveyGate"
          :ai-labeling-enabled="aiLabelingEnabled"
          :show-report-button="false"
          :is-live-analysis-paused="isLiveAnalysisPaused"
          :is-conversation-closed="mockSnapshotMetrics.isClosed"
          :navigate-to-discover-tab="handleDevVoteMore"
          :conversation-scroll-context="conversationScrollContext"
          @update:live-analysis-paused="setLiveAnalysisPaused"
        />
      </template>
    </PrimeCard>

    <div v-if="conversationTab === 'analysis'" class="live-event-dock">
      <div class="live-event-dock__header">
        <span class="live-event-dock__title">Simulate live</span>
        <span class="live-event-dock__status">{{ liveEventStatus }}</span>
      </div>
      <div class="live-event-dock__details">
        <div>{{ variantStatusSummary }}</div>
        <div>{{ groupSizeSummary }}</div>
        <div>{{ aiStatusSummary }}</div>
        <div>{{ statementListStatusSummary }}</div>
      </div>
      <PrimeButton
        :label="autoMockButtonLabel"
        :severity="autoLiveAnalysis ? 'danger' : 'success'"
        size="small"
        class="live-event-dock__auto-button"
        @click="toggleAutoMockBackend"
      />
      <div class="live-event-dock__next-event">
        <label for="next-live-event" class="live-event-dock__next-label">
          Pick a specific event, then trigger it
        </label>
        <PrimeSelect
          id="next-live-event"
          v-model="selectedNextLiveEventKind"
          :options="liveEventKindOptions"
          option-label="label"
          option-value="value"
          class="live-event-dock__select"
        />
        <PrimeButton
          :label="selectedLiveEventButtonLabel"
          size="small"
          severity="info"
          @click="
            simulateSelectedLiveEvent({ kind: selectedNextLiveEventKind })
          "
        />
      </div>
      <div class="live-event-dock__button-title">Manual event shortcuts</div>
      <div class="live-event-dock__buttons">
        <PrimeButton label="Vote" size="small" @click="simulateVoteEvent" />
        <PrimeButton
          label="Add top statement"
          size="small"
          @click="simulateStatementEvent"
        />
        <PrimeButton
          label="Participants"
          size="small"
          @click="simulateParticipantEvent"
        />
        <PrimeButton
          label="LLM labels"
          size="small"
          @click="simulateAiLabelEvent"
        />
        <PrimeButton
          label="Recommended"
          size="small"
          @click="simulateRecommendedDefaultEvent"
        />
        <PrimeButton
          label="Discourage variant"
          size="small"
          @click="simulateDiscourageGroupEvent"
        />
        <PrimeButton
          label="Unavailable variant"
          size="small"
          @click="simulateUnavailableGroupEvent"
        />
        <PrimeButton
          label="Clear variant state"
          size="small"
          @click="simulateClearGroupStateEvent"
        />
        <PrimeButton
          label="Shuffle agreements"
          size="small"
          @click="simulateAgreementOrderEvent"
        />
        <PrimeButton
          label="Shuffle disagreements"
          size="small"
          @click="simulateDisagreementOrderEvent"
        />
        <PrimeButton
          label="Shuffle divisive"
          size="small"
          @click="simulateDivisiveOrderEvent"
        />
        <PrimeButton
          label="Swap top"
          size="small"
          @click="simulateStatementSwapEvent"
        />
        <PrimeButton
          label="Remove top statement"
          size="small"
          severity="secondary"
          @click="simulateRemoveStatementEvent"
        />
        <PrimeButton
          label="Mixed update"
          size="small"
          severity="help"
          @click="simulateMixedUpdateEvent"
        />
        <PrimeButton
          label="Group sizes"
          size="small"
          @click="simulateGroupShiftEvent"
        />
        <PrimeButton
          label="Checkpoint"
          size="small"
          severity="success"
          @click="simulateCheckpointEvent"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import Card from "primevue/card";
import Select from "primevue/select";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AnalysisPage from "src/components/post/analysis/AnalysisPage.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisCheckpoint,
  AnalysisViewState,
  FetchAnalysisCheckpointsResponse,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import type {
  AnalysisOpinionItem,
  AnalysisView,
  PolisClusters,
  SurveyGateStatus,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import {
  getUpdatedAnalysisRouteQuery,
  parseAnalysisViewQuery,
  parseCheckpointQuery,
} from "src/utils/analysis/analysisRoute";
import type { AnalysisData } from "src/utils/api/comment/comment";
import { formatAmount } from "src/utils/common";
import { shouldHideGroupAnalysis } from "src/utils/component/opinion";
import {
  getElementScrollTop,
  getHeaderHeight,
  getScrollTop,
  scrollTo,
} from "src/utils/html/scroll";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type AnalysisReportTestTranslations,
  analysisReportTestTranslations,
} from "./analysis-report-test.i18n";
import {
  type AiLabelMode,
  aiSummaries,
  buildMockSurveyResults,
  longAiLabels,
  mockStatements,
  polisKeys,
  shortAiLabels,
  type SurveyScenario,
} from "./analysisTestData";
import {
  type OpinionGroupVisualizationTranslations,
  opinionGroupVisualizationTranslations,
} from "./opinion-group-visualization.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
    PrimeSelect: Select,
  },
});

type ClusterCount = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type VariantGroupCount = 2 | 3 | 4 | 5 | 6;
type VariantSelectionMode = "auto" | "none" | VariantGroupCount;
type GroupStateOverride =
  | "none"
  | `discouraged-${VariantGroupCount}`
  | `unavailable-${VariantGroupCount}`;
type AnalysisVariantsMode = "enabled" | "locked";
type AnalysisAvailabilityMode = "available" | "noAnalysis";
type AiFeatureMode = "enabled" | "disabled";
type DevAiLabelMode = AiLabelMode | "partial";
type DistributionMode = "balanced" | "imbalanced" | "singleton";
type ScoreProfileMode = "balanced" | "smallBest" | "largeBest" | "flat";
type NumberScale = "normal" | "large" | "veryLarge";
type UngroupedMode = "none" | "some" | "many";
type EmptySectionsMode =
  | "none"
  | "all"
  | "agreements"
  | "disagreements"
  | "divisive"
  | "noSurvey";
type VoteCompletionMode = "moreVotes" | "complete";
type MockBackendLatencyMs = 0 | 250 | 750 | 1500 | 3000;
type LiveEventSource = "manual" | "auto";
type LiveEventKind =
  | "vote"
  | "statement"
  | "participants"
  | "aiLabels"
  | "recommendedDefault"
  | "discourageGroup"
  | "unavailableGroup"
  | "clearGroupState"
  | "agreementOrder"
  | "disagreementOrder"
  | "divisiveOrder"
  | "statementSwap"
  | "removeStatement"
  | "mixedUpdate"
  | "groupSize"
  | "checkpoint";
type CheckpointReason = AnalysisCheckpoint["reasons"][number]["reason"];
type AnalysisViewOption = AnalysisViewState["options"][number];
type MockResolvedAnalysisView = {
  groupCount: VariantGroupCount | undefined;
  resolvedBy: AnalysisViewState["resolvedBy"];
};
type MockAiPayloadStatus = "configured" | "missing" | "partial" | "updated";

interface MockAiPayload {
  labels: Array<string | undefined> | undefined;
  summaries: Array<string | undefined> | undefined;
  status: MockAiPayloadStatus;
}

type SurveyGateScenario =
  | "completeValid"
  | "needsUpdate"
  | "inProgress"
  | "notStartedRequired"
  | "notStartedOptional"
  | "noSurvey";

const variantGroupCounts: VariantGroupCount[] = [2, 3, 4, 5, 6];
const autoLiveEventKinds: LiveEventKind[] = [
  "vote",
  "statement",
  "participants",
  "aiLabels",
  "recommendedDefault",
  "discourageGroup",
  "unavailableGroup",
  "clearGroupState",
  "agreementOrder",
  "disagreementOrder",
  "divisiveOrder",
  "statementSwap",
  "removeStatement",
  "mixedUpdate",
  "groupSize",
  "checkpoint",
];
const participantScaleMultipliers = {
  normal: 1,
  large: 600,
  veryLarge: 600_000,
} satisfies Record<NumberScale, number>;
const mockConversationSlugId = "dev-test";
const baseCheckpointId = 1000;
const baseTime = new Date("2026-05-23T00:00:00Z");

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});

const { t } = useComponentI18n<OpinionGroupVisualizationTranslations>(
  opinionGroupVisualizationTranslations
);

const { t: tSurveyControls } = useComponentI18n<AnalysisReportTestTranslations>(
  analysisReportTestTranslations
);

const route = useRoute();
const router = useRouter();
const conversationTab = ref<"comment" | "analysis">("analysis");
const actionBarElement = ref<HTMLElement | null>(null);
const headerHeight = ref(0);
const { reveal: headerRevealed } = storeToRefs(useLayoutHeaderStore());

const selectedClusterCount = ref<ClusterCount>(3);
const analysisVariantsMode = ref<AnalysisVariantsMode>("enabled");
const analysisAvailabilityMode = ref<AnalysisAvailabilityMode>("available");
const recommendedDefaultMode = ref<VariantSelectionMode>("auto");
const facilitatorPreferenceMode = ref<VariantSelectionMode>(5);
const groupStateOverride = ref<GroupStateOverride>("none");
const aiFeatureMode = ref<AiFeatureMode>("enabled");
const aiLabelMode = ref<DevAiLabelMode>("long");
const distributionMode = ref<DistributionMode>("balanced");
const scoreProfileMode = ref<ScoreProfileMode>("balanced");
const numberScale = ref<NumberScale>("normal");
const ungroupedMode = ref<UngroupedMode>("none");
const emptySectionsMode = ref<EmptySectionsMode>("none");
const voteCompletionMode = ref<VoteCompletionMode>("moreVotes");
const mockBackendLatencyMs = ref<MockBackendLatencyMs>(0);
const mockLatencyAppliesToAuto = ref(true);
const surveyViewerAccess = ref<"public" | "owner">("owner");
const surveyScenario = ref<SurveyScenario>("visible");
const surveyGateScenario = ref<SurveyGateScenario>("completeValid");
const checkpointCount = ref(4);
const latestIsCurrent = ref(true);
const selectedReasons = ref<CheckpointReason[]>([
  "first_displayable_analysis",
  "first_group_count_available",
  "major_participation_milestone",
]);
const isLiveAnalysisPaused = ref(false);
const autoLiveAnalysis = ref(false);
const selectedNextLiveEventKind = ref<LiveEventKind>("vote");
const autoLiveEventCursor = ref(0);
const currentLiveEventSource = ref<LiveEventSource>("manual");
const lastCommittedLiveEventSource = ref<LiveEventSource>("manual");
const liveEventSerial = ref(0);
const liveVoteBump = ref(0);
const liveOpinionBump = ref(0);
const liveParticipantBump = ref(0);
const liveScoreShift = ref(0);
const liveAiPayloadSerial = ref(0);
const removedStatementBump = ref(0);
const agreementOrderShift = ref(0);
const disagreementOrderShift = ref(0);
const divisiveOrderShift = ref(0);
const statementSwapSerial = ref(0);
const lastLiveEventLabel = ref("No event yet");

const selectedRouteAnalysisView = computed(() =>
  parseAnalysisViewQuery({ query: route.query })
);
const selectedRouteCheckpoint = computed(() =>
  parseCheckpointQuery({ query: route.query })
);
const requestedAnalysisView = computed<AnalysisView>(
  () => selectedRouteAnalysisView.value ?? "facilitator_preference"
);

const actionBarHeaderOffset = computed(() =>
  headerRevealed.value ? headerHeight.value : 0
);

const aiLabelingEnabled = computed(() => aiFeatureMode.value === "enabled");
const analysisVariantsEnabled = computed(
  () => analysisVariantsMode.value === "enabled"
);
const mockAiPayload = computed<MockAiPayload>(() => getMockAiPayload());
const effectiveBackendAiLabelMode = computed<AiLabelMode>(() => {
  if (mockAiPayload.value.labels === undefined) {
    return "none";
  }

  return aiLabelMode.value === "partial" ? "long" : aiLabelMode.value;
});

const liveEventStatus = computed(
  () =>
    `${lastLiveEventLabel.value} · snapshot ${String(
      mockSnapshotMetrics.value.conversationViewSnapshotId
    )} · latency ${formatMockLatencyLabel({ latencyMs: getMockBackendLatencyMs() })}`
);

const variantStatusSummary = computed(() => {
  const state = mockAnalysisViewState.value;
  const defaultGroupCount = defaultVariantGroupCount.value;
  const facilitatorGroupCount = getFacilitatorGroupCount(defaultGroupCount);
  const score =
    state.resolvedGroupCount === null
      ? "no score"
      : `score ${formatScore({ groupCount: state.resolvedGroupCount })}`;

  return `Variant: ${state.resolvedBy}, current ${state.resolvedGroupCount ?? "none"}, default ${defaultGroupCount ?? "none"}, facilitator ${facilitatorGroupCount ?? "none"}, ${score}, ${getSelectionScoreProfileLabel()}, override ${groupStateOverride.value}`;
});

const groupSizeSummary = computed(() => {
  const clusterSizes = Object.values(mockClusters.value)
    .map((cluster) => cluster?.numUsers)
    .filter((count): count is number => count !== undefined);

  if (clusterSizes.length === 0) {
    return shouldHideMockGroupAnalysis.value
      ? "Groups hidden by singleton privacy rule"
      : "Groups: none";
  }

  return `Groups: ${distributionMode.value}, sizes ${clusterSizes
    .map((count) => formatAmount(count))
    .join(" / ")}`;
});

const aiStatusSummary = computed(() => {
  if (!aiLabelingEnabled.value) {
    return "LLM labels hidden by feature flag";
  }

  switch (mockAiPayload.value.status) {
    case "configured":
      return `LLM labels: ${aiLabelMode.value}`;
    case "missing":
      return "LLM labels: backend omitted, UI falls back to A/B/C";
    case "partial":
      return "LLM labels: mixed payload, one group is pending";
    case "updated":
      return `LLM labels: refreshed v${String(liveAiPayloadSerial.value)}`;
  }

  return "LLM labels: unknown payload";
});

const statementListStatusSummary = computed(
  () =>
    `Statements: +${String(liveOpinionBump.value)} / -${String(
      removedStatementBump.value
    )}, order A${String(agreementOrderShift.value)} D${String(
      disagreementOrderShift.value
    )} V${String(divisiveOrderShift.value)}, swaps ${String(
      statementSwapSerial.value
    )}`
);

const selectedLiveEventButtonLabel = computed(
  () => `Trigger: ${getLiveEventKindLabel(selectedNextLiveEventKind.value)}`
);

const autoMockButtonLabel = computed(() =>
  autoLiveAnalysis.value ? "Pause auto mock" : "Play auto mock"
);

const conversationScrollContext = computed<ConversationScrollContext>(() => ({
  actionBarElement: actionBarElement.value,
  scrollContainerElement: null,
  getScrollPosition: () => getScrollTop({ scrollContainer: null }),
  getElementScrollPosition: ({ element }: { element: HTMLElement }) =>
    getElementScrollTop({ element, scrollContainer: null }),
  scrollToPosition: ({
    top,
    behavior,
  }: {
    top: number;
    behavior: ScrollBehavior;
  }) => {
    scrollTo({ top, behavior, scrollContainer: null });
  },
}));

onMounted(() => {
  headerHeight.value = getHeaderHeight();
});

let autoLiveAnalysisInterval: ReturnType<typeof setInterval> | undefined;

watch(
  autoLiveAnalysis,
  (isEnabled) => {
    if (autoLiveAnalysisInterval !== undefined) {
      clearInterval(autoLiveAnalysisInterval);
      autoLiveAnalysisInterval = undefined;
    }

    if (!isEnabled) {
      return;
    }

    autoLiveAnalysisInterval = setInterval(() => {
      simulateMockBackendLiveEvent();
    }, 2000);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (autoLiveAnalysisInterval !== undefined) {
    clearInterval(autoLiveAnalysisInterval);
  }
});

function scrollToDevActionBar(): void {
  const element = actionBarElement.value;
  if (element === null) {
    return;
  }

  scrollTo({
    top: Math.max(
      0,
      getElementScrollTop({ element, scrollContainer: null }) -
        getHeaderHeight()
    ),
    behavior: "smooth",
    scrollContainer: null,
  });
}

const clusterCountOptions = computed(() => [
  { label: t("clusterCount0"), value: 0 },
  { label: t("clusterCount1"), value: 1 },
  { label: t("clusterCount2"), value: 2 },
  { label: t("clusterCount3"), value: 3 },
  { label: t("clusterCount4"), value: 4 },
  { label: t("clusterCount5"), value: 5 },
  { label: t("clusterCount6"), value: 6 },
]);

const analysisVariantsOptions = [
  { label: "Has variants entitlement", value: "enabled" },
  { label: "No variants entitlement", value: "locked" },
] satisfies Array<{ label: string; value: AnalysisVariantsMode }>;

const analysisAvailabilityOptions = [
  { label: "Analysis available", value: "available" },
  { label: "No analysis yet", value: "noAnalysis" },
] satisfies Array<{ label: string; value: AnalysisAvailabilityMode }>;

const variantSelectionOptions = [
  { label: "Auto", value: "auto" },
  { label: "None", value: "none" },
  ...variantGroupCounts.map((count) => ({
    label: `${String(count)} groups`,
    value: count,
  })),
] satisfies Array<{ label: string; value: VariantSelectionMode }>;

const groupStateOverrideOptions = [
  { label: "None", value: "none" },
  ...variantGroupCounts.map((count) => ({
    label: `${String(count)} groups discouraged`,
    value: `discouraged-${count}` as const,
  })),
  ...variantGroupCounts.map((count) => ({
    label: `${String(count)} groups unavailable`,
    value: `unavailable-${count}` as const,
  })),
] satisfies Array<{ label: string; value: GroupStateOverride }>;

const aiFeatureOptions = [
  { label: "LLM enabled", value: "enabled" },
  { label: "LLM disabled", value: "disabled" },
] satisfies Array<{ label: string; value: AiFeatureMode }>;

const aiLabelOptions = computed(() => [
  { label: "Long LLM labels", value: "long" },
  { label: "Short LLM labels", value: "short" },
  { label: "Mixed LLM content", value: "partial" },
  { label: t("withoutAiLabels"), value: "none" },
]);

const distributionOptions = computed(() => [
  { label: "Even group sizes", value: "balanced" },
  { label: "One dominant group", value: "imbalanced" },
  { label: "Singleton edge case", value: "singleton" },
]);

const scoreProfileOptions = [
  { label: "Balanced score curve", value: "balanced" },
  { label: "Smaller groups score best", value: "smallBest" },
  { label: "Larger groups score best", value: "largeBest" },
  { label: "Flat scores", value: "flat" },
] satisfies Array<{ label: string; value: ScoreProfileMode }>;

const numberScaleOptions = computed(() => [
  { label: tSurveyControls("numberScaleNormal"), value: "normal" },
  { label: tSurveyControls("numberScaleLarge"), value: "large" },
  {
    label: tSurveyControls("numberScaleVeryLarge"),
    value: "veryLarge",
  },
]);

const emptySectionsOptions = computed(() => [
  { label: t("emptySectionsNone"), value: "none" },
  { label: t("emptySectionsAll"), value: "all" },
  { label: t("emptySectionsAgreements"), value: "agreements" },
  { label: t("emptySectionsDisagreements"), value: "disagreements" },
  { label: t("emptySectionsDivisive"), value: "divisive" },
  { label: "No survey", value: "noSurvey" },
]);

const voteCompletionOptions = [
  { label: "Needs more votes", value: "moreVotes" },
  { label: "Voted on everything", value: "complete" },
] satisfies Array<{ label: string; value: VoteCompletionMode }>;

const mockBackendLatencyOptions = [
  { label: "Off", value: 0 },
  { label: "250 ms", value: 250 },
  { label: "750 ms", value: 750 },
  { label: "1.5 s", value: 1500 },
  { label: "3 s", value: 3000 },
] satisfies Array<{ label: string; value: MockBackendLatencyMs }>;

const liveEventKindOptions = autoLiveEventKinds.map((value) => ({
  label: getLiveEventKindLabel(value),
  value,
}));

const viewerAccessOptions = computed(() => [
  {
    label: tSurveyControls("viewerAccessPublic"),
    value: "public",
  },
  {
    label: tSurveyControls("viewerAccessOwner"),
    value: "owner",
  },
]);

const surveyScenarioOptions = computed(() => [
  { label: "Visible by group", value: "visible" },
  { label: "Suppressed by group", value: "suppressed" },
  {
    label: "Suppressed incl. overall",
    value: "overallSuppressed",
  },
  { label: "Mixed groups", value: "mixed" },
  { label: "No results yet", value: "empty" },
]);

const surveyStatusOptions = [
  { label: "Complete valid", value: "completeValid" },
  { label: "Needs update", value: "needsUpdate" },
  { label: "In progress", value: "inProgress" },
  { label: "Not started (required)", value: "notStartedRequired" },
  { label: "Not started (optional)", value: "notStartedOptional" },
  { label: "No survey", value: "noSurvey" },
] satisfies Array<{ label: string; value: SurveyGateScenario }>;

const reasonOptions = computed<{ reason: CheckpointReason; label: string }[]>(
  () => [
    { reason: "first_displayable_analysis", label: "First analysis" },
    { reason: "first_group_count_available", label: "Group count available" },
    { reason: "default_group_count_changed", label: "Default changed" },
    { reason: "major_participation_milestone", label: "Participant milestone" },
    { reason: "major_vote_milestone", label: "Vote milestone" },
    { reason: "conversation_closed", label: "Conversation closed" },
  ]
);

const effectiveSurveyScenario = computed<SurveyScenario>(() =>
  emptySectionsMode.value === "noSurvey" ? "absent" : surveyScenario.value
);

const participantScaleMultiplier = computed(
  () => participantScaleMultipliers[numberScale.value]
);

const ungroupedCounts = computed<Record<UngroupedMode, number>>(() => ({
  none: 0,
  some: 15 * participantScaleMultiplier.value,
  many: 120 * participantScaleMultiplier.value,
}));

function formatOptionCountLabel({
  label,
  count,
}: {
  label: string;
  count: number;
}): string {
  const formattedCount = `(${formatAmount(count)})`;

  if (/\([^)]*\)\s*$/.test(label)) {
    return label.replace(/\([^)]*\)\s*$/, formattedCount);
  }

  return `${label} ${formattedCount}`;
}

const ungroupedOptions = computed(() => [
  { label: t("ungroupedNone"), value: "none" },
  {
    label: formatOptionCountLabel({
      label: t("ungroupedSome"),
      count: ungroupedCounts.value.some,
    }),
    value: "some",
  },
  {
    label: formatOptionCountLabel({
      label: t("ungroupedMany"),
      count: ungroupedCounts.value.many,
    }),
    value: "many",
  },
]);

function getLiveEventKindLabel(kind: LiveEventKind): string {
  switch (kind) {
    case "vote":
      return "vote";
    case "statement":
      return "statement";
    case "participants":
      return "participants";
    case "aiLabels":
      return "LLM labels";
    case "recommendedDefault":
      return "variant scores";
    case "discourageGroup":
      return "discourage variant";
    case "unavailableGroup":
      return "unavailable variant";
    case "clearGroupState":
      return "clear variant state";
    case "agreementOrder":
      return "agreement order";
    case "disagreementOrder":
      return "disagreement order";
    case "divisiveOrder":
      return "divisive order";
    case "statementSwap":
      return "swap top statements";
    case "removeStatement":
      return "remove statement";
    case "mixedUpdate":
      return "mixed update";
    case "groupSize":
      return "group sizes";
    case "checkpoint":
      return "checkpoint";
  }
}

function getBaseAiLabels(): string[] | undefined {
  switch (aiLabelMode.value) {
    case "long":
      return longAiLabels;
    case "short":
      return shortAiLabels;
    case "partial":
      return longAiLabels;
    case "none":
      return undefined;
  }
}

function getMockAiPayload(): MockAiPayload {
  if (aiLabelMode.value === "partial") {
    return {
      labels: longAiLabels.map((label, index) =>
        index === 1 ? undefined : label
      ),
      summaries: aiSummaries.map((summary, index) =>
        index === 1 ? undefined : summary
      ),
      status: "partial",
    };
  }

  const baseLabels = getBaseAiLabels();
  if (baseLabels === undefined) {
    return { labels: undefined, summaries: undefined, status: "configured" };
  }

  const payloadMode = liveAiPayloadSerial.value % 3;
  if (payloadMode === 1) {
    return { labels: undefined, summaries: undefined, status: "missing" };
  }

  if (payloadMode === 2) {
    return {
      labels: baseLabels.map(
        (label, index) =>
          `${label} v${String(liveAiPayloadSerial.value)}.${String(index + 1)}`
      ),
      summaries: aiSummaries.map(
        (summary) =>
          `${summary} Updated in mock snapshot ${String(liveAiPayloadSerial.value)}.`
      ),
      status: "updated",
    };
  }

  return { labels: baseLabels, summaries: aiSummaries, status: "configured" };
}

function formatMockLatencyLabel({ latencyMs }: { latencyMs: number }): string {
  if (latencyMs === 0) {
    return "off";
  }

  if (latencyMs < 1000) {
    return `${String(latencyMs)}ms`;
  }

  return `${(latencyMs / 1000).toFixed(1)}s`;
}

function getMockBackendLatencyMs(): number {
  if (
    lastCommittedLiveEventSource.value === "auto" &&
    !mockLatencyAppliesToAuto.value
  ) {
    return 0;
  }

  return mockBackendLatencyMs.value;
}

async function waitForMockBackendLatency(): Promise<void> {
  const latencyMs = getMockBackendLatencyMs();
  if (latencyMs <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, latencyMs));
}

function getFixedGroupCount(view: AnalysisView): VariantGroupCount | undefined {
  switch (view) {
    case "2":
      return 2;
    case "3":
      return 3;
    case "4":
      return 4;
    case "5":
      return 5;
    case "6":
      return 6;
    case "facilitator_preference":
    case "auto":
      return undefined;
  }
}

function getAnalysisViewForGroupCount(count: VariantGroupCount): AnalysisView {
  switch (count) {
    case 2:
      return "2";
    case 3:
      return "3";
    case 4:
      return "4";
    case 5:
      return "5";
    case 6:
      return "6";
  }
}

function getFacilitatorGroupCount(
  defaultGroupCount: VariantGroupCount | undefined
): VariantGroupCount | undefined {
  if (facilitatorPreferenceMode.value === "none") {
    return undefined;
  }

  if (facilitatorPreferenceMode.value !== "auto") {
    return facilitatorPreferenceMode.value;
  }

  return defaultGroupCount;
}

function getSelectionScore({ groupCount }: { groupCount: number }): number {
  if (isSpecialGroupState({ groupCount, state: "discouraged" })) {
    return 0.38;
  }

  const baseScore = (() => {
    switch (scoreProfileMode.value) {
      case "balanced":
        return 1 - Math.abs(groupCount - 3) * 0.08;
      case "smallBest":
        return 1 - (groupCount - 2) * 0.09;
      case "largeBest":
        return 1 - (6 - groupCount) * 0.09;
      case "flat":
        return 0.72;
    }
  })();
  const boostedGroupCount =
    variantGroupCounts[liveScoreShift.value % variantGroupCounts.length];

  if (boostedGroupCount === undefined || liveScoreShift.value === 0) {
    return baseScore;
  }

  return baseScore + (groupCount === boostedGroupCount ? 0.35 : 0);
}

function isSpecialGroupState({
  groupCount,
  state,
}: {
  groupCount: number;
  state: "discouraged" | "unavailable";
}): boolean {
  return groupStateOverride.value === `${state}-${groupCount}`;
}

function getSelectionScoreProfileLabel(): string {
  const boostedGroupCount =
    variantGroupCounts[liveScoreShift.value % variantGroupCounts.length];

  if (boostedGroupCount === undefined || liveScoreShift.value === 0) {
    return scoreProfileMode.value;
  }

  return `${scoreProfileMode.value}+${String(boostedGroupCount)}`;
}

function formatScore({ groupCount }: { groupCount: number }): string {
  return getSelectionScore({ groupCount }).toFixed(2);
}

function createAnalysisViewCandidate(groupCount: VariantGroupCount) {
  return {
    candidateId: 5000 + groupCount,
    groupCount,
    assessment: {
      selectionScore: getSelectionScore({ groupCount }),
      silhouetteScore: isSpecialGroupState({
        groupCount,
        state: "discouraged",
      })
        ? -0.2
        : 0.72 - Math.abs(groupCount - 3) * 0.04,
      balanceScore: isSpecialGroupState({ groupCount, state: "discouraged" })
        ? 0.38
        : distributionMode.value === "balanced"
          ? 0.9
          : 0.42,
    },
  };
}

function createCandidateBackedOption({
  view,
  groupCount,
  status,
  resolvesToView,
}: {
  view: AnalysisView;
  groupCount: VariantGroupCount;
  status: "recommended" | "available" | "discouraged";
  resolvesToView?: AnalysisView;
}): AnalysisViewOption {
  return {
    view,
    status,
    candidate: createAnalysisViewCandidate(groupCount),
    ...(resolvesToView === undefined ? {} : { resolvesToView }),
  };
}

function createLockedOption(view: AnalysisView): AnalysisViewOption {
  return {
    view,
    status: "locked",
    reason: "analysis_variants_not_available",
    ...(view === "facilitator_preference"
      ? { resolvesToView: "auto" }
      : {}),
  };
}

function createRecommendedUnavailableOption(
  view: AnalysisView
): AnalysisViewOption {
  return {
    view,
    status: "unavailable",
    reason: "recommended_default_unavailable",
    ...(view === "facilitator_preference"
      ? { resolvesToView: "auto" }
      : {}),
  };
}

function createFixedUnavailableOption(
  groupCount: VariantGroupCount
): AnalysisViewOption {
  return {
    view: getAnalysisViewForGroupCount(groupCount),
    status: "unavailable",
    reason: "fixed_group_count_unavailable",
    groupCount,
  };
}

const defaultVariantGroupCount = computed<VariantGroupCount | undefined>(() => {
  if (recommendedDefaultMode.value === "none") {
    return undefined;
  }

  if (recommendedDefaultMode.value !== "auto") {
    return recommendedDefaultMode.value;
  }

  return getBestScoredGroupCount();
});

function getBestScoredGroupCount(): VariantGroupCount | undefined {
  let bestGroupCount: VariantGroupCount | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const groupCount of variantGroupCounts) {
    if (isSpecialGroupState({ groupCount, state: "unavailable" })) {
      continue;
    }

    const score = getSelectionScore({ groupCount });
    if (score > bestScore) {
      bestScore = score;
      bestGroupCount = groupCount;
    }
  }

  return bestGroupCount;
}

function getVariantGroupCountFromResolvedGroupCount(
  count: number | null
): VariantGroupCount | undefined {
  switch (count) {
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    case 5:
      return 5;
    case 6:
      return 6;
    case null:
    default:
      return undefined;
  }
}

function buildAnalysisViewOptions({
  defaultGroupCount,
  facilitatorGroupCount,
}: {
  defaultGroupCount: VariantGroupCount | undefined;
  facilitatorGroupCount: VariantGroupCount | undefined;
}): AnalysisViewOption[] {
  if (analysisAvailabilityMode.value === "noAnalysis") {
    return [
      analysisVariantsEnabled.value
        ? createRecommendedUnavailableOption("facilitator_preference")
        : createLockedOption("facilitator_preference"),
      createRecommendedUnavailableOption("auto"),
      ...variantGroupCounts.map((groupCount) =>
        analysisVariantsEnabled.value
          ? createFixedUnavailableOption(groupCount)
          : createLockedOption(getAnalysisViewForGroupCount(groupCount))
      ),
    ];
  }

  if (!analysisVariantsEnabled.value) {
    return [
      createLockedOption("facilitator_preference"),
      defaultGroupCount === undefined
        ? createRecommendedUnavailableOption("auto")
        : createCandidateBackedOption({
            view: "auto",
            groupCount: defaultGroupCount,
            status: "recommended",
          }),
      ...variantGroupCounts.map((groupCount) =>
        createLockedOption(getAnalysisViewForGroupCount(groupCount))
      ),
    ];
  }

  return [
    facilitatorGroupCount === undefined
      ? createRecommendedUnavailableOption("facilitator_preference")
      : createCandidateBackedOption({
          view: "facilitator_preference",
          groupCount: facilitatorGroupCount,
          status:
            facilitatorGroupCount === defaultGroupCount
              ? "recommended"
              : "available",
          resolvesToView: getAnalysisViewForGroupCount(facilitatorGroupCount),
        }),
    defaultGroupCount === undefined
      ? createRecommendedUnavailableOption("auto")
      : createCandidateBackedOption({
          view: "auto",
          groupCount: defaultGroupCount,
          status: "recommended",
        }),
    ...variantGroupCounts.map((groupCount) =>
      isSpecialGroupState({ groupCount, state: "unavailable" })
        ? createFixedUnavailableOption(groupCount)
        : createCandidateBackedOption({
            view: getAnalysisViewForGroupCount(groupCount),
            groupCount,
            status:
              groupCount === defaultGroupCount
                ? "recommended"
                : isSpecialGroupState({ groupCount, state: "discouraged" })
                  ? "discouraged"
                  : "available",
          })
    ),
  ];
}

const mockAnalysisViewState = computed<AnalysisViewState>(() => {
  const requestedView = requestedAnalysisView.value;
  const fixedGroupCount = getFixedGroupCount(requestedView);
  const defaultGroupCount = defaultVariantGroupCount.value;
  const facilitatorGroupCount = getFacilitatorGroupCount(defaultGroupCount);
  const canonicalView = analysisVariantsEnabled.value
    ? requestedView
    : "auto";

  const resolved: MockResolvedAnalysisView = (() => {
    if (!analysisVariantsEnabled.value && requestedView !== "auto") {
      return {
        groupCount: defaultGroupCount,
        resolvedBy: "locked_fallback",
      };
    }

    if (canonicalView === "auto") {
      return {
        groupCount: defaultGroupCount,
        resolvedBy:
          defaultGroupCount === undefined ? "no_analysis" : "auto",
      };
    }

    if (canonicalView === "facilitator_preference") {
      return {
        groupCount: facilitatorGroupCount ?? defaultGroupCount,
        resolvedBy:
          facilitatorGroupCount === undefined
            ? "no_analysis"
            : "facilitator_preference",
      };
    }

    if (fixedGroupCount !== undefined) {
      return {
        groupCount:
          isSpecialGroupState({
            groupCount: fixedGroupCount,
            state: "unavailable",
          })
            ? undefined
            : fixedGroupCount,
        resolvedBy:
          isSpecialGroupState({
            groupCount: fixedGroupCount,
            state: "unavailable",
          })
            ? "unavailable_fixed_count"
            : "fixed_count",
      };
    }

    return {
      groupCount: undefined,
      resolvedBy: "no_analysis",
    };
  })();

  return {
    requestedView,
    canonicalView,
    resolvedGroupCount: resolved.groupCount ?? null,
    resolvedCandidateId:
      resolved.groupCount === undefined ? null : 5000 + resolved.groupCount,
    resolvedBy: resolved.resolvedBy,
    variantsEnabled: analysisVariantsEnabled.value,
    options: buildAnalysisViewOptions({
      defaultGroupCount,
      facilitatorGroupCount,
    }),
  };
});

const activeClusterCount = computed<ClusterCount>(() => {
  const resolvedGroupCount = getVariantGroupCountFromResolvedGroupCount(
    mockAnalysisViewState.value.resolvedGroupCount
  );

  if (resolvedGroupCount !== undefined) {
    return resolvedGroupCount;
  }

  switch (mockAnalysisViewState.value.resolvedBy) {
    case "no_analysis":
    case "unavailable_fixed_count":
      return 0;
    case "facilitator_fallback":
    case "facilitator_preference":
    case "fixed_count":
    case "locked_fallback":
    case "auto":
      return selectedClusterCount.value;
  }

  return selectedClusterCount.value;
});

function getDeterministicRatio(seed: number): number {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

function getDeterministicInt({
  seed,
  min,
  max,
}: {
  seed: number;
  min: number;
  max: number;
}): number {
  return min + Math.floor(getDeterministicRatio(seed) * (max - min + 1));
}

function generateClusterStats({
  clusterCount,
  seed,
}: {
  clusterCount: number;
  seed: number;
}): AnalysisOpinionItem["clustersStats"] {
  const stats: AnalysisOpinionItem["clustersStats"] = [];
  for (let i = 0; i < clusterCount; i++) {
    const baseNumUsers = getDeterministicInt({
      seed: seed + i * 7,
      min: 5,
      max: 24,
    });
    const baseNumAgrees = getDeterministicInt({
      seed: seed + i * 11,
      min: 0,
      max: baseNumUsers,
    });
    const baseRemaining = baseNumUsers - baseNumAgrees;
    const baseNumDisagrees = getDeterministicInt({
      seed: seed + i * 13,
      min: 0,
      max: baseRemaining,
    });

    stats.push({
      key: polisKeys[i],
      isAuthorInCluster: i === 0,
      numUsers: baseNumUsers * participantScaleMultiplier.value,
      numAgrees: baseNumAgrees * participantScaleMultiplier.value,
      numDisagrees: baseNumDisagrees * participantScaleMultiplier.value,
      numPasses:
        (baseRemaining - baseNumDisagrees) * participantScaleMultiplier.value,
    });
  }
  return stats;
}

function generateMockOpinion({
  index,
  clusterCount,
}: {
  index: number;
  clusterCount: number;
}): AnalysisOpinionItem {
  const seed = index + clusterCount * 31;
  const isLiveAddedOpinion = index >= 10000;
  const baseNumParticipants = getDeterministicInt({ seed, min: 30, max: 59 });
  const agreeRatio = 0.3 + getDeterministicRatio(seed + 3) * 0.5;
  const disagreeRatio = 0.3 + getDeterministicRatio(seed + 5) * 0.5;
  const baseNumAgrees = Math.floor(baseNumParticipants * agreeRatio);
  const baseRemaining = baseNumParticipants - baseNumAgrees;
  const baseNumDisagrees = Math.floor(baseRemaining * disagreeRatio);
  const baseNumPasses = baseRemaining - baseNumDisagrees;

  return {
    opinionSlugId: `mock-op-${index}`,
    createdAt: new Date("2025-11-20"),
    updatedAt: new Date("2025-11-20"),
    opinion: `Mock #${String(index + 1).padStart(3, "0")}: ${
      mockStatements[index % mockStatements.length]
    }`,
    sourceLanguageCode: null,
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      status: "available",
      mode: "original",
      content: {
        content: `Mock #${String(index + 1).padStart(3, "0")}: ${
          mockStatements[index % mockStatements.length]
        }`,
      },
      translationControl: null,
    },
    numParticipants: baseNumParticipants * participantScaleMultiplier.value,
    numAgrees: baseNumAgrees * participantScaleMultiplier.value,
    numDisagrees: baseNumDisagrees * participantScaleMultiplier.value,
    numPasses: baseNumPasses * participantScaleMultiplier.value,
    username: `user${index + 1}`,
    moderation: { status: "unmoderated" },
    isSeed: false,
    clustersStats: generateClusterStats({ clusterCount, seed }),
    groupAwareConsensusAgree: isLiveAddedOpinion
      ? 0.95
      : 0.6 + getDeterministicRatio(seed + 7) * 0.35,
    groupAwareConsensusDisagree: isLiveAddedOpinion
      ? 0.95
      : 0.6 + getDeterministicRatio(seed + 9) * 0.35,
    divisiveScore: isLiveAddedOpinion
      ? 4
      : getDeterministicRatio(seed + 11) * 4,
  };
}

function distributeCount({
  total,
  weights,
}: {
  total: number;
  weights: number[];
}): number[] {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightTotal <= 0) {
    return weights.map(() => 0);
  }

  const counts = weights.map((weight) =>
    Math.floor((total * weight) / weightTotal)
  );
  let assigned = counts.reduce((sum, count) => sum + count, 0);
  let index = 0;
  while (assigned < total && counts.length > 0) {
    const current = counts[index];
    if (current !== undefined) {
      counts[index] = current + 1;
      assigned += 1;
    }
    index = (index + 1) % counts.length;
  }

  return counts;
}

function getClusterSizes({
  clusterCount,
  total,
}: {
  clusterCount: number;
  total: number;
}): number[] {
  if (distributionMode.value === "singleton" && clusterCount > 1) {
    const singletonCount = clusterCount - 1;
    return [
      Math.max(total - singletonCount, 0),
      ...Array.from({ length: singletonCount }, () => 1),
    ];
  }

  if (distributionMode.value === "balanced") {
    return distributeCount({
      total,
      weights: Array.from({ length: clusterCount }, () => 1),
    });
  }

  return distributeCount({
    total,
    weights: Array.from({ length: clusterCount }, (_value, index) =>
      index === 0 ? 18 : 1
    ),
  });
}

const mockCheckpoints = computed<FetchAnalysisCheckpointsResponse>(() =>
  Array.from({ length: checkpointCount.value }, (_value, index) => {
    const id = baseCheckpointId + index;
    const activatedAt = new Date(baseTime.getTime() + index * 17 * 60 * 1000);
    const reasons = selectedReasons.value
      .filter(
        (_reason, reasonIndex) => index === 0 || (index + reasonIndex) % 2 === 0
      )
      .map((reason) => ({
        reason,
        groupCount:
          reason === "default_group_count_changed" ||
          reason === "first_group_count_available"
            ? Math.min(6, Math.max(2, 2 + (index % 5)))
            : null,
        previousGroupCount:
          reason === "default_group_count_changed"
            ? Math.min(6, Math.max(2, 2 + ((index + 4) % 5)))
            : null,
        participantCount:
          reason === "major_participation_milestone"
            ? (20 + index * 3) * participantScaleMultiplier.value
            : null,
        participantMilestone:
          reason === "major_participation_milestone"
            ? (20 + index * 3) * participantScaleMultiplier.value
            : null,
        voteCount:
          reason === "major_vote_milestone"
            ? (100 + index * 50) * participantScaleMultiplier.value
            : null,
        voteMilestone:
          reason === "major_vote_milestone"
            ? (100 + index * 50) * participantScaleMultiplier.value
            : null,
      }));

    const opinionCount = Math.max(
      0,
      10 + index + liveOpinionBump.value - removedStatementBump.value
    );
    const voteCount =
      (100 + index * 50) * participantScaleMultiplier.value +
      liveVoteBump.value;
    const participantCount =
      (20 + index * 3) * participantScaleMultiplier.value +
      liveParticipantBump.value;

    return {
      conversationViewSnapshotId: id,
      createdAt: activatedAt,
      activatedAt,
      opinionCount,
      voteCount,
      participantCount,
      totalOpinionCount: opinionCount,
      totalVoteCount: voteCount,
      totalParticipantCount: participantCount,
      moderatedOpinionCount: opinionCount,
      hiddenOpinionCount: 0,
      isClosed: reasons.some((reason) => reason.reason === "conversation_closed"),
      reasons,
    };
  })
);

const latestCheckpoint = computed(() => mockCheckpoints.value.at(-1));
const selectedCheckpoint = computed(() =>
  mockCheckpoints.value.find(
    (checkpoint) =>
      checkpoint.conversationViewSnapshotId === selectedRouteCheckpoint.value
  )
);
const liveSnapshotId = computed(() => {
  const latestId = latestCheckpoint.value?.conversationViewSnapshotId;
  if (latestId === undefined) {
    return baseCheckpointId + liveEventSerial.value + 1;
  }

  return latestIsCurrent.value
    ? latestId + liveEventSerial.value
    : latestId + liveEventSerial.value + 1;
});

const mockSnapshotMetrics = computed(() => {
  const checkpoint = selectedCheckpoint.value;
  if (checkpoint !== undefined) {
    return {
      conversationViewSnapshotId: checkpoint.conversationViewSnapshotId,
      analysisSnapshotId: checkpoint.conversationViewSnapshotId + 5000,
      opinionCount: checkpoint.opinionCount,
      voteCount: checkpoint.voteCount,
      participantCount: checkpoint.participantCount,
      isClosed: checkpoint.isClosed,
    };
  }

  const groupCount = activeClusterCount.value;
  const baseParticipants =
    (groupCount === 0 ? 0 : groupCount === 1 ? 90 : 150 + groupCount * 55) *
    participantScaleMultiplier.value;
  const participantCount =
    baseParticipants +
    ungroupedCounts.value[ungroupedMode.value] +
    liveParticipantBump.value;
  const opinionCount = Math.max(
    0,
    18 + groupCount * 3 + liveOpinionBump.value - removedStatementBump.value
  );
  const voteCount =
    participantCount * Math.max(3, groupCount + 4) + liveVoteBump.value;

  return {
    conversationViewSnapshotId: liveSnapshotId.value,
    analysisSnapshotId: liveSnapshotId.value + 5000,
    opinionCount,
    voteCount,
    participantCount,
    isClosed: false,
  };
});

const mockParticipantCount = computed(
  () => mockSnapshotMetrics.value.participantCount
);
const mockOpinionCount = computed(() => mockSnapshotMetrics.value.opinionCount);
const mockVoteCount = computed(() => mockSnapshotMetrics.value.voteCount);

const mockClusters = computed<Partial<PolisClusters>>(() => {
  const clusterCount = activeClusterCount.value;
  if (clusterCount === 0) {
    return {};
  }

  const clusters: Partial<PolisClusters> = {};
  const aiPayload = mockAiPayload.value;
  const clusteredParticipantCount = Math.max(
    0,
    mockParticipantCount.value - ungroupedCounts.value[ungroupedMode.value]
  );
  const clusterSizes = getClusterSizes({
    clusterCount,
    total: clusteredParticipantCount,
  });

  for (let i = 0; i < clusterCount; i++) {
    const key = polisKeys[i];
    const representative: AnalysisOpinionItem[] = [];
    for (let j = 0; j < 5; j++) {
      representative.push(
        generateMockOpinion({
          index: i * 5 + j,
          clusterCount,
        })
      );
    }

    clusters[key] = {
      key,
      numUsers: clusterSizes[i] ?? 0,
      aiLabel: aiPayload.labels?.[i],
      aiSummary: aiPayload.summaries?.[i],
      isUserInCluster: i === 0,
      representative,
    };
  }

  return clusters;
});

const shouldHideMockGroupAnalysis = computed(() =>
  shouldHideGroupAnalysis(mockClusters.value)
);

function getDynamicStatementIndexes({
  baseStartIndex,
  baseCount,
  orderShift,
}: {
  baseStartIndex: number;
  baseCount: number;
  orderShift: number;
}): number[] {
  const baseIndexes = Array.from(
    { length: baseCount },
    (_value, index) => baseStartIndex + index
  );

  const liveAddedIndexes = Array.from(
    { length: liveOpinionBump.value },
    (_value, index) =>
      baseStartIndex + 10000 + liveOpinionBump.value - index - 1
  );

  const indexes = [...liveAddedIndexes, ...baseIndexes].slice(
    removedStatementBump.value
  );

  applyLocalizedRankChange({ indexes, orderShift });

  if (indexes.length > 1 && statementSwapSerial.value % 2 === 1) {
    const first = indexes[0];
    const second = indexes[1];
    if (first !== undefined && second !== undefined) {
      indexes[0] = second;
      indexes[1] = first;
    }
  }

  return indexes;
}

function applyLocalizedRankChange({
  indexes,
  orderShift,
}: {
  indexes: number[];
  orderShift: number;
}): void {
  if (orderShift <= 0 || indexes.length < 2) {
    return;
  }

  const visibleWindowSize = Math.min(6, indexes.length);
  const sourceIndex = 1 + ((orderShift - 1) % (visibleWindowSize - 1));
  const targetIndex = Math.max(0, sourceIndex - 2);
  const movedIndexes = indexes.splice(sourceIndex, 1);
  const movedIndex = movedIndexes[0];
  if (movedIndex === undefined) {
    return;
  }

  indexes.splice(targetIndex, 0, movedIndex);
}

function generateMockOpinionsForIndexes({
  indexes,
}: {
  indexes: number[];
}): AnalysisOpinionItem[] {
  return indexes.map((index) =>
    generateMockOpinion({ index, clusterCount: activeClusterCount.value })
  );
}

const mockAgreementItems = computed(() => {
  if (activeClusterCount.value === 0) return [];
  if (
    emptySectionsMode.value === "all" ||
    emptySectionsMode.value === "agreements"
  )
    return [];
  return generateMockOpinionsForIndexes({
    indexes: getDynamicStatementIndexes({
      baseStartIndex: 0,
      baseCount: 20,
      orderShift: agreementOrderShift.value,
    }),
  });
});

const mockDisagreementItems = computed(() => {
  if (activeClusterCount.value === 0) return [];
  if (
    emptySectionsMode.value === "all" ||
    emptySectionsMode.value === "disagreements"
  )
    return [];
  return generateMockOpinionsForIndexes({
    indexes: getDynamicStatementIndexes({
      baseStartIndex: 100,
      baseCount: 15,
      orderShift: disagreementOrderShift.value,
    }),
  });
});

const mockDivisiveItems = computed(() => {
  if (activeClusterCount.value === 0) return [];
  if (
    emptySectionsMode.value === "all" ||
    emptySectionsMode.value === "divisive"
  )
    return [];
  const items = generateMockOpinionsForIndexes({
    indexes: getDynamicStatementIndexes({
      baseStartIndex: 200,
      baseCount: 8,
      orderShift: divisiveOrderShift.value,
    }),
  });
  return items.filter((item) => item.divisiveScore > 0);
});

const mockAnalysisData = computed<AnalysisData>(() => {
  const hideGroupAnalysis = shouldHideMockGroupAnalysis.value;

  return {
    consensusAgree: hideGroupAnalysis ? [] : mockAgreementItems.value,
    consensusDisagree: hideGroupAnalysis ? [] : mockDisagreementItems.value,
    controversial: hideGroupAnalysis ? [] : mockDivisiveItems.value,
    polisClusters: hideGroupAnalysis ? {} : mockClusters.value,
    conversationViewSnapshotId:
      mockSnapshotMetrics.value.conversationViewSnapshotId,
    analysisSnapshotId: mockSnapshotMetrics.value.analysisSnapshotId,
    conversationViewSnapshot: {
      conversationViewSnapshotId:
        mockSnapshotMetrics.value.conversationViewSnapshotId,
      analysisSnapshotId: mockSnapshotMetrics.value.analysisSnapshotId,
      opinionCount: mockSnapshotMetrics.value.opinionCount,
      voteCount: mockSnapshotMetrics.value.voteCount,
      participantCount: mockSnapshotMetrics.value.participantCount,
      totalOpinionCount: mockSnapshotMetrics.value.opinionCount,
      totalVoteCount: mockSnapshotMetrics.value.voteCount,
      totalParticipantCount: mockSnapshotMetrics.value.participantCount,
      moderatedOpinionCount: mockSnapshotMetrics.value.opinionCount,
      hiddenOpinionCount: 0,
      isClosed: mockSnapshotMetrics.value.isClosed,
    },
    emptyReason:
      mockAnalysisViewState.value.resolvedBy === "unavailable_fixed_count"
        ? `Agora could not form ${String(requestedAnalysisView.value)} meaningful groups for this checkpoint.`
        : undefined,
    analysisViewState: mockAnalysisViewState.value,
    hasVotedOnAllAvailableOpinions: voteCompletionMode.value === "complete",
  };
});

const analysisQuery = useQuery<AnalysisData, Error>({
  queryKey: computed(() => [
    "dev-analysis-tab-analysis",
    requestedAnalysisView.value,
    selectedRouteCheckpoint.value,
    selectedClusterCount.value,
    analysisVariantsMode.value,
    analysisAvailabilityMode.value,
    recommendedDefaultMode.value,
    facilitatorPreferenceMode.value,
    groupStateOverride.value,
    aiFeatureMode.value,
    aiLabelMode.value,
    liveAiPayloadSerial.value,
    distributionMode.value,
    scoreProfileMode.value,
    numberScale.value,
    ungroupedMode.value,
    emptySectionsMode.value,
    voteCompletionMode.value,
    liveEventSerial.value,
    liveVoteBump.value,
    liveOpinionBump.value,
    liveParticipantBump.value,
    liveScoreShift.value,
    removedStatementBump.value,
    agreementOrderShift.value,
    disagreementOrderShift.value,
    divisiveOrderShift.value,
    statementSwapSerial.value,
  ]),
  queryFn: async () => {
    await waitForMockBackendLatency();
    return mockAnalysisData.value;
  },
  enabled: computed(
    () => conversationTab.value === "analysis" && !isLiveAnalysisPaused.value
  ),
  staleTime: Infinity,
  placeholderData: (previousData) => previousData,
});

const analysisCheckpointsQuery = useQuery<
  FetchAnalysisCheckpointsResponse,
  Error
>({
  queryKey: computed(() => [
    "dev-analysis-tab-checkpoints",
    checkpointCount.value,
    selectedReasons.value.join(","),
    latestIsCurrent.value,
    numberScale.value,
    liveEventSerial.value,
    liveVoteBump.value,
    liveOpinionBump.value,
    liveParticipantBump.value,
    removedStatementBump.value,
  ]),
  queryFn: async () => {
    await waitForMockBackendLatency();
    return mockCheckpoints.value;
  },
  enabled: computed(() => conversationTab.value === "analysis"),
  staleTime: Infinity,
  placeholderData: (previousData) => previousData,
});

const isDevAnalysisLoading = computed(
  () =>
    ((analysisQuery.isPending.value || analysisQuery.isRefetching.value) &&
      analysisQuery.data.value === undefined) ||
    ((analysisCheckpointsQuery.isPending.value ||
      analysisCheckpointsQuery.isRefetching.value) &&
      analysisCheckpointsQuery.data.value === undefined)
);

const mockSurveyResults = computed<SurveyResultsAggregatedResponse>(() =>
  buildMockSurveyResults({
    clusterCount: activeClusterCount.value,
    aiLabelMode: effectiveBackendAiLabelMode.value,
    surveyViewerAccess: surveyViewerAccess.value,
    surveyScenario: effectiveSurveyScenario.value,
    responseScaleMultiplier: participantScaleMultiplier.value,
  })
);

const hasMockSurvey = computed(
  () =>
    mockSurveyResults.value.hasSurvey && surveyGateScenario.value !== "noSurvey"
);

const surveyResultsQuery = useQuery<SurveyResultsAggregatedResponse, Error>({
  queryKey: computed(() => [
    "dev-analysis-tab-survey-results",
    activeClusterCount.value,
    effectiveBackendAiLabelMode.value,
    liveAiPayloadSerial.value,
    surveyViewerAccess.value,
    effectiveSurveyScenario.value,
    participantScaleMultiplier.value,
    surveyGateScenario.value,
  ]),
  queryFn: async () => {
    await waitForMockBackendLatency();
    return mockSurveyResults.value;
  },
  enabled: computed(() => hasMockSurvey.value),
  staleTime: Infinity,
  placeholderData: (previousData) => previousData,
});

const surveyStatusByScenario = {
  completeValid: "complete_valid",
  needsUpdate: "needs_update",
  inProgress: "in_progress",
  notStartedRequired: "not_started",
  notStartedOptional: "not_started",
  noSurvey: "no_survey",
} satisfies Record<SurveyGateScenario, SurveyGateStatus>;

const mockSurveyStatus = computed<SurveyGateStatus>(
  () => surveyStatusByScenario[surveyGateScenario.value]
);

const mockSurveyGate = computed<SurveyGateSummary>(() => ({
  hasSurvey: hasMockSurvey.value,
  isOptional: surveyGateScenario.value === "notStartedOptional",
  canParticipate:
    surveyGateScenario.value === "completeValid" ||
    surveyGateScenario.value === "notStartedOptional",
  status: mockSurveyStatus.value,
}));

watch(
  [mockCheckpoints, selectedRouteCheckpoint],
  ([checkpoints, checkpointId]) => {
    if (
      checkpointId !== undefined &&
      !checkpoints.some(
        (checkpoint) => checkpoint.conversationViewSnapshotId === checkpointId
      )
    ) {
      void selectCheckpoint(checkpoints.at(-1)?.conversationViewSnapshotId);
    }
  },
  { immediate: true }
);

function setLiveAnalysisPaused(paused: boolean): void {
  isLiveAnalysisPaused.value = paused;
}

function handleDevVoteMore(): void {
  conversationTab.value = "comment";
}

function setCheckpointCount(count: number): void {
  checkpointCount.value = Math.max(0, count);
}

function addCheckpoint(): void {
  checkpointCount.value += 1;
}

function removeCheckpoint(): void {
  checkpointCount.value = Math.max(0, checkpointCount.value - 1);
}

function restoreScrollPosition(scrollTop: number): void {
  requestAnimationFrame(() => {
    scrollTo({ top: scrollTop, behavior: "auto", scrollContainer: null });
  });
}

async function selectCheckpoint(
  checkpointViewSnapshotId: number | undefined
): Promise<void> {
  isLiveAnalysisPaused.value = false;

  if (checkpointViewSnapshotId === selectedRouteCheckpoint.value) {
    return;
  }

  const scrollTop = getScrollTop({ scrollContainer: null });
  try {
    await router.replace({
      path: route.path,
      query: getUpdatedAnalysisRouteQuery({
        query: route.query,
        analysisView: selectedRouteAnalysisView.value,
        checkpointViewSnapshotId,
      }),
    });
  } finally {
    restoreScrollPosition(scrollTop);
  }
}

function freezeLatestCheckpoint(): void {
  void selectCheckpoint(latestCheckpoint.value?.conversationViewSnapshotId);
}

function toggleReason(reason: CheckpointReason): void {
  selectedReasons.value = selectedReasons.value.includes(reason)
    ? selectedReasons.value.filter(
        (selectedReason) => selectedReason !== reason
      )
    : [...selectedReasons.value, reason];
}

function commitLiveEvent(): void {
  lastCommittedLiveEventSource.value = currentLiveEventSource.value;
  liveEventSerial.value += 1;
  void selectLiveCheckpointAfterEvent();
}

async function selectLiveCheckpointAfterEvent(): Promise<void> {
  await selectCheckpoint(undefined);
  await refreshDevAnalysisQueriesAfterLiveEvent();
}

async function refreshDevAnalysisQueriesAfterLiveEvent(): Promise<void> {
  if (conversationTab.value !== "analysis" || isLiveAnalysisPaused.value) {
    return;
  }

  await nextTick();
  await analysisQuery.refetch();
  await analysisCheckpointsQuery.refetch();
}

function simulateSelectedLiveEvent({ kind }: { kind: LiveEventKind }): void {
  switch (kind) {
    case "vote":
      simulateVoteEvent();
      return;
    case "statement":
      simulateStatementEvent();
      return;
    case "participants":
      simulateParticipantEvent();
      return;
    case "aiLabels":
      simulateAiLabelEvent();
      return;
    case "recommendedDefault":
      simulateRecommendedDefaultEvent();
      return;
    case "discourageGroup":
      simulateDiscourageGroupEvent();
      return;
    case "unavailableGroup":
      simulateUnavailableGroupEvent();
      return;
    case "clearGroupState":
      simulateClearGroupStateEvent();
      return;
    case "agreementOrder":
      simulateAgreementOrderEvent();
      return;
    case "disagreementOrder":
      simulateDisagreementOrderEvent();
      return;
    case "divisiveOrder":
      simulateDivisiveOrderEvent();
      return;
    case "statementSwap":
      simulateStatementSwapEvent();
      return;
    case "removeStatement":
      simulateRemoveStatementEvent();
      return;
    case "mixedUpdate":
      simulateMixedUpdateEvent();
      return;
    case "groupSize":
      simulateGroupShiftEvent();
      return;
    case "checkpoint":
      simulateCheckpointEvent();
      return;
  }
}

function simulateVoteEvent(): void {
  liveVoteBump.value += 37 * participantScaleMultiplier.value;
  lastLiveEventLabel.value = "New vote";
  commitLiveEvent();
}

function simulateStatementEvent(): void {
  liveOpinionBump.value += 1;
  liveVoteBump.value += 12 * participantScaleMultiplier.value;
  lastLiveEventLabel.value = "New statement";
  commitLiveEvent();
}

function simulateParticipantEvent(): void {
  liveParticipantBump.value += 9 * participantScaleMultiplier.value;
  liveVoteBump.value += 28 * participantScaleMultiplier.value;
  lastLiveEventLabel.value = "New participants";
  commitLiveEvent();
}

function simulateAiLabelEvent(): void {
  liveAiPayloadSerial.value += 1;
  lastLiveEventLabel.value = `LLM label payload: ${mockAiPayload.value.status}`;
  commitLiveEvent();
}

function simulateRecommendedDefaultEvent(): void {
  liveScoreShift.value += 1;
  lastLiveEventLabel.value = `Variant scores changed: default ${String(
    defaultVariantGroupCount.value ?? "none"
  )}`;
  commitLiveEvent();
}

function getLiveVariantGroupCount(): VariantGroupCount {
  const selectedGroupCount = getFixedGroupCount(requestedAnalysisView.value);
  if (selectedGroupCount !== undefined) {
    return selectedGroupCount;
  }

  return (
    variantGroupCounts[liveEventSerial.value % variantGroupCounts.length] ?? 2
  );
}

function simulateDiscourageGroupEvent(): void {
  const groupCount = getLiveVariantGroupCount();
  groupStateOverride.value = `discouraged-${groupCount}`;
  lastLiveEventLabel.value = `${String(groupCount)} groups discouraged for selected snapshot`;
  commitLiveEvent();
}

function simulateUnavailableGroupEvent(): void {
  const groupCount = getLiveVariantGroupCount();
  groupStateOverride.value = `unavailable-${groupCount}`;
  lastLiveEventLabel.value = `${String(groupCount)} groups unavailable for selected snapshot`;
  commitLiveEvent();
}

function simulateClearGroupStateEvent(): void {
  groupStateOverride.value = "none";
  lastLiveEventLabel.value = "Variant override cleared";
  commitLiveEvent();
}

function simulateAgreementOrderEvent(): void {
  agreementOrderShift.value += 1;
  lastLiveEventLabel.value = "Agreement statements reordered";
  commitLiveEvent();
}

function simulateDisagreementOrderEvent(): void {
  disagreementOrderShift.value += 1;
  lastLiveEventLabel.value = "Disagreement statements reordered";
  commitLiveEvent();
}

function simulateDivisiveOrderEvent(): void {
  divisiveOrderShift.value += 1;
  lastLiveEventLabel.value = "Divisive statements reordered";
  commitLiveEvent();
}

function simulateStatementSwapEvent(): void {
  statementSwapSerial.value += 1;
  lastLiveEventLabel.value = "Top statements swapped";
  commitLiveEvent();
}

function simulateRemoveStatementEvent(): void {
  removedStatementBump.value += 1;
  lastLiveEventLabel.value = "Top statement removed";
  commitLiveEvent();
}

function simulateMixedUpdateEvent(): void {
  liveVoteBump.value += 41 * participantScaleMultiplier.value;
  liveParticipantBump.value += 3 * participantScaleMultiplier.value;
  liveOpinionBump.value += 1;
  agreementOrderShift.value += 1;
  disagreementOrderShift.value += 1;
  statementSwapSerial.value += 1;
  lastLiveEventLabel.value = "Mixed live update";
  commitLiveEvent();
}

function toggleAutoMockBackend(): void {
  autoLiveAnalysis.value = !autoLiveAnalysis.value;
}

function simulateGroupShiftEvent(): void {
  switch (distributionMode.value) {
    case "balanced":
      distributionMode.value = "imbalanced";
      break;
    case "imbalanced":
      distributionMode.value = "singleton";
      break;
    case "singleton":
      distributionMode.value = "balanced";
      break;
  }

  liveParticipantBump.value += 1;
  lastLiveEventLabel.value = `Group-size scenario: ${distributionMode.value}`;
  commitLiveEvent();
}

function simulateCheckpointEvent(): void {
  latestIsCurrent.value = true;
  addCheckpoint();
  lastLiveEventLabel.value = "New checkpoint";
  commitLiveEvent();
}

function getAutoLiveEventKind(): LiveEventKind {
  return (
    autoLiveEventKinds[autoLiveEventCursor.value % autoLiveEventKinds.length] ??
    "vote"
  );
}

function simulateMockBackendLiveEvent(): void {
  const eventKind = getAutoLiveEventKind();
  selectedNextLiveEventKind.value = eventKind;
  currentLiveEventSource.value = "auto";
  simulateSelectedLiveEvent({ kind: eventKind });
  currentLiveEventSource.value = "manual";
  autoLiveEventCursor.value =
    (autoLiveEventCursor.value + 1) % autoLiveEventKinds.length;
  selectedNextLiveEventKind.value = getAutoLiveEventKind();
}
</script>

<style scoped lang="scss">
.page-container {
  padding: 2rem;
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.control-card,
.preview-card {
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0;
  color: $grey-8;
  font-size: 0.9rem;
  line-height: 1.4;
}

.controls-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  font-weight: var(--font-weight-medium);
  color: $grey-9;
  font-size: 0.875rem;
}

.control-select {
  min-width: 220px;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e9e9f1;
}

.control-section-title {
  color: $grey-9;
  font-weight: var(--font-weight-semibold);
}

.control-buttons,
.reason-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: $grey-8;
  font-size: 0.9rem;
}

.dev-action-bar {
  background-color: $app-background-color;
  margin-bottom: 1rem;
  z-index: 200;
}

.comment-placeholder {
  border: 1px dashed #d8d6de;
  border-radius: 16px;
  padding: 2rem;
  color: #6d6a74;
  background: white;
  text-align: center;
}

.live-event-dock {
  position: fixed;
  top: 5rem;
  inset-inline-end: 1rem;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: min(22rem, calc(100vw - 2rem));
  border: 1px solid #e9e9f1;
  border-radius: 18px;
  background: rgb(255 255 255 / 95%);
  padding: 0.75rem;
  box-shadow: 0 14px 35px rgb(44 42 51 / 14%);
  backdrop-filter: blur(10px);
}

.live-event-dock__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.live-event-dock__title {
  color: $grey-9;
  font-weight: var(--font-weight-semibold);
}

.live-event-dock__status {
  color: $grey-7;
  font-size: 0.8rem;
  text-align: end;
}

.live-event-dock__auto-button {
  width: fit-content;
}

.live-event-dock__next-event {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  align-items: end;
}

.live-event-dock__next-label {
  grid-column: 1 / -1;
  color: $grey-8;
  font-size: 0.8rem;
  font-weight: var(--font-weight-medium);
}

.live-event-dock__select {
  min-width: 0;
}

.live-event-dock__button-title {
  color: $grey-8;
  font-size: 0.8rem;
  font-weight: var(--font-weight-medium);
}

.live-event-dock__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

@media (max-width: $breakpoint-sm-max) {
  .dev-action-bar {
    position: static;
  }

  .live-event-dock {
    position: static;
    width: auto;
  }
}
</style>
