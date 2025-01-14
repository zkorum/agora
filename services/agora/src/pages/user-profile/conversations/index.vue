<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div
      v-for="commentItem in profileData.userCommentList"
      :key="commentItem.commentItem.commentSlugId"
    >
      <ZKHoverEffect :enable-hover="true">
        <div
          class="container"
          @click="
            openComment(
              commentItem.postData.metadata.postSlugId,
              commentItem.commentItem.commentSlugId
            )
          "
        >
          <div class="topRowFlex">
            <div class="postTitle">
              {{ commentItem.postData.payload.title }}
            </div>
            <div>
              <CommentActionOptions
                :comment-item="commentItem.commentItem"
                :post-slug-id="commentItem.postData.metadata.postSlugId"
                @deleted="commentDeleted()"
              />
            </div>
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

          <CommentModeration
            :comment-item="commentItem.commentItem"
            :post-slug-id="commentItem.postData.metadata.postSlugId"
          />
        </div>
      </ZKHoverEffect>

      <q-separator :inset="false" />
    </div>

    <div ref="bottomOfPostDiv"></div>
  </div>
</template>

<script setup lang="ts">
import { useElementVisibility, useTimeAgo } from "@vueuse/core";
import { useUserStore } from "src/stores/user";
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import CommentActionOptions from "src/components/post/views/CommentActionOptions.vue";
import CommentModeration from "src/components/post/views/CommentModeration.vue";
import { useRouter } from "vue-router";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";

const { loadMoreUserComments, loadUserProfile } = useUserStore();
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

async function openComment(postSlugId: string, commentSlugId: string) {
  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: postSlugId },
    query: {
      opinionSlugId: commentSlugId,
    },
  });
}

async function commentDeleted() {
  await loadUserProfile();
}
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

.topRowFlex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
