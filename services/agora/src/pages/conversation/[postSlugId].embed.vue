<template>
  <EmbedLayout ref="embedLayoutRef">
    <div v-if="hasConversationData">
      <div class="container">
        <TranslatedPostContent
          :extended-post-data="loadedConversationData"
          :initial-display-content="loadedConversationDisplayContent"
          :compact-mode="false"
          @open-moderation-history="openModerationHistory()"
          @verified="(payload) => handleTicketVerified(payload)"
        />

        <div ref="sentinelElement"></div>
        <div
          ref="actionBarElement"
          class="sticky-below-header sticky-action-bar"
          :style="{ '--header-height': headerHeight + 'px' }"
        >
        <PostActionBar
          v-model="currentTab"
          :compact-mode="false"
          :opinion-count="displayedActionBarStats.opinionCount"
          :participant-count="displayedActionBarStats.participantCount"
          :vote-count="displayedActionBarStats.voteCount"
          :total-participant-count="displayedActionBarStats.totalParticipantCount"
          :total-vote-count="displayedActionBarStats.totalVoteCount"
          :is-loading="isActionBarLoading"
          :conversation-slug-id="loadedConversationData.metadata.conversationSlugId"
          :conversation-title="displayedConversationTitle"
          :author-username="loadedConversationData.metadata.authorUsername"
          :on-same-tab-click="() => handleSameTabActionBarClick()"
          :conversation-type-config="loadedConversationData.metadata"
          :has-survey="loadedConversationData.interaction.surveyGate?.hasSurvey === true"
          :enable-route-navigation="true"
          :conversation-route-context="conversationRouteContext"
        />
        </div>

        <!-- Child routes: only tab-specific content -->
        <div class="tab-content" :style="tabContentStyle">
          <router-view v-slot="{ Component }">
            <KeepAlive :max="2">
              <component
                :is="Component"
                :key="route.path"
                :conversation-data="loadedConversationData"
                :moderation-history-trigger="moderationHistoryTrigger"
                :comment-filter="commentFilter"
                :on-view-analysis="onViewAnalysis"
                :navigate-to-discover-tab="navigateToDiscoverTab"
                :conversation-scroll-context="conversationScrollContext"
                :conversation-route-context="conversationRouteContext"
                @update:comment-filter="
                  (filter: CommentFilterOptions) => { commentFilter = filter }
                "
              />
            </KeepAlive>
          </router-view>
        </div>

        <FloatingBottomContainer
          v-if="!isMaxDiffConversation"
        >
          <CommentComposer
            :post-slug-id="loadedConversationData.metadata.conversationSlugId"
            :participation-mode="loadedConversationData.metadata.participationMode"
            :requires-event-ticket="loadedConversationData.metadata.requiresEventTicket"
            :survey-gate="loadedConversationData.interaction.surveyGate"
            :is-composer-disabled="isVotingDisabled"
            @submitted-comment="handleSubmittedComment"
          />
        </FloatingBottomContainer>
      </div>
    </div>
  </EmbedLayout>
</template>

<script setup lang="ts">
import FloatingBottomContainer from "src/components/navigation/FloatingBottomContainer.vue";
import CommentComposer from "src/components/post/comments/CommentComposer.vue";
import TranslatedPostContent from "src/components/post/display/TranslatedPostContent.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import {
  type ConversationActionBarStats,
  useConversationActionBarStats,
} from "src/composables/conversation/useConversationActionBarStats";
import { useConversationParentState } from "src/composables/conversation/useConversationParentState";
import { useTabScrollRestoration } from "src/composables/conversation/useTabScrollRestoration";
import { useStickyObserver } from "src/composables/ui/useStickyObserver";
import EmbedLayout from "src/layouts/EmbedLayout.vue";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
import { computed, ref } from "vue";

const embedLayoutRef = ref<{ containerElement: HTMLElement | null } | null>(null);
const scrollContainer = computed(() => embedLayoutRef.value?.containerElement ?? null);
const conversationRouteContext: ConversationRouteContext = { kind: "embed" };

const { sentinelElement, headerHeight } = useStickyObserver();

const {
  route,
  conversationData,
  conversationDisplayContent,
  hasConversationData,
  loadedConversationData,
  loadedConversationDisplayContent,
  currentTab,
  isCurrentTabLoading,
  moderationHistoryTrigger,
  commentFilter,
  actionBarElement,
  onViewAnalysis,
  navigateToDiscoverTab,
  openModerationHistory,
  handleTicketVerified,
  handleSubmittedComment,
  scrollToActionBar,
  conversationScrollContext,
  pendingScrollOverride,
} = useConversationParentState({
  analysisRouteName: "/conversation/[postSlugId].embed/analysis",
  commentRouteNames: [
    "/conversation/[postSlugId].embed/",
    "/conversation/[postSlugId].embed",
  ],
  routeContext: conversationRouteContext,
  scrollContainer,
});

const { displayedTitle: displayedConversationTitle } = useConversationDisplayContent({
  conversationData,
  initialDisplayContent: conversationDisplayContent,
});

const {
  actionBarStats,
  isLoadingCheckpointStats,
  isLoadingCommentStats,
  refetchCommentStats,
} = useConversationActionBarStats({
  conversationData,
  currentTab,
  routeQuery: computed(() => route.query),
});

const displayedActionBarStats = computed<ConversationActionBarStats>(() => {
  const stats = actionBarStats.value;
  if (stats !== undefined) {
    return stats;
  }

  return getActionBarStatsFromMetadata();
});

const isActionBarLoading = computed(
  () =>
    isCurrentTabLoading.value ||
    isLoadingCheckpointStats.value ||
    isLoadingCommentStats.value
);

const isMaxDiffConversation = computed(() => {
  const metadata = loadedConversationData.value.metadata;
  return (
    metadata.conversationType === "ranking" && metadata.rankingMode === "bws"
  );
});

function getActionBarStatsFromMetadata(): ConversationActionBarStats {
  const metadata = loadedConversationData.value.metadata;
  return {
    opinionCount: metadata.opinionCount,
    participantCount: metadata.participantCount,
    voteCount: metadata.voteCount,
    totalParticipantCount: metadata.totalParticipantCount,
    totalVoteCount: metadata.totalVoteCount,
  };
}

function handleSameTabActionBarClick(): void {
  scrollToActionBar({ behavior: "smooth" });
  if (currentTab.value === "comment") {
    void refetchCommentStats();
  }
}

const isVotingDisabled = computed(() => {
  const data = loadedConversationData.value;
  const isModeratedAndLocked =
    data.metadata.moderation.status === "moderated" &&
    data.metadata.moderation.action === "lock";
  return isModeratedAndLocked || data.metadata.isClosed;
});

const { tabContentStyle } = useTabScrollRestoration({
  analysisRouteName: "/conversation/[postSlugId].embed/analysis",
  pendingScrollOverride,
  actionBarElement,
  scrollContainer,
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 1rem;
  flex-direction: column;
  padding: 1rem;
}
</style>
