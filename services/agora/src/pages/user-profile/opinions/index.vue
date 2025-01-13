<template>
  <div>
    <div
      v-for="postData in profileData.userPostList"
      :key="postData.metadata.conversationSlugId"
    >
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

      <div>
        <q-separator :inset="false" />
      </div>
    </div>

    <div ref="bottomOfPostDiv"></div>
  </div>
</template>

<script setup lang="ts">
import { useElementVisibility } from "@vueuse/core";
import { storeToRefs } from "pinia";
import PostDetails from "src/components/post/PostDetails.vue";
import { useUserStore } from "src/stores/user";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

const { loadUserProfile, loadMoreUserPosts } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

const router = useRouter();

const endOfFeed = ref(false);
let isExpandingPosts = false;

const bottomOfPostDiv = ref(null);
const targetIsVisible = useElementVisibility(bottomOfPostDiv);

let isLoaded = false;

onMounted(async () => {
  await loadUserProfile();
  isLoaded = true;
});

watch(targetIsVisible, async () => {
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

<style scoped lang="scss"></style>
