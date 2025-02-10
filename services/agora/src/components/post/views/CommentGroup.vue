<template>
  <div>
    <div v-if="isLoading" class="noCommentMessage">
      <q-spinner-gears size="50px" color="primary" />
    </div>
    <div
      v-if="commentItemList.length == 0 && !isLoading"
      class="noCommentMessage"
    >
      There are no opinions in this conversation filter.
    </div>

    <div
      v-if="commentItemList.length > 0 && !isLoading"
      class="commentListFlex"
    >
      <ZKCard
        v-if="aiSummary !== undefined"
        padding="1rem"
        class="commentItemBackground"
      >
        <CommentConsensusSummary :summary="aiSummary" />
      </ZKCard>

      <ZKCard
        v-for="commentItem in commentItemList"
        :id="commentItem.opinionSlugId"
        :key="commentItem.opinionSlugId + '-' + selectedClusterKey"
        padding="1rem"
        class="commentItemBackground"
      >
        <CommentSingle
          :selected-cluster-key="selectedClusterKey"
          :comment-item="commentItem"
          :post-slug-id="postSlugId"
          :highlight="initialCommentSlugId == commentItem.opinionSlugId"
          :comment-slug-id-liked-map="commentSlugIdLikedMap"
          :is-post-locked="isPostLocked"
          @deleted="deletedComment()"
          @muted-comment="mutedComment()"
        />
      </ZKCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OpinionItem, PolisKey } from "src/shared/types/zod";
import CommentSingle from "./CommentSingle.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import CommentConsensusSummary from "./CommentConsensusSummary.vue";

const emit = defineEmits(["deleted", "mutedComment"]);

defineProps<{
  selectedClusterKey: PolisKey | undefined;
  commentItemList: OpinionItem[];
  postSlugId: string;
  aiSummary?: string;
  initialCommentSlugId: string;
  commentSlugIdLikedMap: Map<string, "agree" | "disagree">;
  isPostLocked: boolean;
  isLoading: boolean;
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
  gap: 1.5rem;
  padding-bottom: 10rem;
  padding-top: 1rem;
}

.commentItemBackground {
  background-color: white;
}
</style>
