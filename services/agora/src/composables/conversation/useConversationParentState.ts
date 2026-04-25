import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import {
  useConversationQuery,
  useInvalidateConversationQuery,
} from "src/utils/api/post/useConversationQuery";
import { useInvalidateVoteQueries } from "src/utils/api/vote/useVoteQueries";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import {
  getElementScrollTop,
  getHeaderHeight,
  getScrollTop,
  scrollTo,
} from "src/utils/html/scroll";
import { computed, provide, type Ref, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

import { isNetworkOffline } from "../useNetworkStatus";

type RouteName = keyof RouteNamedMap;

const PULL_TO_REFRESH_MIN_DELAY_MS = 500;

export interface ConversationParentConfig {
  analysisRouteName: RouteName;
  commentRouteNames: RouteName[];
  routePrefix: string; // e.g. "/conversation/{id}" or "/conversation/{id}/embed"
  scrollContainer?: Ref<HTMLElement | null>; // embed pages use a container div instead of window
}

export interface SubmittedCommentData {
  opinionSlugId: string;
  authStateChanged: boolean;
  needsCacheRefresh: boolean;
}

export function useConversationParentState({
  analysisRouteName,
  commentRouteNames,
  routePrefix,
  scrollContainer,
}: ConversationParentConfig) {
  const route = useRoute();
  const router = useRouter();

  const authStore = useAuthenticationStore();
  const { isAuthInitialized } = storeToRefs(authStore);

  // Clear login intentions immediately (before query setup)
  const loginIntentionStore = useLoginIntentionStore();
  loginIntentionStore.clearVotingIntention();
  loginIntentionStore.clearOpinionAgreementIntention();
  loginIntentionStore.clearReportUserContentIntention();

  // Use TanStack Query for conversation data
  const conversationQuery = useConversationQuery({
    conversationSlugId: computed(
      () => (route.params as { postSlugId: string }).postSlugId
    ),
    enabled: computed(() => isAuthInitialized.value),
  });

  const conversationData = computed(() => {
    const data = conversationQuery.data.value;
    if (!data || data.metadata.conversationSlugId === "") {
      return undefined;
    }
    return data;
  });

  const hasConversationData = computed(
    () => conversationData.value !== undefined
  );

  // Type-safe version for template use (guaranteed non-undefined)
  const loadedConversationData = computed(() => {
    const data = conversationData.value;
    if (!data) {
      throw new Error(
        "[ConversationParentState] Accessed conversation data before loaded"
      );
    }
    return data;
  });

  const { invalidateUserVotes } = useInvalidateVoteQueries();
  const {
    invalidateAnalysis: invalidateAnalysisQuery,
    invalidateComments,
    forceRefreshAnalysis,
  } = useInvalidateCommentQueries();
  const { invalidateConversation } = useInvalidateConversationQuery();

  // Child tab refresh: the active child route registers its own refresh handler
  const childRefreshHandler = ref<(() => Promise<void>) | undefined>();
  provide(
    "registerChildRefreshHandler",
    (handler: () => Promise<void>) => {
      childRefreshHandler.value = handler;
    }
  );

  const submittedCommentHandler = ref<
    ((data: SubmittedCommentData) => Promise<void>) | undefined
  >();
  provide(
    "registerSubmittedCommentHandler",
    (handler: (data: SubmittedCommentData) => Promise<void>) => {
      submittedCommentHandler.value = handler;
    }
  );

  // Shared state for children
  const opinionCountOffset = ref(0);
  const participantCountOffset = ref(0);
  const currentTab = ref<"comment" | "analysis">("comment");
  const isCurrentTabLoading = ref(false);
  const moderationHistoryTrigger = ref(0);

  // Ref for scroll targeting — bound to a wrapper div around PostActionBar in parent pages
  const actionBarElement = ref<HTMLElement | null>(null);

  // When true, the tab scroll restoration watcher should skip
  // restoring the saved position and let scrollToActionBar handle it instead.
  const pendingScrollOverride = ref(false);

  function scrollToActionBar({ behavior }: { behavior?: ScrollBehavior } = {}): void {
    const el = actionBarElement.value;
    if (!el) return;
    const container = scrollContainer?.value;
    const elTop = getElementScrollTop({ element: el, scrollContainer: container });
    scrollTo({ top: elTop - getHeaderHeight(), behavior, scrollContainer: container });
  }

  // Filter state: owned here, displayed in PostActionBar slot, synced with child route via props
  const commentFilter = ref<CommentFilterOptions>("discover");

  // Computed: base participant count + offset
  const participantCountLocal = computed(
    () =>
      (conversationData.value?.metadata.participantCount ?? 0) +
      participantCountOffset.value
  );

  // Provide state and functions to child routes
  provide("refreshConversation", async () => {
    await conversationQuery.refetch();
  });
  provide("opinionCountOffset", opinionCountOffset);
  provide("participantCountOffset", participantCountOffset);
  provide("setCurrentTabLoading", (loading: boolean) => {
    isCurrentTabLoading.value = loading;
  });
  provide("decrementOpinionCount", () => {
    opinionCountOffset.value -= 1;
  });
  provide("scrollToActionBar", scrollToActionBar);
  provide("getScrollPosition", () =>
    getScrollTop({ scrollContainer: scrollContainer?.value }),
  );
  provide(
    "scrollToPosition",
    ({ top, behavior }: { top: number; behavior?: ScrollBehavior }) =>
      scrollTo({ top, behavior, scrollContainer: scrollContainer?.value }),
  );

  // Navigation functions for banner actions (parameterized by route prefix)
  function navigateToAnalysis({ initialTab }: { initialTab?: ShortcutItem } = {}) {
    const data = conversationData.value;
    if (data === undefined) return;

    pendingScrollOverride.value = true;
    void router.push({
      path: `${routePrefix.replace("{id}", data.metadata.conversationSlugId)}/analysis`,
      query: initialTab ? { tab: initialTab } : undefined,
    });
  }

  function navigateToCommentTab() {
    const data = conversationData.value;
    if (data === undefined) return;

    // Invalidate comments cache to ensure fresh data when user navigates
    void invalidateComments(data.metadata.conversationSlugId);

    void router.replace(
      `${routePrefix.replace("{id}", data.metadata.conversationSlugId)}/`
    );
  }

  function navigateToDiscoverTab() {
    const data = conversationData.value;
    if (data === undefined) return;

    commentFilter.value = "discover";

    // Invalidate comments cache to ensure fresh data when user navigates
    void invalidateComments(data.metadata.conversationSlugId);

    pendingScrollOverride.value = true;

    // Push (not back/replace) so the analysis entry stays in history.
    // Back from the comment tab will return to analysis at its saved position.
    void router.push(
      `${routePrefix.replace("{id}", data.metadata.conversationSlugId)}/`
    );
  }

  function onViewAnalysis() {
    navigateToAnalysis({ initialTab: "Me" });
  }

  // Sync currentTab with route
  watch(
    () => route.name,
    (newRouteName) => {
      if (newRouteName === analysisRouteName) {
        currentTab.value = "analysis";
        // Refresh both conversation metadata and analysis data together.
        // Stale participantCount causes >100% group percentages when clusters
        // have more users than the cached count.
        const slugId = conversationData.value?.metadata.conversationSlugId;
        if (slugId) {
          invalidateConversation(slugId);
          invalidateAnalysisQuery(slugId);
        }
      } else if (commentRouteNames.some((name) => name === newRouteName)) {
        currentTab.value = "comment";
      }
    },
    { immediate: true }
  );

  function openModerationHistory(): void {
    if (currentTab.value !== "comment") {
      navigateToCommentTab();
    }
    moderationHistoryTrigger.value += 1;
  }

  const { loadAuthenticatedModules } = useBackendAuthApi();

  async function handleTicketVerified(payload: {
    userIdChanged: boolean;
    needsCacheRefresh: boolean;
  }): Promise<void> {
    if (payload.needsCacheRefresh) {
      await loadAuthenticatedModules();
    }

    // Refresh conversation data after ticket verification
    await conversationQuery.refetch();
  }

  async function handleSubmittedComment(
    data: SubmittedCommentData
  ): Promise<void> {
    const handler = submittedCommentHandler.value;
    if (handler !== undefined) {
      await handler(data);
      return;
    }

    const slugId = conversationData.value?.metadata.conversationSlugId;
    if (slugId === undefined) {
      return;
    }

    opinionCountOffset.value += 1;
    invalidateComments(slugId);
    forceRefreshAnalysis(slugId);

    if (data.needsCacheRefresh) {
      await loadAuthenticatedModules();
    }
  }

  async function handleRefresh(done: () => void): Promise<void> {
    if (isNetworkOffline.value) {
      done();
      return;
    }

    try {
      if (!conversationData.value) {
        await conversationQuery.refetch();
        return;
      }

      const slugId = conversationData.value.metadata.conversationSlugId;

      // Each layer refreshes what it owns:
      // - Parent: conversation metadata + user votes
      // - Child tab: its own queries (comments or analysis) via registered handler
      // Minimum delay ensures the pull-to-refresh spinner stays visible (matches feed behavior)
      await Promise.all([
        conversationQuery.refetch(),
        invalidateUserVotes(slugId),
        childRefreshHandler.value?.() ?? Promise.resolve(),
        new Promise((resolve) =>
          setTimeout(resolve, PULL_TO_REFRESH_MIN_DELAY_MS)
        ),
      ]);
    } finally {
      done();
    }
  }

  return {
    route,
    conversationQuery,
    conversationData,
    hasConversationData,
    loadedConversationData,
    opinionCountOffset,
    participantCountOffset,
    currentTab,
    isCurrentTabLoading,
    moderationHistoryTrigger,
    commentFilter,
    participantCountLocal,
    actionBarElement,
    onViewAnalysis,
    navigateToDiscoverTab,
    openModerationHistory,
    handleTicketVerified,
    handleSubmittedComment,
    handleRefresh,
    invalidateUserVotes,
    scrollToActionBar,
    pendingScrollOverride,
    scrollContainer,
  };
}
