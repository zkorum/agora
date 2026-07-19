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
          :conversation-route-context="props.conversationRouteContext"
          @deleted="deletedComment()"
          @muted-comment="mutedComment()"
        />
      </div>

      <div class="comment-content">
        <ContentTranslationControl
          v-if="contentTranslation?.isAvailable === true"
          :model-value="contentTranslation.mode"
          :source-language-label="contentTranslation.sourceLanguageLabel"
          :translation-status="contentTranslation.translationStatus"
          class="translation-control"
          @update:model-value="emit('update:contentTranslationMode', $event)"
        />

        <ZKHtmlContent
          :html-body="displayedOpinion"
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

        <div class="comment-actions">
          <CommentActionBar
            :comment-item="commentItem"
            :post-slug-id="postSlugId"
            :voting-utilities="votingUtilities"
            :participation-mode="participationMode"
            :requires-event-ticket="props.requiresEventTicket"
            :survey-gate="props.surveyGate"
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
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type {
  EventSlug,
  LocalizedContentTranslationStatus,
  OpinionItem,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";
import { computed } from "vue";

import ZKHtmlContent from "../../../../ui-library/ZKHtmlContent.vue";
import CommentActionBar from "./CommentActionBar.vue";
import CommentActionOptions from "./CommentActionOptions.vue";
import CommentModeration from "./CommentModeration.vue";

interface CommentContentTranslationPreview {
  isAvailable: boolean;
  isLoadingInitialTranslation: boolean;
  mode: ContentTranslationDisplayMode;
  sourceLanguageLabel: string | undefined;
  translationStatus: LocalizedContentTranslationStatus;
  translatedOpinion: string;
}

const props = defineProps<{
  commentItem: OpinionItem;
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  votingUtilities: OpinionVotingUtilities;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  surveyGate: SurveyGateSummary | undefined;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  contentTranslation: CommentContentTranslationPreview | undefined;
  conversationRouteContext: ConversationRouteContext;
}>();

const emit = defineEmits<{
  deleted: [opinionSlugId: string];
  mutedComment: [];
  "update:contentTranslationMode": [mode: ContentTranslationDisplayMode];
}>();

const displayedOpinion = computed(() => {
  if (props.contentTranslation?.mode === "translated") {
    return props.contentTranslation.translatedOpinion;
  }
  return props.commentItem.opinion;
});

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
  gap: 0.5rem;
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
  gap: 0.875rem;
}

.comment-content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.comment-content :deep(p) {
  margin-block: 0;
}

.comment-content :deep(p + p) {
  margin-top: 0.5rem;
}

.comment-actions {
  margin-top: 0.125rem;
}

.translation-control {
  margin-bottom: 0;
}
</style>
