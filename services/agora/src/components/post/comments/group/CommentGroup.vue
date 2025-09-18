<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading && !hasError" class="noCommentMessage">
      <q-spinner-gears size="50px" color="primary" />
      <div class="loadingText">{{ t("loadingComments") }}</div>
    </div>

    <!-- Retrying state -->
    <div v-if="isRetrying" class="noCommentMessage">
      <q-spinner-gears size="50px" color="primary" />
      <div class="loadingText">{{ t("retrying") }}</div>
    </div>

    <!-- Error state -->
    <CommentLoadingError
      v-if="hasError && !isLoading && !isRetrying"
      :title="t('commentsLoadFailed')"
      :message="errorMessage"
      :default-message="t('unexpectedErrorRetry')"
      :show-retry="true"
      :retry-label="t('retryLoadComments')"
      :is-retrying="isRetrying"
      icon="error_outline"
      icon-color="negative"
      @retry="handleRetryClick"
    />

    <!-- Empty state (no errors, not loading) -->
    <div
      v-if="commentItemList.length === 0 && !isLoading && !hasError"
      class="noCommentMessage"
    >
      <q-icon name="forum" size="50px" color="grey-5" />
      <div class="emptyText">{{ t("noOpinionsMessage") }}</div>
    </div>

    <!-- Success state with data -->
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
import CommentLoadingError from "../ui/CommentLoadingError.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  commentGroupTranslations,
  type CommentGroupTranslations,
} from "./CommentGroup.i18n";

const { t } = useComponentI18n<CommentGroupTranslations>(
  commentGroupTranslations
);

const emit = defineEmits([
  "deleted",
  "mutedComment",
  "changeVote",
  "retryLoadComments",
]);

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
  hasError: boolean;
  errorMessage?: string | null;
  isRetrying: boolean;
  loginRequiredToParticipate: boolean;
}>();

function deletedComment() {
  emit("deleted");
}

function mutedComment() {
  emit("mutedComment");
}

function handleRetryClick(): void {
  emit("retryLoadComments");
}
</script>

<style scoped lang="scss">
.noCommentMessage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 4rem;
  text-align: center;
}

.loadingText,
.emptyText {
  font-size: 1rem;
  color: var(--q-dark);
  opacity: 0.7;
  margin-top: 1rem;
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
