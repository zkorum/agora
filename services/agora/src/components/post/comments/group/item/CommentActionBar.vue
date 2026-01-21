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

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="agreement"
      :requires-zupass-event-slug="props.requiresEventTicket"
      :login-required-to-participate="props.loginRequiredToParticipate"
    />
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import VotingButton from "src/components/features/opinion/VotingButton.vue";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTicketVerificationFlow } from "src/composables/zupass/useTicketVerificationFlow";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";
import type { EventSlug, ExtendedConversation } from "src/shared/types/zod";
import {
  type OpinionItem,
  type VotingAction,
} from "src/shared/types/zod";
import { calculatePercentage } from "src/shared/util";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useInvalidateConversationQuery } from "src/utils/api/post/useConversationQuery";
import { formatPercentage } from "src/utils/common";
import { useNotify } from "src/utils/ui/notify";
import { computed, inject, type Ref,ref } from "vue";

import {
  type CommentActionBarTranslations,
  commentActionBarTranslations,
} from "./CommentActionBar.i18n";

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  votingUtilities: OpinionVotingUtilities;
  loginRequiredToParticipate: boolean;
  requiresEventTicket?: EventSlug;
}>();

const emit = defineEmits<{
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean },
  ];
}>();

const showLoginDialog = ref(false);
const hasVotedThisSession = ref(false);
const { setOpinionAgreementIntention } = useConversationLoginIntentions();

const { showNotifyMessage } = useNotify();
const { updateAuthState } = useBackendAuthApi();
const { invalidateConversation } = useInvalidateConversationQuery();
const authStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authStore);
const userStore = useUserStore();
const { verifiedEventTickets } = storeToRefs(userStore);

// Inject reactive conversation data from parent
const conversationData = inject<Ref<ExtendedConversation> | undefined>("conversationData");

// Query client for reading analysis cache
const queryClient = useQueryClient();

// Compute if voting should be disabled (closed OR locked by moderator)
const isVotingDisabled = computed(() => {
  const data = conversationData?.value;
  if (!data) return false;

  const isModeratedAndLocked =
    data.metadata.moderation.status === "moderated" &&
    data.metadata.moderation.action === "lock";

  const isClosed = data.metadata.isClosed;

  return isModeratedAndLocked || isClosed;
});

const { t } = useComponentI18n<CommentActionBarTranslations>(
  commentActionBarTranslations
);

// Zupass verification
const { verifyTicket } = useTicketVerificationFlow();
const { isVerifying: isVerifyingZupass } = useZupassVerification();

// Inject parent state for vote unlock banner
const navigateToAnalysis = inject<() => void>("navigateToAnalysis")!;

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

// Check if opinion is locked due to missing event ticket
const isOpinionLocked = computed(() => {
  if (props.requiresEventTicket === undefined) {
    return false;
  }
  const verifiedTicketsArray = Array.from(verifiedEventTickets.value);
  return !verifiedTicketsArray.includes(props.requiresEventTicket);
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

async function onLoginCallback() {
  // Store the intention with eventSlug
  setOpinionAgreementIntention(
    props.commentItem.opinionSlugId,
    props.requiresEventTicket
  );

  const needsLogin = props.loginRequiredToParticipate && !isLoggedIn.value;
  const hasZupassRequirement = props.requiresEventTicket !== undefined;

  // If user just needs Zupass verification (no login required), trigger it inline
  if (!needsLogin && hasZupassRequirement) {
    await handleZupassVerification();
  }
  // Otherwise, dialog will route user to login via PreLoginIntentionDialog
}

async function handleZupassVerification() {
  if (props.requiresEventTicket === undefined) {
    return;
  }

  // Dialog will close when Zupass iframe is ready (via callback)
  const result = await verifyTicket({
    eventSlug: props.requiresEventTicket,
    onIframeReady: () => {
      // Close dialog as soon as Zupass iframe becomes visible
      showLoginDialog.value = false;
    },
  });

  if (result.success) {
    // Emit to parent so banner gets refreshed
    emit("ticketVerified", {
      userIdChanged: result.userIdChanged,
      needsCacheRefresh: result.needsCacheRefresh,
    });
  }
}

async function castPersonalVote(
  opinionSlugId: string,
  voteAction: VotingAction
): Promise<void> {
  // Prevent multiple clicks while Zupass is verifying
  if (isVerifyingZupass.value) {
    return;
  }

  // Check if user needs login or Zupass verification
  const needsLogin = props.loginRequiredToParticipate && !isLoggedIn.value;
  const needsZupass = isOpinionLocked.value;

  if (needsLogin || needsZupass) {
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

// Vote banner logic (3 states)
const bannerMessage = computed(() => {
  // Just got clustered THIS mount (show celebration once)
  if (userClusteredThisMount.value && !userIsClusteredFromCache.value) {
    return t("assignedGroup"); // "You have been assigned a group!"
  }

  // User was clustered before OR just got clustered (show refinement)
  if (userClusteredThisMount.value || userIsClusteredFromCache.value) {
    return t("keepVotingToRefineAnalysis"); // "Keep voting to refine the analysis"
  }

  // Not clustered yet
  return t("keepVotingToDiscoverGroup"); // "Keep voting to discover your group"
});

const showViewAnalysisLink = computed(() => {
  // Only show link for "You have been assigned a group!" celebration message
  return userClusteredThisMount.value && !userIsClusteredFromCache.value;
});

const shouldShowBanner = computed(() => {
  // Show banner whenever user has voted this session
  // Message will be "Keep voting" or "You have been assigned a group!" based on clustering status
  return hasVotedThisSession.value;
});

function handleViewAnalysisClick() {
  // Call parent navigation function
  navigateToAnalysis();
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
