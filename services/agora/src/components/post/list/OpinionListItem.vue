<template>
  <RouterLink
    :to="{
      name: '/conversation/[postSlugId]',
      params: { postSlugId: conversationSlugId },
      query: { opinion: opinionSlugId },
    }"
    class="opinion-list-link"
  >
    <ZKHoverEffect
      :enable-hover="true"
      background-color="white"
      hover-variant="medium"
    >
      <div class="commentItemStyle">
        <div class="topRowFlex">
          <div class="postTitle">
            <ConversationTitleWithPrivacyLabel
              :is-private="!isIndexed"
              :title="conversationTitle"
              size="medium"
            />
          </div>
          <div @click.stop.prevent>
            <CommentActionOptions
              :comment-item="opinionItem"
              :post-slug-id="conversationSlugId"
            />
          </div>
        </div>

        <UserIdentityCard
          :author-verified="false"
          :created-at="opinionItem.createdAt"
          :user-identity="opinionItem.username"
          :show-verified-text="false"
          organization-image-url=""
        />

        <div>
          <ZKHtmlContent
            :html-body="opinionItem.opinion"
            :compact-mode="false"
            :enable-links="false"
          />
        </div>

        <CommentModeration
          v-if="opinionItem.moderation?.status == 'moderated'"
          :comment-item="opinionItem"
          :post-slug-id="conversationSlugId"
        />
      </div>
    </ZKHoverEffect>
  </RouterLink>
</template>

<script setup lang="ts">
import ConversationTitleWithPrivacyLabel from "src/components/features/conversation/ConversationTitleWithPrivacyLabel.vue";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import type { OpinionItem } from "src/shared/types/zod";

import ZKHoverEffect from "../../ui-library/ZKHoverEffect.vue";
import ZKHtmlContent from "../../ui-library/ZKHtmlContent.vue";
import CommentActionOptions from "../comments/group/item/CommentActionOptions.vue";
import CommentModeration from "../comments/group/item/CommentModeration.vue";

defineProps<{
  conversationSlugId: string;
  conversationTitle: string;
  isIndexed: boolean;
  opinionSlugId: string;
  opinionItem: OpinionItem;
}>();
</script>

<style scoped lang="scss">
.opinion-list-link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.postTitle {
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  font-size: 1.2rem;
  font-weight: var(--font-weight-medium);
}

.commentItemStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: $container-padding;
}

.topRowFlex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
