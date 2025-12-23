<template>
  <EmbedLayout>
    <PostDetails
      v-if="hasConversationData"
      :conversation-data="conversationData"
      :compact-mode="false"
    />
  </EmbedLayout>
</template>

<script setup lang="ts">
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/conversation/useConversationData";
import EmbedLayout from "src/layouts/EmbedLayout.vue";

const { conversationData, hasConversationData } = useConversationData();
</script>

<style scoped lang="scss"></style>
