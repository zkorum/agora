<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div class="container">
      <!-- TODO: Add push reason label -->
      <div
        v-if="showPushReasonLabel"
        class="pushReasonPosition pushReasonStyle pushReasonFlex"
        @click="clickedPushReasonLabel()"
      >
        <q-icon name="mdi-information-outline" size="1.1rem" />
        Majority Opinion (Total)
      </div>

      <div class="topBar">
        <div class="metadata">
          <UserAvatar
            :user-name="commentItem.username"
            :size="30"
            class="avatarIcon"
          />

          <div class="userNameTime">
            <div>
              {{ commentItem.username }}
            </div>
          </div>
        </div>

        <CommentActionOptions
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
          @deleted="deletedComment()"
          @muted-comment="mutedComment()"
        />
      </div>

      <div>
        <div :class="{ highlightComment: highlight }">
          <span v-html="commentItem.opinion"></span>
        </div>

        <CommentModeration
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
        />

        <div class="actionBarPaddings">
          <CommentActionBar
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :comment-slug-id-liked-map="commentSlugIdLikedMap"
            :is-post-locked="isPostLocked"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CommentActionBar from "./CommentActionBar.vue";
import UserAvatar from "src/components/account/UserAvatar.vue";
import type { OpinionItem } from "src/shared/types/zod";
import { ref } from "vue";
import CommentModeration from "./CommentModeration.vue";
import CommentActionOptions from "./CommentActionOptions.vue";
import { useDialog } from "src/utils/ui/dialog";

const emit = defineEmits(["deleted", "mutedComment"]);

defineProps<{
  showPushReasonLabel: boolean;
  commentItem: OpinionItem;
  postSlugId: string;
  highlight: boolean;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
}>();

const { showMessage } = useDialog();

const deleted = ref(false);

function clickedPushReasonLabel() {
  showMessage(undefined, "This is XXX because of YYY.");
}

function deletedComment() {
  deleted.value = true;
  emit("deleted");
}

function mutedComment() {
  emit("mutedComment");
}
</script>

<style scoped lang="scss">
.container {
  position: relative;
}

.pushReasonFlex {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.pushReasonStyle:hover {
  cursor: pointer;
}

.pushReasonStyle {
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 0.5rem;
  color: $primary;
  background-color: white;
  border-style: solid;
  border-width: 1px;
  border-color: $primary;
}

.pushReasonPosition {
  position: absolute;
  top: -2rem;
  right: -0.2rem;
}

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
  padding-bottom: 1rem;
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
  word-break: break-all;
}

.topBar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.topRightBar {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
