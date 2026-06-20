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
    @update:content-translation-mode="setTranslationMode"
    @deleted="emit('deleted', $event)"
    @muted-comment="emit('mutedComment')"
  />
</template>

<script setup lang="ts">
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  EventSlug,
  OpinionItem,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useOpinionContentTranslationPreview } from "src/utils/translation/useContentTranslationPreview";
import { computed } from "vue";

import CommentItem from "./CommentItem.vue";

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
  dynamicTranslationEnabled: boolean;
  supportedTargetLanguageCodes: SupportedDisplayLanguageCodes[];
}>();

const emit = defineEmits<{
  deleted: [opinionSlugId: string];
  mutedComment: [];
}>();

const translationSubject = computed(() => ({
  kind: "opinion" as const,
  conversationSlugId: props.postSlugId,
  opinionSlugId: props.commentItem.opinionSlugId,
}));

const { preview: translationPreview, setMode: setTranslationMode } =
  useOpinionContentTranslationPreview({
    subject: translationSubject,
    dynamicTranslationEnabled: computed(() => props.dynamicTranslationEnabled),
    sourceLanguageCode: computed(() => props.commentItem.sourceLanguageCode),
    supportedTargetLanguageCodes: computed(() => props.supportedTargetLanguageCodes),
  });
</script>
