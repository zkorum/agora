<template>
  <div>
    <ZKHoverEffect
      :enable-hover="compactMode"
      :background-color="compactMode ? 'white' : undefined"
      hover-variant="medium"
    >
      <div class="container standardStyle">
        <TranslatedPostContent
          :extended-post-data="conversationData"
          :compact-mode="compactMode"
          @open-moderation-history="openModerationHistory()"
          @verified="(payload) => handleTicketVerified(payload)"
        />

        <PostActionBar
          v-model="currentTab"
          :compact-mode="compactMode"
          :opinion-count="displayedActionBarStats.opinionCount"
          :participant-count="displayedActionBarStats.participantCount"
          :vote-count="displayedActionBarStats.voteCount"
          :total-participant-count="
            displayedActionBarStats.totalParticipantCount
          "
          :total-vote-count="displayedActionBarStats.totalVoteCount"
          :is-loading="isActionBarLoading"
          :conversation-slug-id="conversationData.metadata.conversationSlugId"
          :conversation-title="conversationData.payload.title"
          :author-username="conversationData.metadata.authorUsername"
          :conversation-type="conversationData.metadata.conversationType"
          :has-survey="
            conversationData.interaction.surveyGate?.hasSurvey === true
          "
          :enable-route-navigation="true"
        />

        <AnalysisPage
          v-if="!compactMode && currentTab === 'analysis'"
          ref="analysisPageRef"
          :conversation-slug-id="
            props.conversationData.metadata.conversationSlugId
          "
          :conversation-author-username="
            conversationData.metadata.authorUsername
          "
          :conversation-organization-name="
            conversationData.metadata.organization?.name ?? ''
          "
          :analysis-query="analysisQuery"
          :analysis-checkpoints-query="analysisCheckpointsQuery"
          :live-conversation-view-snapshot-id="
            conversationData.metadata.conversationViewSnapshotId
          "
          :survey-query="surveyResultsQuery"
          :has-survey="hasSurvey"
          :survey-gate="conversationData.interaction.surveyGate"
          :ai-labeling-enabled="conversationData.metadata.aiLabelingEnabled"
          :show-report-button="true"
          :is-live-analysis-paused="isLiveAnalysisPaused"
          :is-conversation-closed="conversationData.metadata.isClosed"
          :navigate-to-discover-tab="navigateToDiscoverTab"
          :conversation-scroll-context="conversationScrollContext"
          @update:live-analysis-paused="setLiveAnalysisPaused"
        />

        <CommentSection
          v-if="!compactMode && currentTab === 'comment'"
          ref="opinionSectionRef"
          :post-slug-id="conversationData.metadata.conversationSlugId"
          :conversation-author-username="
            conversationData.metadata.authorUsername
          "
          :conversation-organization-name="
            conversationData.metadata.organization?.name ?? ''
          "
          :participation-mode="conversationData.metadata.participationMode"
          :requires-event-ticket="conversationData.metadata.requiresEventTicket"
          :survey-gate="conversationData.interaction.surveyGate"
          :on-view-analysis="viewAnalysisTab"
          :is-voting-disabled="isVotingDisabled"
          :preloaded-queries="{
            commentsDiscoverQuery,
            commentsNewQuery,
            commentsModeratedQuery,
            hiddenCommentsQuery,
            commentsMyVotesQuery,
          }"
        />
      </div>
    </ZKHoverEffect>

    <FloatingBottomContainer v-if="!compactMode">
      <CommentComposer
        :post-slug-id="conversationData.metadata.conversationSlugId"
        :participation-mode="conversationData.metadata.participationMode"
        :requires-event-ticket="conversationData.metadata.requiresEventTicket"
        :survey-gate="conversationData.interaction.surveyGate"
        :is-composer-disabled="isVotingDisabled"
        @submitted-comment="submittedComment"
      />
    </FloatingBottomContainer>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
  type ConversationActionBarStats,
  useConversationActionBarStats,
} from "src/composables/conversation/useConversationActionBarStats";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { ExtendedConversation, OpinionItem } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import {
  useAnalysisCheckpointsQuery,
  useAnalysisQuery,
  useCommentsQuery,
  useHiddenCommentsQuery,
  useInvalidateCommentQueries,
} from "src/utils/api/comment/useCommentQueries";
import { useSurveyResultsAggregatedQuery } from "src/utils/api/survey/useSurveyQueries";
import {
  getElementScrollTop,
  getScrollTop,
  scrollTo,
} from "src/utils/html/scroll";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import FloatingBottomContainer from "../navigation/FloatingBottomContainer.vue";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import AnalysisPage from "./analysis/AnalysisPage.vue";
import CommentComposer from "./comments/CommentComposer.vue";
import CommentSection from "./comments/CommentSection.vue";
import TranslatedPostContent from "./display/TranslatedPostContent.vue";
import PostActionBar from "./interactionBar/PostActionBar.vue";

