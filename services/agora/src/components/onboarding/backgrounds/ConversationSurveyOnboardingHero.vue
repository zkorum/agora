<template>
  <ConversationSurveyHero
    v-if="conversationData !== undefined"
    :conversation-title="displayedConversationTitle"
    :author-username="conversationData.metadata.authorUsername"
    :organization-name="conversationData.metadata.organization?.name ?? ''"
    :organization-image-url="conversationData.metadata.organization?.imageUrl ?? ''"
    :content-translation="translationPreview"
    @update:content-translation-mode="setTranslationMode"
  />
  <DefaultImageExample v-else />
</template>

<script setup lang="ts">
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
import { computed } from "vue";

import ConversationSurveyHero from "./ConversationSurveyHero.vue";
import DefaultImageExample from "./DefaultImageExample.vue";

const props = defineProps<{
  conversationData?: ExtendedConversationDisplayData;
  initialDisplayContent?: ConversationContentFetchResponse;
}>();

const conversationData = computed(() => props.conversationData);
const initialDisplayContent = computed(() => props.initialDisplayContent);
const {
  displayedTitle: displayedConversationTitle,
  translationPreview,
  setTranslationMode,
} = useConversationDisplayContent({
  conversationData,
  initialDisplayContent,
});
</script>
