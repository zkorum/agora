<template>
  <div>
    <div v-if="commentItemList.length == 0" class="noCommentMessage">
      There are no opinions in this conversation filter.
    </div>

    <div v-if="commentItemList.length > 0" class="commentListFlex">
      <div
        v-for="commentItem in commentItemList"
        :id="commentItem.opinionSlugId"
        :key="commentItem.opinionSlugId"
      >
        <CommentSingle
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
          :highlight="initialCommentSlugId == commentItem.opinionSlugId"
          :comment-slug-id-liked-map="commentSlugIdLikedMap"
          :is-post-locked="isPostLocked"
          @deleted="deletedComment()"
          @muted-comment="mutedComment()"
        />

        <q-separator />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OpinionItem } from "src/shared/types/zod";
import CommentSingle from "./CommentSingle.vue";

const emit = defineEmits(["deleted", "mutedComment"]);

defineProps<{
  commentItemList: OpinionItem[];
  postSlugId: string;
  initialCommentSlugId: string;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
}>();

function deletedComment() {
  emit("deleted");
}

function mutedComment() {
  emit("mutedComment");
}
</script>

<style scoped lang="scss">
.noCommentMessage {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
}

.commentListFlex {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
