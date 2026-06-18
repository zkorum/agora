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
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import type { OpinionVotingUtilities } from "src/composables/opinion/types";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  EventSlug,
  OpinionItem,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
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

const userStore = useUserStore();

const isOwnStatement = computed(
  () =>
    userStore.profileData.userName !== "" &&
    userStore.profileData.userName === props.commentItem.username
);

const translationSubject = computed(() => ({
  kind: "opinion" as const,
  conversationSlugId: props.postSlugId,
  opinionSlugId: props.commentItem.opinionSlugId,
}));

const participationGate = useParticipationGate({
  conversationSlugId: computed(() => props.postSlugId),
  participationMode: computed(() => props.participationMode),
  requiresEventTicket: computed(() => props.requiresEventTicket),
  surveyGate: computed(() => props.surveyGate),
});

const { preview: translationPreview, setMode: setTranslationMode } =
  useOpinionContentTranslationPreview({
    subject: translationSubject,
    dynamicTranslationEnabled: computed(
      () => props.dynamicTranslationEnabled && !isOwnStatement.value
    ),
    sourceLanguageCode: computed(() => props.commentItem.sourceLanguageCode),
    supportedTargetLanguageCodes: computed(() => props.supportedTargetLanguageCodes),
    shouldRequestTranslation: async () => {
      if (await participationGate.shouldOpenParticipationModal()) {
        await participationGate.openParticipationOnboarding();
        return false;
      }
      return true;
    },
    onParticipationBlocked: async ({ reason }) => {
      await participationGate.handleBlockedReason({ reason });
    },
  });
</script>
