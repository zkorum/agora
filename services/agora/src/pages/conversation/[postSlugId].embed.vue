<template>
  <EmbedLayout>
    <PostDetails
      v-if="dataLoaded"
      :key="postData.metadata.opinionCount"
      :extended-post-data="postData"
      :compact-mode="false"
    />
  </EmbedLayout>
</template>

<script setup lang="ts">
import EmbedLayout from "src/layouts/EmbedLayout.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import { useConversationData } from "src/composables/useConversationData";

const { postData, dataLoaded } = useConversationData();
</script>

<style scoped lang="scss"></style>
