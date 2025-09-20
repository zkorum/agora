<template>
  <EmbedLayout>
    <PostDetails
      v-if="hasConversationData"
      v-model="currentTab"
      :conversation-data="conversationData"
      :compact-mode="false"
    />
  </EmbedLayout>
</template>

<script setup lang="ts">
import EmbedLayout from "src/layouts/EmbedLayout.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/conversation/useConversationData";
import { ref } from "vue";

const { conversationData, hasConversationData } = useConversationData();
const currentTab = ref<"comment" | "analysis">("comment");
</script>

<style scoped lang="scss"></style>
