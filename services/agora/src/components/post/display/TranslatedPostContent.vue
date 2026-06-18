<template>
  <PostContent
    :extended-post-data="extendedPostData"
    :compact-mode="compactMode"
    :content-translation="translationPreview"
    @update:content-translation-mode="setTranslationMode"
    @open-moderation-history="emit('openModerationHistory')"
    @conversation-deleted="emit('conversationDeleted')"
    @verified="emit('verified', $event)"
  />
</template>

<script setup lang="ts">
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { getSupportedContentTranslationTargetLanguageCodes } from "src/utils/translation/contentTranslation";
import { useConversationContentTranslationPreview } from "src/utils/translation/useContentTranslationPreview";
import { computed } from "vue";

import PostContent from "./PostContent.vue";

const props = defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
}>();

const emit = defineEmits<{
  openModerationHistory: [];
  conversationDeleted: [];
  verified: [payload: { userIdChanged: boolean; needsCacheRefresh: boolean }];
}>();

const userStore = useUserStore();

const isOwnConversation = computed(
  () =>
    userStore.profileData.userName !== "" &&
    userStore.profileData.userName === props.extendedPostData.metadata.authorUsername
);

const translationSubject = computed(() => ({
  kind: "conversation" as const,
  conversationSlugId: props.extendedPostData.metadata.conversationSlugId,
}));

const sourceLanguageCode = computed(
  () =>
    props.extendedPostData.metadata.languageSetting.languageCode ??
    props.extendedPostData.metadata.languageSetting.detectedLanguageCode ??
    props.extendedPostData.metadata.languageSetting.detectedRawLanguageCode
);
const supportedTargetLanguageCodes = computed(() =>
  getSupportedContentTranslationTargetLanguageCodes({
    languageSetting: props.extendedPostData.metadata.languageSetting,
    multilingualSetting: props.extendedPostData.metadata.multilingualSetting,
  })
);

const participationGate = useParticipationGate({
  conversationSlugId: computed(
    () => props.extendedPostData.metadata.conversationSlugId
  ),
  participationMode: computed(
    () => props.extendedPostData.metadata.participationMode
  ),
  requiresEventTicket: computed(
    () => props.extendedPostData.metadata.requiresEventTicket
  ),
  surveyGate: computed(() => props.extendedPostData.interaction.surveyGate),
});

const { preview: translationPreview, setMode: setTranslationMode } =
  useConversationContentTranslationPreview({
    subject: translationSubject,
    dynamicTranslationEnabled: computed(
      () =>
        props.extendedPostData.metadata.multilingualSetting
          .dynamicTranslationEnabled && !isOwnConversation.value
    ),
    sourceLanguageCode,
    supportedTargetLanguageCodes,
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
