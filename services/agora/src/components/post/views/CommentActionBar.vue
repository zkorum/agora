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
          {{ numDislikesLocal }} ({{
            Math.round(
              (numDislikesLocal / (numDislikesLocal + numLikesLocal)) * 100
            )
          }}%)
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
          {{ numLikesLocal }} ({{
            Math.round(
              (numLikesLocal / (numDislikesLocal + numLikesLocal)) * 100
            )
          }}%)
        </div>
      </div>
    </div>

    <div class="actionButtonCluster">
      <CommentActionOptions
        :comment-item="props.commentItem"
        :post-slug-id="props.postSlugId"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
      />

      <ZKButton
        flat
        text-color="color-text-weak"
        icon="mdi-export-variant"
        size="0.8rem"
        @click.stop.prevent="shareButtonClicked()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useBackendVoteApi } from "src/utils/api/vote";
import { computed, ref } from "vue";
import { type OpinionItem, type VotingAction } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useDialog } from "src/utils/ui/dialog";
import { storeToRefs } from "pinia";
import CommentActionOptions from "./CommentActionOptions.vue";

const emit = defineEmits(["deleted", "mutedComment"]);

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
}>();

const webShare = useWebShare();

const { showLoginConfirmationDialog } = useDialog();

const { castVoteForComment } = useBackendVoteApi();
const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const numLikesLocal = ref(props.commentItem.numAgrees);
const numDislikesLocal = ref(props.commentItem.numDisagrees);

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

function mutedComment() {
  emit("mutedComment");
}

async function shareButtonClicked() {
  const sharePostUrl =
    window.location.origin +
    process.env.VITE_PUBLIC_DIR +
    "/conversation/" +
    props.postSlugId +
    "?opinionSlugId=" +
    props.commentItem.opinionSlugId;
  await webShare.share("Agora Opinion", sharePostUrl);
}

function deletedComment() {
  emit("deleted");
}

async function castPersonalVote(
  commentSlugId: string,
  isUpvoteButton: boolean
) {
  if (!isAuthenticated.value) {
    showLoginConfirmationDialog();
  } else {
    const numLikesBackup = numLikesLocal.value;
    const numDislikesBackup = numDislikesLocal.value;

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
        numLikesLocal.value = numLikesLocal.value - 1;
      } else {
        numDislikesLocal.value = numDislikesLocal.value - 1;
      }
    } else {
      if (targetState == "agree") {
        props.commentSlugIdLikedMap.set(commentSlugId, "agree");
        numLikesLocal.value = numLikesLocal.value + 1;
        if (originalSelection == "disagree") {
          numDislikesLocal.value = numDislikesLocal.value - 1;
        }
      } else {
        props.commentSlugIdLikedMap.set(commentSlugId, "disagree");
        numDislikesLocal.value = numDislikesLocal.value + 1;
        if (originalSelection == "agree") {
          numLikesLocal.value = numLikesLocal.value - 1;
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

      numLikesLocal.value = numLikesBackup;
      numDislikesLocal.value = numDislikesBackup;
    }
  }
}
</script>

<style scoped lang="scss">
.actionButtonCluster {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: right;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: $color-text-weak;
}

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
</style>
