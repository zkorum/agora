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
          :conversation-author-username="conversationAuthorUsername"
          :conversation-organization-name="conversationOrganizationName"
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
          :conversation-author-username="conversationAuthorUsername"
          :conversation-organization-name="conversationOrganizationName"
        />

        <div>
          <CommentActionBar
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :voting-utilities="votingUtilities"
            :participation-mode="participationMode"
            :requires-event-ticket="props.requiresEventTicket"
            :on-view-analysis="props.onViewAnalysis"
            :is-voting-disabled="props.isVotingDisabled"
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
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  votingUtilities: OpinionVotingUtilities;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
}>();

const emit = defineEmits<{
  deleted: [opinionSlugId: string];
  mutedComment: [];
}>();

import type { EventSlug, ParticipationMode } from "src/shared/types/zod";

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
