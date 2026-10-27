<template>
  <div class="one-at-a-time">
    <VotingSessionToolbar
      :progress="{
        kind: 'count',
        label:
          remainingCount === undefined
            ? ''
            : t('remaining', { count: formatAmount(remainingCount) }),
      }"
      :can-undo="canUndo"
      :is-busy="isSubmittingVote"
      :is-disabled="props.isVotingDisabled"
      @undo="undoVote"
    />

    <div class="saving-status" role="status" aria-live="polite">
      <span v-if="showSavingStatus">{{ t("finishingSaving") }}</span>
    </div>

    <ErrorRetryBlock
      v-if="
        recoveryQuery.isError.value &&
        (session.isAtCapacity.value || currentOpinion === undefined)
      "
      :title="t('recoveryError')"
      :retry-label="t('retry')"
      @retry="retryRecovery"
    />

    <CommentGroup
      v-if="displayedOpinion !== undefined"
      :comment-item-list="[displayedOpinion]"
      :post-slug-id="props.postSlugId"
      :conversation-author-username="props.conversationAuthorUsername"
      :conversation-organization-name="props.conversationOrganizationName"
      :highlighted-opinion="editingOpinion ?? null"
      :editing-opinion-slug-id="editingOpinion?.opinionSlugId"
      :voting-utilities="{ userVotes, castVote }"
      :on-view-analysis="props.onViewAnalysis"
      :is-voting-disabled="
        props.isVotingDisabled ||
        isSubmittingVote ||
        session.isAtCapacity.value ||
        session.isCurrentOpinionPending.value ||
        (userId === undefined && session.hasInFlightActions.value) ||
        participationStatus.status === 'blocked' ||
        currentOpinion === undefined
      "
      :show-vote-results="false"
      :conversation-route-context="props.conversationRouteContext"
      @edit-opinion="emit('editOpinion', $event)"
      @muted-comment="handleMutedOpinion"
      @deleted="handleDeletedOpinion"
    />

    <div v-else-if="isWaitingForOpinion" aria-busy="true">
      <PageLoadingSpinner v-if="showLoading" />
    </div>
    <ErrorRetryBlock
      v-else-if="query.isError.value"
      :title="t('loadError')"
      :retry-label="t('retry')"
      @retry="refresh"
    />
    <div v-else-if="session.isCaughtUp.value" class="caught-up" role="status">
      <q-icon name="mdi-check-circle-outline" size="2rem" color="primary" />
      <strong class="text-primary">{{ t("caughtUp") }}</strong>
      <span>{{ t("caughtUpDescription") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { useTimeoutFn } from "@vueuse/core";
import { storeToRefs } from "pinia";
import VotingSessionToolbar from "src/components/post/voting/VotingSessionToolbar.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import type {
  OpinionEditRequest,
  OpinionVoteParams,
} from "src/composables/opinion/types";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { usePolisVotingSession } from "src/composables/opinion/usePolisVotingSession";
import { useVoteReconciliation } from "src/composables/opinion/useVoteReconciliation";
import { useVotingActionGuard } from "src/composables/opinion/useVotingActionGuard";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useOpinionUpdatesStore } from "src/stores/opinionUpdates";
import { useBackendCommentApi } from "src/utils/api/comment/comment";
import { useBackendVoteApi } from "src/utils/api/vote";
import { formatAmount } from "src/utils/common";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  onActivated,
  onDeactivated,
  onUnmounted,
  ref,
  watch,
} from "vue";

import CommentGroup from "./group/CommentGroup.vue";
import {
  type OneAtATimeTranslations,
  oneAtATimeTranslations,
} from "./OneAtATimeSection.i18n";

const props = defineProps<{
  postSlugId: string;
  editingOpinion: DisplayedOpinionItem | undefined;
  order: "discover" | "new";
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  conversationRouteContext: ConversationRouteContext;
}>();
const emit = defineEmits<{ editOpinion: [request: OpinionEditRequest] }>();

