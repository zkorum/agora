<template>
  <div>
    <div v-if="commentItemList.length == 0" class="noCommentMessage">
      There are no opinions in this conservation.
    </div>

    <div v-if="commentItemList.length > 0" class="commentListFlex">
      <div
        v-for="commentItem in commentItemList"
        :id="commentItem.commentSlugId"
        :key="commentItem.commentSlugId"
      >
        <CommentSingle
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
          :highlight="initialCommentSlugId == commentItem.commentSlugId"
          :comment-slug-id-liked-map="commentSlugIdLikedMap"
          :is-post-locked="isPostLocked"
          @deleted="deletedComment()"
        />

        <q-separator />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommentItem } from "src/shared/types/zod";
import CommentSingle from "./CommentSingle.vue";

const emit = defineEmits(["deleted"]);

defineProps<{
  commentItemList: CommentItem[];
  postSlugId: string;
  initialCommentSlugId: string;
  commentSlugIdLikedMap: Map<string, "like" | "dislike">;
  isPostLocked: boolean;
}>();

function deletedComment() {
  emit("deleted");
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
