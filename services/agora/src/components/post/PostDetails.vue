<template>
  <div>
    <q-infinite-scroll
      :offset="2000"
      :disable="compactMode || !hasMore"
      @load="onLoad"
    >
      <ZKHoverEffect :enable-hover="compactMode">
        <div
          class="container standardStyle"
          :class="{ compactBackground: compactMode }"
        >
          <PostContent
            :extended-post-data="extendedPostData"
            :compact-mode="compactMode"
            @open-moderation-history="openModerationHistory()"
          />

          <PostActionBar
            v-model="currentTab"
            :compact-mode="compactMode"
            :opinion-count="
              extendedPostData.metadata.opinionCount + commentCountOffset
            "
            @share="shareClicked()"
          />

          <div v-if="!compactMode">
            <AnalysisPage
              v-if="currentTab == 'analysis'"
              :conversation-slug-id="
                props.extendedPostData.metadata.conversationSlugId
              "
              :participant-count="
                props.extendedPostData.metadata.participantCount
              "
              :polis="props.extendedPostData.polis"
            />

            <CommentSection
              v-if="currentTab == 'comment'"
              ref="commentSectionRef"
              :post-slug-id="extendedPostData.metadata.conversationSlugId"
              :polis="extendedPostData.polis"
              :is-post-locked="
                extendedPostData.metadata.moderation.status == 'moderated'
              "
              :login-required-to-participate="
                extendedPostData.metadata.isIndexed ||
                extendedPostData.metadata.isLoginRequired
              "
              @deleted="decrementCommentCount()"
              @participant-count-delta="
                (delta: number) => (participantCountLocal += delta)
              "
              @has-more-changed="
                (newHasMore: boolean) => (hasMore = newHasMore)
              "
            />
          </div>
        </div>
      </ZKHoverEffect>

      <FloatingBottomContainer v-if="!compactMode && !isPostLocked">
        <CommentComposer
          :post-slug-id="extendedPostData.metadata.conversationSlugId"
          :login-required-to-participate="
            extendedPostData.metadata.isIndexed ||
            extendedPostData.metadata.isLoginRequired
          "
          @submitted-comment="
            (opinionSlugId: string) => submittedComment(opinionSlugId)
          "
        />
      </FloatingBottomContainer>
    </q-infinite-scroll>
  </div>
</template>

<script setup lang="ts">
import CommentSection from "./comments/CommentSection.vue";
import PostContent from "./display/PostContent.vue";
import PostActionBar from "./interactionBar/PostActionBar.vue";
import FloatingBottomContainer from "../navigation/FloatingBottomContainer.vue";
import CommentComposer from "./comments/CommentComposer.vue";
import { ref } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import type { ExtendedConversation, VotingAction } from "src/shared/types/zod";
import AnalysisPage from "./analysis/AnalysisPage.vue";

const props = defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
}>();
const currentTab = defineModel<"comment" | "analysis">({
  required: true,
});

const commentSectionRef = ref<InstanceType<typeof CommentSection>>();

const commentCountOffset = ref(0);

const webShare = useWebShare();
const { getConversationUrl } = useConversationUrl();

const participantCountLocal = ref(
  props.extendedPostData.metadata.participantCount
);
const hasMore = ref(true);

const isPostLocked =
  props.extendedPostData.metadata.moderation.status === "moderated" &&
  props.extendedPostData.metadata.moderation.action === "lock";

function onLoad(index: number, done: () => void) {
  if (commentSectionRef.value) {
    commentSectionRef.value.triggerLoadMore();
  }
  done();
}

function openModerationHistory() {
  if (commentSectionRef.value) {
    commentSectionRef.value.openModerationHistory();
  } else {
    console.warn("Comment section reference is undefined");
  }
}

function decrementCommentCount() {
  commentCountOffset.value -= 1;
}

async function submittedComment(opinionSlugId: string) {
  commentCountOffset.value += 1;
  // WARN: we know that the backend auto-agrees on opinion submission--that's why we do the following.
  // Change this if you change this behaviour.
  changeVote("agree", opinionSlugId);

  if (commentSectionRef.value) {
    await commentSectionRef.value.refreshAndHighlightOpinion(opinionSlugId);
  }
}

function changeVote(vote: VotingAction, opinionSlugId: string) {
  // Delegate all vote logic to CommentSection
  if (commentSectionRef.value) {
    commentSectionRef.value.changeVote(vote, opinionSlugId);
  }
}

async function shareClicked() {
  const sharePostUrl = getConversationUrl(
    props.extendedPostData.metadata.conversationSlugId
  );
  await webShare.share(
    "Agora - " + props.extendedPostData.payload.title,
    sharePostUrl
  );
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.compactBackground {
  background-color: white;
  transition: $mouse-hover-transition;
}

.compactBackground:hover {
  background-color: $mouse-hover-color;
}

.standardStyle {
  padding-top: 1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: 1rem;
}
</style>
