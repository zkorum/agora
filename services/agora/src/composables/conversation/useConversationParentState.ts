import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useInvalidateVoteQueries } from "src/utils/api/vote/useVoteQueries";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, provide, type Ref, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

type RouteName = keyof RouteNamedMap;

export interface ConversationParentConfig {
  analysisRouteName: RouteName;
  commentRouteNames: RouteName[];
  routePrefix: string; // e.g. "/conversation/{id}" or "/conversation/{id}/embed"
  headerHeight: Ref<number>; // from useStickyObserver — avoids duplicate querySelector
  scrollContainer?: Ref<HTMLElement | null>; // embed pages use a container div instead of window
}

export function useConversationParentState({
  analysisRouteName,
  commentRouteNames,
  routePrefix,
  headerHeight,
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
  } = useInvalidateCommentQueries();

  // Child tab refresh: the active child route registers its own refresh handler
  const childRefreshHandler = ref<(() => Promise<void>) | undefined>();
  provide(
    "registerChildRefreshHandler",
    (handler: () => Promise<void>) => {
      childRefreshHandler.value = handler;
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

  const headerStore = useLayoutHeaderStore();

  function scrollToActionBar({ behavior }: { behavior?: ScrollBehavior } = {}): void {
    const el = actionBarElement.value;
    if (!el) return;
    const container = scrollContainer?.value;
    const effectiveHeight = headerStore.reveal ? headerHeight.value : 0;
    if (container) {
      const elTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top: elTop - effectiveHeight, behavior });
    } else {
      const elTop = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elTop - effectiveHeight, behavior });
    }
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

  // Navigation functions for banner actions (parameterized by route prefix)
  function navigateToAnalysis({ initialTab }: { initialTab?: ShortcutItem } = {}) {
    const data = conversationData.value;
    if (data === undefined) return;

    // Invalidate analysis cache to ensure fresh data when user navigates
    void invalidateAnalysisQuery(data.metadata.conversationSlugId);

    pendingScrollOverride.value = true;
    void router.push({
      path: `${routePrefix.replace("{id}", data.metadata.conversationSlugId)}/analysis`,
      query: initialTab ? { tab: initialTab } : undefined,
    }).then(() => {
      scrollToActionBar();
    });
  }

  function navigateToCommentTab() {
    const data = conversationData.value;
    if (data === undefined) return;

    // Invalidate comments cache to ensure fresh data when user navigates
    void invalidateComments(data.metadata.conversationSlugId);

    void router.push(
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
    void router.push(
      `${routePrefix.replace("{id}", data.metadata.conversationSlugId)}/`
    ).then(() => {
      scrollToActionBar();
    });
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

  async function handleRefresh(done: () => void): Promise<void> {
    if (!conversationData.value) {
      done();
      return;
    }

    const slugId = conversationData.value.metadata.conversationSlugId;

    // Each layer refreshes what it owns:
    // - Parent: conversation metadata + user votes
    // - Child tab: its own queries (comments or analysis) via registered handler
    await Promise.all([
      conversationQuery.refetch(),
      invalidateUserVotes(slugId),
      childRefreshHandler.value?.() ?? Promise.resolve(),
    ]);

    done();
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
    handleRefresh,
    invalidateUserVotes,
    scrollToActionBar,
    pendingScrollOverride,
    scrollContainer,
  };
}
