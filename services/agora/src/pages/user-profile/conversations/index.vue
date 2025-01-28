<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div class="container">
      <div
        v-for="postData in profileData.userPostList"
        :key="postData.metadata.conversationSlugId"
      >
        <ZKHoverEffect :enable-hover="true">
          <PostDetails
            :extended-post-data="postData"
            :compact-mode="true"
            :show-comment-section="false"
            :skeleton-mode="false"
            class="showCursor"
            :show-author="false"
            :display-absolute-time="true"
            @click="openPost(postData.metadata.conversationSlugId)"
          />
        </ZKHoverEffect>
      </div>

      <div ref="bottomOfPostDiv"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElementVisibility } from "@vueuse/core";
import { useUserStore } from "src/stores/user";
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import PostDetails from "src/components/post/PostDetails.vue";

const { loadMoreUserPosts, loadUserProfile } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

const endOfFeed = ref(false);
let isExpandingPosts = false;

const bottomOfPostDiv = ref(null);
const targetIsVisible = useElementVisibility(bottomOfPostDiv);

let isLoaded = false;

const router = useRouter();

onMounted(async () => {
  await loadUserProfile();
  isLoaded = true;
});

watch(targetIsVisible, async () => {
  console.log(endOfFeed.value);
  if (
    targetIsVisible.value &&
    !isExpandingPosts &&
    !endOfFeed.value &&
    isLoaded
  ) {
    isExpandingPosts = true;

    const response = await loadMoreUserPosts();
    endOfFeed.value = response.reachedEndOfFeed;

    isExpandingPosts = false;
  }
});

async function openPost(postSlugId: string) {
  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: postSlugId },
  });
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
