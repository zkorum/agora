<template>
  <div class="maxdiff-container">
    <!-- Loading state -->
    <PageLoadingSpinner
      v-if="
        isInitializingEngine ||
        itemsQuery.isPending.value ||
        (loadQuery.isPending.value && !loadQuery.isError.value)
      "
    />

    <!-- Items fetch error -->
    <ErrorRetryBlock
      v-else-if="itemsQuery.isError.value"
      :title="t('loadingError')"
      :retry-label="t('retryButton')"
      compact
      @retry="retryInitialize"
    />

    <!-- Initialization error (e.g. candidate set fetch failed) -->
    <ErrorRetryBlock
      v-else-if="initError || candidateResolutionError"
      :title="t('loadingError')"
      :retry-label="t('retryButton')"
      compact
      @retry="retryInitialize"
    />

    <!-- Completed ranking -->
    <div
      v-else-if="isComplete && finalRanking.length > 0"
      class="voting-section"
    >
      <div class="section-header-row">
        <div class="section-header">{{ t("complete") }}</div>
        <AnalysisActionButton
          type="learnMore"
          @action-click="showLearnMoreDialog = true"
        />
      </div>
      <div class="complete-message">{{ t("completeMessage") }}</div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        :label="t('viewMyRanking')"
        class="view-ranking-btn"
        @click="props.onViewAnalysis()"
      />
      <q-btn
        flat
        no-caps
        color="primary"
        :label="t('redoRanking')"
        style="align-self: flex-start"
        @click="handleRedoRanking"
      />
    </div>

    <!-- Not enough statements -->
    <div v-else-if="itemList.length < 2" class="info-message">
      {{ itemList.length === 0 ? t("noStatements") : t("needMoreStatements") }}
    </div>

    <!-- Active voting -->
    <div v-else-if="candidateItems.length > 0" class="voting-section">
      <div class="section-header-row">
        <div class="section-header">{{ t("title") }}</div>
        <AnalysisActionButton
          type="learnMore"
          @action-click="showLearnMoreDialog = true"
        />
      </div>

      <div class="step-indicator">
        <div class="step-item">
          <div
            class="step-circle step-circle-best"
            :class="{
              'step-active': selectedBest === null,
              'step-done': selectedBest !== null,
            }"
          >
            <q-icon v-if="selectedBest !== null" name="check" size="0.8rem" />
            <span v-else>1</span>
          </div>
          <span
            class="step-label"
            :class="{ 'step-label-active': selectedBest === null }"
          >
            {{ t("stepSelectBest") }}
          </span>
        </div>
        <div
          class="step-connector"
          :class="{ 'step-connector-done': selectedBest !== null }"
        ></div>
        <div class="step-item">
          <div
            class="step-circle step-circle-worst"
            :class="{
              'step-active': selectedBest !== null && selectedWorst === null,
            }"
          >
            <span>2</span>
          </div>
          <span
            class="step-label"
            :class="{
              'step-label-active':
                selectedBest !== null && selectedWorst === null,
            }"
          >
            {{ t("stepSelectWorst") }}
          </span>
        </div>
      </div>

      <div class="progress-row">
        <span class="progress-percent">{{ progressPercent }}%</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <span class="progress-encouragement">{{ t("votesCountMessage") }}</span>
        <q-btn
          v-if="canUndo"
          flat
          dense
          no-caps
          size="sm"
          color="primary"
          icon="mdi-undo"
          :label="t('undoLastVote')"
          @click="handleUndoClick"
        />
      </div>

      <div class="candidates-grid-wrapper">
        <div
          class="candidates-grid"
          :class="{ 'candidates-transitioning': isTransitioning }"
        >
          <div
            v-for="item in candidateItems"
            :key="item.slugId"
            class="candidate-card"
            role="button"
            tabindex="0"
            :class="{
              'selected-best': selectedBest === item.slugId,
              'selected-worst': selectedWorst === item.slugId,
            }"
            @click="handleCandidateClick(item.slugId)"
            @keydown.enter.prevent="handleCandidateClick(item.slugId)"
            @keydown.space.prevent="handleCandidateClick(item.slugId)"
          >
            <MaxDiffCandidateCardContent
              ref="candidateContentComponents"
              :conversation-slug-id="conversationSlugId"
              :item="item"
              @content-changed="checkTruncation"
            />
            <div class="candidate-label">
              <span v-if="selectedBest === item.slugId" class="label-best">
                {{ t("mostImportant") }}
              </span>
              <span
                v-else-if="selectedWorst === item.slugId"
                class="label-worst"
              >
                {{ t("leastImportant") }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="showTransitionSpinner" class="transition-spinner-overlay">
          <q-spinner-dots color="primary" size="2.5rem" />
        </div>
      </div>
    </div>

    <!-- Fallback: initialization in progress -->
    <PageLoadingSpinner v-else />

    <MaxDiffStatementDialog
      v-model="showStatementDialog"
      :conversation-slug-id="conversationSlugId"
      :item-slug-id="dialogItemSlugId"
      :display-content="dialogDisplayContent"
      :external-url="dialogExternalUrl"
      :vote-label="dialogVoteLabel"
      :vote-color="dialogVoteColor"
      :vote-flat="dialogVoteFlat"
      :on-vote="dialogVoteCallback"
    />

    <PreParticipationIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="voting"
      :conversation-slug-id="conversationData.metadata.conversationSlugId"
      :requires-zupass-event-slug="
        conversationData.metadata.requiresEventTicket
      "
      :needs-auth="needsLogin"
      :participation-mode="conversationData.metadata.participationMode"
    />

    <q-dialog v-model="showLearnMoreDialog" position="bottom">
      <ZKBottomDialogContainer :title="t('learnMoreTitle')">
        <div class="learn-more-content">
          <p>{{ t("learnMoreHow") }}</p>
          <p>{{ t("learnMoreWhy") }}</p>
          <p>
            <a
              href="#"
              class="learn-more-link"
              @click.prevent="openScoringDetail"
              >{{ t("learnMoreScoringLink") }}</a
            >
          </p>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <q-dialog v-model="showScoringDetailDialog" position="bottom">
      <ZKBottomDialogContainer :title="t('scoringDetailTitle')">
        <div class="learn-more-content">
          <p>{{ t("scoringDetailPipeline") }}</p>
          <p>{{ t("scoringDetailCocm") }}</p>
          <p class="learn-more-reference">
            {{ t("scoringDetailReference") }}
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
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import PreParticipationIntentionDialog from "src/components/authentication/intention/PreParticipationIntentionDialog.vue";
import AnalysisActionButton from "src/components/post/analysis/common/AnalysisActionButton.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import type { RegisterChildRefreshHandler } from "src/composables/conversation/useConversationParentState";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ExtendedConversationDisplayData,
  MaxDiffComparison,
  ParticipationBlockedReason,
  RankingItemDisplayedContent,
} from "src/shared/types/zod";
import {
  type MaxDiffSaveContext,
  useMaxDiffItemsQuery,
  useMaxDiffLoadQuery,
  useMaxDiffSaveMutation,
} from "src/utils/api/maxdiff/useMaxDiffQueries";
import {
  createMaxDiff,
  type MaxDiffInstance,
  recordMaxDiffVote,
  restoreMaxDiff,
} from "src/utils/maxdiff";
import {
  createMaxDiffCandidateDisplaySnapshot,
  type MaxDiffCandidateDisplayItem,
  retryMaxDiffCandidateResolution,
} from "src/utils/maxdiffCandidateDisplay";
import { getRankingItemDisplayText } from "src/utils/translation/rankingItemDisplayText";
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  triggerRef,
  watch,
} from "vue";

