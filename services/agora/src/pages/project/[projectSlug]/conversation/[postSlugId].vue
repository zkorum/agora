<template>
  <PullToRefresh
    :can-refresh="canStartConversationRefresh"
    @refresh="handleRefresh"
  >
    <PageLoadingSpinner v-if="isInitialLoading" />

    <ErrorRetryBlock
      v-else-if="hasInitialLoadError"
      :title="t('errorTitle')"
      :retry-label="t('retryButton')"
      @retry="refetchInitialData"
    />

    <ProjectConversationView
      v-else-if="hasConversationData && projectConversationData !== undefined"
      v-model:selected-language="selectedLanguage"
      :project="projectConversationData.project"
      :conversation-data="loadedConversationData"
      :initial-display-content="loadedConversationDisplayContent"
      :language-options="projectConversationData.languageOptions"
      @conversation-deleted="handleConversationDeleted"
    >
      <template #conversation-actions>
        <ConversationStickyActionBar
          layout="project"
          :sticky-top="0"
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
            :author-username="loadedConversationData.metadata.authorUsername"
            :on-same-tab-click="handleSameTabActionBarClick"
            :conversation-type-config="loadedConversationData.metadata"
            :has-survey="
              loadedConversationData.interaction.surveyGate?.hasSurvey === true
            "
            :enable-route-navigation="true"
            :conversation-route-context="conversationRouteContext"
          />
        </ConversationStickyActionBar>
      </template>

      <template #conversation-toolbar>
        <CommentSortingSelector
          v-if="currentTab === 'comment' && !isMaxDiffConversation"
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
      </template>

      <template #conversation-feed>
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
                :conversation-route-context="conversationRouteContext"
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
      </template>
    </ProjectConversationView>

    <FloatingBottomContainer
      v-if="hasConversationData && !isMaxDiffConversation"
      :anchor-element="actionBarElement ?? undefined"
      :respect-drawer-offset="false"
    >
      <CommentComposer
        :post-slug-id="loadedConversationData.metadata.conversationSlugId"
        :participation-mode="loadedConversationData.metadata.participationMode"
        :requires-event-ticket="
          loadedConversationData.metadata.requiresEventTicket
        "
        :survey-gate="loadedConversationData.interaction.surveyGate"
        :is-composer-disabled="isVotingDisabled"
        :conversation-route-context="conversationRouteContext"
        @submitted-comment="handleSubmittedComment"
      />
    </FloatingBottomContainer>
  </PullToRefresh>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import FloatingBottomContainer from "src/components/navigation/FloatingBottomContainer.vue";
import CommentComposer from "src/components/post/comments/CommentComposer.vue";
import CommentSortingSelector from "src/components/post/comments/group/CommentSortingSelector.vue";
import ConversationStickyActionBar from "src/components/post/interactionBar/ConversationStickyActionBar.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ProjectConversationView from "src/components/project/ProjectConversationView.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import PullToRefresh from "src/components/ui/PullToRefresh.vue";
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
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useBackendProjectPageApi } from "src/utils/api/projectPage";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { getScrollTop } from "src/utils/html/scroll";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { getSingleRouteParam } from "src/utils/router/params";
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import {
  type ConversationPageTranslations,
  conversationPageTranslations,
} from "../../../conversation/[postSlugId].i18n";

const { t } = useComponentI18n<ConversationPageTranslations>(
  conversationPageTranslations
);
usePageLayout({
  enableFooter: false,
  enableHeader: false,
  enableDrawer: false,
});
const route = useRoute();
const queryClient = useQueryClient();
const { fetchProjectConversationPage } = useBackendProjectPageApi();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(
  useAuthenticationStore()
);
const languageStore = useLanguageStore();
const { displayLanguage } = storeToRefs(languageStore);
const { changeDisplayLanguage } = languageStore;
const pausedAnalysisActionBarStats = ref<
  ConversationActionBarStats | undefined
