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
          organization-image-url=""
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
            :voting-utilities="votingUtilities"
            :login-required-to-participate="loginRequiredToParticipate"
            :requires-event-ticket="props.requiresEventTicket"
            @ticket-verified="(payload) => emit('ticketVerified', payload)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OpinionIdentityCard from "src/components/post/comments/OpinionIdentityCard.vue";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type { OpinionItem } from "src/shared/types/zod";

import ZKHtmlContent from "../../../../ui-library/ZKHtmlContent.vue";
import CommentActionBar from "./CommentActionBar.vue";
import CommentActionOptions from "./CommentActionOptions.vue";
import CommentModeration from "./CommentModeration.vue";

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  votingUtilities: OpinionVotingUtilities;
  loginRequiredToParticipate: boolean;
  requiresEventTicket?: EventSlug;
}>();

const emit = defineEmits<{
  deleted: [opinionSlugId: string];
  mutedComment: [];
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean },
  ];
}>();

import type { EventSlug } from "src/shared/types/zod";

function deletedComment() {
  emit("deleted", props.commentItem.opinionSlugId);
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
