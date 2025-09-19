<template>
  <ZKLoadingState
    :is-loading="isLoading"
    :has-error="hasError"
    :error-message="errorMessage"
    :is-retrying="isRetrying"
    :is-empty="isEmpty"
    :show-retry="true"
    :loading-text="t('loadingComments')"
    :retrying-text="t('retrying')"
    :error-title="t('commentsLoadFailed')"
    :default-error-message="t('unexpectedErrorRetry')"
    :empty-text="t('noOpinionsMessage')"
    :retry-label="t('retryLoadComments')"
    empty-icon="forum"
    empty-icon-color="grey-5"
    @retry="handleRetryClick"
  >
    <div class="commentListFlex">
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
  </ZKLoadingState>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  OpinionItem,
  VotingAction,
  VotingOption,
} from "src/shared/types/zod";
import CommentItem from "./item/CommentItem.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKLoadingState from "src/components/ui-library/ZKLoadingState.vue";
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

const props = defineProps<{
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

const isEmpty = computed(() => props.commentItemList.length === 0);

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