>();
const selectedLanguage = computed<SupportedDisplayLanguageCodes>({
  get: () => displayLanguage.value,
  set: (newLanguage) => {
    if (newLanguage === displayLanguage.value) {
      return;
    }
    void changeDisplayLanguage({ newLanguage });
  },
});

const projectSlug = computed(() =>
  getSingleRouteParam(
    "projectSlug" in route.params ? route.params.projectSlug : undefined
  )
);
const conversationSlugId = computed(() =>
  getSingleRouteParam(
    "postSlugId" in route.params ? route.params.postSlugId : undefined
  )
);
const conversationRouteContext = computed<ConversationRouteContext>(() => ({
  kind: "project",
  projectSlug: projectSlug.value,
}));

const conversationConfig: ConversationParentConfig = {
  analysisRouteName:
    "/project/[projectSlug]/conversation/[postSlugId]/analysis",
  commentRouteNames: [
    "/project/[projectSlug]/conversation/[postSlugId]/",
    "/project/[projectSlug]/conversation/[postSlugId]",
  ],
  reportRouteNames: ["/project/[projectSlug]/conversation/[postSlugId]/report"],
  routeContext: conversationRouteContext,
};

const {
  route: conversationRoute,
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

const projectConversationQuery = useQuery({
  queryKey: computed(() => [
    "projectConversationPage",
    projectSlug.value,
    conversationSlugId.value,
    displayLanguage.value,
    isGuestOrLoggedIn.value,
  ]),
  queryFn: async () =>
    await fetchProjectConversationPage({
      request: {
        projectSlug: projectSlug.value,
        conversationSlugId: conversationSlugId.value,
      },
      authenticated: isGuestOrLoggedIn.value,
    }),
  enabled: computed(
    () =>
      projectSlug.value !== "" &&
      conversationSlugId.value !== "" &&
      isAuthInitialized.value
  ),
  retry: false,
});
const projectConversationData = computed(
  () => projectConversationQuery.data.value
);

const {
  actionBarStats,
  isLoadingCheckpointStats,
  isLoadingCommentStats,
  refetchCommentStats,
} = useConversationActionBarStats({
  conversationData,
  currentTab,
  routeQuery: computed(() => conversationRoute.query),
  overrideStats: pausedAnalysisActionBarStats,
});

const displayedActionBarStats = computed<ConversationActionBarStats>(() => {
  const stats = actionBarStats.value;
  if (stats !== undefined) {
    return stats;
  }

  const metadata = loadedConversationData.value.metadata;
  return {
    opinionCount: metadata.opinionCount,
    participantCount: metadata.participantCount,
    voteCount: metadata.voteCount,
    totalParticipantCount: metadata.totalParticipantCount,
    totalVoteCount: metadata.totalVoteCount,
  };
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
const isInitialLoading = computed(
  () =>
    (conversationQuery.isPending.value && !hasConversationData.value) ||
    (projectConversationQuery.isPending.value &&
      projectConversationData.value === undefined)
);
const hasInitialLoadError = computed(
  () =>
    (conversationQuery.isError.value && !hasConversationData.value) ||
    (projectConversationQuery.isError.value &&
      projectConversationData.value === undefined)
);

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
});

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

watch(conversationData, async (data, previousData) => {
  if (
    previousData !== undefined &&
    data !== undefined &&
    data.metadata.conversationSlugId !==
      previousData.metadata.conversationSlugId
  ) {
    await invalidateUserVotes(data.metadata.conversationSlugId);
  }
});

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

function handleConversationDeleted(): void {
  void queryClient.invalidateQueries({
    queryKey: ["projectPage", projectSlug.value],
  });
}

function canStartConversationRefresh(): boolean {
  return getScrollTop({}) <= 2;
}

function setActionBarElement(element: HTMLElement | null): void {
  actionBarElement.value = element;
}

async function refetchInitialData(): Promise<void> {
  await Promise.all([
    conversationQuery.refetch(),
    projectConversationQuery.refetch(),
  ]);
}
</script>
