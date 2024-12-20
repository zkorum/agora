<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div
      v-for="commentItem in profileData.userCommentList"
      :key="commentItem.commentItem.commentSlugId"
    >
      <ZKHoverEffect :enable-hover="true">
        <RouterLink
          :to="{
            name: 'single-post',
            params: { postSlugId: commentItem.postData.metadata.postSlugId },
            query: { commentSlugId: commentItem.commentItem.commentSlugId },
          }"
        >
          <div class="container">
            <div class="postTitle">
              {{ commentItem.postData.payload.title }}
            </div>

            <div class="commentMetadata">
              <span :style="{ fontWeight: 'bold' }">{{
                commentItem.commentItem.username
              }}</span>
              commented
              {{ useTimeAgo(commentItem.commentItem.createdAt) }}
            </div>

            <div class="commentBody">
              <span v-html="commentItem.commentItem.comment"></span>
            </div>
          </div>
        </RouterLink>
      </ZKHoverEffect>

      <q-separator :inset="false" />
    </div>

    <div ref="bottomOfPostDiv"></div>
  </div>
</template>

<script setup lang="ts">
import { useElementVisibility, useTimeAgo } from "@vueuse/core";
import { useUserStore } from "src/stores/user";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

const { loadMoreUserComments, loadUserProfile } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

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

    const response = await loadMoreUserComments();
    endOfFeed.value = response.reachedEndOfFeed;

    isExpandingPosts = false;
  }
});
</script>

<style scoped lang="scss">
.postTitle {
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  font-size: 1.2rem;
  font-weight: bold;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.commentMetadata {
  color: $color-text-weak;
  font-size: 0.9rem;
}

.commentBody {
  padding-top: 0.5rem;
}
</style>
