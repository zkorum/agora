<template>
  <div>
    <q-infinite-scroll
      :offset="2000"
      :disable="compactMode || !hasMore"
      @load="onLoad"
    >
      <WidthWrapper :enable="true">
        <ZKHoverEffect :enable-hover="compactMode">
          <div
            class="container"
            :class="{
              compactBackground: compactMode,
            }"
          >
            <div
              class="innerContainer postPadding"
              :class="{ postPaddingCompact: compactMode }"
            >
              <!-- TODO: Pass author verified flag here -->
              <PostMetadata
                :poster-user-name="extendedPostData.metadata.authorUsername"
                :created-at="new Date(extendedPostData.metadata.createdAt)"
                :skeleton-mode="skeletonMode"
                :post-slug-id="extendedPostData.metadata.conversationSlugId"
                :author-verified="false"
                @open-moderation-history="openModerationHistory()"
              />

              <div class="postDiv">
                <div>
                  <div v-if="!skeletonMode" class="titleDiv titlePadding">
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
                  <UserHtmlBody
                    :html-body="extendedPostData.payload.body"
                    :compact-mode="compactMode"
                  />
                </div>

                <ZKCard
                  v-if="
                    extendedPostData.metadata.moderation.status == 'moderated'
                  "
                  padding="1rem"
                  class="lockCardStyle"
                >
                  <PostLockedMessage
                    :moderation-property="extendedPostData.metadata.moderation"
                    :post-slug-id="extendedPostData.metadata.conversationSlugId"
                  />
                </ZKCard>
              </div>

              <div
                v-if="extendedPostData.payload.poll && !skeletonMode"
                class="pollContainer"
              >
                <PollWrapper
                  :poll-options="extendedPostData.payload.poll"
                  :post-slug-id="extendedPostData.metadata.conversationSlugId"
                  :user-response="extendedPostData.interaction"
                />
              </div>

              <div class="bottomButtons">
                <div class="leftButtonCluster">
                  <div v-if="!skeletonMode">
                    <ZKButton
                      :disable="
                        extendedPostData.metadata.moderation.status ==
                        'moderated'
                      "
                      button-type="standardButton"
                      @click.stop.prevent="clickedCommentButton()"
                    >
                      <div class="commentCountStyle">
                        <ZKIcon
                          color="#7D7A85"
                          name="meteor-icons:comment"
                          size="1rem"
                        />
                        <div :style="{ color: '#7D7A85' }">
                          {{
                            (
                              extendedPostData.metadata.opinionCount +
                              commentCountOffset
                            ).toString()
                          }}
                        </div>
                      </div>
                    </ZKButton>
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
                      button-type="standardButton"
                      @click.stop.prevent="shareClicked()"
                    >
                      <ZKIcon color="#7D7A85" name="mdi:share" size="1rem" />
                    </ZKButton>
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

            <div v-if="!compactMode" class="commentSectionPadding">
              <CommentSection
                :key="commentSectionKey"
                ref="commentSectionRef"
                :post-slug-id="extendedPostData.metadata.conversationSlugId"
                :participant-count="extendedPostData.metadata.participantCount"
                :polis="extendedPostData.polis"
                :is-post-locked="
                  extendedPostData.metadata.moderation.status == 'moderated'
                "
                @deleted="decrementCommentCount()"
              />
            </div>
          </div>
        </ZKHoverEffect>

        <FloatingBottomContainer v-if="!compactMode && !isLocked">
          <CommentComposer
            :show-controls="focusCommentElement"
            :post-slug-id="extendedPostData.metadata.conversationSlugId"
            @cancel-clicked="cancelledCommentComposor()"
            @submitted-comment="
              (opinionSlugId: string) => submittedComment(opinionSlugId)
            "
            @editor-focused="focusCommentElement = true"
          />
        </FloatingBottomContainer>
      </WidthWrapper>
    </q-infinite-scroll>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "../ui-library/ZKButton.vue";
import CommentSection from "./views/CommentSection.vue";
import PostMetadata from "./views/PostMetadata.vue";
import PollWrapper from "../poll/PollWrapper.vue";
import FloatingBottomContainer from "../navigation/FloatingBottomContainer.vue";
import CommentComposer from "./views/CommentComposer.vue";
import { computed, ref } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useRoute, useRouter } from "vue-router";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import Skeleton from "primevue/skeleton";
import type { ExtendedConversation } from "src/shared/types/zod";
import ZKCard from "../ui-library/ZKCard.vue";
import PostLockedMessage from "./views/PostLockedMessage.vue";
import { useOpinionScrollableStore } from "src/stores/opinionScrollable";
import WidthWrapper from "../navigation/WidthWrapper.vue";
import UserHtmlBody from "./views/UserHtmlBody.vue";
import { storeToRefs } from "pinia";
import ZKIcon from "../ui-library/ZKIcon.vue";

const props = defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
  skeletonMode: boolean;
}>();

const commentSectionRef = ref<InstanceType<typeof CommentSection>>();

const commentCountOffset = ref(0);
const commentSectionKey = ref(Date.now());

const router = useRouter();
const route = useRoute();

const webShare = useWebShare();

const focusCommentElement = ref(false);

const { loadMore } = useOpinionScrollableStore();
const { hasMore } = storeToRefs(useOpinionScrollableStore());

const isLocked = computed(() => {
  if (props.extendedPostData.metadata.moderation.status == "moderated") {
    if (props.extendedPostData.metadata.moderation.action == "lock") {
      return true;
    }
  }
  return false;
});

function onLoad(index: number, done: () => void) {
  loadMore();
  done();
}

function openModerationHistory() {
  commentSectionRef.value?.openModerationHistory();
}

function decrementCommentCount() {
  commentCountOffset.value -= 1;
}

async function submittedComment(opinionSlugId: string) {
  commentCountOffset.value += 1;
  focusCommentElement.value = false;

  commentSectionKey.value += Date.now();

  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: props.extendedPostData.metadata.conversationSlugId },
    query: { opinion: opinionSlugId },
  });
}

function cancelledCommentComposor() {
  focusCommentElement.value = false;
}

async function clickedCommentButton() {
  if (route.name != "/conversation/[postSlugId]") {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: {
        postSlugId: props.extendedPostData.metadata.conversationSlugId,
      },
    });
  } else {
    focusCommentElement.value = !focusCommentElement.value;
  }
}

async function shareClicked() {
  const sharePostUrl =
    window.location.origin +
    process.env.VITE_PUBLIC_DIR +
    "/conversation/" +
    props.extendedPostData.metadata.conversationSlugId;
  await webShare.share(
    "Agora - " + props.extendedPostData.payload.title,
    sharePostUrl
  );
}
</script>

<style scoped lang="scss">
.innerContainer {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pollContainer {
  padding-bottom: 1rem;
}

.titleDiv {
  font-size: 1.125rem;
  font-weight: 500;
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

.compactBackground {
  background-color: white;
}

.compactBackground:hover {
  background-color: $mouse-hover-color;
}

.leftButtonCluster {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.postPadding {
  padding-top: $container-padding;
  padding-left: $container-padding;
  padding-right: $container-padding;
}

.postPaddingCompact {
  padding-bottom: $container-padding;
}

.titlePadding {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.lockCardStyle {
  background-color: white;
  margin-bottom: 1rem;
}

.commentCountStyle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-right: 0.1rem;
  padding-left: 0.1rem;
}

.commentSectionPadding {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