import MaxDiffCandidateCardContent from "./MaxDiffCandidateCardContent.vue";
import MaxDiffStatementDialog from "./MaxDiffStatementDialog.vue";
import {
  type MaxDiffVotingTabTranslations,
  maxDiffVotingTabTranslations,
} from "./MaxDiffVotingTab.i18n";

const props = defineProps<{
  conversationData: ExtendedConversationDisplayData;
  onViewAnalysis: () => void;
}>();

const { t } = useComponentI18n<MaxDiffVotingTabTranslations>(
  maxDiffVotingTabTranslations
);

const $q = useQuasar();
const { showNotifyMessage } = useNotify();
const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);
const { needsAuth: isAuthBlocked, shouldOpenParticipationModal } =
  useParticipationGate({
    conversationSlugId,
    participationMode: computed(
      () => props.conversationData.metadata.participationMode
    ),
    requiresEventTicket: computed(
      () => props.conversationData.metadata.requiresEventTicket
    ),
    surveyGate: computed(() => props.conversationData.interaction.surveyGate),
  });

// Inject parent refresh handler (same pattern as ConversationCommentTab)
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

const needsLogin = computed(() => {
  return isAuthBlocked.value;
});

const { setVotingIntention } = useConversationLoginIntentions();
const showLoginDialog = ref(false);