const props = defineProps<{
  conversationData: ExtendedConversation;
  compactMode: boolean;
}>();

const emit = defineEmits<{
  ticketVerified: [
    payload: { userIdChanged: boolean; needsCacheRefresh: boolean },
  ];
}>();

const currentTab = ref<"comment" | "analysis">("comment");
const route = useRoute();

const opinionSectionRef = ref<InstanceType<typeof CommentSection>>();
const analysisPageRef = ref<InstanceType<typeof AnalysisPage>>();
const isLiveAnalysisPaused = ref(false);

const conversationScrollContext = computed<ConversationScrollContext>(() => ({
  actionBarElement: null,
  scrollContainerElement: null,
  getScrollPosition: () => getScrollTop({ scrollContainer: null }),
  getElementScrollPosition: ({ element }: { element: HTMLElement }) =>
    getElementScrollTop({ element, scrollContainer: null }),
  scrollToPosition: ({
    top,
    behavior,
  }: {
    top: number;
    behavior: ScrollBehavior;
  }) => {
    scrollTo({ top, behavior, scrollContainer: null });
  },
}));

const {
  invalidateAnalysis,
  markAnalysisAsStale,
  markCommentsAsStale,
  invalidateComments,
  invalidateHiddenComments,
} = useInvalidateCommentQueries();
const { loadAuthenticatedModules } = useBackendAuthApi();
const userStore = useUserStore();

const hasSurvey = computed(
  () => props.conversationData.interaction.surveyGate?.hasSurvey === true
);

const aiLabelingEnabled = computed(
  () => props.conversationData.metadata.aiLabelingEnabled
);

const { profileData } = storeToRefs(userStore);

// Lazy load analysis data only when user clicks Analysis tab
const isAnalysisEnabled = computed(
  () => !props.compactMode && currentTab.value === "analysis"
);

const isAnalysisQueryEnabled = computed(
  () => isAnalysisEnabled.value && !isLiveAnalysisPaused.value
);

// Create a computed property to ensure reactivity for the query's enabled parameter
const isSiteModerator = computed(() => profileData.value.isSiteModerator);

// Preload both analysis and comment data immediately when component mounts (only if not in compact mode)
const analysisQuery = useAnalysisQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  voteCount: props.conversationData.metadata.voteCount,
  aiLabelingEnabled,
  enabled: isAnalysisQueryEnabled,
});

const analysisCheckpointsQuery = useAnalysisCheckpointsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  enabled: isAnalysisQueryEnabled,
});

const surveyResultsQuery = useSurveyResultsAggregatedQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  enabled: computed(() => isAnalysisEnabled.value && hasSurvey.value),
});

// Preload comment queries for all filter types (only if not in compact mode)
const commentsDiscoverQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "discover",
  voteCount: props.conversationData.metadata.voteCount,
  enabled: !props.compactMode,
});

const commentsNewQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "new",
  voteCount: props.conversationData.metadata.voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const commentsModeratedQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "moderated",
  voteCount: props.conversationData.metadata.voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const commentsMyVotesQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "my_votes",
  voteCount: props.conversationData.metadata.voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const hiddenCommentsQuery = useHiddenCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  voteCount: props.conversationData.metadata.voteCount,
  enabled: false, // Lazy: fetched on-demand when user selects this filter
});

const isVotingDisabled = computed(() => {
  const data = props.conversationData;
  const isModeratedAndLocked =
    data.metadata.moderation.status === "moderated" &&
    data.metadata.moderation.action === "lock";
  return isModeratedAndLocked || data.metadata.isClosed;
});

function viewAnalysisTab(): void {
  currentTab.value = "analysis";
}

function navigateToDiscoverTab(): void {
  currentTab.value = "comment";
}

function setLiveAnalysisPaused(paused: boolean): void {
  isLiveAnalysisPaused.value = paused;
}

// Track loading states from child components
const isCurrentTabLoading = computed((): boolean => {
  if (props.compactMode) {
    return false; // No loading indicator needed in compact mode
  }

  if (currentTab.value === "comment") {
    return opinionSectionRef.value?.isLoading ?? false;
  } else if (currentTab.value === "analysis") {
    return (
      ((analysisQuery.isPending.value || analysisQuery.isRefetching.value) &&
        analysisQuery.data.value === undefined) ||
      ((analysisCheckpointsQuery.isPending.value ||
        analysisCheckpointsQuery.isRefetching.value) &&
        analysisCheckpointsQuery.data.value === undefined) ||
      ((surveyResultsQuery.isPending.value ||
        surveyResultsQuery.isRefetching.value) &&
        surveyResultsQuery.data.value === undefined)
    );
  }

  return false;
});

