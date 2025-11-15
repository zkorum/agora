<template>
  <div>
    <div class="agreementButtons">
      <VotingButton
        vote-type="disagree"
        :label="t('disagree')"
        :is-selected="userVoteAction === 'disagree'"
        :disabled="false"
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
        :disabled="false"
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
        :disabled="false"
        :set-aria-label="`${t('agreeAriaLabel')} ${localNumAgrees}`"
        :vote-count="localNumAgrees"
        :percentage="formatPercentage(relativeTotalPercentageAgrees)"
        :show-vote-count="userCastedVote"
        @click="castPersonalVote(props.commentItem.opinionSlugId, 'agree')"
      />
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'agreement'"
      :requires-zupass-event-slug="props.requiresEventTicket"
      :login-required-to-participate="props.loginRequiredToParticipate"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import {
  type OpinionItem,
  type VotingAction,
  type VotingOption,
} from "src/shared/types/zod";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import { calculatePercentage } from "src/shared/util";
import { formatPercentage } from "src/utils/common";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref, onMounted, watch } from "vue";
import VotingButton from "src/components/features/opinion/VotingButton.vue";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  commentActionBarTranslations,
  type CommentActionBarTranslations,
} from "./CommentActionBar.i18n";
import { useTicketVerificationFlow } from "src/composables/zupass/useTicketVerificationFlow";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";

import type { EventSlug } from "src/shared/types/zod";

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  votingUtilities: OpinionVotingUtilities;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
  requiresEventTicket?: EventSlug;
}>();

const emit = defineEmits<{
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean }
  ];
}>();

// Local state management
const localUserVote = ref<VotingOption | undefined>(undefined);
const localNumAgrees = ref(0);
const localNumDisagrees = ref(0);
const localNumPasses = ref(0);

const showLoginDialog = ref(false);
const { setOpinionAgreementIntention } = useConversationLoginIntentions();

const { showNotifyMessage } = useNotify();
const { updateAuthState } = useBackendAuthApi();
const authStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authStore);
const userStore = useUserStore();
const { verifiedEventTickets } = storeToRefs(userStore);

const { t } = useComponentI18n<CommentActionBarTranslations>(
  commentActionBarTranslations
);

// Zupass verification
const { verifyTicket } = useTicketVerificationFlow();
const { isVerifying: isVerifyingZupass } = useZupassVerification();

// Check if opinion is locked due to missing event ticket
const isOpinionLocked = computed(() => {
  if (props.requiresEventTicket === undefined) {
    return false;
  }
  const verifiedTicketsArray = Array.from(verifiedEventTickets.value);
  return !verifiedTicketsArray.includes(props.requiresEventTicket);
});

// Initialize local state from props and global user votes
onMounted(() => {
  // Initialize vote counts from props
  localNumAgrees.value = props.commentItem.numAgrees;
  localNumDisagrees.value = props.commentItem.numDisagrees;
  localNumPasses.value = props.commentItem.numPasses;

  // Initialize user vote from global state
  const existingVote = props.votingUtilities.userVotes.find(
    (vote) => vote.opinionSlugId === props.commentItem.opinionSlugId
  );
  localUserVote.value = existingVote?.votingAction;
});

// Watch for changes in user votes (e.g., after ticket verification, account merge, or login)
watch(
  () => props.votingUtilities.userVotes,
  (newUserVotes) => {
    const existingVote = newUserVotes.find(
      (vote) => vote.opinionSlugId === props.commentItem.opinionSlugId
    );
    localUserVote.value = existingVote?.votingAction;
  },
  { deep: true }
);

const userCastedVote = computed(() => {
  return localUserVote.value !== undefined;
});

const userVoteAction = computed(() => {
  return localUserVote.value;
});

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
  setOpinionAgreementIntention(props.commentItem.opinionSlugId, props.requiresEventTicket);

  const needsLogin = props.loginRequiredToParticipate && !isLoggedIn.value;
  const hasZupassRequirement = props.requiresEventTicket !== undefined;

  console.log('[CommentActionBar] onLoginCallback', {
    needsLogin,
    hasZupassRequirement,
    isLoggedIn: isLoggedIn.value,
  });

  // If user just needs Zupass verification (no login required), trigger it inline
  if (!needsLogin && hasZupassRequirement) {
    console.log('[CommentActionBar] Triggering inline Zupass verification');
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
    console.log('[CommentActionBar] Emitting ticketVerified event', {
      userIdChanged: result.userIdChanged,
      needsCacheRefresh: result.needsCacheRefresh,
    });
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

  const currentVote = localUserVote.value;

  // Allow re-clicking the same vote to cancel it
  // If already voted and clicking same button, treat as cancel
  if (currentVote === voteAction) {
    voteAction = "cancel";
  }

  // Store original state for rollback
  const originalVote = localUserVote.value;
  const originalNumAgrees = localNumAgrees.value;
  const originalNumDisagrees = localNumDisagrees.value;
  const originalNumPasses = localNumPasses.value;

  // Apply optimistic updates locally
  // Helper to update counter
  const updateCounter = (vote: VotingOption | undefined, delta: number) => {
    if (vote === "agree") {
      localNumAgrees.value += delta;
    } else if (vote === "disagree") {
      localNumDisagrees.value += delta;
    } else if (vote === "pass") {
      localNumPasses.value += delta;
    }
  };

  // Remove old vote
  updateCounter(currentVote, -1);

  // Add new vote (unless canceling)
  if (voteAction !== "cancel") {
    localUserVote.value = voteAction;
    updateCounter(voteAction, 1);
  } else {
    localUserVote.value = undefined;
  }

  try {
    const success = await props.votingUtilities.castVote(
      opinionSlugId,
      voteAction
    );

    if (success) {
      await updateAuthState({ partialLoginStatus: { isKnown: true } });
      // Keep the optimistic changes
    } else {
      // Revert optimistic changes
      localUserVote.value = originalVote;
      localNumAgrees.value = originalNumAgrees;
      localNumDisagrees.value = originalNumDisagrees;
      localNumPasses.value = originalNumPasses;
      showNotifyMessage(t("voteFailed"));
    }
  } catch {
    // Revert optimistic changes
    localUserVote.value = originalVote;
    localNumAgrees.value = originalNumAgrees;
    localNumDisagrees.value = originalNumDisagrees;
    localNumPasses.value = originalNumPasses;
    showNotifyMessage(t("voteFailed"));
  }
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
</style>
