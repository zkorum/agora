<template>
  <div class="one-at-a-time">
    <VotingSessionToolbar
      :progress="{ kind: 'count', label: remainingCount === undefined ? '' : t('remaining', { count: formatAmount(remainingCount) }) }"
      :can-undo="canUndo"
      :is-busy="isSubmittingVote"
      :is-disabled="props.isVotingDisabled"
      @undo="undoVote"
    />

    <CommentGroup
      v-if="currentOpinion !== undefined"
      :comment-item-list="[currentOpinion]"
      :post-slug-id="props.postSlugId"
      :conversation-author-username="props.conversationAuthorUsername"
      :conversation-organization-name="props.conversationOrganizationName"
      :highlighted-opinion="null"
      :voting-utilities="{ userVotes, castVote }"
      :participation-mode="props.participationMode"
      :requires-event-ticket="props.requiresEventTicket"
      :survey-gate="props.surveyGate"
      :on-view-analysis="props.onViewAnalysis"
      :is-voting-disabled="props.isVotingDisabled || isSubmittingVote"
      :show-vote-results="false"
      :conversation-route-context="props.conversationRouteContext"
      @muted-comment="handleMutedOpinion"
      @deleted="handleDeletedOpinion"
    />

    <PageLoadingSpinner v-else-if="query.isPending.value || isAdvancing" />
    <ErrorRetryBlock
      v-else-if="query.isError.value"
      :title="t('loadError')"
      :retry-label="t('retry')"
      @retry="refresh"
    />
    <div v-else class="caught-up" role="status">
      <q-icon name="mdi-check-circle-outline" size="2rem" color="primary" />
      <strong class="text-primary">{{ t("caughtUp") }}</strong>
      <span>{{ t("caughtUpDescription") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import VotingSessionToolbar from "src/components/post/voting/VotingSessionToolbar.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import type { OpinionVoteParams } from "src/composables/opinion/types";
import { useOpinionVoting } from "src/composables/opinion/useOpinionVoting";
import { usePolisVotingSession } from "src/composables/opinion/usePolisVotingSession";
import { useVoteReconciliation } from "src/composables/opinion/useVoteReconciliation";
import { useVotingActionGuard } from "src/composables/opinion/useVotingActionGuard";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  DisplayedOpinionItem,
  EventSlug,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
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
  watch,
} from "vue";

import CommentGroup from "./group/CommentGroup.vue";
import {
  type OneAtATimeTranslations,
  oneAtATimeTranslations,
} from "./OneAtATimeSection.i18n";

const props = defineProps<{
  postSlugId: string;
  order: "discover" | "new";
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  participationMode: ParticipationMode;
  requiresEventTicket: EventSlug | undefined;
  surveyGate: SurveyGateSummary | undefined;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  conversationRouteContext: ConversationRouteContext;
}>();

const { t } = useComponentI18n<OneAtATimeTranslations>(oneAtATimeTranslations);
const { showNotifyMessage } = useNotify();
const queryClient = useQueryClient();
const actionGuard = useVotingActionGuard();
const session = usePolisVotingSession();
const { currentOpinion, remainingCount, excludedOpinionSlugIds, isAdvancing, canUndo } = session;
const { shouldOpenParticipationModal, openParticipationOnboarding } = useParticipationGate({
  conversationSlugId: computed(() => props.postSlugId),
  participationMode: computed(() => props.participationMode),
  requiresEventTicket: computed(() => props.requiresEventTicket),
  surveyGate: computed(() => props.surveyGate),
});
const { fetchUserVotesForPostSlugIds } = useBackendVoteApi();
const { displayLanguage, spokenLanguages } = storeToRefs(useLanguageStore());
const authStore = useAuthenticationStore();
const { userId } = storeToRefs(authStore);
const opinionUpdates = useOpinionUpdatesStore();
const { fetchNextUnansweredOpinion } = useBackendCommentApi();
const isSubmittingVote = actionGuard.isPending;
let liveRefreshTimer: ReturnType<typeof setTimeout> | undefined;
const reconciliation = useVoteReconciliation({
  needsConfirmation: session.hasPendingWrites,
  isBusy: isSubmittingVote,
  captureSession: actionGuard.capture,
  confirm: async ({ signal, isCurrent }) => {
    const captured = session.capturePendingWrites();
    const votes = await fetchUserVotesForPostSlugIds({ conversationSlugIdList: [props.postSlugId], signal });
    if (!isCurrent() || isSubmittingVote.value) return;
    if (session.confirmPendingWrites({ votes, captured })) await query.refetch();
  },
});
const query = useQuery({
  queryKey: [
    "nextUnansweredOpinion",
    computed(() => props.postSlugId),
    computed(() => props.order),
    userId,
    displayLanguage,
    spokenLanguages,
    excludedOpinionSlugIds,
  ],
  queryFn: ({ signal }) =>
    fetchNextUnansweredOpinion({
      conversationSlugId: props.postSlugId,
      order: props.order,
      excludedOpinionSlugIds: excludedOpinionSlugIds.value,
      signal,
    }),
  staleTime: 0,
  enabled: computed(() => !isSubmittingVote.value),
  retry: false,
});
const {
  userVotes,
  castVote: submitVote,
  fetchUserVotingData,
} = useOpinionVoting({
  postSlugId: props.postSlugId,
  captureAction: actionGuard.capture,
});

watch(
  [query.data, query.isFetching, isSubmittingVote],
  ([data, isFetching, isPending]) => {
    if (data === undefined || isFetching || isPending || query.isError.value) return;
    session.acceptQueryResult(data);
  },
  { immediate: true }
);
watch(
  () => query.isError.value,
  (isError) => {
    if (isError) session.finishLoading();
  }
);

watch(
  userId,
  (newUserId, oldUserId) => {
    if (oldUserId === undefined && newUserId !== undefined && authStore.isGuest) {
      session.preserveCurrent();
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
    session.preserveCurrent();
    void query.refetch();
    if (liveRefreshTimer !== undefined) clearTimeout(liveRefreshTimer);
    liveRefreshTimer = setTimeout(() => {
      liveRefreshTimer = undefined;
      void query.refetch();
    }, 1200);
  }
);

async function castVote({ opinionSlugId, voteAction }: OpinionVoteParams) {
  return await actionGuard.run(async (isCurrent) => {
    if (props.isVotingDisabled) return undefined;
    const previousVote = userVotes.value.find(vote => vote.opinionSlugId === opinionSlugId)?.votingAction;
    const vote = session.prepareVote({ opinionSlugId, voteAction, previousVote });
    if (vote === undefined) return undefined;
    const response = await submitVote(vote.params);
    if (!isCurrent()) return undefined;
    if (response?.success) {
      vote.confirm();
      reconciliation.restart();
    }
    return response;
  });
}

async function undoVote(): Promise<void> {
  try {
    await actionGuard.run(async (isCurrent) => {
      if (!canUndo.value || props.isVotingDisabled) return;
      if (await shouldOpenParticipationModal()) {
        if (isCurrent()) await openParticipationOnboarding();
        return;
      }
      if (!isCurrent()) return;
      const undo = session.prepareUndo();
      if (undo === undefined) return;
      try {
        await queryClient.cancelQueries({ queryKey: ["nextUnansweredOpinion", props.postSlugId] });
        if (!isCurrent()) return;
        const response = await submitVote(undo.params);
        if (!isCurrent()) return;
        if (!response?.success) {
          undo.rollback();
          showNotifyMessage(t("undoFailed"));
        } else {
          reconciliation.restart();
        }
      } catch (error) {
        if (isCurrent()) undo.rollback();
        throw error;
      }
    });
  } catch {
    // The vote mutation owns technical-error notifications and cache rollback.
  }
}

function resetSession(): void {
  actionGuard.invalidate();
  session.reset();
  reconciliation.restart();
}

watch([() => props.postSlugId, () => props.order], resetSession, { flush: "sync" });

async function refresh({ preserveCurrent = false }: { preserveCurrent?: boolean } = {}): Promise<void> {
  if (isSubmittingVote.value) return;
  session.refresh({ preserveCurrent });
  reconciliation.restart();
  await query.refetch();
  if (!session.hasPendingWrites.value) await fetchUserVotingData();
}

function discardOpinions(matches: (opinion: DisplayedOpinionItem) => boolean): void {
  actionGuard.invalidate();
  session.discard(matches);
  reconciliation.restart();
}

async function handleDeletedOpinion(opinionSlugId: string): Promise<void> {
  discardOpinions(opinion => opinion.opinionSlugId === opinionSlugId);
  await refresh();
}

async function handleMutedOpinion(): Promise<void> {
  const username = currentOpinion.value?.username;
  if (username !== undefined) discardOpinions(opinion => opinion.username === username);
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

onActivated(() => {
  reconciliation.resume();
  void refresh({ preserveCurrent: true });
});
onDeactivated(() => {
  reconciliation.pause();
  if (liveRefreshTimer !== undefined) clearTimeout(liveRefreshTimer);
});
onUnmounted(() => {
  actionGuard.invalidate();
  if (liveRefreshTimer !== undefined) clearTimeout(liveRefreshTimer);
});

defineExpose({
  refresh,
  acknowledgeCreatedOpinion,
  isLoading: computed(() => query.isPending.value || isAdvancing.value),
});
</script>

<style scoped lang="scss">
.one-at-a-time {
  min-height: 13rem;
  padding-block: 0 5rem;
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