function onLoginCallback() {
  setVotingIntention(props.conversationData.metadata.requiresEventTicket);
}

function handleBlockedSave(reason: ParticipationBlockedReason): void {
  if (
    reason === "event_ticket_required" ||
    reason === "account_required" ||
    reason === "strong_verification_required" ||
    reason === "email_verification_required"
  ) {
    showLoginDialog.value = true;
    return;
  }

  if (reason === "survey_required" || reason === "survey_outdated") {
    showLoginDialog.value = true;
    return;
  }

  showNotifyMessage(t("savingError"));
}

// TanStack queries for items and saved state
const itemsQuery = useMaxDiffItemsQuery({
  conversationSlugId,
  enabled: true,
});

const loadQuery = useMaxDiffLoadQuery({
  conversationSlugId,
  enabled: true,
});

// Pull-to-refresh handler: refetch items and saved state
async function handleChildRefresh(): Promise<void> {
  await Promise.all([itemsQuery.refetch(), loadQuery.refetch()]);
}

function registerRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler =
    registerChildRefreshHandler(handleChildRefresh);
}

function unregisterRefreshHandler(): void {
  unregisterChildRefreshHandler?.();
  unregisterChildRefreshHandler = undefined;
}

// Register on initial setup and re-register on KeepAlive reactivation
// (whichever tab activates last must own the handler)
registerRefreshHandler();
onActivated(() => {
  registerRefreshHandler();
});
onDeactivated(unregisterRefreshHandler);

const itemList = computed<MaxDiffCandidateDisplayItem[]>(() => {
  const data = itemsQuery.data.value;
  if (data === undefined) return [];
  return data.map((item) => {
    const displayText = getRankingItemDisplayText({
      displayContent: item.displayContent,
    });
    return {
      slugId: item.slugId,
      title: displayText.title,
      body: displayText.body,
      displayContent: item.displayContent,
      externalUrl: item.externalUrl ?? null,
    };
  });
});

const itemBySlugId = computed(() => {
  const map = new Map<string, MaxDiffCandidateDisplayItem>();
  for (const item of itemList.value) {
    map.set(item.slugId, item);
  }
  return map;
});

const candidateItems = ref<MaxDiffCandidateDisplayItem[]>([]);
const candidateResolutionError = ref(false);

const candidateItemBySlugId = computed(() => {
  const map = new Map<string, MaxDiffCandidateDisplayItem>();
  for (const item of candidateItems.value) {
    map.set(item.slugId, item);
  }
  return map;
});

function updateCandidateItemSnapshot(): boolean {
  const resolvedCandidateItems = createMaxDiffCandidateDisplaySnapshot({
    candidateSlugIds: candidates.value,
    itemBySlugId: itemBySlugId.value,
  });
  if (resolvedCandidateItems.length !== candidates.value.length) {
    candidateItems.value = [];
    candidateResolutionError.value = true;
    return false;
  }

  candidateItems.value = resolvedCandidateItems;
  candidateResolutionError.value = false;
  return true;
}

