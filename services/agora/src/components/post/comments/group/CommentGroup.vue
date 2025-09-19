<template>
  <div class="commentListFlex">
    <ZKCard
      v-for="commentItem in commentItemList"
      :id="commentItem.opinionSlugId"
      :key="commentItem.opinionSlugId"
      padding="0rem"
      class="commentItemBackground"
      :class="{
        highlightCommentItem: initialCommentSlugId == commentItem.opinionSlugId,
      }"
    >
      <CommentItem
        :comment-item="commentItem"
        :post-slug-id="postSlugId"
        :comment-slug-id-liked-map="commentSlugIdLikedMap"
        :is-post-locked="isPostLocked"
        :login-required-to-participate="loginRequiredToParticipate"
        @deleted="deletedComment()"
        @muted-comment="mutedComment()"
        @change-vote="
          (vote: VotingAction, opinionSlugId: string) =>
            changeVote(vote, opinionSlugId)
        "
      />
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import type {
  OpinionItem,
  VotingAction,
  VotingOption,
} from "src/shared/types/zod";
import CommentItem from "./item/CommentItem.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";

const emit = defineEmits(["deleted", "mutedComment", "changeVote"]);

function changeVote(vote: VotingAction, opinionSlugId: string) {
  emit("changeVote", vote, opinionSlugId);
}

defineProps<{
  commentItemList: OpinionItem[];
  postSlugId: string;
  initialCommentSlugId: string;
  commentSlugIdLikedMap: Map<string, VotingOption>;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
}>();

function deletedComment() {
  emit("deleted");
}

function mutedComment() {
  emit("mutedComment");
}
</script>

<style scoped lang="scss">
.commentListFlex {
  display: flex;
  flex-direction: column;
  gap: $feed-flex-gap;
  padding-bottom: 10rem;
}

.commentItemBackground {
  background-color: white;
}

.highlightCommentItem {
  border-style: solid;
  border-color: $primary;
  border-width: 2px;
}
</style>
