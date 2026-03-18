<template>
  <div class="maxdiff-container">
    <!-- Loading state -->
    <PageLoadingSpinner v-if="isLoading" />

    <!-- Fetch error -->
    <div v-else-if="itemsFetchError" class="info-message">
      {{ t("loadingError") }}
    </div>

    <!-- Completed ranking (check before statement count so users with saved rankings still see them) -->
    <div v-else-if="isComplete && finalRanking.length > 0" class="ranking-section">
      <div class="section-header">{{ t("complete") }}</div>
      <div class="section-subheader">{{ t("ranking") }}</div>
      <ol class="ranking-list">
        <li
          v-for="(slugId, index) in finalRanking"
          :key="slugId"
          class="ranking-item"
          @click="openStatementDialog(slugId)"
        >
          <span class="rank-number">{{ index + 1 }}</span>
          <ZKHtmlContent
            class="rank-content"
            :html-body="itemContentMap.get(slugId) ?? slugId"
            :compact-mode="true"
            :enable-links="false"
          />
        </li>
      </ol>
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
      {{
        itemList.length === 0
          ? t("noStatements")
          : t("needMoreStatements")
      }}
    </div>

    <!-- Active voting -->
    <div v-else-if="candidates.length > 0" class="voting-section">
      <div class="section-header">{{ t("title") }}</div>

      <div class="step-indicator">
        <div class="step-item">
          <div
            class="step-circle step-circle-best"
            :class="{ 'step-active': selectedBest === null, 'step-done': selectedBest !== null }"
          >
            <q-icon v-if="selectedBest !== null" name="check" size="0.8rem" />
            <span v-else>1</span>
          </div>
          <span class="step-label" :class="{ 'step-label-active': selectedBest === null }">
            {{ t("stepSelectBest") }}
          </span>
        </div>
        <div class="step-connector" :class="{ 'step-connector-done': selectedBest !== null }"></div>
        <div class="step-item">
          <div
            class="step-circle step-circle-worst"
            :class="{ 'step-active': selectedBest !== null && selectedWorst === null }"
          >
            <span>2</span>
          </div>
          <span class="step-label" :class="{ 'step-label-active': selectedBest !== null && selectedWorst === null }">
            {{ t("stepSelectWorst") }}
          </span>
        </div>
      </div>

      <div class="progress-row">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
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

      <div class="candidates-grid" :class="{ 'candidates-transitioning': isTransitioning }">
        <button
          v-for="slugId in candidates"
          :key="slugId"
          class="candidate-card"
          :class="{
            'selected-best': selectedBest === slugId,
            'selected-worst': selectedWorst === slugId,
          }"
          @click="handleCandidateClick(slugId)"
        >
          <div :ref="(el) => setContentRef(slugId, el)" class="candidate-content-wrapper">
            <span>{{ itemContentMap.get(slugId) ?? slugId }}</span>
            <span v-if="itemBySlugId.get(slugId)?.body" class="candidate-body-inline">
              — {{ stripHtml(itemBySlugId.get(slugId)?.body ?? "") }}
            </span>
          </div>
          <div class="candidate-label">
            <span v-if="selectedBest === slugId" class="label-best">
              {{ t("mostImportant") }}
            </span>
            <span v-else-if="selectedWorst === slugId" class="label-worst">
              {{ t("leastImportant") }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Fallback: initialization in progress -->
    <PageLoadingSpinner v-else />

    <MaxDiffStatementDialog
      v-model="showStatementDialog"
      :title="dialogTitle"
      :html-body="expandedContent"
      :external-url="dialogExternalUrl"
      :vote-label="dialogVoteLabel"
      :vote-color="dialogVoteColor"
      :vote-flat="dialogVoteFlat"
      :on-vote="dialogVoteCallback"
    />

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="voting"
      :needs-auth="needsLogin"
      :participation-mode="conversationData.metadata.participationMode"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import { useMaxDiffHistoryUndo } from "src/composables/maxdiff/useMaxDiffHistoryUndo";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ExtendedConversation, MaxDiffComparison } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import {
  createMaxDiff,
  type MaxDiffInstance,
  recordMaxDiffVote,
  restoreMaxDiff,
} from "src/utils/maxdiff";
import { useNotify } from "src/utils/ui/notify";
import type { ComponentPublicInstance } from "vue";
import { computed, nextTick, ref, triggerRef, watch } from "vue";

import MaxDiffStatementDialog from "./MaxDiffStatementDialog.vue";
import {
  type MaxDiffVotingTabTranslations,
  maxDiffVotingTabTranslations,
} from "./MaxDiffVotingTab.i18n";

const props = defineProps<{
  conversationData: ExtendedConversation;
  hasConversationData: boolean;
}>();

const { t } = useComponentI18n<MaxDiffVotingTabTranslations>(
  maxDiffVotingTabTranslations
);

