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
import { storeToRefs } from "pinia";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type {
  DisplayedOpinionItem,
  EventSlug,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";
import { getContentTranslationSourceLanguageLabel } from "src/utils/translation/contentTranslation";
import {
  type OpinionContentTranslationPreview,
  useOpinionContentTranslationPreview,
} from "src/utils/translation/useContentTranslationPreview";
import { computed, ref } from "vue";

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
const { displayLanguage } = storeToRefs(useLanguageStore());
const hasRequestedTranslation = ref(false);

const { preview: requestedTranslationPreview, setMode: setRequestedTranslationMode } =
  useOpinionContentTranslationPreview({
    subject: translationSubject,
    enabled: computed(() => hasRequestedTranslation.value),
    sourceLanguageCode: computed(() => props.commentItem.sourceLanguageCode),
  });

const initialTranslationPreview = computed<
  OpinionContentTranslationPreview | undefined
>(() => {
  const displayContent = props.commentItem.displayContent;
  if (displayContent === undefined) {
    return undefined;
  }
  const translationControl = displayContent.translationControl;
  if (translationControl === null) {
    return undefined;
  }
  const sourceLanguageLabel = getContentTranslationSourceLanguageLabel({
    sourceLanguage: undefined,
    fallbackLanguageCode: props.commentItem.sourceLanguageCode,
    fallbackLabel: translationControl.sourceLanguageLabel,
    displayLanguage: displayLanguage.value,
  });

  if (displayContent.status === "available" && displayContent.mode === "translated") {
    return {
      isAvailable: true,
      isLoadingInitialTranslation: false,
      mode: "translated",
      sourceLanguageLabel,
      translationStatus: translationControl.status,
      translatedOpinion: displayContent.content.content,
    };
  }

  return {
    isAvailable: true,
    isLoadingInitialTranslation: false,
    mode: "original",
    sourceLanguageLabel,
    translationStatus: translationControl.status,
    translatedOpinion: "",
  };
});

const translationPreview = computed(
  () => requestedTranslationPreview.value ?? initialTranslationPreview.value
);

function setTranslationMode(mode: ContentTranslationDisplayMode): void {
  hasRequestedTranslation.value = true;
  void setRequestedTranslationMode(mode);
}
</script>