function needsDialog(slugId: string): boolean {
  if (truncatedCards.value.has(slugId)) return true;
  const item = candidateItemBySlugId.value.get(slugId);
  if (item === undefined) return false;
  if (item.body !== null) return true;
  if (item.externalUrl !== null) return true;
  return false;
}

// Save mutation with rollback
const saveMutation = useMaxDiffSaveMutation({
  conversationSlugId,
  onRollback: (context: MaxDiffSaveContext) => {
    instance.value = restoreMaxDiff(context.previousState);
    triggerRef(instance);
    isComplete.value = context.previousIsComplete;
    finalRanking.value = context.previousFinalRanking;
    candidates.value = context.previousCandidates;
    cancelTransition();
  },
  onBlocked: handleBlockedSave,
  onNetworkError: () => {
    showNotifyMessage(t("savingError"));
  },
});

// MaxDiff engine state
const instance = ref<MaxDiffInstance | null>(null);
const isInitializingEngine = ref(true);
const isComplete = ref(false);
const finalRanking = ref<string[]>([]);
const candidates = ref<string[]>([]);
const selectedBest = ref<string | null>(null);
const selectedWorst = ref<string | null>(null);
const isTransitioning = ref(false);
const showTransitionSpinner = ref(false);
let transitionTimeout: ReturnType<typeof setTimeout> | null = null;
let transitionSpinnerTimeout: ReturnType<typeof setTimeout> | null = null;

function clearTransitionSpinner(): void {
  if (transitionSpinnerTimeout !== null) {
    clearTimeout(transitionSpinnerTimeout);
    transitionSpinnerTimeout = null;
  }
  showTransitionSpinner.value = false;
}

function cancelTransition(): void {
  if (transitionTimeout !== null) {
    clearTimeout(transitionTimeout);
    transitionTimeout = null;
  }
  clearTransitionSpinner();
  isTransitioning.value = false;
}

onBeforeUnmount(() => {
  unregisterRefreshHandler();
  cancelTransition();
});

// Statement dialog state
const showStatementDialog = ref(false);
const dialogVoteLabel = ref<string | undefined>(undefined);
const dialogVoteColor = ref<string | undefined>(undefined);
const dialogVoteFlat = ref(false);
const dialogVoteCallback = ref<(() => void) | undefined>(undefined);

const dialogItemSlugId = ref<string | undefined>(undefined);
const dialogDisplayContent = ref<RankingItemDisplayedContent | undefined>(
  undefined
);
const dialogExternalUrl = ref<string | null>(null);

function openVotingDialog(slugId: string): void {
  const item = candidateItemBySlugId.value.get(slugId);
  dialogItemSlugId.value = item?.slugId;
  dialogDisplayContent.value = item?.displayContent;
  dialogExternalUrl.value = item?.externalUrl ?? null;

  if (selectedBest.value === slugId) {
    // Card is already selected as best — clicking deselects it
    dialogVoteLabel.value = t("cancelSelection");
    dialogVoteColor.value = undefined;
    dialogVoteFlat.value = true;
    dialogVoteCallback.value = () => {
      selectCandidate(slugId);
    };
  } else if (selectedBest.value === null) {
    dialogVoteLabel.value = t("mostImportant");
    dialogVoteColor.value = "positive";
    dialogVoteFlat.value = false;
    dialogVoteCallback.value = () => {
      selectCandidate(slugId);
    };
  } else {
    dialogVoteLabel.value = t("leastImportant");
    dialogVoteColor.value = "negative";
    dialogVoteFlat.value = false;
    dialogVoteCallback.value = () => {
      selectCandidate(slugId);
    };
  }

  showStatementDialog.value = true;
}

// Truncation detection for candidate cards
const truncatedCards = ref(new Set<string>());
const candidateContentComponents = ref<Array<{ isTruncated: () => boolean }>>(
  []
);

