<template>
  <div>
    <div class="actionButtonCluster">
      <CommentActionOptions
        :comment-item="props.commentItem"
        @deleted="deletedComment()"
      />

      <ZKButton
        flat
        text-color="color-text-weak"
        icon="mdi-export-variant"
        size="0.8rem"
        @click.stop.prevent="shareButtonClicked()"
      />
      <ZKButton
        :disable="isPostLocked"
        flat
        :text-color="downvoteIcon.color"
        :icon="downvoteIcon.icon"
        size="0.8rem"
        @click.stop.prevent="
          castPersonalVote(props.commentItem.commentSlugId, false)
        "
      >
        <div v-if="userCastedVote" class="voteCountLabel">
          {{ numDislikesLocal }}
        </div>
      </ZKButton>

      <ZKButton
        :disable="isPostLocked"
        flat
        :text-color="upvoteIcon.color"
        :icon="upvoteIcon.icon"
        size="0.8rem"
        @click.stop.prevent="
          castPersonalVote(props.commentItem.commentSlugId, true)
        "
      >
        <div v-if="userCastedVote" class="voteCountLabel">
          {{ numLikesLocal }}
        </div>
      </ZKButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useBackendVoteApi } from "src/utils/api/vote";
import { computed, ref } from "vue";
import { type CommentItem, type VotingAction } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useDialog } from "src/utils/ui/dialog";
import { storeToRefs } from "pinia";
import CommentActionOptions from "./CommentActionOptions.vue";

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  commentItem: CommentItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, "like" | "dislike">;
  isPostLocked: boolean;
}>();

const webShare = useWebShare();

const { showLoginConfirmationDialog } = useDialog();

const { castVoteForComment } = useBackendVoteApi();
const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const numLikesLocal = ref(props.commentItem.numLikes);
const numDislikesLocal = ref(props.commentItem.numDislikes);

const userCastedVote = computed(() => {
  const hasEntry = props.commentSlugIdLikedMap.has(
    props.commentItem.commentSlugId
  );
  return hasEntry ? true : false;
});

interface IconObject {
  icon: string;
  color: string;
}

const downvoteIcon = computed<IconObject>(() => {
  const userAction = props.commentSlugIdLikedMap.get(
    props.commentItem.commentSlugId
  );
  if (userAction == "dislike") {
    return {
      icon: "mdi-thumb-down",
      color: "primary",
    };
  } else {
    return {
      icon: "mdi-thumb-down-outline",
      color: "color-text-weak",
    };
  }
});

const upvoteIcon = computed<IconObject>(() => {
  const userAction = props.commentSlugIdLikedMap.get(
    props.commentItem.commentSlugId
  );
  if (userAction == "like") {
    return {
      icon: "mdi-thumb-up",
      color: "primary",
    };
  } else {
    return {
      icon: "mdi-thumb-up-outline",
      color: "color-text-weak",
    };
  }
});

function shareButtonClicked() {
  const sharePostUrl =
    window.location.origin +
    "/post/" +
    props.postSlugId +
    "?commentSlugId=" +
    props.commentItem.commentSlugId;
  webShare.share("Agora Comment", sharePostUrl);
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
      targetState = isUpvoteButton ? "like" : "dislike";
    } else {
      if (originalSelection == "like") {
        if (isUpvoteButton) {
          targetState = "cancel";
        } else {
          targetState = "dislike";
        }
      } else {
        if (isUpvoteButton) {
          targetState = "like";
        } else {
          targetState = "cancel";
        }
      }
    }

    if (targetState == "cancel") {
      props.commentSlugIdLikedMap.delete(commentSlugId);
      if (originalSelection == "like") {
        numLikesLocal.value = numLikesLocal.value - 1;
      } else {
        numDislikesLocal.value = numDislikesLocal.value - 1;
      }
    } else {
      if (targetState == "like") {
        props.commentSlugIdLikedMap.set(commentSlugId, "like");
        numLikesLocal.value = numLikesLocal.value + 1;
        if (originalSelection == "dislike") {
          numDislikesLocal.value = numDislikesLocal.value - 1;
        }
      } else {
        props.commentSlugIdLikedMap.set(commentSlugId, "dislike");
        numDislikesLocal.value = numDislikesLocal.value + 1;
        if (originalSelection == "like") {
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
</style>
