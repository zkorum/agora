<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div v-if="deleted" class="deletedMessage">Deleted</div>
    <div v-if="!deleted" class="contentLayout">
      <div class="moderatedMessage">Response removed from feed</div>

      <div class="metadata">
        <UserAvatar
          :user-name="commentItem.username"
          :size="40"
          class="avatarIcon"
        />

        <div class="userNameTime">
          <div>
            {{ commentItem.username }}
          </div>

          <div>
            {{ formatTimeAgo(new Date(commentItem.createdAt)) }}
          </div>
        </div>
      </div>

      <div>
        <div :class="{ highlightComment: highlight }">
          <span v-html="commentItem.comment"></span>
        </div>

        <div
          v-if="!commentItem.moderation.isModerated"
          class="actionBarPaddings"
        >
          <CommentActionBar
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :comment-slug-id-liked-map="commentSlugIdLikedMap"
            :is-post-locked="isPostLocked"
            @deleted="deletedComment()"
          />
        </div>

        <div v-if="commentItem.moderation.isModerated">
          <ZKNextPage message="View Moderation Details" route-name="welcome" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentActionBar from "./CommentActionBar.vue";
import UserAvatar from "src/components/account/UserAvatar.vue";
import { formatTimeAgo } from "@vueuse/core";
import type { CommentItem } from "src/shared/types/zod";
import { ref } from "vue";
import ZKNextPage from "src/components/ui-library/ZKNextPage.vue";

const emit = defineEmits(["deleted"]);

defineProps<{
  commentItem: CommentItem;
  postSlugId: string;
  highlight: boolean;
  commentSlugIdLikedMap: Map<string, "like" | "dislike">;
  isPostLocked: boolean;
}>();

const deleted = ref(false);

function deletedComment() {
  deleted.value = true;
  emit("deleted");
}
</script>

<style scoped lang="scss">
.contentLayout {
  display: flex;
  flex-direction: column;
  justify-content: left;
  gap: 1rem;
}

.metadata {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  color: $color-text-weak;
}

.actionBarPaddings {
  padding-top: 0.5rem;
}

.highlightComment {
  background-color: #ccfbf1;
  border-radius: 15px;
  padding: 0.5rem;
}

.avatarIcon {
  margin-right: 0.5rem;
}

.userNameTime {
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
}

.deletedMessage {
  display: flex;
  justify-content: center;
}

.moderatedMessage {
  font-weight: 400;
  font-style: italic;
  color: #6d6a74;
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style>
