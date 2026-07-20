<template>
  <Teleport v-if="isActive" to="#page-header">
    <DefaultMenuBar :center-content="false">
      <template #left>
        <BackButton @click="handleBack" />
        <span v-if="isSticky && hasConversationData" class="navbar-title">
          {{ displayedConversationTitle }}
        </span>
      </template>
    </DefaultMenuBar>
  </Teleport>

  <PullToRefresh
    :can-refresh="canStartConversationRefresh"
    @refresh="handleRefresh"
  >
    <WidthWrapper :enable="true">
      <PageLoadingSpinner
        v-if="conversationQuery.isPending.value && !hasConversationData"
      />

      <ErrorRetryBlock
        v-else-if="
          conversationQuery.isError.value &&
          !conversationQuery.isPending.value &&
          !hasConversationData
        "
        :title="t('errorTitle')"
        :retry-label="t('retryButton')"
        @retry="conversationQuery.refetch()"
      />

      <div v-else-if="hasConversationData">
        <ZKHoverEffect :enable-hover="false">
          <div class="container standardStyle">
            <TranslatedPostContent
              :extended-post-data="loadedConversationData"
              :initial-display-content="loadedConversationDisplayContent"
              :compact-mode="false"
              @open-moderation-history="openModerationHistory()"
              @conversation-deleted="handleConversationDeleted"
              @verified="(payload) => handleTicketVerified(payload)"
            />

            <div ref="sentinelElement"></div>
            <ConversationStickyActionBar
              layout="standard"
              :sticky-top="headerRevealed ? headerHeight : 0"
              @update:action-bar-element="setActionBarElement"
            >
              <PostActionBar
                v-model="currentTab"
                :compact-mode="false"
                :opinion-count="displayedActionBarStats.opinionCount"
                :participant-count="displayedActionBarStats.participantCount"
                :vote-count="displayedActionBarStats.voteCount"
                :total-participant-count="
                  displayedActionBarStats.totalParticipantCount
                "
                :total-vote-count="displayedActionBarStats.totalVoteCount"
                :is-loading="isActionBarLoading"
                :conversation-slug-id="
                  loadedConversationData.metadata.conversationSlugId
                "
                :conversation-title="displayedConversationTitle"
                :author-username="
                  loadedConversationData.metadata.authorUsername
                "
                :on-same-tab-click="() => handleSameTabActionBarClick()"
                :conversation-type-config="loadedConversationData.metadata"
                :has-survey="
                  loadedConversationData.interaction.surveyGate?.hasSurvey ===
                  true
                "
                :enable-route-navigation="true"
                :conversation-route-context="normalConversationRouteContext"
              />
            </ConversationStickyActionBar>

            <div
              v-if="currentTab === 'comment' && !isMaxDiffConversation"
              class="dropdownSlot"
            >
              <CommentSortingSelector
                :filter-value="commentFilter"
                :moderated-opinion-count="
                  loadedConversationData.metadata.moderatedOpinionCount
                "
                :hidden-opinion-count="
                  loadedConversationData.metadata.hiddenOpinionCount
                "
                @changed-algorithm="
                  (filter: CommentFilterOptions) => {
                    commentFilter = filter;
                  }
                "
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
                    :conversation-route-context="normalConversationRouteContext"
                    v-bind="analysisRouteProps"
                    @analysis-live-pause-stats="setAnalysisLivePauseStats"
                    @update:comment-filter="
                      (filter: CommentFilterOptions) => {
                        commentFilter = filter;
                      }
                    "
                  />
                </KeepAlive>
              </router-view>
            </div>

            <FloatingBottomContainer v-if="!isMaxDiffConversation">
              <CommentComposer
                ref="commentComposerRef"
                :post-slug-id="
                  loadedConversationData.metadata.conversationSlugId
                "
                :participation-mode="
                  loadedConversationData.metadata.participationMode
                "
                :requires-event-ticket="
                  loadedConversationData.metadata.requiresEventTicket
                "
                :survey-gate="loadedConversationData.interaction.surveyGate"
                :is-composer-disabled="isVotingDisabled"
                @submitted-comment="handleSubmittedComment"
              />
            </FloatingBottomContainer>
          </div>
        </ZKHoverEffect>
      </div>
    </WidthWrapper>
  </PullToRefresh>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import FloatingBottomContainer from "src/components/navigation/FloatingBottomContainer.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import CommentComposer from "src/components/post/comments/CommentComposer.vue";
import CommentSortingSelector from "src/components/post/comments/group/CommentSortingSelector.vue";
import TranslatedPostContent from "src/components/post/display/TranslatedPostContent.vue";
import ConversationStickyActionBar from "src/components/post/interactionBar/ConversationStickyActionBar.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import PullToRefresh from "src/components/ui/PullToRefresh.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import {
  type ConversationActionBarStats,
  useConversationActionBarStats,
} from "src/composables/conversation/useConversationActionBarStats";
import {
  type ConversationParentConfig,
  useConversationParentState,
} from "src/composables/conversation/useConversationParentState";
import { useTabScrollRestoration } from "src/composables/conversation/useTabScrollRestoration";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useStickyObserver } from "src/composables/ui/useStickyObserver";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { getElementScrollTop, getScrollTop } from "src/utils/html/scroll";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import {
  isBackToConversationCommentTab,
  navigateBackOrReplace,
} from "src/utils/nav/historyBack";
import {
  getConversationPath,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationPageTranslations,
  conversationPageTranslations,
} from "./[postSlugId].i18n";

const { isActive } = usePageLayout({ enableFooter: false });

