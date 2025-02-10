<template>
  <div>
    <div class="agreementButtons">
      <div class="buttonContainer">
        <ZKButton
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
            Total: {{ numDisagreesLocal }} ({{
              formatPercentage(totalPercentageDisagrees)
            }})
          </div>
          <div v-if="commentItem.clustersStats.length >= 2">
            <div
              v-for="clusterItem in commentItem.clustersStats"
              :key="clusterItem.key"
              :class="{ highlightStat: selectedClusterKey === clusterItem.key }"
            >
              Group
              {{ formatClusterLabel(clusterItem.key, clusterItem.aiLabel) }}:
              {{ clusterItem.numDisagrees }} ({{
                formatPercentage(
                  calculatePercentage(
                    clusterItem.numDisagrees,
                    clusterItem.numUsers
                  )
                )
              }})
            </div>
          </div>
        </div>
      </div>

      <div class="buttonContainer">
        <ZKButton
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
            Total: {{ numAgreesLocal }} ({{
              formatPercentage(totalPercentageAgrees)
            }})
          </div>
          <div v-if="commentItem.clustersStats.length >= 2">
            <div
              v-for="clusterItem in commentItem.clustersStats"
              :key="clusterItem.key"
              :class="{ highlightStat: selectedClusterKey === clusterItem.key }"
            >
              Group
              {{ formatClusterLabel(clusterItem.key, clusterItem.aiLabel) }}:
              {{ clusterItem.numAgrees }} ({{
                formatPercentage(
                  calculatePercentage(
                    clusterItem.numAgrees,
                    clusterItem.numUsers
                  )
                )
              }})
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBackendVoteApi } from "src/utils/api/vote";
import { computed, ref } from "vue";
import {
  PolisKey,
  type OpinionItem,
  type VotingAction,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useDialog } from "src/utils/ui/dialog";
import { formatPercentage, calculatePercentage } from "src/utils/common";
import { storeToRefs } from "pinia";
import { formatClusterLabel } from "src/utils/component/opinion";

const props = defineProps<{
  selectedClusterKey: PolisKey | undefined;
  commentItem: OpinionItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
}>();

const { showLoginConfirmationDialog } = useDialog();

const { castVoteForComment } = useBackendVoteApi();
const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const numAgreesLocal = ref(props.commentItem.numAgrees);
const numDisagreesLocal = ref(props.commentItem.numDisagrees);

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

const totalPercentageAgrees = computed(() => {
  return calculatePercentage(
    numAgreesLocal.value,
    numDisagreesLocal.value + numAgreesLocal.value
  );
});

const totalPercentageDisagrees = computed(() => {
  return calculatePercentage(
    numDisagreesLocal.value,
    numDisagreesLocal.value + numAgreesLocal.value
  );
});

async function castPersonalVote(
  commentSlugId: string,
  isUpvoteButton: boolean
) {
  if (!isAuthenticated.value) {
    showLoginConfirmationDialog();
  } else {
    const numLikesBackup = numAgreesLocal.value;
    const numDislikesBackup = numDisagreesLocal.value;

    let targetState: VotingAction = "cancel";
    const originalSelection = props.commentSlugIdLikedMap.get(commentSlugId);
    if (originalSelection == undefined) {
      targetState = isUpvoteButton ? "agree" : "disagree";
    } else {
      if (originalSelection == "agree") {
        if (isUpvoteButton) {
          targetState = "cancel";
        } else {
          targetState = "disagree";
        }
      } else {
        if (isUpvoteButton) {
          targetState = "agree";
        } else {
          targetState = "cancel";
        }
      }
    }

    if (targetState == "cancel") {
      props.commentSlugIdLikedMap.delete(commentSlugId);
      if (originalSelection == "agree") {
        numAgreesLocal.value = numAgreesLocal.value - 1;
      } else {
        numDisagreesLocal.value = numDisagreesLocal.value - 1;
      }
    } else {
      if (targetState == "agree") {
        props.commentSlugIdLikedMap.set(commentSlugId, "agree");
        numAgreesLocal.value = numAgreesLocal.value + 1;
        if (originalSelection == "disagree") {
          numDisagreesLocal.value = numDisagreesLocal.value - 1;
        }
      } else {
        props.commentSlugIdLikedMap.set(commentSlugId, "disagree");
        numDisagreesLocal.value = numDisagreesLocal.value + 1;
        if (originalSelection == "agree") {
          numAgreesLocal.value = numAgreesLocal.value - 1;
        }
      }
    }

    const response = await castVoteForComment(commentSlugId, targetState);
    if (!response) {
      // Revert
      if (originalSelection == undefined) {
        props.commentSlugIdLikedMap.delete(commentSlugId);
      } else {
        props.commentSlugIdLikedMap.set(commentSlugId, originalSelection);
      }

      numAgreesLocal.value = numLikesBackup;
      numDisagreesLocal.value = numDislikesBackup;
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
  padding-top: 1rem;
  padding-bottom: 1rem;
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
