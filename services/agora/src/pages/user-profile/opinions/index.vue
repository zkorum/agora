<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <div class="container">
      <div
        v-for="commentItem in profileData.userCommentList"
        :key="commentItem.opinionItem.opinionSlugId"
      >
        <ZKHoverEffect :enable-hover="true">
          <div
            class="commentItemStyle"
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

            <UserIdentity
              :author-verified="false"
              :created-at="commentItem.opinionItem.createdAt"
              :user-name="commentItem.opinionItem.username"
            />

            <div>
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
import CommentActionOptions from "src/components/post/views/CommentActionOptions.vue";
import CommentModeration from "src/components/post/views/CommentModeration.vue";
import { useRouter } from "vue-router";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import UserIdentity from "src/components/post/views/UserIdentity.vue";

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
  font-weight: 500;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.commentItemStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  background-color: white;
}

.topRowFlex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
