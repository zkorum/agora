<template>
  <CommentItem
    :comment-item="commentItem"
    :post-slug-id="postSlugId"
    :conversation-author-username="conversationAuthorUsername"
    :conversation-organization-name="conversationOrganizationName"
    :voting-utilities="votingUtilities"
    :participation-mode="participationMode"
    :requires-event-ticket="requiresEventTicket"
    :survey-gate="surveyGate"
    :on-view-analysis="onViewAnalysis"
    :is-voting-disabled="isVotingDisabled"
    :content-translation="translationPreview"
    :conversation-route-context="conversationRouteContext"
    @update:content-translation-mode="setTranslationMode"
    @deleted="emit('deleted', $event)"
    @muted-comment="emit('mutedComment')"
  />
</template>

<script setup lang="ts">
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type {
  DisplayedOpinionItem,
  EventSlug,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { useOpinionItemDisplayContent } from "src/utils/translation/useOpinionItemDisplayContent";
import { computed } from "vue";

import CommentItem from "./CommentItem.vue";

const props = defineProps<{
  commentItem: DisplayedOpinionItem;
  postSlugId: string;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  votingUtilities: OpinionVotingUtilities;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  surveyGate: SurveyGateSummary | undefined;
  onViewAnalysis: () => void;
  isVotingDisabled: boolean;
  conversationRouteContext: ConversationRouteContext;
}>();

const emit = defineEmits<{
  deleted: [opinionSlugId: string];
  mutedComment: [];
}>();

const { translationPreview, setTranslationMode } = useOpinionItemDisplayContent({
  conversationSlugId: computed(() => props.postSlugId),
  opinionItem: computed(() => props.commentItem),
});
</script>
