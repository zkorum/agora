<template>
  <div>
    <div v-if="dataLoaded" class="pollContainer">
      <div class="pollOptionList">
        <PollOption
          v-for="optionItem in localPollOptionList"
          :key="optionItem.optionNumber"
          :option="optionItem.optionTitle"
          :display-mode="
            currentDisplayMode == DisplayModes.Vote ? 'option' : 'result'
          "
          :voted-by-user="
            userVoteStatus.votedIndex == optionItem.optionNumber - 1 &&
            userVoteStatus.hasVoted
          "
          :option-percentage="
            totalVoteCount === 0
              ? 0
              : Math.round((optionItem.numResponses * 100) / totalVoteCount)
          "
          @click="clickedVotingOption(optionItem.optionNumber - 1, $event)"
        />
      </div>

      <div class="actionButtonCluster">
        <div class="voteCount">
          {{ totalVoteCount }}
          {{ totalVoteCount === 1 ? t("vote") : t("votes") }}
        </div>

        <div v-if="!userVoteStatus.hasVoted">
          <ZKButton
            v-if="currentDisplayMode == DisplayModes.Vote"
            button-type="standardButton"
            @click.stop.prevent="showResultsInterface()"
          >
            <div class="resultsButton">
              <ZKIcon
                color="#6b4eff"
                name="material-symbols:grouped-bar-chart-rounded"
                size="1rem"
              />
              <div>{{ t("results") }}</div>
            </div>
          </ZKButton>

          <ZKButton
            v-if="currentDisplayMode == DisplayModes.Results"
            button-type="standardButton"
            @click.stop.prevent="showVoteInterface()"
          >
            <div class="resultsButton">
              <ZKIcon
                color="#6b4eff"
                name="material-symbols:how-to-vote"
                size="1rem"
              />
              <div>{{ t("vote") }}</div>
            </div>
          </ZKButton>
        </div>
      </div>
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="voting"
      :requires-zupass-event-slug="props.requiresEventTicket"
      :login-required-to-participate="props.loginRequiredToParticipate"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTicketVerificationFlow } from "src/composables/zupass/useTicketVerificationFlow";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";
import type {
  PollList,
  PollOptionWithResult,
  UserInteraction,
} from "src/shared/types/zod";
import type { EventSlug } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useBackendPollApi } from "src/utils/api/poll";
import { computed,onBeforeMount, ref, watch } from "vue";

import PreLoginIntentionDialog from "../../../authentication/intention/PreLoginIntentionDialog.vue";
import ZKButton from "../../../ui-library/ZKButton.vue";
import ZKIcon from "../../../ui-library/ZKIcon.vue";
import PollOption from "./PollOption.vue";
import {
  type PollWrapperTranslations,
  pollWrapperTranslations,
} from "./PollWrapper.i18n";

const props = defineProps<{
  userResponse: UserInteraction;
  pollOptions: PollList;
  postSlugId: string;
  loginRequiredToParticipate: boolean;
  requiresEventTicket?: EventSlug;
}>();

const emit = defineEmits<{
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean }
  ];
}>();

const localPollOptionList = ref<PollOptionWithResult[]>([]);
initializeLocalPoll();

const dataLoaded = ref(false);

const backendPollApi = useBackendPollApi();
const authStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authStore);
const userStore = useUserStore();
const { verifiedEventTickets } = storeToRefs(userStore);
const { loadPostData } = useHomeFeedStore();
const { updateAuthState } = useBackendAuthApi();

// Zupass verification
const { verifyTicket } = useTicketVerificationFlow();
const { isVerifying: isVerifyingZupass } = useZupassVerification();

// Check if poll is locked due to missing event ticket
const isPollLocked = computed(() => {
  if (props.requiresEventTicket === undefined) {
    return false;
  }
  // Convert Set to Array for better reactivity tracking
  const verifiedTicketsArray = Array.from(verifiedEventTickets.value);
  return !verifiedTicketsArray.includes(props.requiresEventTicket);
});

const { setVotingIntention } = useConversationLoginIntentions();

const { t } = useComponentI18n<PollWrapperTranslations>(
  pollWrapperTranslations
);

enum DisplayModes {
  Vote,
  Results,
}
const currentDisplayMode = ref<DisplayModes>(DisplayModes.Vote);

const userVoteStatus = ref<UserInteraction>({
  hasVoted: false,
  votedIndex: 0,
});

const totalVoteCount = ref(0);
initializeTotalVoteCount();

const showLoginDialog = ref(false);

