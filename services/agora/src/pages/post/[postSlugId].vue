<template>
  <div>
    <PostDetails
      v-if="dataLoaded"
      :extended-post-data="postData"
      :compact-mode="false"
      :skeleton-mode="false"
      :show-author="true"
      :display-absolute-time="false"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PostDetails from "src/components/post/PostDetails.vue";
import type { ExtendedPost } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useBackendPostApi } from "src/utils/api/post";
import { onMounted, ref } from "vue";

const props = defineProps<{
  postSlugId: string;
}>();

const { fetchPostBySlugId } = useBackendPostApi();
const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { emptyPost } = usePostStore();
const postData = ref<ExtendedPost>(emptyPost);

const dataLoaded = ref(false);

onMounted(async () => {
  const response = await fetchPostBySlugId(
    props.postSlugId,
    isAuthenticated.value
  );
  if (response != null) {
    postData.value = response;
  }
  dataLoaded.value = true;
});
</script>

<style scoped lang="scss"></style>
