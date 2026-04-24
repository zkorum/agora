<template>
  <ConversationSurveyHero
    v-if="conversationData !== undefined"
    :conversation-title="conversationData.payload.title"
    :author-username="conversationData.metadata.authorUsername"
    :organization-name="conversationData.metadata.organization?.name ?? ''"
    :organization-image-url="conversationData.metadata.organization?.imageUrl ?? ''"
  />
  <DefaultImageExample v-else />
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";

import ConversationSurveyHero from "./ConversationSurveyHero.vue";
import DefaultImageExample from "./DefaultImageExample.vue";

defineProps<{
  conversationData?: ExtendedConversation;
}>();
</script>
