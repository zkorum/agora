<template>
  <MainLayout
    :general-props="{
      addBottomPadding: true,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasBackButton: true,
      hasSettingsButton: true,
      hasCloseButton: false,
      hasLoginButton: true,
    }"
  >
    <PostDetails
      v-if="dataLoaded"
      :extended-post-data="postData"
      :compact-mode="false"
      :skeleton-mode="false"
      :show-author="true"
      :display-absolute-time="false"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PostDetails from "src/components/post/PostDetails.vue";
import MainLayout from "src/layouts/MainLayout.vue";
import type { ExtendedPost } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useBackendPostApi } from "src/utils/api/post";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const { fetchPostBySlugId } = useBackendPostApi();
const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { emptyPost } = usePostStore();
const postData = ref<ExtendedPost>(emptyPost);

const dataLoaded = ref(false);

const route = useRoute();

onMounted(async () => {
  if (route.name == "/post/[postSlugId]") {
    const response = await fetchPostBySlugId(
      route.params.postSlugId,
      isAuthenticated.value
    );
    if (response != null) {
      postData.value = response;
    }
    dataLoaded.value = true;
  }
});
</script>

<style scoped lang="scss"></style>
