<template>
  <EmbedLayout>
    <PostDetails
      v-if="dataLoaded"
      :key="String(isGuestOrLoggedIn)"
      v-model="currentTab"
      :extended-post-data="postData"
      :compact-mode="false"
    />
  </EmbedLayout>
</template>

<script setup lang="ts">
import EmbedLayout from "src/layouts/EmbedLayout.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/useConversationData";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { ref } from "vue";

const { postData, dataLoaded } = useConversationData();
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
const currentTab = ref<"comment" | "analysis">("comment");
</script>

<style scoped lang="scss"></style>
