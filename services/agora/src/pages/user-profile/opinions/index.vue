<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div
      v-for="commentItem in profileData.userCommentList"
      :key="commentItem.opinionItem.opinionSlugId"
    >
      <ZKHoverEffect :enable-hover="true">
        <div
          class="container"
          @click="
            openComment(
              commentItem.conversationData.metadata.conversationSlugId,
              commentItem.opinionItem.opinionSlugId
            )
          "
        >
          <div class="topRowFlex">
            <div class="postTitle">
              {{ commentItem.conversationData.payload.title }}
            </div>
            <div>
              <CommentActionOptions
                :comment-item="commentItem.opinionItem"
                :post-slug-id="
                  commentItem.conversationData.metadata.conversationSlugId
                "
                @deleted="commentDeleted()"
              />
            </div>
          </div>

          <div class="commentMetadata">
            <span :style="{ fontWeight: 'bold' }">{{
              commentItem.opinionItem.username
            }}</span>
            commented
            {{ useTimeAgo(commentItem.opinionItem.createdAt) }}
          </div>

          <div class="commentBody">
            <span v-html="commentItem.opinionItem.opinion"></span>
          </div>

          <CommentModeration
            :comment-item="commentItem.opinionItem"
            :post-slug-id="
              commentItem.conversationData.metadata.conversationSlugId
            "
          />
        </div>
      </ZKHoverEffect>

      <q-separator :inset="false" />
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
