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
              :key="commentSectionKey"
              ref="commentSectionRef"
              :post-slug-id="extendedPostData.metadata.conversationSlugId"
              :participant-count="participantCountLocal"
              :polis="extendedPostData.polis"
              :is-post-locked="
                extendedPostData.metadata.moderation.status == 'moderated'
              "
              :login-required-to-participate="
                extendedPostData.metadata.isIndexed ||
                extendedPostData.metadata.isLoginRequired
              "
              :opinion-item-list-partial="opinionItemListPartial"
              :comment-slug-id-liked-map="commentSlugIdLikedMap"
              @deleted="decrementCommentCount()"
              @change-vote="
                (vote: VotingAction, opinionSlugId: string) =>
                  changeVote(vote, opinionSlugId)
              "
              @update-comment-slug-id-liked-map="
                (map: Map<string, VotingOption>) =>
                  updateCommentSlugIdLikedMap(map)
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
import { ref, triggerRef } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useRouter } from "vue-router";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import type {
  ExtendedConversation,
  VotingAction,
  VotingOption,
} from "src/shared/types/zod";
import { useOpinionScrollableStore } from "src/stores/opinionScrollable";
import { storeToRefs } from "pinia";
import AnalysisPage from "./analysis/AnalysisPage.vue";

const props = defineProps<{
  extendedPostData: ExtendedConversation;
  compactMode: boolean;
}>();

const commentSectionRef = ref<InstanceType<typeof CommentSection>>();

const commentCountOffset = ref(0);
const commentSectionKey = ref(Date.now());
const currentTab = ref<"comment" | "analysis">("comment");

const router = useRouter();

const webShare = useWebShare();
const { getConversationUrl } = useConversationUrl();

const { loadMore, updateOpinionVote, cancelOpinionVote } =
  useOpinionScrollableStore();
const { hasMore, opinionItemListPartial } = storeToRefs(
  useOpinionScrollableStore()
);
const commentSlugIdLikedMap = ref<Map<string, VotingOption>>(new Map());
const participantCountLocal = ref(
  props.extendedPostData.metadata.participantCount
);

const isPostLocked =
  props.extendedPostData.metadata.moderation.status === "moderated" &&
  props.extendedPostData.metadata.moderation.action === "lock";

function onLoad(index: number, done: () => void) {
  loadMore();
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
  commentSectionKey.value += Date.now();
  // WARN: we know that the backend auto-agrees on opinion submission--that's why we do the following.
  // Change this if you change this behaviour.
  changeVote("agree", opinionSlugId);

  await router.replace({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: props.extendedPostData.metadata.conversationSlugId },
    query: { opinion: opinionSlugId },
  });
}

function changeVote(vote: VotingAction, opinionSlugId: string) {
  switch (vote) {
    case "agree": {
      if (commentSlugIdLikedMap.value.size === 0) {
        participantCountLocal.value = participantCountLocal.value + 1;
      }
      commentSlugIdLikedMap.value.set(opinionSlugId, "agree");
      triggerRef(commentSlugIdLikedMap);
      updateOpinionVote(opinionSlugId, "agree");
      break;
    }
    case "disagree": {
      if (commentSlugIdLikedMap.value.size === 0) {
        participantCountLocal.value = participantCountLocal.value + 1;
      }
      commentSlugIdLikedMap.value.set(opinionSlugId, "disagree");
      triggerRef(commentSlugIdLikedMap);
      updateOpinionVote(opinionSlugId, "disagree");
      break;
    }
    case "pass": {
      if (commentSlugIdLikedMap.value.size === 0) {
        participantCountLocal.value = participantCountLocal.value + 1;
      }
      commentSlugIdLikedMap.value.set(opinionSlugId, "pass");
      triggerRef(commentSlugIdLikedMap);
      updateOpinionVote(opinionSlugId, "pass");
      break;
    }
    case "cancel": {
      if (commentSlugIdLikedMap.value.size === 1) {
        participantCountLocal.value = participantCountLocal.value - 1;
      }
      const originalVote = commentSlugIdLikedMap.value.get(opinionSlugId);
      if (originalVote !== undefined) {
        cancelOpinionVote(opinionSlugId, originalVote);
      }
      commentSlugIdLikedMap.value.delete(opinionSlugId);
      triggerRef(commentSlugIdLikedMap);
      break;
    }
  }
}

function updateCommentSlugIdLikedMap(map: Map<string, VotingOption>) {
  commentSlugIdLikedMap.value = map;
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
