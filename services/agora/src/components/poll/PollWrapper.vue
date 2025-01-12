<template>
  <div @click.stop.prevent="">
    <div v-if="dataLoaded" class="pollContainer">
      <!-- Show buttons for voting -->
      <div v-if="currentDisplayMode == DisplayModes.Vote">
        <div class="pollOptionList">
          <ZKButton
            v-for="optionItem in localPollOptionList"
            :key="optionItem.index"
            outline
            :label="optionItem.option"
            text-color="primary"
            @click.stop.prevent="voteCasted(optionItem.index)"
          />
        </div>
      </div>

      <!-- Show the final result -->
      <div
        v-if="currentDisplayMode == DisplayModes.Results"
        class="pollOptionList"
      >
        <option-view
          v-for="optionItem in localPollOptionList"
          :key="optionItem.index"
          :option="optionItem.option"
          :voted-by-user="
            userVoteStatus.votedIndex == optionItem.index &&
            userVoteStatus.hasVoted
          "
          :option-percentage="
            totalVoteCount === 0
              ? 0
              : Math.round((optionItem.numResponses * 100) / totalVoteCount)
          "
        />
      </div>

      <div class="actionButtonCluster">
        <div class="voteCount">
          {{ totalVoteCount }} vote<span v-if="totalVoteCount > 1">s</span>
        </div>

        <div v-if="!userVoteStatus.hasVoted">
          <ZKButton
            v-if="currentDisplayMode == DisplayModes.Vote"
            outline
            text-color="primary"
            icon="mdi-chart-bar"
            label="Results"
            @click.stop.prevent="showResultsInterface()"
          />

          <ZKButton
            v-if="currentDisplayMode == DisplayModes.Results && isAuthenticated"
            outline
            text-color="primary"
            label="Vote"
            icon="mdi-vote"
            @click.stop.prevent="showVoteInterface()"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OptionView from "components/poll/OptionView.vue";
import ZKButton from "../ui-library/ZKButton.vue";
import { usePostStore, type DummyPollOptionFormat } from "src/stores/post";
import { onBeforeMount, ref, watch } from "vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendPollApi } from "src/utils/api/poll";
import type { UserInteraction, PollList } from "src/shared/types/zod";
import { storeToRefs } from "pinia";

const props = defineProps<{
  userResponse: UserInteraction;
  pollOptions: PollList;
  postSlugId: string;
}>();

const localPollOptionList = ref<DummyPollOptionFormat[]>([]);
initializeLocalPoll();

const dataLoaded = ref(false);

const backendPollApi = useBackendPollApi();
const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { loadPostData } = usePostStore();

enum DisplayModes {
  Vote,
  Results,
}
const currentDisplayMode = ref<DisplayModes>(
  isAuthenticated.value ? DisplayModes.Vote : DisplayModes.Results
);

const userVoteStatus = ref<UserInteraction>({
  hasVoted: false,
  votedIndex: 0,
});

const totalVoteCount = ref(0);
initializeTotalVoteCount();

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

async function voteCasted(selectedIndex: number) {
  const response = await backendPollApi.submitPollResponse(
    selectedIndex,
    props.postSlugId
  );
  if (response == true) {
    await Promise.all([loadPostData(false), fetchUserPollResponseData(true)]);
    incrementLocalPollIndex(selectedIndex);
    totalVoteCount.value += 1;
  }
}

watch(currentDisplayMode, () => {
  if (currentDisplayMode.value == DisplayModes.Results) {
    showResultsInterface();
  } else {
    showVoteInterface();
  }
});
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
}

.voteCount {
  padding-right: 0.5rem;
  padding-left: 0.5rem;
}
</style>
