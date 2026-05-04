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
        :show-vote-count="userCastedVote"
        @click="castPersonalVote(props.commentItem.opinionSlugId, 'disagree')"
      />

      <VotingButton
        vote-type="pass"
        :label="t('pass')"
        :is-selected="userVoteAction === 'pass'"
        :disabled="isVotingDisabled"
        :set-aria-label="`${t('passAriaLabel')} ${localNumPasses}`"
        :vote-count="localNumPasses"
        :percentage="formatPercentage(relativeTotalPercentagePasses)"
        :show-vote-count="userCastedVote"
        @click="castPersonalVote(props.commentItem.opinionSlugId, 'pass')"
      />

      <VotingButton
        vote-type="agree"
        :label="t('agree')"
        :is-selected="userVoteAction === 'agree'"
        :disabled="isVotingDisabled"
        :set-aria-label="`${t('agreeAriaLabel')} ${localNumAgrees}`"
        :vote-count="localNumAgrees"
        :percentage="formatPercentage(relativeTotalPercentageAgrees)"
        :show-vote-count="userCastedVote"
        @click="castPersonalVote(props.commentItem.opinionSlugId, 'agree')"
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

    <PreParticipationIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="agreement"
      :conversation-slug-id="props.postSlugId"
      :requires-zupass-event-slug="props.requiresEventTicket"
      :needs-auth="needsLogin"
      :participation-mode="props.participationMode"
    />
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import PreParticipationIntentionDialog from "src/components/authentication/intention/PreParticipationIntentionDialog.vue";
import VotingButton from "src/components/features/opinion/VotingButton.vue";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type EventSlug,
  type OpinionItem,
  type ParticipationMode,
  type SurveyGateSummary,
  type VotingAction,
} from "src/shared/types/zod";
import { calculatePercentage } from "src/shared/util";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useInvalidateConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useUserClusteringSession } from "src/utils/api/vote/useVoteQueries";
import { formatPercentage } from "src/utils/common";
import { computeBannerState } from "src/utils/component/bannerState";
import { MIN_VOTES_FOR_CLUSTER } from "src/utils/component/opinion";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref } from "vue";

import {
  type CommentActionBarTranslations,
  commentActionBarTranslations,
} from "./CommentActionBar.i18n";

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  votingUtilities: OpinionVotingUtilities;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  surveyGate: SurveyGateSummary | undefined;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
}>();

const showLoginDialog = ref(false);
const hasVotedThisSession = ref(false);
const { setOpinionAgreementIntention } = useConversationLoginIntentions();
const {
  needsAuth: isAuthBlocked,
  shouldOpenParticipationModal,
} = useParticipationGate({
  conversationSlugId: computed(() => props.postSlugId),
  participationMode: computed(() => props.participationMode),
  requiresEventTicket: computed(() => props.requiresEventTicket),
  surveyGate: computed(() => props.surveyGate),
});

const { showNotifyMessage } = useNotify();
const { updateAuthState } = useBackendAuthApi();
const { invalidateConversation } = useInvalidateConversationQuery();

// Query client for reading analysis cache
const queryClient = useQueryClient();

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
  const analysisData = queryClient.getQueryData<{
    polisClusters?: Record<string, { isUserInCluster?: boolean } | undefined>;
  }>(["analysis", props.postSlugId]);

  return (
    analysisData?.polisClusters &&
    Object.values(analysisData.polisClusters).some(
      (cluster) => cluster?.isUserInCluster === true
    )
  );
});

// Check if user needs login/verification based on participation mode
const needsLogin = computed(() => {
  return isAuthBlocked.value;
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

function onLoginCallback() {
  // Store the intention with eventSlug
  setOpinionAgreementIntention(
    props.commentItem.opinionSlugId,
    props.requiresEventTicket
  );
}

async function castPersonalVote(
  opinionSlugId: string,
  voteAction: VotingAction
): Promise<void> {
  if (await shouldOpenParticipationModal()) {
    showLoginDialog.value = true;
    return;
  }

  // Allow re-clicking the same vote to cancel it
  // If already voted and clicking same button, treat as cancel
  const isCancellation = userVoteAction.value === voteAction;
  if (isCancellation) {
    voteAction = "cancel";
    // Hide banner immediately for cancellations to prevent flash
    hasVotedThisSession.value = false;
  }

  // Cast vote - TanStack Query handles optimistic updates automatically
  try {
    const result = await props.votingUtilities.castVote(
      opinionSlugId,
      voteAction
    );

    if (result.success) {
      // Detect clustering for the first time this mount
      if (result.userIsClustered === true && !userClusteredThisMount.value) {
        userClusteredThisMount.value = true;
      }

      // Show banner for actual votes (not cancellations)
      if (!isCancellation) {
        hasVotedThisSession.value = true;
      }
      await updateAuthState({ partialLoginStatus: { isKnown: true } });
    } else {
      // Show specific error message based on reason
      if (result.reason === "conversation_closed") {
        showNotifyMessage(t("conversationClosed"));
      } else if (result.reason === "conversation_locked") {
        showNotifyMessage(t("voteFailed"));
      } else if (result.reason === "event_ticket_required" || result.reason === "account_required" || result.reason === "strong_verification_required" || result.reason === "email_verification_required") {
        showLoginDialog.value = true;
      } else if (
        result.reason === "survey_required" ||
        result.reason === "survey_outdated"
      ) {
        showLoginDialog.value = true;
      } else {
        showNotifyMessage(t("voteFailed"));
      }

      // Invalidate conversation for ANY conversation state error to refresh UI
      // This handles: conversation_closed, conversation_locked, or if conversation was reopened
      invalidateConversation(props.postSlugId);
    }
  } catch {
    showNotifyMessage(t("voteFailed"));
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
  return t("keepVotingToDiscoverGroup", { minVotes: String(MIN_VOTES_FOR_CLUSTER) });
});

const showViewAnalysisLink = computed(() => bannerState.value === "celebration");

const shouldShowBanner = computed(() => {
  // Show banner whenever user has voted this session
  // Message will be "Keep voting" or "You have been assigned a group!" based on clustering status
  return hasVotedThisSession.value;
});

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