function checkTruncation(): void {
  const newSet = new Set<string>();
  for (const [index, component] of candidateContentComponents.value.entries()) {
    const slugId = candidateItems.value[index]?.slugId;
    if (slugId === undefined) continue;
    if (component.isTruncated()) {
      newSet.add(slugId);
    }
  }
  truncatedCards.value = newSet;
}

const progressPercent = computed(() => {
  if (!instance.value) return 0;
  return Math.round(instance.value.progress * 100);
});

const showLearnMoreDialog = ref(false);
const showScoringDetailDialog = ref(false);

function openScoringDetail(): void {
  showLearnMoreDialog.value = false;
  showScoringDetailDialog.value = true;
}

const canUndo = computed(() => {
  if (!instance.value) return false;
  if (isTransitioning.value) return false;
  return instance.value.exportState().comparisons.length > 0;
});

// Initialize engine when both queries resolve
const engineInitialized = ref(false);
const initError = ref(false);

function resolveInitialization(): boolean {
  const items = itemsQuery.data.value;
  const loadData = loadQuery.data.value;
  const loadError = loadQuery.isError.value;
  if (items === undefined || engineInitialized.value) return false;
  // Wait for load query to settle (success or error)
  if (loadData === undefined && !loadError) return false;

  const slugIds = items.map((item) => item.slugId);
  if (slugIds.length < 2) {
    candidateItems.value = [];
    candidates.value = [];
    initError.value = false;
    candidateResolutionError.value = false;
    isInitializingEngine.value = false;
    engineInitialized.value = true;
    return true;
  }

  isInitializingEngine.value = true;

  if (loadData !== undefined && loadData.comparisons !== null) {
    // Restore from saved state
    const comparisons: MaxDiffComparison[] = loadData.comparisons.map((c) => ({
      best: c.best,
      worst: c.worst,
      set: c.set,
    }));
    const restored = restoreMaxDiff({ items: slugIds, comparisons });
    instance.value = restored;
    isComplete.value = restored.complete;
    finalRanking.value = restored.result ?? [];
  } else {
    // No saved state or load failed — create fresh instance
    const fresh = createMaxDiff(slugIds);
    instance.value = fresh;
    isComplete.value = false;
    finalRanking.value = [];
  }

  // Use candidate sets from load response (computed server-side)
  if (loadData !== undefined) {
    candidates.value = loadData.candidateSets[0] ?? [];
  } else if (!instance.value.complete) {
    initError.value = true;
    isInitializingEngine.value = false;
    engineInitialized.value = true;
    return false;
  }

  if (!instance.value.complete && candidates.value.length === 0) {
    candidateItems.value = [];
    candidateResolutionError.value = true;
    isInitializingEngine.value = false;
    engineInitialized.value = true;
    return false;
  }

  const candidatesResolved = updateCandidateItemSnapshot();
  isInitializingEngine.value = false;
  engineInitialized.value = true;
  if (!candidatesResolved) {
    return false;
  }

  initError.value = false;
  return true;
}

watch(
  [
    () => itemsQuery.data.value,
    () => itemsQuery.isError.value,
    () => loadQuery.data.value,
    () => loadQuery.isError.value,
  ],
  ([, itemsError]) => {
    if (itemsError) {
      isInitializingEngine.value = false;
      return;
    }
    resolveInitialization();
  },
  { immediate: true }
);

// Detect truncated candidate cards after DOM updates
watch(
  candidates,
  () => {
    updateCandidateItemSnapshot();
    void nextTick(checkTruncation);
  },
  { immediate: true }
);

watch(itemBySlugId, () => {
  if (candidateResolutionError.value && !isInitializingEngine.value) {
    updateCandidateItemSnapshot();
    void nextTick(checkTruncation);
  }
});

async function retryInitialize(): Promise<void> {
  isInitializingEngine.value = true;
  const retryResult = await retryMaxDiffCandidateResolution({
    refetchItems: async () => await itemsQuery.refetch(),
    refetchLoad: async () => await loadQuery.refetch(),
    resolve: () => {
      engineInitialized.value = false;
      return resolveInitialization();
    },
  });
  if (retryResult !== "resolved") {
    isInitializingEngine.value = false;
  }
}

