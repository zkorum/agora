<template>
  <div>
    <div v-if="isLoading" class="noCommentMessage">
      <q-spinner-gears size="50px" color="primary" />
    </div>
    <div
      v-if="commentItemList.length == 0 && !isLoading"
      class="noCommentMessage"
    >
      {{ t("noOpinionsMessage") }}
    </div>

    <div
      v-if="commentItemList.length > 0 && !isLoading"
      class="commentListFlex"
    >
      <ZKCard
        v-for="commentItem in commentItemList"
        :id="commentItem.opinionSlugId"
        :key="commentItem.opinionSlugId"
        padding="0rem"
        class="commentItemBackground"
        :class="{
          highlightCommentItem:
            initialCommentSlugId == commentItem.opinionSlugId,
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
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  commentGroupTranslations,
  type CommentGroupTranslations,
} from "./CommentGroup.i18n";

const { t } = useComponentI18n<CommentGroupTranslations>(
  commentGroupTranslations
);

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
  isLoading: boolean;
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
.noCommentMessage {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
}

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
