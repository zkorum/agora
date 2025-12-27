<template>
  <RouterLink
    :to="{
      name: '/conversation/[postSlugId]',
      params: { postSlugId: conversationData.metadata.conversationSlugId },
    }"
    class="post-list-link"
  >
    <PostDetails :conversation-data="conversationData" :compact-mode="true" />
  </RouterLink>
</template>

<script setup lang="ts">
import type { ExtendedConversation } from "src/shared/types/zod";

import PostDetails from "../PostDetails.vue";

defineProps<{
  conversationData: ExtendedConversation;
}>();
</script>

<style scoped lang="scss">
.post-list-link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
</style>
