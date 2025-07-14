<template>
  <div>
    <div class="container">
      <div class="topBar">
        <!-- TODO: Pass author verified flag here -->
        <OpinionIdentityCard
          :author-verified="false"
          :created-at="commentItem.createdAt"
          :user-identity="commentItem.username"
          :show-verified-text="false"
          :organization-image-url="''"
          :is-seed="commentItem.isSeed"
        />

        <CommentActionOptions
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
          @deleted="deletedComment()"
          @muted-comment="mutedComment()"
        />
      </div>

      <div>
        <ZKHtmlContent
          :html-body="commentItem.opinion"
          :compact-mode="false"
          :enable-links="true"
        />
      </div>

      <div class="commentAdditionalDetailsFlex">
        <CommentModeration
          v-if="commentItem.moderation?.status == 'moderated'"
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
        />

        <div>
          <CommentActionBar
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :comment-slug-id-liked-map="commentSlugIdLikedMap"
            :is-post-locked="isPostLocked"
            :login-required-to-participate="loginRequiredToParticipate"
            @change-vote="(vote: VotingAction) => changeVote(vote)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  OpinionItem,
  VotingAction,
  VotingOption,
} from "src/shared/types/zod";
import CommentModeration from "./CommentModeration.vue";
import CommentActionOptions from "./CommentActionOptions.vue";
import CommentActionBar from "./CommentActionBar.vue";
import ZKHtmlContent from "../../../../ui-library/ZKHtmlContent.vue";
import OpinionIdentityCard from "src/components/post/comments/OpinionIdentityCard.vue";

const emit = defineEmits(["deleted", "mutedComment", "changeVote"]);

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  commentSlugIdLikedMap: Map<string, VotingOption>;
  isPostLocked: boolean;
  loginRequiredToParticipate: boolean;
}>();

function changeVote(vote: VotingAction) {
  emit("changeVote", vote, props.commentItem.opinionSlugId);
}

function deletedComment() {
  emit("deleted");
}

function mutedComment() {
  emit("mutedComment");
}
</script>

<style scoped lang="scss">
.container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: $container-padding;
}

.topBar {
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
}

.commentAdditionalDetailsFlex {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
