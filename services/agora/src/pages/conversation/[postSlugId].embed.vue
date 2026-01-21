<template>
  <EmbedLayout>
    <PostDetails
      v-if="hasConversationData"
      :conversation-data="loadedConversationData"
      :compact-mode="false"
    />
  </EmbedLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PostDetails from "src/components/post/PostDetails.vue";
import EmbedLayout from "src/layouts/EmbedLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const authStore = useAuthenticationStore();
const { isAuthInitialized } = storeToRefs(authStore);

// Clear login intentions immediately (before query setup)
const loginIntentionStore = useLoginIntentionStore();
loginIntentionStore.clearVotingIntention();
loginIntentionStore.clearOpinionAgreementIntention();
loginIntentionStore.clearReportUserContentIntention();

// Use TanStack Query for conversation data
const conversationQuery = useConversationQuery({
  conversationSlugId: computed(() => (route.params as { postSlugId: string }).postSlugId),
  enabled: computed(() => isAuthInitialized.value),
});

const conversationData = computed(() => {
  const data = conversationQuery.data.value;
  if (!data || data.metadata.conversationSlugId === "") {
    return undefined;
  }
  return data;
});

const hasConversationData = computed(() => conversationData.value !== undefined);

// Type-safe version for template use (guaranteed non-undefined)
const loadedConversationData = computed(() => {
  const data = conversationData.value;
  if (!data) {
    // This should never happen inside v-if="hasConversationData" block
    throw new Error("[EmbedPage] Accessed conversation data before loaded");
  }
  return data;
});
</script>

<style scoped lang="scss"></style>
