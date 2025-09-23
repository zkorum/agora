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
            ref="analysisPageRef"
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
import { ref, computed, watch } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import AnalysisPage from "./analysis/AnalysisPage.vue";

const props = defineProps<{
  conversationData: ExtendedConversation;
  compactMode: boolean;
}>();
const currentTab = ref<"comment" | "analysis">("comment");

const opinionSectionRef = ref<InstanceType<typeof CommentSection>>();
const analysisPageRef = ref<InstanceType<typeof AnalysisPage>>();

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
  // Note: The backend auto-agrees on opinion submission, but with the new local state
  // management approach, each CommentActionBar will handle its own vote state independently
  // when the user votes on their newly created opinion.

  if (opinionSectionRef.value) {
    await opinionSectionRef.value.refreshAndHighlightOpinion(opinionSlugId);
  }

  // Refresh analysis data since new opinion affects analysis results
  if (analysisPageRef.value) {
    analysisPageRef.value.refreshData();
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

async function refreshChildComponents(): Promise<void> {
  // Reset local state that might have drifted from backend changes
  opinionCountOffset.value = 0;
  participantCountLocal.value =
    props.conversationData.metadata.participantCount;

  const refreshPromises: Promise<void>[] = [];

  // Refresh CommentSection data (includes vote data refresh)
  if (opinionSectionRef.value) {
    refreshPromises.push(opinionSectionRef.value.refreshData());
  }

  // Refresh AnalysisPage data
  if (analysisPageRef.value) {
    analysisPageRef.value.refreshData();
  }

  // Wait for all refreshes to complete
  await Promise.all(refreshPromises);
}

// Watch for tab changes and refresh data when switching tabs
watch(currentTab, async (newTab) => {
  if (!props.compactMode) {
    // Refresh the newly active tab's data with forced network requests
    if (newTab === "comment" && opinionSectionRef.value) {
      await opinionSectionRef.value.refreshData();
    } else if (newTab === "analysis" && analysisPageRef.value) {
      analysisPageRef.value.refreshData();
    }
  }
});

defineExpose({
  refreshChildComponents,
});
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