watch(currentDisplayMode, () => {
  if (currentDisplayMode.value == DisplayModes.Results) {
    showResultsInterface();
  } else {
    showVoteInterface();
  }
});

onBeforeMount(async () => {
  await fetchUserPollResponseData(false);
});

function initializeTotalVoteCount() {
  totalVoteCount.value = 0;
  localPollOptionList.value.forEach((option) => {
    totalVoteCount.value += option.numResponses;
  });
}

function incrementLocalPollIndex(targetIndex: number) {
  localPollOptionList.value.forEach((pollOption) => {
    if (targetIndex == pollOption.optionNumber - 1) {
      pollOption.numResponses += 1;
    }
  });
}

function initializeLocalPoll() {
  props.pollOptions?.forEach((pollOption) => {
    localPollOptionList.value.push(pollOption);
  });
}

async function fetchUserPollResponseData(loadFromRemote: boolean) {
  if (loadFromRemote) {
    const response = await backendPollApi.fetchUserPollResponse([
      props.postSlugId,
    ]);
    const selectedOption = response.get(props.postSlugId);
    if (selectedOption) {
      userVoteStatus.value = {
        hasVoted: true,
        votedIndex: selectedOption - 1,
      };
      showResultsInterface();
    }
  } else {
    userVoteStatus.value = {
      hasVoted: props.userResponse.hasVoted,
      votedIndex: props.userResponse.votedIndex,
    };

    if (userVoteStatus.value.hasVoted) {
      showResultsInterface();
    }
  }

  dataLoaded.value = true;
}

function showResultsInterface() {
  currentDisplayMode.value = DisplayModes.Results;
}

function showVoteInterface() {
  currentDisplayMode.value = DisplayModes.Vote;
}

async function clickedVotingOption(selectedIndex: number, event: MouseEvent) {
  if (currentDisplayMode.value === DisplayModes.Results) {
    return;
  }

  // Prevent multiple clicks while Zupass is verifying
  if (isVerifyingZupass.value) {
    return;
  }

  event.stopPropagation();

  // Check if user needs login or Zupass verification
  const needsLogin = props.loginRequiredToParticipate && !isLoggedIn.value;
  const needsZupass = isPollLocked.value;

  if (needsLogin || needsZupass) {
    showLoginDialog.value = true;
    return;
  }

  // User is allowed to vote - submit response
  const response = await backendPollApi.submitPollResponse(
    selectedIndex,
    props.postSlugId
  );
  // TODO: refactor backend to send error and reason if any, and react appropriately
  // and eventual change in state (isGuest etc)
  if (response == true) {
    // TODO: refactor because there arep potentially redundant requests (loadPostData inside updateAuthState)
    await updateAuthState({ partialLoginStatus: { isKnown: true } });
    await Promise.all([loadPostData(), fetchUserPollResponseData(true)]);
    incrementLocalPollIndex(selectedIndex);
    totalVoteCount.value += 1;
  } else {
    showLoginDialog.value = true;
  }
}

async function onLoginCallback() {
  // Store the intention with eventSlug
  setVotingIntention(props.requiresEventTicket);

  const needsLogin = props.loginRequiredToParticipate && !isLoggedIn.value;
  const hasZupassRequirement = props.requiresEventTicket !== undefined;

  console.log('[PollWrapper] onLoginCallback', {
    needsLogin,
    hasZupassRequirement,
    isLoggedIn: isLoggedIn.value,
  });

  // If user just needs Zupass verification (no login required), trigger it inline
  if (!needsLogin && hasZupassRequirement) {
    console.log('[PollWrapper] Triggering inline Zupass verification');
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
    onSuccess: async () => {
      // Reload poll data after successful verification
      await Promise.all([loadPostData(), fetchUserPollResponseData(true)]);
    },
  });

  if (result.success) {
    // Emit to parent so banner gets refreshed
    console.log('[PollWrapper] Emitting ticketVerified event', {
      userIdChanged: result.userIdChanged,
      needsCacheRefresh: result.needsCacheRefresh,
    });
    emit("ticketVerified", {
      userIdChanged: result.userIdChanged,
      needsCacheRefresh: result.needsCacheRefresh,
    });
  }
}
</script>

<style scoped lang="scss">
.actionButtonCluster {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  gap: 1rem;
}

.pollOptionList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pollContainer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: black;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.voteCount {
  padding-right: 0.5rem;
  padding-left: 0.5rem;
}

.resultsButton {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: #6b4eff;
}
</style>