const { t } = useComponentI18n<OneAtATimeTranslations>(oneAtATimeTranslations);
const { showNotifyMessage } = useNotify();
const actionGuard = useVotingActionGuard();
const session = usePolisVotingSession();
const { currentOpinion, remainingCount, fetchExcludedOpinionSlugIds, canUndo } =
  session;
const {
  participationStatus,
  openParticipationOnboarding,
  captureParticipationAction,
  recordParticipationRejection,
} = useParticipationGate(() => props.postSlugId);
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
const authStore = useAuthenticationStore();
const { userId } = storeToRefs(authStore);
// Guest creation changes identity while the first optimistic refill is already
// running. Keep that session's query identity stable instead of cancel/refetch.
const sessionViewerId = ref(userId.value);
const opinionUpdates = useOpinionUpdatesStore();
const { fetchNextUnansweredOpinion, fetchOpinionsBySlugIdList } =
  useBackendCommentApi();
const isSubmittingVote = actionGuard.isPending;
const showLoading = ref(false);
const isActive = ref(true);
const showSavingStatus = ref(false);
const savingDelay = useTimeoutFn(
  () => {
    showSavingStatus.value = true;
  },
  200,
  { immediate: false }
);
watch([session.hasInFlightActions, isActive], ([saving, active]) => {
  savingDelay.stop();
  showSavingStatus.value = false;
  if (saving && active) savingDelay.start();
});
const recoveryQuery = useQuery(() => {
  const captured = session.recoveries.value;
  return {
    queryKey: [
      "oneAtATimeRecovery",
      props.postSlugId,
      sessionViewerId.value,
      displayLanguage.value,
      [...captured.values()].map((recovery) => recovery.entry.id),
    ],
    queryFn: async ({ signal }: { signal: AbortSignal }) => ({
      targets: await fetchOpinionsBySlugIdList({
        opinionSlugIdList: [...captured.keys()],
        signal,
      }),
      captured,
    }),
    enabled: isActive.value && captured.size > 0,
    gcTime: 0,
    retry: false,
  };
});
watch([recoveryQuery.data, recoveryQuery.isFetching], ([data, fetching]) => {
  if (data === undefined || fetching || recoveryQuery.isError.value) return;
  session.acceptRecoveredOpinions({
    captured: data.captured,
    opinions: data.targets
      .filter((target) => target.conversationSlugId === props.postSlugId)
      .map((target) => target.opinion),
  });
});
async function retryRecovery(): Promise<void> {
  await recoveryQuery.refetch();
}
function showRecoveryFeedback(): void {
  if (!isActive.value) return;
  const feedback = session.takeFeedback();
  if (feedback !== undefined)
    showNotifyMessage(
      t(
        feedback === "changed"
          ? "voteChanged"
          : feedback === "unconfirmed"
            ? "voteUnconfirmed"
            : "voteUnavailable"
      )
    );
}
watch(
  [currentOpinion, session.isCaughtUp, session.currentFeedback],
  showRecoveryFeedback
);
const reconciliation = useVoteReconciliation({
  needsConfirmation: session.hasPendingWrites,
  isBusy: isSubmittingVote,
  captureSession: actionGuard.capture,
  confirm: async ({ signal, isCurrent }) => {
    const captured = session.capturePendingWrites();
    const votes = await fetchUserVotesForPostSlugIds({
      conversationSlugIdList: [props.postSlugId],
      signal,
    });
    if (!isCurrent() || isSubmittingVote.value) return;
    if (session.confirmPendingWrites({ votes, captured }))
      await query.refetch();
  },
});
const spokenLanguagesKey = computed(() =>
  [...spokenLanguages.value].sort().join(",")
);
const query = useQuery(() => {
  const request = {
    conversationSlugId: props.postSlugId,
    order: props.order,
    excludedOpinionSlugIds: fetchExcludedOpinionSlugIds.value,
  };
  return {
    queryKey: [
      "nextUnansweredOpinion",
      request.conversationSlugId,
      request.order,
      sessionViewerId.value,
      displayLanguage.value,
      spokenLanguagesKey.value,
      request.excludedOpinionSlugIds,
    ],
    queryFn: async ({ signal }: { signal: AbortSignal }) => ({
      response: await fetchNextUnansweredOpinion({ ...request, signal }),
      excludedOpinionSlugIds: request.excludedOpinionSlugIds,
    }),
    enabled:
      isActive.value &&
      session.needsNextOpinion.value &&
      props.editingOpinion === undefined,
    // Consumed exclusion-specific results are not useful cache entries.
    gcTime: 0,
    retry: false,
  };
});
const isWaitingForOpinion = computed(
  () =>
    session.isWaitingForOpinion.value &&
    !query.isError.value &&
    !recoveryQuery.isError.value
);
const displayedOpinion = computed(
  () =>
    currentOpinion.value ??
    (isWaitingForOpinion.value && !showLoading.value
      ? session.previousOpinion.value
      : undefined)
);
const loadingDelay = useTimeoutFn(
  () => {
    showLoading.value = true;
  },
  200,
  { immediate: false }
);
watch(
  [isWaitingForOpinion, isActive],
  ([waiting, active]) => {
    loadingDelay.stop();
    showLoading.value = false;
    if (waiting && active) loadingDelay.start();
  },
  { immediate: true }
);
const {
  userVotes,
  castVote: submitVote,
  fetchUserVotingData,
} = useOpinionVoting({
  postSlugId: props.postSlugId,
  captureAction: actionGuard.capture,
  feedback: "session",
});

