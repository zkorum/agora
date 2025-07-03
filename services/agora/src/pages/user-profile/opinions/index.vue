<template>
  <div>
    <q-infinite-scroll :offset="2000" :disable="!canLoadMore" @load="onLoad">
      <div class="container">
        <div
          v-for="commentItem in profileData.userCommentList"
          :key="commentItem.opinionItem.opinionSlugId"
        >
          <ZKHoverEffect :enable-hover="true">
            <div
              class="commentItemStyle hoverColor"
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

              <!-- TODO: Map author verification status -->
              <UserIdentityCard
                :author-verified="false"
                :created-at="commentItem.opinionItem.createdAt"
                :user-identity="commentItem.opinionItem.username"
                :show-verified-text="false"
                :organization-image-url="''"
              />

              <div>
                <HtmlContent
                  :html-body="commentItem.opinionItem.opinion"
                  :compact-mode="false"
                />
              </div>

              <CommentModeration
                v-if="commentItem.opinionItem.moderation?.status == 'moderated'"
                :comment-item="commentItem.opinionItem"
                :post-slug-id="
                  commentItem.conversationData.metadata.conversationSlugId
                "
              />
            </div>
          </ZKHoverEffect>
        </div>
      </div>
    </q-infinite-scroll>

    <div
      v-if="profileData.dataLoaded && profileData.userCommentList.length == 0"
      class="emptyMessage"
    >
      You have no opinions
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from "src/stores/user";
import { ref } from "vue";
import { storeToRefs } from "pinia";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import CommentActionOptions from "src/components/post/comments/group/item/CommentActionOptions.vue";
import CommentModeration from "src/components/post/comments/group/item/CommentModeration.vue";
import HtmlContent from "src/components/post/display/HtmlContent.vue";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import { useRouterNavigation } from "src/utils/router/navigation";

const { loadMoreUserComments, loadUserProfile } = useUserStore();
const { profileData } = storeToRefs(useUserStore());

const canLoadMore = ref(true);

const { openComment } = useRouterNavigation();

async function onLoad(index: number, done: () => void) {
  if (canLoadMore.value) {
    const response = await loadMoreUserComments();
    canLoadMore.value = !response.reachedEndOfFeed;
  }
  done();
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
  gap: $feed-flex-gap;
}

.commentItemStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: $container-padding;
  background-color: white;
}

.topRowFlex {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.emptyMessage {
  padding: 2rem;
  text-align: center;
}

.hoverColor {
  transition: $mouse-hover-transition;
}

.hoverColor:hover {
  background-color: $mouse-hover-color;
}
</style>