const { isLoggedIn, hasStrongVerification, hasEmailVerification } =
  storeToRefs(useAuthenticationStore());
const { saveMaxDiffResult, loadMaxDiffResult, fetchMaxDiffItems } = useMaxDiffApi();
const $q = useQuasar();
const { showNotifyMessage } = useNotify();

const needsLogin = computed(() => {
  const mode = props.conversationData.metadata.participationMode;
  if (mode === "account_required") return !isLoggedIn.value;
  if (mode === "strong_verification") return !hasStrongVerification.value;
  if (mode === "email_verification") return !hasEmailVerification.value;
  return false; // guest
});

const { setVotingIntention } = useConversationLoginIntentions();
const showLoginDialog = ref(false);

function onLoginCallback() {
  setVotingIntention();
}

const conversationSlugId = computed(
  () => props.conversationData.metadata.conversationSlugId
);

// Fetch active MaxDiff items for this conversation
interface MaxDiffItemDisplay {
  slugId: string;
  title: string;
  body: string | null;
  externalUrl: string | null;
}

const itemList = ref<MaxDiffItemDisplay[]>([]);
const itemsFetched = ref(false);
const itemsFetchError = ref(false);

const itemContentMap = computed(() => {
  const map = new Map<string, string>();
  for (const item of itemList.value) {
    map.set(item.slugId, item.title);
  }
  return map;
});