async function handleCandidateClick(slugId: string): Promise<void> {
  if (await shouldOpenParticipationModal()) {
    showLoginDialog.value = true;
    return;
  }

  if (needsDialog(slugId)) {
    openVotingDialog(slugId);
    return;
  }

  selectCandidate(slugId);
}

function selectCandidate(slugId: string): void {
  // First click = select best
  if (selectedBest.value === null) {
    selectedBest.value = slugId;
    return;
  }

  // Clicking the same as best = deselect
  if (selectedBest.value === slugId) {
    selectedBest.value = null;
    return;
  }

  // Second click = select worst (different from best)
  if (selectedWorst.value === null) {
    selectedWorst.value = slugId;
    // Both selected — record the vote
    recordVote();
    return;
  }

  // Clicking the same as worst = deselect
  if (selectedWorst.value === slugId) {
    selectedWorst.value = null;
    return;
  }

  // Clicking a third card = replace worst
  selectedWorst.value = slugId;
  void recordVote();
}

function recordVote(): void {
  if (!instance.value || !selectedBest.value || !selectedWorst.value) return;

  // Snapshot state BEFORE optimistic update for rollback
  const previousState = instance.value.exportState();
  const context: MaxDiffSaveContext = {
    previousState,
    previousIsComplete: isComplete.value,
    previousFinalRanking: [...finalRanking.value],
    previousCandidates: [...candidates.value],
    isFirstVote: previousState.comparisons.length === 0,
  };

  const best = selectedBest.value;
  const worst = selectedWorst.value;
  const currentCandidates = [...candidates.value];

  // Optimistic update: record in engine
  recordMaxDiffVote({
    instance: instance.value,
    candidates: currentCandidates,
    best,
    worst,
  });
  triggerRef(instance);

  isComplete.value = instance.value.complete;
  finalRanking.value = instance.value.result ?? [];

  // Reset selection and transition to next round
  selectedBest.value = null;
  selectedWorst.value = null;
  isTransitioning.value = true;

  // Show spinner if fetch takes longer than 2s
  clearTransitionSpinner();
  transitionSpinnerTimeout = setTimeout(() => {
    showTransitionSpinner.value = true;
  }, 2000);

  // Save + get next candidates from server response.
  // Runs in parallel with the 400ms transition animation.
  const savePromise = saveMutation
    .mutateAsync({
      ranking: instance.value.result ?? null,
      comparisons: instance.value.exportState().comparisons,
      isComplete: instance.value.complete,
      context,
    })
    .catch(() => undefined);
  // onError already handles rollback — catch returns undefined on failure

  transitionTimeout = setTimeout(() => {
    void (async () => {
      const saveResult = await savePromise;
      if (saveResult?.success && !instance.value?.complete) {
        candidates.value = saveResult.candidateSets[0] ?? [];
      } else {
        candidates.value = [];
      }
      cancelTransition();
    })();
  }, 400);
}

function undoLastVote(): void {
  if (!instance.value) return;

  const state = instance.value.exportState();
  if (state.comparisons.length === 0) return;

  // Cancel any in-flight transition from the vote being undone
  cancelTransition();

  // Snapshot for rollback (undo should be reversible on save failure)
  const context: MaxDiffSaveContext = {
    previousState: state,
    previousIsComplete: isComplete.value,
    previousFinalRanking: [...finalRanking.value],
    previousCandidates: [...candidates.value],
    isFirstVote: false,
  };

  const remainingComparisons = state.comparisons.slice(0, -1);
  const removedComparison = state.comparisons[state.comparisons.length - 1];

  const restored = restoreMaxDiff({
    items: state.items,
    comparisons: remainingComparisons,
  });

  instance.value = restored;
  triggerRef(instance);

  isComplete.value = restored.complete;
  finalRanking.value = restored.result ?? [];
  selectedBest.value = null;
  selectedWorst.value = null;

  candidates.value = removedComparison.set;

  saveMutation.mutate({
    ranking: restored.result ?? null,
    comparisons: restored.exportState().comparisons,
    isComplete: restored.complete,
    context,
  });
}