const { actionBarStats, isLoadingCheckpointStats, isLoadingCommentStats } =
  useConversationActionBarStats({
    conversationData: computed(() => props.conversationData),
    currentTab,
    routeQuery: computed(() => route.query),
    enableCommentStats: computed(() => !props.compactMode),
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

function getActionBarStatsFromMetadata(): ConversationActionBarStats {
  const metadata = props.conversationData.metadata;
  return {
    opinionCount: metadata.opinionCount,
    participantCount: metadata.participantCount,
    voteCount: metadata.voteCount,
    totalParticipantCount: metadata.totalParticipantCount,
    totalVoteCount: metadata.totalVoteCount,
  };
}

function openModerationHistory(): void {
  if (opinionSectionRef.value) {
    opinionSectionRef.value.openModerationHistory();
  } else {
    console.warn("Opinion section reference is undefined");
  }
}

async function submittedComment(data: {
  opinionSlugId: string;
  opinionItem: OpinionItem;
  authStateChanged: boolean;
  needsCacheRefresh: boolean;
}): Promise<void> {
  await markCommentsAsStale(props.conversationData.metadata.conversationSlugId);
  markAnalysisAsStale(props.conversationData.metadata.conversationSlugId);

  if (opinionSectionRef.value) {
    await opinionSectionRef.value.refreshAndHighlightOpinion(data.opinionSlugId);
  }

  // Handle deferred cache refresh if auth state changed (new guest user)
  if (data.needsCacheRefresh) {
    // Load authenticated modules (including user profile with username)
    await loadAuthenticatedModules();

    // Fetch the opinion again to get updated author info with username
    // Using refreshAndHighlightOpinion instead of refreshData to force immediate refetch
    if (opinionSectionRef.value) {
      await opinionSectionRef.value.refreshAndHighlightOpinion(data.opinionSlugId);

      // Update user store with username from the fetched opinion
      // This is necessary because loadUserProfile() may hit a read replica that doesn't yet
      // have the newly created username committed, resulting in stale/empty username data.
      // The opinion data, however, always has the correct username since it's fetched directly.
      // This ensures the header/sidebar shows the correct username immediately.
      const targetOpinion = opinionSectionRef.value.targetOpinion;
      if (targetOpinion && targetOpinion.username) {
        profileData.value.userName = targetOpinion.username;
      }
    }
  }
}

onMounted(async () => {
  await refreshAllData();
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
        commentsMyVotesQuery,
      ];

      // Only include hiddenCommentsQuery if user is a moderator
      if (isSiteModerator.value) {
        commentQueries.push(hiddenCommentsQuery);
      }

      const staleOrUnfetchedQueries = commentQueries.filter(
        (query) => query.isStale.value || !query.data.value
      );
      await Promise.all(
        staleOrUnfetchedQueries.map((query) => query.refetch())
      );
    } else if (newTab === "analysis") {
      // Check and refetch analysis query if it is stale
      if (analysisQuery.isStale.value) {
        await analysisQuery.refetch();
      }

      if (hasSurvey.value && surveyResultsQuery.isStale.value) {
        await surveyResultsQuery.refetch();
      }
    }
  }
});

async function refreshAllData(): Promise<void> {
  const slugId = props.conversationData.metadata.conversationSlugId;

  // Invalidate all queries to force fresh data
  invalidateComments(slugId);
  invalidateAnalysis(slugId);

  if (isSiteModerator.value) {
    invalidateHiddenComments(slugId);
  }

  // Refresh comment data if the component is rendered
  if (opinionSectionRef.value) {
    await opinionSectionRef.value.refreshData();
  }
}

async function handleTicketVerified(payload: {
  userIdChanged: boolean;
  needsCacheRefresh: boolean;
}): Promise<void> {
  // This is called directly by PostContent when EventTicketRequirementBanner emits verified
  // Emit to parent (conversation page) so it can refresh conversation data AND all tab data
  emit("ticketVerified", payload);

  // Handle deferred cache refresh if a new guest was created via Zupass
  if (payload.needsCacheRefresh) {
    // Load authenticated modules (including user profile) after ticket verification
    // The underlying problem is read replica lag: when a new guest user is created via Zupass,
    // the username is written to the primary database but may not yet be replicated to read replicas.
    // By deferring loadAuthenticatedModules() until after the verification flow completes,
    // we give the replication time to catch up, increasing the likelihood that the username
    // will be available when we fetch the user profile.
    await loadAuthenticatedModules();
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
  flex-direction: column;
  gap: 1rem;
}

.standardStyle {
  padding-top: 1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: 1rem;
}
</style>