const itemBySlugId = computed(() => {
  const map = new Map<string, MaxDiffItemDisplay>();
  for (const item of itemList.value) {
    map.set(item.slugId, item);
  }
  return map;
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function needsDialog(slugId: string): boolean {
  if (truncatedCards.value.has(slugId)) return true;
  const item = itemBySlugId.value.get(slugId);
  if (item === undefined) return false;
  if (item.body !== null) return true;
  if (item.externalUrl !== null) return true;
  return false;
}

// MaxDiff engine state
const instance = ref<MaxDiffInstance | null>(null);
const isLoading = ref(true);
const isComplete = ref(false);
const finalRanking = ref<string[]>([]);
const candidates = ref<string[]>([]);
const selectedBest = ref<string | null>(null);
const selectedWorst = ref<string | null>(null);
const isTransitioning = ref(false);

// Statement dialog state
const showStatementDialog = ref(false);
const expandedContent = ref("");
const dialogVoteLabel = ref<string | undefined>(undefined);
const dialogVoteColor = ref<string | undefined>(undefined);
const dialogVoteFlat = ref(false);
const dialogVoteCallback = ref<(() => void) | undefined>(undefined);

function openStatementDialog(slugId: string): void {
  const item = itemBySlugId.value.get(slugId);
  dialogTitle.value = item?.title ?? slugId;
  expandedContent.value = item?.body ?? "";
  dialogExternalUrl.value = item?.externalUrl ?? null;
  dialogVoteLabel.value = undefined;
  dialogVoteColor.value = undefined;
  dialogVoteFlat.value = false;
  dialogVoteCallback.value = undefined;
  showStatementDialog.value = true;
}

const dialogTitle = ref("");
const dialogExternalUrl = ref<string | null>(null);

function openVotingDialog(slugId: string): void {
  const item = itemBySlugId.value.get(slugId);
  dialogTitle.value = item?.title ?? slugId;
  expandedContent.value = item?.body ?? "";
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
const contentRefs = new Map<string, HTMLElement>();

function setContentRef(
  slugId: string,
  el: Element | ComponentPublicInstance | null
): void {
  if (el instanceof HTMLElement) {
    contentRefs.set(slugId, el);
  }
}

function checkTruncation(): void {
  const newSet = new Set<string>();
  for (const [slugId, el] of contentRefs) {
    if (el.scrollHeight > el.clientHeight + 1) {
      newSet.add(slugId);
    }
  }
  truncatedCards.value = newSet;
}

const progressPercent = computed(() => {
  if (!instance.value) return 0;
  return Math.round(instance.value.progress * 100);
});

const canUndo = computed(() => {
  if (!instance.value) return false;
  if (isTransitioning.value) return false;
  return instance.value.exportState().comparisons.length > 0;
});

const { pushUndoEntry, consumeUndoEntry, clearAllUndoEntries } =
  useMaxDiffHistoryUndo({
    onUndo: () => void undoLastVote(),
    canUndo: () => canUndo.value,
  });

// Fetch items and initialize MaxDiff when conversation data is ready
watch(
  () => props.hasConversationData,
  async (hasData) => {
    if (hasData && !itemsFetched.value) {
      const response = await fetchMaxDiffItems({
        conversationSlugId: conversationSlugId.value,
        lifecycleFilter: "active",
      });
      if (response.status === "success") {
        itemList.value = response.data.items.map((item) => ({
          slugId: item.slugId,
          title: item.title,
          body: item.body ?? null,
          externalUrl: item.externalUrl ?? null,
        }));
        itemsFetched.value = true;
        if (itemList.value.length >= 2 && !instance.value) {
          await initializeMaxDiff();
        } else {
          isLoading.value = false;
        }
      } else {
        itemsFetchError.value = true;
        isLoading.value = false;
      }
    }
  },
  { immediate: true },
);

// Detect truncated candidate cards after DOM updates
watch(candidates, () => {
  void nextTick(checkTruncation);
});

async function initializeMaxDiff(): Promise<void> {
  isLoading.value = true;

  const slugIds = itemList.value.map((item) => item.slugId);

  // Try to load saved state from backend
  const loadResponse = await loadMaxDiffResult({
    conversationSlugId: conversationSlugId.value,
  });

  if (
    loadResponse.status === "success" &&
    loadResponse.data.comparisons !== null
  ) {
    // Restore from saved state
    const comparisons: MaxDiffComparison[] = loadResponse.data.comparisons.map(
      (c) => ({
        best: c.best,
        worst: c.worst,
        set: c.set,
      })
    );

    const restored = restoreMaxDiff({
      items: slugIds,
      comparisons,
    });

    instance.value = restored;
    isComplete.value = restored.complete;
    finalRanking.value = restored.result ?? [];

    // Don't push history entries for previously saved comparisons.
    // Browser back should only undo votes made in the current session.
  } else {
    // Create fresh instance
    const fresh = createMaxDiff(slugIds);
    instance.value = fresh;
    isComplete.value = false;
    finalRanking.value = [];
  }

  updateCandidates();
  isLoading.value = false;
}

function updateCandidates(): void {
  if (!instance.value || instance.value.complete) {
    candidates.value = [];
    return;
  }
  candidates.value = instance.value.getCandidates(4);
}

function handleCandidateClick(slugId: string): void {
  if (needsLogin.value) {
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
    void recordVote();
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

async function recordVote(): Promise<void> {
  if (!instance.value || !selectedBest.value || !selectedWorst.value) return;

  const best = selectedBest.value;
  const worst = selectedWorst.value;
  const currentCandidates = [...candidates.value];

  // Record in the MaxDiff engine
  recordMaxDiffVote({
    instance: instance.value,
    candidates: currentCandidates,
    best,
    worst,
  });

  // Force Vue to re-evaluate computeds that read from instance
  triggerRef(instance);

  pushUndoEntry();

  // Check completion
  isComplete.value = instance.value.complete;
  finalRanking.value = instance.value.result ?? [];

  if (isComplete.value) {
    clearAllUndoEntries();
  }

  // Reset selection and transition to next round
  selectedBest.value = null;
  selectedWorst.value = null;
  isTransitioning.value = true;

  setTimeout(() => {
    updateCandidates();
    isTransitioning.value = false;
  }, 400);

  // Auto-save to backend
  const saveResponse = await saveMaxDiffResult({
    conversationSlugId: conversationSlugId.value,
    ranking: instance.value.result ?? null,
    comparisons: instance.value.exportState().comparisons,
    isComplete: instance.value.complete,
  });

  if (saveResponse.status !== "success") {
    showNotifyMessage(t("savingError"));
  }
}

async function undoLastVote(): Promise<void> {
  if (!instance.value) return;

  const state = instance.value.exportState();
  if (state.comparisons.length === 0) return;

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

  const saveResponse = await saveMaxDiffResult({
    conversationSlugId: conversationSlugId.value,
    ranking: restored.result ?? null,
    comparisons: restored.exportState().comparisons,
    isComplete: restored.complete,
  });

  if (saveResponse.status !== "success") {
    showNotifyMessage(t("undoError"));
  }
}

function handleUndoClick(): void {
  void undoLastVote();
  consumeUndoEntry();
}

function handleRedoRanking(): void {
  $q.dialog({
    title: t("redoConfirmTitle"),
    message: t("redoConfirmMessage"),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    clearAllUndoEntries();
    const slugIds = itemList.value.map((item) => item.slugId);
    instance.value = createMaxDiff(slugIds);
    isComplete.value = false;
    finalRanking.value = [];
    updateCandidates();

    void saveMaxDiffResult({
      conversationSlugId: conversationSlugId.value,
      ranking: null,
      comparisons: [],
      isComplete: false,
    });
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

.section-header {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
}

.section-subheader {
  font-size: 0.95rem;
  font-weight: var(--font-weight-medium);
  color: $color-text-weak;
  margin-top: 0.5rem;
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
  gap: 0.25rem;
  align-items: flex-start;
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

.ranking-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ranking-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ranking-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: $app-background-color;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.rank-number {
  font-weight: var(--font-weight-semibold);
  color: $primary;
  min-width: 1.5rem;
  text-align: center;
}

.rank-content {
  flex: 1;
  min-width: 0;
}
</style>
