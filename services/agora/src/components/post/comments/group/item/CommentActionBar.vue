<template>
  <div>
    <div class="agreementButtons">
      <VotingButton
        vote-type="disagree"
        label="Disagree"
        :is-selected="userVoteAction === 'disagree'"
        :disabled="isPostLocked"
        :set-aria-label="`Disagree with comment. Current disagrees: ${props.commentItem.numDisagrees}`"
        :vote-count="props.commentItem.numDisagrees"
        :percentage="formatPercentage(relativeTotalPercentageDisagrees)"
        :show-vote-count="userCastedVote"
        @click="castPersonalVote(props.commentItem.opinionSlugId, 'disagree')"
      />

      <VotingButton
        vote-type="pass"
        label="Pass"
        :is-selected="userVoteAction === 'pass'"
        :disabled="isPostLocked"
        :set-aria-label="`Pass on comment. Current passes: ${props.commentItem.numPasses}`"
        :vote-count="props.commentItem.numPasses"
        :percentage="formatPercentage(relativeTotalPercentagePasses)"
        :show-vote-count="userCastedVote"
        @click="castPersonalVote(props.commentItem.opinionSlugId, 'pass')"
      />

      <VotingButton
        vote-type="agree"
        label="Agree"
        :is-selected="userVoteAction === 'agree'"
        :disabled="isPostLocked"
        :set-aria-label="`Agree with comment. Current agrees: ${props.commentItem.numAgrees}`"
        :vote-count="props.commentItem.numAgrees"
        :percentage="formatPercentage(relativeTotalPercentageAgrees)"
        :show-vote-count="userCastedVote"
        @click="castPersonalVote(props.commentItem.opinionSlugId, 'agree')"
      />
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'agreement'"
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
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useBackendVoteApi } from "src/utils/api/vote";
import { calculatePercentage } from "src/shared/common/util";
import { formatPercentage } from "src/utils/common";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref } from "vue";
import VotingButton from "src/components/features/opinion/VotingButton.vue";
import { useConversationData } from "src/composables/useConversationData";

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, VotingOption>;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
}>();

const emit = defineEmits(["changeVote"]);

const showLoginDialog = ref(false);
const { createOpinionAgreementLoginIntention } = useConversationData();

const { showNotifyMessage } = useNotify();

const { castVoteForComment } = useBackendVoteApi();
const { updateAuthState } = useBackendAuthApi();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const userCastedVote = computed(() => {
  return props.commentSlugIdLikedMap.has(props.commentItem.opinionSlugId);
});

const userVoteAction = computed(() => {
  return props.commentSlugIdLikedMap.get(props.commentItem.opinionSlugId);
});

const totalVotes = computed(() => {
  return (
    props.commentItem.numAgrees +
    props.commentItem.numDisagrees +
    props.commentItem.numPasses
  );
});

const relativeTotalPercentageAgrees = computed(() => {
  return calculatePercentage(props.commentItem.numAgrees, totalVotes.value);
});

const relativeTotalPercentageDisagrees = computed(() => {
  return calculatePercentage(props.commentItem.numDisagrees, totalVotes.value);
});

const relativeTotalPercentagePasses = computed(() => {
  return calculatePercentage(props.commentItem.numPasses, totalVotes.value);
});

function onLoginCallback() {
  createOpinionAgreementLoginIntention(props.commentItem.opinionSlugId);
}

async function castPersonalVote(
  commentSlugId: string,
  voteAction: VotingAction
) {
  if (props.loginRequiredToParticipate && !isLoggedIn.value) {
    showLoginDialog.value = true;
    return;
  }

  let targetState: VotingAction = "cancel";
  const originalSelection = props.commentSlugIdLikedMap.get(commentSlugId);

  if (originalSelection === undefined) {
    targetState = voteAction;
  } else {
    // temporarily disabling changing vote, until it is supported in external polis system
    showNotifyMessage("Vote change temporarily disabled");
    return;
  }

  emit("changeVote", targetState);

  const response = await castVoteForComment(commentSlugId, targetState);
  // TODO: refactor backend to return error and reason if any, and react appropriately
  if (!response) {
    // Revert
    emit(
      "changeVote",
      originalSelection !== undefined ? originalSelection : "cancel"
    );
  } else {
    await updateAuthState({ partialLoginStatus: { isKnown: true } });
  }
}
</script>

<style scoped lang="scss">
.agreementButtons {
  display: grid;
  grid-template-columns: 1fr 0.5fr 1fr;
  grid-template-rows: 1fr;
  gap: 0.5rem;
  padding-left: 0.2rem;
  padding-right: 0.2rem;
}
</style>
