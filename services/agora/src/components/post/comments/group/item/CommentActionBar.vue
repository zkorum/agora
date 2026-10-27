<template>
  <div>
    <div class="agreementButtons">
      <VotingButton
        vote-type="disagree"
        :label="t('disagree')"
        :is-selected="userVoteAction === 'disagree'"
        :disabled="isVotingDisabled"
        :set-aria-label="`${t('disagreeAriaLabel')} ${localNumDisagrees}`"
        :vote-count="localNumDisagrees"
        :percentage="formatPercentage(relativeTotalPercentageDisagrees)"
        :show-vote-count="props.showVoteResults && userCastedVote"
        @click="
          castPersonalVote({
            opinionSlugId: props.commentItem.opinionSlugId,
            sourceVersion: props.sourceVersion,
            voteAction: 'disagree',
          })
        "
      />

      <VotingButton
        vote-type="pass"
        :label="t('pass')"
        :is-selected="userVoteAction === 'pass'"
        :disabled="isVotingDisabled"
        :set-aria-label="`${t('passAriaLabel')} ${localNumPasses}`"
        :vote-count="localNumPasses"
        :percentage="formatPercentage(relativeTotalPercentagePasses)"
        :show-vote-count="props.showVoteResults && userCastedVote"
        @click="
          castPersonalVote({
            opinionSlugId: props.commentItem.opinionSlugId,
            sourceVersion: props.sourceVersion,
            voteAction: 'pass',
          })
        "
      />

      <VotingButton
        vote-type="agree"
        :label="t('agree')"
        :is-selected="userVoteAction === 'agree'"
        :disabled="isVotingDisabled"
        :set-aria-label="`${t('agreeAriaLabel')} ${localNumAgrees}`"
        :vote-count="localNumAgrees"
        :percentage="formatPercentage(relativeTotalPercentageAgrees)"
        :show-vote-count="props.showVoteResults && userCastedVote"
        @click="
          castPersonalVote({
            opinionSlugId: props.commentItem.opinionSlugId,
            sourceVersion: props.sourceVersion,
            voteAction: 'agree',
          })
        "
      />
    </div>

    <!-- Vote unlock banner - shown after voting -->
    <div v-if="shouldShowBanner" class="voteUnlockBanner">
      <div class="bannerContent">
        <div class="bannerMessage">{{ bannerMessage }}</div>
        <a
          v-if="showViewAnalysisLink"
          class="viewAnalysisLink"
          @click="handleViewAnalysisClick"
        >
          {{ t("viewAnalysis") }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import VotingButton from "src/components/features/opinion/VotingButton.vue";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import type {
  OpinionVoteParams,
  OpinionVotingUtilities,
} from "src/composables/opinion/types";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { OpinionItem } from "src/shared/types/zod";
import { calculatePercentage } from "src/shared/util";
import type { AnalysisData } from "src/utils/api/comment/analysisData";
import { useInvalidateConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useUserClusteringSession } from "src/utils/api/vote/useVoteQueries";
import { formatPercentage } from "src/utils/common";
import { computeBannerState } from "src/utils/component/bannerState";
import { MIN_VOTES_FOR_CLUSTER } from "src/utils/component/opinion";
import {
  isQueryForViewerScope,
  useViewerQueryScope,
} from "src/utils/query/viewerScope";
import { useNotify } from "src/utils/ui/notify";
import { computed, onUnmounted, ref } from "vue";

import {
  type CommentActionBarTranslations,
  commentActionBarTranslations,
} from "./CommentActionBar.i18n";

const props = defineProps<{
  commentItem: OpinionItem;
  sourceVersion: string;
  postSlugId: string;
  votingUtilities: OpinionVotingUtilities;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  showVoteResults: boolean;
}>();

let latestVoteAction: symbol | undefined;
onUnmounted(() => {
  latestVoteAction = undefined;
});
const hasVotedThisSession = ref(false);
const {
  participationStatus,
  openParticipationOnboarding,
  captureParticipationAction,
} = useParticipationGate(() => props.postSlugId);

const { showNotifyMessage } = useNotify();
const { invalidateConversation } = useInvalidateConversationQuery();

// Query client for reading analysis cache
const queryClient = useQueryClient();
const viewerScope = useViewerQueryScope();

const { t } = useComponentI18n<CommentActionBarTranslations>(
  commentActionBarTranslations
);

// Session-level clustering state (reactive, shared across all CommentActionBar instances)
const { isUserClusteredInSession } = useUserClusteringSession();

// Track if user is clustered (from vote response during this mount)
const userClusteredThisMount = ref(false);

// Check if user is in a cluster by looking at analysis cache
// This matches the same check in useVoteQueries.ts that determines whether to ask backend
const userIsClusteredFromCache = computed(() => {
  const analysisQueryData = queryClient.getQueriesData<AnalysisData>({
    queryKey: ["analysis", props.postSlugId],
    predicate: (query) =>
      isQueryForViewerScope({
        queryKey: query.queryKey,
        viewerScope: viewerScope.value,
      }),
  });

  return analysisQueryData.some(
    ([, analysisData]) =>
      analysisData?.polisClusters !== undefined &&
      Object.values(analysisData.polisClusters).some(
        (cluster) => cluster?.isUserInCluster === true
      )
  );
});

// Computed properties from TanStack Query cache (no local state)
const userVoteAction = computed(() => {
  const existingVote = props.votingUtilities.userVotes.find(
    (vote) => vote.opinionSlugId === props.commentItem.opinionSlugId
  );
  return existingVote?.votingAction;
});

const userCastedVote = computed(() => {
  return userVoteAction.value !== undefined;
});

// Vote counts come directly from props (updated when comments refetch)
const localNumAgrees = computed(() => props.commentItem.numAgrees);
const localNumDisagrees = computed(() => props.commentItem.numDisagrees);
const localNumPasses = computed(() => props.commentItem.numPasses);

const totalVotes = computed(() => {
  return localNumAgrees.value + localNumDisagrees.value + localNumPasses.value;
});

const relativeTotalPercentageAgrees = computed(() => {
  return calculatePercentage(localNumAgrees.value, totalVotes.value);
});

const relativeTotalPercentageDisagrees = computed(() => {
  return calculatePercentage(localNumDisagrees.value, totalVotes.value);
});

const relativeTotalPercentagePasses = computed(() => {
  return calculatePercentage(localNumPasses.value, totalVotes.value);
});

async function openOnboarding(): Promise<void> {
  await openParticipationOnboarding();
}

async function castPersonalVote({
  opinionSlugId,
  voteAction,
  sourceVersion,
}: OpinionVoteParams): Promise<void> {
  const action = Symbol();
  latestVoteAction = action;
  const isCurrent = () => latestVoteAction === action;
  const participation = captureParticipationAction();
  if (props.isVotingDisabled) return;
  if (participationStatus.value.status !== "ready") {
    if (isCurrent()) await openOnboarding();
    return;
  }
  if (!isCurrent()) return;

  // Re-clicking the selected vote cancels it, including while it is pending.
  if (userVoteAction.value === voteAction) {
    voteAction = "cancel";
  }
  hasVotedThisSession.value = voteAction !== "cancel";

  try {
    const result = await props.votingUtilities.castVote({
      opinionSlugId,
      voteAction,
      sourceVersion,
    });

    if (result === undefined || !isCurrent()) return;

    if (result.success) {
      // Detect clustering for the first time this mount
      if (result.userIsClustered === true && !userClusteredThisMount.value) {
        userClusteredThisMount.value = true;
      }
    } else {
      hasVotedThisSession.value = userCastedVote.value;
      if (!participation.isCurrent()) return;
      // Show specific error message based on reason
      if (result.reason === "conversation_closed") {
        await participation.handleBlockedReason(result);
        if (participation.isCurrent())
          showNotifyMessage(t("conversationClosed"));
      } else if (result.reason === "conversation_locked") {
        await participation.handleBlockedReason(result);
        if (participation.isCurrent()) showNotifyMessage(t("voteFailed"));
      } else if (
        result.reason === "event_ticket_required" ||
        result.reason === "account_required" ||
        result.reason === "strong_verification_required" ||
        result.reason === "email_verification_required" ||
        result.reason === "survey_required" ||
        result.reason === "survey_outdated"
      ) {
        await participation.handleBlockedReason(result);
      } else {
        showNotifyMessage(t("voteFailed"));
      }

      // Invalidate conversation for ANY conversation state error to refresh UI
      // This handles: conversation_closed, conversation_locked, or if conversation was reopened
      invalidateConversation(props.postSlugId);
    }
  } catch {
    // The mutation owns rollback and technical-error notifications.
    if (isCurrent()) hasVotedThisSession.value = userCastedVote.value;
  }
}

// Vote banner logic (3 states): uses pure function for testability
const bannerState = computed(() =>
  computeBannerState({
    clusteredThisMount: userClusteredThisMount.value,
    clusteredFromCache: !!userIsClusteredFromCache.value,
    clusteredInSession: isUserClusteredInSession(props.postSlugId),
  })
);

const bannerMessage = computed(() => {
  const state = bannerState.value;
  if (state === "celebration") {
    return t("assignedGroup");
  }
  if (state === "refine") {
    return t("keepVotingToRefineAnalysis");
  }
  return t("keepVotingToDiscoverGroup", {
    minVotes: String(MIN_VOTES_FOR_CLUSTER),
  });
});

const showViewAnalysisLink = computed(
  () => bannerState.value === "celebration"
);

const shouldShowBanner = computed(
  () =>
    props.showVoteResults && hasVotedThisSession.value && userCastedVote.value
);

function handleViewAnalysisClick() {
  props.onViewAnalysis();
}
</script>

<style scoped lang="scss">
.agreementButtons {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  gap: 0.5rem;
  padding-left: 0.2rem;
  padding-right: 0.2rem;
}

.voteUnlockBanner {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.bannerContent {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bannerMessage {
  flex: 1;
  color: #495057;
  font-size: 0.875rem;
  font-weight: 400;
}

.viewAnalysisLink {
  color: $primary;
  font-size: 0.875rem;
  font-weight: 400;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s;
}

.viewAnalysisLink:hover {
  text-decoration: underline;
}
</style>