watch(
  [query.data, query.isFetching],
  ([data, isFetching]) => {
    if (data === undefined || isFetching || query.isError.value) return;
    session.acceptFetchedOpinion(data);
  },
  { immediate: true }
);

const liveRefresh = useTimeoutFn(
  () => {
    void query.refetch();
  },
  1200,
  { immediate: false }
);

watch(
  userId,
  (newUserId, oldUserId) => {
    if (
      oldUserId === undefined &&
      newUserId !== undefined &&
      authStore.isGuest
    ) {
      return;
    }
    resetSession();
  },
  { flush: "sync" }
);

watch(
  () => opinionUpdates.getNewOpinionSignalVersion(props.postSlugId),
  (version, previousVersion) => {
    if (version === previousVersion) return;
    session.refresh({ preserveCurrent: true });
    if (!isActive.value) return;
    void query.refetch({ cancelRefetch: false });
    liveRefresh.start();
  }
);

async function castVote({
  opinionSlugId,
  voteAction,
  sourceVersion,
}: OpinionVoteParams) {
  const isCurrent = actionGuard.capture();
  const participation = captureParticipationAction();
  if (
    props.isVotingDisabled ||
    isSubmittingVote.value ||
    (userId.value === undefined && session.hasInFlightActions.value) ||
    session.isAtCapacity.value
  )
    return undefined;
  if (participationStatus.value.status !== "ready") {
    await openParticipationOnboarding();
    return undefined;
  }
  const previousVote = userVotes.value.find(
    (vote) => vote.opinionSlugId === opinionSlugId
  )?.votingAction;
  const vote = session.prepareVote({
    opinionSlugId,
    voteAction,
    sourceVersion,
    previousVote,
  });
  if (vote === undefined || !vote.optimistic()) return undefined;
  try {
    const response = await submitVote(vote.params);
    if (!isCurrent()) return undefined;
    if (response?.success) {
      vote.confirm();
      reconciliation.restart();
    } else if (
      response?.success === false &&
      response.reason === "statement_changed"
    ) {
      vote.reject("changed");
    } else if (response !== undefined && !response.success) {
      vote.reject("blocked");
      recordParticipationRejection(response.participationStatus);
      if (isActive.value && participation.isCurrent()) {
        if (
          response.reason === "conversation_closed" ||
          response.reason === "conversation_locked"
        )
          showNotifyMessage(t("votingUnavailable"));
        else await participation.handleBlockedReason(response);
      }
    } else {
      vote.reject("unconfirmed");
    }
    return response;
  } catch {
    if (isCurrent()) vote.reject("unconfirmed");
    return undefined;
  }
}

