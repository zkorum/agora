<template>
  <div>
    <div class="agreementButtons">
      <div class="buttonContainer">
        <ZKButton
          button-type="largeButton"
          class="maxWidth"
          :disable="isPostLocked"
          label="Disagree"
          :text-color="downvoteIcon.textColor"
          :color="downvoteIcon.backgroundColor"
          size="0.8rem"
          @click.stop.prevent="
            castPersonalVote(props.commentItem.opinionSlugId, false)
          "
        >
        </ZKButton>

        <div v-if="userCastedVote" class="voteCountLabelDisagree">
          <div>
            {{ props.commentItem.numDisagrees }} •
            {{ formatPercentage(relativeTotalPercentageDisagrees) }}
          </div>
        </div>
      </div>

      <div class="buttonContainer">
        <ZKButton
          button-type="largeButton"
          class="maxWidth"
          :disable="isPostLocked"
          label="Agree"
          :text-color="upvoteIcon.textColor"
          :color="upvoteIcon.backgroundColor"
          size="0.8rem"
          @click.stop.prevent="
            castPersonalVote(props.commentItem.opinionSlugId, true)
          "
        >
        </ZKButton>

        <div v-if="userCastedVote" class="voteCountLabelAgree">
          <div>
            {{ numAgreesLocal }} •
            {{ formatPercentage(relativeTotalPercentageAgrees) }}
          </div>
        </div>
      </div>
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
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { type OpinionItem, type VotingAction } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useBackendVoteApi } from "src/utils/api/vote";
import { calculatePercentage, formatPercentage } from "src/utils/common";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref } from "vue";

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
  participantCount: number;
  loginRequiredToParticipate: boolean;
}>();

const emit = defineEmits(["changeVote"]);

const showLoginDialog = ref(false);
const { createOpinionAgreementIntention } = useLoginIntentionStore();

const { showNotifyMessage } = useNotify();

const { castVoteForComment } = useBackendVoteApi();
const { updateAuthState } = useBackendAuthApi();
const { isLoggedIn } = storeToRefs(useAuthenticationStore());

// we use computed to make the changes update immediately on-click, without waiting for this whole child component to re-render upon emit
const numAgreesLocal = computed(() => props.commentItem.numAgrees);
const numDisagreesLocal = computed(() => props.commentItem.numDisagrees);

const userCastedVote = computed(() => {
  const hasEntry = props.commentSlugIdLikedMap.has(
    props.commentItem.opinionSlugId
  );
  return hasEntry ? true : false;
});

interface IconObject {
  icon: string;
  textColor: string;
  backgroundColor: string;
}

const downvoteIcon = computed<IconObject>(() => {
  const userAction = props.commentSlugIdLikedMap.get(
    props.commentItem.opinionSlugId
  );
  if (userAction == "disagree") {
    return {
      icon: "mdi-thumb-down",
      textColor: "white",
      backgroundColor: "button-disagree-background-selected",
    };
  } else {
    return {
      icon: "mdi-thumb-down-outline",
      textColor: "button-disagree-text",
      backgroundColor: "button-disagree-background-unselected",
    };
  }
});

const upvoteIcon = computed<IconObject>(() => {
  const userAction = props.commentSlugIdLikedMap.get(
    props.commentItem.opinionSlugId
  );
  if (userAction == "agree") {
    return {
      icon: "mdi-thumb-up",
      textColor: "white",
      backgroundColor: "button-agree-background-selected",
    };
  } else {
    return {
      icon: "mdi-thumb-up-outline",
      textColor: "button-agree-text",
      backgroundColor: "button-agree-background-unselected",
    };
  }
});

const relativeTotalPercentageAgrees = computed(() => {
  return calculatePercentage(
    numAgreesLocal.value,
    numAgreesLocal.value + numDisagreesLocal.value
  );
});

const relativeTotalPercentageDisagrees = computed(() => {
  return calculatePercentage(
    numDisagreesLocal.value,
    numAgreesLocal.value + numDisagreesLocal.value
  );
});

function onLoginCallback() {
  createOpinionAgreementIntention(
    props.postSlugId,
    props.commentItem.opinionSlugId
  );
}

async function castPersonalVote(
  commentSlugId: string,
  isUpvoteButton: boolean
) {
  if (props.loginRequiredToParticipate && !isLoggedIn.value) {
    showLoginDialog.value = true;
  } else {
    let targetState: VotingAction = "cancel";
    const originalSelection = props.commentSlugIdLikedMap.get(commentSlugId);
    if (originalSelection == undefined) {
      targetState = isUpvoteButton ? "agree" : "disagree";
    } else {
      // temporarily disabling changing vote, until it is supported in external polis system
      showNotifyMessage("Vote change temporarily disabled");
      return;
      //TODO: remove the above and uncomment what's below
      // if (originalSelection == "agree") {
      //   if (isUpvoteButton) {
      //     targetState = "cancel";
      //   } else {
      //     targetState = "disagree";
      //   }
      // } else {
      //   if (isUpvoteButton) {
      //     targetState = "agree";
      //   } else {
      //     targetState = "cancel";
      //   }
      // }
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
}
</script>

<style scoped lang="scss">
.voteCountLabel {
  padding-left: 0.5rem;
}

.agreementButtons {
  display: grid;
  grid-template-columns: calc(50% - 0.5rem) calc(50% - 0.5rem);
  grid-template-rows: 1fr;
  gap: 0px 1rem;
  grid-template-areas: ". .";
  padding-left: 0.2rem;
  padding-right: 0.2rem;
}

.maxWidth {
  width: 100%;
}

.buttonContainer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.voteCountLabelDisagree {
  color: $button-disgree-text;
}

.voteCountLabelAgree {
  color: $button-agree-text;
}

.highlightStat {
  font-weight: bold;
}
</style>