function handleUndoClick(): void {
  undoLastVote();
}

function handleRedoRanking(): void {
  $q.dialog({
    title: t("redoConfirmTitle"),
    message: t("redoConfirmMessage"),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    // Snapshot for rollback
    const context: MaxDiffSaveContext = {
      previousState: instance.value?.exportState() ?? {
        items: [],
        comparisons: [],
      },
      previousIsComplete: isComplete.value,
      previousFinalRanking: [...finalRanking.value],
      previousCandidates: [...candidates.value],
      isFirstVote: false,
    };

    cancelTransition();
    const slugIds = itemList.value.map((item) => item.slugId);
    instance.value = createMaxDiff(slugIds);
    isComplete.value = false;
    finalRanking.value = [];

    // Save empty state, use candidateSets from response
    void (async () => {
      const result = await saveMutation
        .mutateAsync({
          ranking: null,
          comparisons: [],
          isComplete: false,
          context,
        })
        .catch(() => undefined);
      if (result?.success) {
        candidates.value = result.candidateSets[0] ?? [];
      }
    })();
  });
}
</script>

<style scoped lang="scss">
@use "sass:color";
.maxdiff-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.info-message {
  text-align: center;
  color: $color-text-weak;
  padding: 2rem 1rem;
  font-size: 0.95rem;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.step-indicator {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
}

.step-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: var(--font-weight-semibold);
  border: 2px solid $color-border-weak;
  color: $color-text-weak;
  background: $color-background-default;
  transition: all 0.2s ease;
}

.step-circle.step-active.step-circle-best {
  border-color: $positive;
  background: $positive;
  color: white;
}

.step-circle.step-active.step-circle-worst {
  border-color: $negative;
  background: $negative;
  color: white;
}

.step-circle.step-done {
  border-color: $color-border-weak;
  background: $color-border-weak;
  color: white;
}

.step-connector {
  height: 2px;
  flex: 0 0 2rem;
  background: $color-border-weak;
  margin-top: 14px;
  transition: background 0.2s ease;
}

.step-connector.step-connector-done {
  background: $color-border-weak;
}

.step-label {
  font-size: 0.75rem;
  color: $color-text-weak;
  text-align: center;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.step-label.step-label-active {
  opacity: 1;
  font-weight: var(--font-weight-medium);
}

.progress-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
  width: 100%;
}

.progress-percent {
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-weak;
}

.progress-encouragement {
  font-size: 0.75rem;
  color: $color-text-weak;
  opacity: 0.6;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: $color-border-weak;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: $primary;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.candidates-grid-wrapper {
  position: relative;
}

.candidates-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  transition: opacity 0.3s ease;

  &.candidates-transitioning {
    opacity: 0.3;
    pointer-events: none;
  }
}

.transition-spinner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.candidate-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid $color-border-weak;
  border-radius: 12px;
  background: $color-background-default;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.4;
  min-height: 80px;
  min-width: 0;
  overflow: hidden;

  &:hover {
    border-color: color.adjust($color-border-weak, $lightness: -10%);
  }

  &.selected-best {
    border-color: $positive;
    background: rgba($positive, 0.08);
  }

  &.selected-worst {
    border-color: $negative;
    background: rgba($negative, 0.08);
  }
}

.candidate-content-wrapper {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
}

.candidate-body-inline {
  font-size: 0.85em;
  color: $color-text-weak;
}

.candidate-label {
  min-height: 1.2rem;
  font-size: 0.75rem;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.label-best {
  color: color.adjust($positive, $lightness: -10%);
}

.label-worst {
  color: $negative;
}

.voting-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.complete-message {
  font-size: 0.95rem;
  color: $color-text-weak;
  line-height: 1.5;
}

.view-ranking-btn {
  align-self: flex-start;
  border-radius: 8px;
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
