<template>
  <div>
    <ZKHoverEffect
      :enable-hover="compactMode"
      :background-color="compactMode ? 'white' : undefined"
      hover-variant="medium"
    >
      <div class="container standardStyle">
        <PostContent
          :extended-post-data="conversationData"
          :compact-mode="compactMode"
          @open-moderation-history="openModerationHistory()"
          @verified="(payload) => handleTicketVerified(payload)"
        />

        <PostActionBar
          v-model="currentTab"
          :compact-mode="compactMode"
          :opinion-count="
            conversationData.metadata.opinionCount + opinionCountOffset
          "
          :participant-count="participantCountLocal"
          :vote-count="props.conversationData.metadata.voteCount"
          :is-loading="isCurrentTabLoading"
          :conversation-slug-id="conversationData.metadata.conversationSlugId"
          :conversation-title="conversationData.payload.title"
          :author-username="conversationData.metadata.authorUsername"
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
            :login-required-to-participate="
              conversationData.metadata.isLoginRequired
            "
            :requires-event-ticket="
              conversationData.metadata.requiresEventTicket
            "
            :preloaded-queries="{
              commentsDiscoverQuery,
              commentsNewQuery,
              commentsModeratedQuery,
              hiddenCommentsQuery,
              commentsMyVotesQuery,
            }"
            @deleted="decrementOpinionCount()"
            @participant-count-delta="
              (delta: number) => (participantCountLocal += delta)
            "
            @ticket-verified="(payload) => handleTicketVerified(payload)"
          />
        </div>
      </div>
    </ZKHoverEffect>

    <FloatingBottomContainer v-if="!compactMode">
      <CommentComposer
        :post-slug-id="conversationData.metadata.conversationSlugId"
        :login-required-to-participate="
          conversationData.metadata.isLoginRequired
        "
        :requires-event-ticket="conversationData.metadata.requiresEventTicket"
        @submitted-comment="submittedComment"
        @ticket-verified="(payload) => handleTicketVerified(payload)"
      />
    </FloatingBottomContainer>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { ExtendedConversation } from "src/shared/types/zod";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import {
  useAnalysisQuery,
  useCommentsQuery,
  useHiddenCommentsQuery,
  useInvalidateCommentQueries,
} from "src/utils/api/comment/useCommentQueries";
import { computed, onMounted, provide, ref, watch } from "vue";

import FloatingBottomContainer from "../navigation/FloatingBottomContainer.vue";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import AnalysisPage from "./analysis/AnalysisPage.vue";
import CommentComposer from "./comments/CommentComposer.vue";
import CommentSection from "./comments/CommentSection.vue";
import PostContent from "./display/PostContent.vue";
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

// Provide conversation data to all descendants (reactive)
provide("conversationData", computed(() => props.conversationData));

const currentTab = ref<"comment" | "analysis">("comment");

const opinionSectionRef = ref<InstanceType<typeof CommentSection>>();
const analysisPageRef = ref<InstanceType<typeof AnalysisPage>>();

const opinionCountOffset = ref(0);

const {
  invalidateAnalysis,
  forceRefreshAnalysis,
  invalidateComments,
  invalidateHiddenComments,
} = useInvalidateCommentQueries();
const { loadAuthenticatedModules } = useBackendAuthApi();
const userStore = useUserStore();

const participantCountLocal = ref(
  props.conversationData.metadata.participantCount
);

const { profileData } = storeToRefs(userStore);

// Lazy load analysis data only when user clicks Analysis tab
const isAnalysisEnabled = computed(
  () => !props.compactMode && currentTab.value === "analysis"
);

// Create a computed property to ensure reactivity for the query's enabled parameter
const isModerator = computed(() => profileData.value.isModerator);

// Preload both analysis and comment data immediately when component mounts (only if not in compact mode)
const analysisQuery = useAnalysisQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  voteCount: props.conversationData.metadata.voteCount,
  enabled: isAnalysisEnabled,
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
  enabled: !props.compactMode,
});

const commentsModeratedQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "moderated",
  voteCount: props.conversationData.metadata.voteCount,
  enabled: !props.compactMode,
});

const commentsMyVotesQuery = useCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  filter: "my_votes",
  voteCount: props.conversationData.metadata.voteCount,
  enabled: !props.compactMode,
});

const hiddenCommentsQuery = useHiddenCommentsQuery({
  conversationSlugId: props.conversationData.metadata.conversationSlugId,
  voteCount: props.conversationData.metadata.voteCount,
  enabled: !props.compactMode && isModerator.value,
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

async function submittedComment(data: {
  opinionSlugId: string;
  authStateChanged: boolean;
  needsCacheRefresh: boolean;
}): Promise<void> {
  opinionCountOffset.value += 1;

  // The 1.3s wait for vote buffer flush happens in CommentComposer
  // before this function is called, so the vote is already in the database

  if (opinionSectionRef.value) {
    await opinionSectionRef.value.refreshAndHighlightOpinion(
      data.opinionSlugId
    );
  }

  // Force refresh analysis data since new opinion affects analysis results
  // Always use forceRefreshAnalysis to ensure cache expires completely
  forceRefreshAnalysis(props.conversationData.metadata.conversationSlugId);

  // Handle deferred cache refresh if auth state changed (new guest user)
  if (data.needsCacheRefresh) {
    console.log(
      "[PostDetails] New guest user detected - performing deferred cache refresh"
    );

    // Load authenticated modules (including user profile with username)
    await loadAuthenticatedModules();

    // Fetch the opinion again to get updated author info with username
    // Using refreshAndHighlightOpinion instead of refreshData to force immediate refetch
    if (opinionSectionRef.value) {
      await opinionSectionRef.value.refreshAndHighlightOpinion(
        data.opinionSlugId
      );

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
  // Reset local state
  participantCountLocal.value =
    props.conversationData.metadata.participantCount;

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
      if (isModerator.value) {
        commentQueries.push(hiddenCommentsQuery);
      }

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

async function refreshAllData(): Promise<void> {
  // Reset local state
  opinionCountOffset.value = 0;
  participantCountLocal.value =
    props.conversationData.metadata.participantCount;

  const slugId = props.conversationData.metadata.conversationSlugId;

  // Invalidate all queries to force fresh data
  invalidateComments(slugId);
  invalidateAnalysis(slugId);

  if (isModerator.value) {
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
  console.log(
    "[PostDetails] Ticket verified event received - emitting to parent",
    payload
  );
  // This is called directly by PostContent when EventTicketRequirementBanner emits verified
  // Emit to parent (conversation page) so it can refresh conversation data AND all tab data
  emit("ticketVerified", payload);

  // Handle deferred cache refresh if a new guest was created via Zupass
  if (payload.needsCacheRefresh) {
    console.log(
      "[PostDetails] New guest via Zupass - performing deferred cache refresh"
    );
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
