<!-- eslint-disable vue/no-v-html -->
<template>
  <div>
    <ZKHoverEffect :enable-hover="compactMode">
      <div class="container postPadding">
        <div class="innerContainer">
          <PostMetadata
            :poster-user-name="extendedPostData.metadata.authorUsername"
            :created-at="new Date(extendedPostData.metadata.createdAt)"
            :is-compat-size="true"
            :skeleton-mode="skeletonMode"
            :show-author="showAuthor"
            :display-absolute-time="displayAbsoluteTime"
            :post-slug-id="extendedPostData.metadata.postSlugId"
          />

          <div class="postDiv">
            <div>
              <div
                v-if="!skeletonMode"
                class="titleDiv extraTitleBottomPadding"
              >
                {{ extendedPostData.payload.title }}
              </div>

              <div v-if="skeletonMode" class="titleDiv">
                <Skeleton
                  width="100%"
                  height="4rem"
                  border-radius="16px"
                ></Skeleton>
              </div>
            </div>

            <div
              v-if="
                extendedPostData.payload.body != undefined &&
                extendedPostData.payload.body.length > 0
              "
              class="bodyDiv"
            >
              <span
                :class="{ truncate: compactMode }"
                v-html="extendedPostData.payload.body"
              ></span>
            </div>

            <ZKCard
              v-if="extendedPostData.metadata.moderation.status == 'moderated'"
              padding="1rem"
            >
              <PostLockedMessage
                :moderation-property="extendedPostData.metadata.moderation"
                :post-slug-id="extendedPostData.metadata.postSlugId"
              />
            </ZKCard>
          </div>

          <div v-if="extendedPostData.payload.poll" class="pollContainer">
            <PollWrapper
              :poll-options="extendedPostData.payload.poll"
              :post-slug-id="extendedPostData.metadata.postSlugId"
              :user-response="extendedPostData.interaction"
            />
          </div>

          <div class="bottomButtons">
            <div class="leftButtonCluster">
              <div v-if="!skeletonMode">
                <ZKButton
                  :disable="
                    extendedPostData.metadata.moderation.status == 'moderated'
                  "
                  text-color="color-text-weak"
                  size="0.8rem"
                  :label="
                    (
                      extendedPostData.metadata.commentCount +
                      commentCountOffset
                    ).toString()
                  "
                  icon="mdi-comment-outline"
                  @click.stop.prevent="clickedCommentButton()"
                />
              </div>
              <div v-if="skeletonMode">
                <Skeleton
                  width="3rem"
                  height="2rem"
                  border-radius="16px"
                ></Skeleton>
              </div>
            </div>

            <div>
              <div v-if="!skeletonMode">
                <ZKButton
                  text-color="color-text-weak"
                  size="0.8rem"
                  icon="mdi-export-variant"
                  @click.stop.prevent="shareClicked()"
                />
              </div>
              <div v-if="skeletonMode">
                <Skeleton
                  width="3rem"
                  height="2rem"
                  border-radius="16px"
                ></Skeleton>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!compactMode" ref="commentSectionRef">
          <CommentSection
            :key="commentCountOffset"
            :post-slug-id="extendedPostData.metadata.postSlugId"
            :initial-comment-slug-id="commentSlugIdQuery"
            :is-post-locked="
              extendedPostData.metadata.moderation.status == 'moderated'
            "
            :comment-filter="parsedCommentFilter"
            @deleted="decrementCommentCount()"
          />
        </div>
      </div>
    </ZKHoverEffect>

    <FloatingBottomContainer
      v-if="!compactMode && isAuthenticated && !isLocked"
    >
      <CommentComposer
        :show-controls="focusCommentElement"
        :post-slug-id="extendedPostData.metadata.postSlugId"
        @cancel-clicked="cancelledCommentComposor()"
        @submitted-comment="submittedComment()"
        @editor-focused="focusCommentElement = true"
      />
    </FloatingBottomContainer>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "../ui-library/ZKButton.vue";
import CommentSection from "./views/CommentSection.vue";
import PostMetadata from "./views/PostMetadata.vue";
import PollWrapper from "../poll/PollWrapper.vue";
import FloatingBottomContainer from "../navigation/FloatingBottomContainer.vue";
import CommentComposer from "./views/CommentComposer.vue";
import { usePostStore } from "src/stores/post";
import { computed, onMounted, ref } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useRoute, useRouter } from "vue-router";
import { useRouteQuery } from "@vueuse/router";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import Skeleton from "primevue/skeleton";
import type { ExtendedPost } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import ZKCard from "../ui-library/ZKCard.vue";
import PostLockedMessage from "./views/PostLockedMessage.vue";

const props = defineProps<{
  extendedPostData: ExtendedPost;
  compactMode: boolean;
  skeletonMode: boolean;
  showAuthor: boolean;
  displayAbsoluteTime: boolean;
}>();

const { isAuthenticated } = useAuthenticationStore();

const commentSlugIdQuery = useRouteQuery("commentSlugId", "", {
  transform: String,
});
const commentFilterQuery = useRouteQuery("commentFilterQuery", "", {
  transform: String,
});

const parsedCommentFilter = computed<"new" | "moderated" | "hidden">(() => {
  if (
    commentFilterQuery.value == "new" ||
    commentFilterQuery.value == "moderated" ||
    commentFilterQuery.value == "hidden"
  ) {
    return commentFilterQuery.value;
  } else {
    return "new";
  }
});

const commentCountOffset = ref(0);

const commentSectionRef = ref<HTMLElement | null>(null);

// const { composeDummyCommentItem } = usePostStore();

const router = useRouter();
const route = useRoute();

const { loadPostData } = usePostStore();

const webShare = useWebShare();

const focusCommentElement = ref(false);

const action = useRouteQuery("action");

onMounted(() => {
  if (action.value == "comment") {
    setTimeout(() => {
      scrollToCommentSection();
    }, 100);
  }
});

const isLocked = computed(() => {
  if (props.extendedPostData.metadata.moderation.status == "moderated") {
    if (props.extendedPostData.metadata.moderation.action == "lock") {
      return true;
    }
  }
  return false;
});

function decrementCommentCount() {
  commentCountOffset.value -= 1;
}

function scrollToCommentSection() {
  console.log(commentSectionRef.value);
  commentSectionRef.value?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

async function submittedComment() {
  commentCountOffset.value += 1;
  focusCommentElement.value = false;
  scrollToCommentSection();
  await loadPostData(false);
}

function cancelledCommentComposor() {
  focusCommentElement.value = false;
}

function clickedCommentButton() {
  if (route.name != "single-post") {
    router.push({
      name: "single-post",
      params: { postSlugId: props.extendedPostData.metadata.postSlugId },
      query: { action: "comment" },
    });
  } else {
    focusCommentElement.value = !focusCommentElement.value;
  }
}

function shareClicked() {
  console.log(process.env.VITE_PUBLIC_DIR);

  const sharePostUrl =
    window.location.origin +
    process.env.VITE_PUBLIC_DIR +
    "/post/" +
    props.extendedPostData.metadata.postSlugId;
  webShare.share(
    "Agora - " + props.extendedPostData.payload.title,
    sharePostUrl
  );
}
</script>

<style scoped lang="scss">
.innerContainer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pollContainer {
  padding-bottom: 1rem;
}

.titleDiv {
  font-size: 1.2rem;
  font-weight: 600;
}

.bodyDiv {
  padding-bottom: 1rem;
}

.postDiv {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bottomButtons {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.leftButtonCluster {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.postPadding {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
}

.extraTitleBottomPadding {
  padding-bottom: 0.5rem;
}
</style>
