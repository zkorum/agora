<template>
  <EmbedLayout>
    <PostDetails
      v-if="hasConversationData"
      :key="String(isGuestOrLoggedIn)"
      v-model="currentTab"
      :conversation-data="conversationData"
      :compact-mode="false"
    />
  </EmbedLayout>
</template>

<script setup lang="ts">
import EmbedLayout from "src/layouts/EmbedLayout.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/api/useConversationData";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { ref } from "vue";

const { conversationData, hasConversationData } = useConversationData();
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
const currentTab = ref<"comment" | "analysis">("comment");
</script>

<style scoped lang="scss"></style>
