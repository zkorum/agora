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
          :is-loading="isCurrentTabLoading"
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
            :analysis-query="analysisQuery"
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
            :preloaded-queries="{
              commentsDiscoverQuery,
              commentsNewQuery,
              commentsModeratedQuery,
              hiddenCommentsQuery,
            }"
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
import { ref, computed, watch, onMounted } from "vue";
import { useWebShare } from "src/utils/share/WebShare";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import type { ExtendedConversation } from "src/shared/types/zod";
import AnalysisPage from "./analysis/AnalysisPage.vue";
import {
  useAnalysisQuery,
  useCommentsQuery,
  useHiddenCommentsQuery,
  useInvalidateCommentQueries,
} from "src/utils/api/comment/useCommentQueries";

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
const { invalidateAnalysis } = useInvalidateCommentQueries();

const participantCountLocal = ref(
  props.conversationData.metadata.participantCount
);

// Preload both analysis and comment data immediately when component mounts (only if not in compact mode)
const analysisQuery = useAnalysisQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  enabled: !props.compactMode,
});

// Preload comment queries for all filter types (only if not in compact mode)
const commentsDiscoverQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "discover",
  enabled: !props.compactMode,
});

const commentsNewQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "new",
  enabled: !props.compactMode,
});

const commentsModeratedQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "moderated",
  enabled: !props.compactMode,
});

const hiddenCommentsQuery = useHiddenCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  enabled: !props.compactMode,
});

const isPostLocked = computed((): boolean => {
  return (
    props.conversationData.metadata.moderation.status === "moderated" &&
    props.conversationData.metadata.moderation.action === "lock"
  );
});

// Track loading states from child components
const isCurrentTabLoading = computed((): boolean => {
  if (props.compactMode) {
    return false; // No loading indicator needed in compact mode
  }

  if (currentTab.value === "comment") {
    return opinionSectionRef.value?.isLoading ?? false;
  } else if (currentTab.value === "analysis") {
    // Use the preloaded analysis query loading state
    return analysisQuery.isPending.value || analysisQuery.isRefetching.value;
  }

  return false;
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
  } else {
    // If analysis page is not rendered, refresh via query invalidation
    invalidateAnalysis(props.conversationData.metadata.conversationSlugId);
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

onMounted(() => {
  // Reset local state
  participantCountLocal.value =
    props.conversationData.metadata.participantCount;

  refreshAllData();
});

// Watch for tab changes and refresh data when switching tabs
watch(currentTab, async (newTab) => {
  if (!props.compactMode) {
    if (newTab === "comment") {
      // Check and refetch comment queries if they are stale
      const commentQueries = [
        commentsDiscoverQuery,
        commentsNewQuery,
        commentsModeratedQuery,
        hiddenCommentsQuery,
      ];

      const staleQueries = commentQueries.filter(
        (query) => query.isStale.value
      );
      await Promise.all(staleQueries.map((query) => query.refetch()));
    } else if (newTab === "analysis") {
      // Check and refetch analysis query if it is stale
      if (analysisQuery.isStale.value) {
        await analysisQuery.refetch();
      }
    }
  }
});

function refreshAllData(): void {
  // Reset local state
  opinionCountOffset.value = 0;
  participantCountLocal.value =
    props.conversationData.metadata.participantCount;

  // Refresh analysis data
  invalidateAnalysis(props.conversationData.metadata.conversationSlugId);

  // Refresh comment data if the component is rendered
  if (opinionSectionRef.value) {
    opinionSectionRef.value.refreshData();
  }
}

defineExpose({
  // General function to refresh all tab data
  refreshAllData,
  // Specific method to manually refresh analysis data if needed
  refreshAnalysis: () =>
    invalidateAnalysis(props.conversationData.metadata.conversationSlugId),
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
