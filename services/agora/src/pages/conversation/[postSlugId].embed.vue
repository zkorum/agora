<template>
  <EmbedLayout>
    <PostDetails
      v-if="dataLoaded"
      :key="String(isGuestOrLoggedIn)"
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

const { postData, dataLoaded } = useConversationData();
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
</script>

<style scoped lang="scss"></style>