const router = useRouter();
const { t } = useComponentI18n<ConversationPageTranslations>(
  conversationPageTranslations
);
const PULL_TO_REFRESH_BOUNDARY_TOLERANCE_PX = 2;
const {
  sentinelElement,
  isSticky,
  headerHeight,
  refresh: refreshStickyState,
} = useStickyObserver();
const navigationStore = useNavigationStore();
const { resetDraft } = useNewPostDraftsStore();
const { safeNavigateBack } = useGoBackButtonHandler();

const authStore = useAuthenticationStore();
const { userId } = storeToRefs(authStore);
const { reveal: headerRevealed } = storeToRefs(useLayoutHeaderStore());
const commentComposerRef = ref<InstanceType<typeof CommentComposer>>();
const pausedAnalysisActionBarStats = ref<
  ConversationActionBarStats | undefined
>();

const conversationConfig: ConversationParentConfig = {
  analysisRouteName: "/conversation/[postSlugId]/analysis",
  commentRouteNames: [
    "/conversation/[postSlugId]/",
    "/conversation/[postSlugId]",
  ],
  routeContext: normalConversationRouteContext,
};

const {
  route,
  conversationQuery,
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
  handleRefresh,
  invalidateUserVotes,
  scrollToActionBar,
  conversationScrollContext,
  pendingScrollOverride,
} = useConversationParentState(conversationConfig);

const { displayedTitle: displayedConversationTitle } =
  useConversationDisplayContent({
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
  overrideStats: pausedAnalysisActionBarStats,
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

function setAnalysisLivePauseStats(
  stats: ConversationActionBarStats | undefined
): void {
  pausedAnalysisActionBarStats.value = stats;
}

function handleSameTabActionBarClick(): void {
  scrollToActionBar({ behavior: "smooth" });
  if (currentTab.value === "comment") {
    void refetchCommentStats();
  }
}

watch(
  () => ({
    conversationSlugId: conversationData.value?.metadata.conversationSlugId,
    currentTab: currentTab.value,
  }),
  ({ conversationSlugId: nextSlugId, currentTab: nextTab }, previous) => {
    if (
      nextTab !== "analysis" ||
      (previous !== undefined && nextSlugId !== previous.conversationSlugId)
    ) {
      pausedAnalysisActionBarStats.value = undefined;
    }
  }
);

function getVisualRefreshBoundaryTop(): number | undefined {
  const sentinel = sentinelElement.value;
  if (sentinel === null) {
    return undefined;
  }

  const effectiveHeaderHeight = headerRevealed.value ? headerHeight.value : 0;
  return getElementScrollTop({ element: sentinel }) - effectiveHeaderHeight;
}

function canStartConversationRefresh(): boolean {
  const currentScrollTop = getScrollTop({});
  if (currentScrollTop <= PULL_TO_REFRESH_BOUNDARY_TOLERANCE_PX) {
    return true;
  }

  const visualBoundaryTop = getVisualRefreshBoundaryTop();
  if (visualBoundaryTop === undefined) {
    return false;
  }

  return (
    Math.abs(currentScrollTop - visualBoundaryTop) <=
    PULL_TO_REFRESH_BOUNDARY_TOLERANCE_PX
  );
}

const isVotingDisabled = computed(() => {
  const data = conversationData.value;
  if (data === undefined) {
    return true;
  }

  const isModeratedAndLocked =
    data.metadata.moderation.status === "moderated" &&
    data.metadata.moderation.action === "lock";
  return isModeratedAndLocked || data.metadata.isClosed;
});

const analysisRouteProps = computed(() => {
  if (currentTab.value !== "analysis") {
    return {};
  }

  return {
    conversationScrollContext: conversationScrollContext.value,
  };
});

const { tabContentStyle } = useTabScrollRestoration({
  analysisRouteName: conversationConfig.analysisRouteName,
  pendingScrollOverride,
  actionBarElement,
  onScrollComplete: refreshStickyState,
});

function setActionBarElement(element: HTMLElement | null): void {
  actionBarElement.value = element;
}

function handleBack(event: MouseEvent): void {
  event.preventDefault();
  if (currentTab.value === "analysis") {
    const slugId = conversationData.value?.metadata.conversationSlugId;
    if (slugId === undefined) return;

    const fallbackRoute = getConversationPath({ conversationSlugId: slugId });
    const conversationPathPrefix = fallbackRoute.endsWith("/")
      ? fallbackRoute.slice(0, -1)
      : fallbackRoute;
    void navigateBackOrReplace({
      router,
      fallbackRoute,
      shouldNavigateBack: isBackToConversationCommentTab({
        historyBack: window.history.state?.back,
        conversationPathPrefix,
      }),
    });
  } else {
    void safeNavigateBack({ name: "/" });
  }
}

function handleConversationDeleted(): void {
  commentComposerRef.value?.discardDraft();
}

// Handle conversation creation navigation
onMounted(() => {
  if (navigationStore.cameFromConversationCreation) {
    resetDraft();
  }
});

// Watch for userId changes to detect account merges
watch(userId, async (newUserId, oldUserId) => {
  if (
    oldUserId !== undefined &&
    newUserId !== undefined &&
    oldUserId !== newUserId
  ) {
    if (conversationData.value) {
      void invalidateUserVotes(
        conversationData.value.metadata.conversationSlugId
      );
    }
    await conversationQuery.refetch();
  }
});

// Clear conversation creation context when leaving this page
onBeforeUnmount(() => {
  navigationStore.clearConversationCreationContext();
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 0.5rem;
  flex-direction: column;
}

.standardStyle {
  padding: 1rem;
}

.dropdownSlot {
  display: flex;
  justify-content: flex-end;
}

.navbar-title {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  min-width: 0;
  flex: 1;
  color: black;
  margin-inline-end: 1rem;
}
</style>
