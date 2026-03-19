<template>
  <SpaLink
    :to="{
      name: '/conversation/[postSlugId]/',
      params: { postSlugId: conversationData.metadata.conversationSlugId },
    }"
  >
    <PostDetails :conversation-data="conversationData" :compact-mode="true" />
  </SpaLink>
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";

import SpaLink from "../../ui-library/SpaLink.vue";
import PostDetails from "../PostDetails.vue";

defineProps<{
  conversationData: ExtendedConversation;
}>();
</script>
