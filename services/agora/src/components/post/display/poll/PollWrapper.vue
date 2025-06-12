<template>
  <div>
    <div v-if="dataLoaded" class="pollContainer">
      <div class="pollOptionList">
        <PollOption
          v-for="optionItem in localPollOptionList"
          :key="optionItem.index"
          :option="optionItem.option"
          :display-mode="
            currentDisplayMode == DisplayModes.Vote ? 'option' : 'result'
          "
          :voted-by-user="
            userVoteStatus.votedIndex == optionItem.index &&
            userVoteStatus.hasVoted
          "
          :option-percentage="
            totalVoteCount === 0
              ? 0
              : Math.round((optionItem.numResponses * 100) / totalVoteCount)
          "
          @click="clickedVotingOption(optionItem.index, $event)"
        />
      </div>

      <div class="actionButtonCluster">
        <div class="voteCount">
          {{ totalVoteCount }} vote<span v-if="totalVoteCount > 1">s</span>
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
              <div>Results</div>
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
              <div>Vote</div>
            </div>
          </ZKButton>
        </div>
      </div>
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'voting'"
    />
  </div>
</template>

<script setup lang="ts">
import ZKButton from "../../../ui-library/ZKButton.vue";
import {
  useHomeFeedStore,
  type DummyPollOptionFormat,
} from "src/stores/homeFeed";
import { onBeforeMount, ref, watch } from "vue";
import { useBackendPollApi } from "src/utils/api/poll";
import type { UserInteraction, PollList } from "src/shared/types/zod";
import { storeToRefs } from "pinia";
import ZKIcon from "../../../ui-library/ZKIcon.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import PreLoginIntentionDialog from "../../../authentication/intention/PreLoginIntentionDialog.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendAuthApi } from "src/utils/api/auth";
import PollOption from "./PollOption.vue";

const props = defineProps<{
  userResponse: UserInteraction;
  pollOptions: PollList;
  postSlugId: string;
  loginRequiredToParticipate: boolean;
}>();

const localPollOptionList = ref<DummyPollOptionFormat[]>([]);
initializeLocalPoll();

const dataLoaded = ref(false);

const backendPollApi = useBackendPollApi();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { loadPostData } = useHomeFeedStore();
const { updateAuthState } = useBackendAuthApi();

const { createVotingIntention } = useLoginIntentionStore();

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
    if (targetIndex == pollOption.index) {
      pollOption.numResponses += 1;
    }
  });
}

function initializeLocalPoll() {
  props.pollOptions?.forEach((pollOption) => {
    const localPollItem: DummyPollOptionFormat = {
      index: pollOption.optionNumber - 1,
      numResponses: pollOption.numResponses,
      option: pollOption.optionTitle,
    };
    localPollOptionList.value.push(localPollItem);
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
  event.stopPropagation();

  if (props.loginRequiredToParticipate && !isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }
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

function onLoginCallback() {
  createVotingIntention(props.postSlugId);
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
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
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