async function undoVote(): Promise<void> {
  try {
    await actionGuard.run(async (isCurrent) => {
      const participation = captureParticipationAction();
      if (!canUndo.value || props.isVotingDisabled) return;
      if (participationStatus.value.status !== "ready") {
        if (isCurrent()) await openParticipationOnboarding();
        return;
      }
      if (!isCurrent()) return;
      const undo = session.prepareUndo();
      if (undo === undefined) return;
      try {
        const response = await submitVote(undo.params);
        if (!isCurrent()) return;
        if (!response?.success) {
          undo.rollback();
          if (!participation.isCurrent()) return;
          if (response === undefined) {
            if (isActive.value) showNotifyMessage(t("voteUnconfirmed"));
          } else if (
            response.reason === "statement_changed" ||
            response.reason === "conversation_closed" ||
            response.reason === "conversation_locked"
          ) {
            if (response.reason !== "statement_changed")
              recordParticipationRejection(response.participationStatus);
            if (isActive.value) showNotifyMessage(t("undoFailed"));
          } else {
            recordParticipationRejection(response.participationStatus);
            if (isActive.value)
              await participation.handleBlockedReason(response);
          }
        } else {
          reconciliation.restart();
        }
      } catch {
        if (isCurrent()) {
          undo.rollback();
          if (isActive.value) showNotifyMessage(t("voteUnconfirmed"));
        }
      }
    });
  } catch {
    // Onboarding failures are handled by its own flow.
  }
}

function resetSession(): void {
  sessionViewerId.value = userId.value;
  liveRefresh.stop();
  actionGuard.invalidate();
  session.reset();
  reconciliation.restart();
}

watch([() => props.postSlugId, () => props.order], resetSession, {
  flush: "sync",
});
watch([displayLanguage, spokenLanguagesKey], resetSession, { flush: "sync" });

async function refresh({
  preserveCurrent = false,
}: { preserveCurrent?: boolean } = {}): Promise<void> {
  if (isSubmittingVote.value) return;
  const isCurrent = actionGuard.capture();
  session.refresh({ preserveCurrent });
  reconciliation.restart();
  await query.refetch();
  if (isCurrent() && !session.hasPendingWrites.value)
    await fetchUserVotingData();
}

function discardOpinions(
  matches: (opinion: DisplayedOpinionItem) => boolean
): void {
  session.discard(matches);
  reconciliation.restart();
}

async function handleDeletedOpinion(opinionSlugId: string): Promise<void> {
  discardOpinions((opinion) => opinion.opinionSlugId === opinionSlugId);
  await refresh();
}

async function handleMutedOpinion(): Promise<void> {
  const username = displayedOpinion.value?.username;
  if (username !== undefined)
    discardOpinions((opinion) => opinion.username === username);
  await refresh();
}

async function acknowledgeCreatedOpinion(opinionSlugId: string): Promise<void> {
  showNotifyMessage({
    message: t("statementSubmitted"),
    icon: "mdi-check-circle-outline",
  });
  session.excludeCreatedOpinion(opinionSlugId);
  await query.refetch();
}

function acknowledgeEditedOpinion(opinion: DisplayedOpinionItem): void {
  session.updateCurrentOpinion(opinion);
}

onActivated(() => {
  isActive.value = true;
  showRecoveryFeedback();
  reconciliation.resume();
  void refresh({ preserveCurrent: true });
});
onDeactivated(() => {
  isActive.value = false;
  reconciliation.pause();
  liveRefresh.stop();
});
onUnmounted(() => {
  actionGuard.invalidate();
});

defineExpose({
  refresh,
  acknowledgeCreatedOpinion,
  acknowledgeEditedOpinion,
  isLoading: computed(() => isWaitingForOpinion.value && showLoading.value),
});
</script>

<style scoped lang="scss">
.one-at-a-time {
  min-height: 13rem;
}
.saving-status {
  min-block-size: 1.25rem;
  color: $color-text-weak;
  font-size: 0.875rem;
}
.caught-up {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  background: white;
  border-radius: 1rem;
  color: $color-text-weak;
}
</style>
