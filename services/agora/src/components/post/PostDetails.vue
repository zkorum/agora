<template>
  <div>
    <ZKHoverEffect
      :enable-hover="compactMode"
      :background-color="compactMode ? 'white' : undefined"
      hover-background-color="#e2e8f0"
    >
      <div class="container standardStyle">
        <PostContent
          :extended-post-data="conversationData"
          :compact-mode="compactMode"
          @open-moderation-history="openModerationHistory()"
        />

        <PostActionBar
          v-model="currentTab"
          :compact-mode="compactMode"
          :opinion-count="
            conversationData.metadata.opinionCount + opinionCountOffset
          "
          @share="shareClicked()"
        />

        <div v-if="!compactMode">
          <AnalysisPage
            v-if="currentTab == 'analysis'"
            :conversation-slug-id="
              props.conversationData.metadata.conversationSlugId
            "
            :participant-count="
              props.conversationData.metadata.participantCount
            "
          />

          <CommentSection
            v-if="currentTab == 'comment'"
            ref="opinionSectionRef"
            :post-slug-id="conversationData.metadata.conversationSlugId"
            :is-post-locked="isPostLocked"
            :login-required-to-participate="
              conversationData.metadata.isIndexed ||
              conversationData.metadata.isLoginRequired
            "
            @deleted="decrementOpinionCount()"
            @participant-count-delta="
              (delta: number) => (participantCountLocal += delta)
            "
          />
        </div>
      </div>
    </ZKHoverEffect>

    <FloatingBottomContainer v-if="!compactMode && !isPostLocked">
      <CommentComposer
        :post-slug-id="conversationData.metadata.conversationSlugId"
        :login-required-to-participate="
          conversationData.metadata.isIndexed ||
          conversationData.metadata.isLoginRequired
        "
        @submitted-comment="
          (opinionSlugId: string) => submittedComment(opinionSlugId)
        "
      />
    </FloatingBottomContainer>
  </div>
</template>

<script setup lang="ts">
import CommentSection from "./comments/CommentSection.vue";
import PostContent from "./display/PostContent.vue";
import PostActionBar from "./interactionBar/PostActionBar.vue";
import FloatingBottomContainer from "../navigation/FloatingBottomContainer.vue";
import CommentComposer from "./comments/CommentComposer.vue";
import { ref, computed } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import type { ExtendedConversation, VotingAction } from "src/shared/types/zod";
import AnalysisPage from "./analysis/AnalysisPage.vue";

const props = defineProps<{
  conversationData: ExtendedConversation;
  compactMode: boolean;
}>();
const currentTab = defineModel<"comment" | "analysis">({
  required: true,
});

const opinionSectionRef = ref<InstanceType<typeof CommentSection>>();

const opinionCountOffset = ref(0);

const webShare = useWebShare();
const { getConversationUrl } = useConversationUrl();

const participantCountLocal = ref(
  props.conversationData.metadata.participantCount
);

const isPostLocked = computed((): boolean => {
  return (
    props.conversationData.metadata.moderation.status === "moderated" &&
    props.conversationData.metadata.moderation.action === "lock"
  );
});

function openModerationHistory(): void {
  if (opinionSectionRef.value) {
    opinionSectionRef.value.openModerationHistory();
  } else {
    console.warn("Opinion section reference is undefined");
  }
}

function decrementOpinionCount(): void {
  opinionCountOffset.value -= 1;
}

async function submittedComment(opinionSlugId: string): Promise<void> {
  opinionCountOffset.value += 1;
  // WARN: we know that the backend auto-agrees on opinion submission--that's why we do the following.
  // Change this if you change this behaviour.
  changeVote("agree", opinionSlugId);

  if (opinionSectionRef.value) {
    await opinionSectionRef.value.refreshAndHighlightOpinion(opinionSlugId);
  }
}

function changeVote(vote: VotingAction, opinionSlugId: string): void {
  // Delegate all vote logic to CommentSection
  if (opinionSectionRef.value) {
    opinionSectionRef.value.changeVote(vote, opinionSlugId);
  }
}

async function shareClicked(): Promise<void> {
  const sharePostUrl = getConversationUrl(
    props.conversationData.metadata.conversationSlugId
  );
  await webShare.share(
    "Agora - " + props.conversationData.payload.title,
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

.standardStyle {
  padding-top: 1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: 1rem;
}
</style>
