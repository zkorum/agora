import { storeToRefs } from "pinia";
import { useOpinionEditTarget } from "src/composables/opinion/useOpinionEditTarget";
import { useOpinionListState } from "src/composables/opinion/useOpinionListState";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useInvalidateCommentQueries } from "src/utils/api/comment/useCommentQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { useInvalidateVoteQueries } from "src/utils/api/vote/useVoteQueries";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import {
  getElementScrollTop,
  getHeaderHeight,
  getScrollTop,
  scrollTo,
} from "src/utils/html/scroll";
import {
  type ConversationRouteContext,
  getConversationAnalysisPath,
  getConversationCommentRoute,
  getConversationPath,
} from "src/utils/router/conversationRouteContext";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  computed,
  type MaybeRef,
  provide,
  type Ref,
  ref,
  unref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

import { isNetworkOffline } from "../useNetworkStatus";

type RouteName = keyof RouteNamedMap;

const PULL_TO_REFRESH_MIN_DELAY_MS = 500;

export interface ConversationParentConfig {
  analysisRouteName: RouteName;
  commentRouteNames: RouteName[];
  reportRouteNames?: RouteName[];
  routeContext: MaybeRef<ConversationRouteContext>;
  scrollContainer?: Ref<HTMLElement | null>; // embed pages use a container div instead of window
}

export interface SubmittedCommentData {
  kind?: "created" | "edited";
  displayedOpinionItem: DisplayedOpinionItem;
  needsCacheRefresh: boolean;
}

export type ChildRefreshHandler = () => Promise<void>;
export type RegisterChildRefreshHandler = (
  handler: ChildRefreshHandler
) => () => void;

export interface ConversationScrollContext {
  actionBarElement: HTMLElement | null;
  scrollContainerElement: HTMLElement | null;
  getScrollPosition: () => number;
  getElementScrollPosition: (params: { element: HTMLElement }) => number;
  scrollToPosition: (params: { top: number; behavior: ScrollBehavior }) => void;
}

export function useConversationParentState({
  analysisRouteName,
  commentRouteNames,
  reportRouteNames = [],
  routeContext,
  scrollContainer,
}: ConversationParentConfig) {
  const route = useRoute();
  const router = useRouter();
  const routeContextValue = computed(() => unref(routeContext));

  const authStore = useAuthenticationStore();
  const { isAuthInitialized } = storeToRefs(authStore);

  // Use TanStack Query for conversation data
  const conversationQuery = useConversationQuery({
    conversationSlugId: computed(() =>
      getSingleRouteParam(
        "postSlugId" in route.params ? route.params.postSlugId : undefined
      )
    ),
    enabled: computed(() => isAuthInitialized.value),
  });

  const conversationData = computed(() => {
    const data = conversationQuery.data.value;
    if (!data || data.conversationData.metadata.conversationSlugId === "") {
      return undefined;
    }
    return data.conversationData;
  });

  const conversationDisplayContent = computed(() => {
    const data = conversationQuery.data.value;
    if (!data || data.conversationData.metadata.conversationSlugId === "") {
      return undefined;
    }
    return data.displayContent;
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

  const loadedConversationDisplayContent = computed(() => {
    const displayContent = conversationDisplayContent.value;
    if (!displayContent) {
      throw new Error(
        "[ConversationParentState] Accessed conversation display content before loaded"
      );
    }
    return displayContent;
  });

  const { invalidateUserVotes } = useInvalidateVoteQueries();
  const { invalidateComments, markAnalysisAsStale } =
    useInvalidateCommentQueries();

  // Child tab refresh: the active child route registers its own refresh handler
  const childRefreshHandler = ref<ChildRefreshHandler | undefined>();
  provide<RegisterChildRefreshHandler>(
    "registerChildRefreshHandler",
    (handler) => {
      childRefreshHandler.value = handler;
      return () => {
        if (childRefreshHandler.value === handler) {
          childRefreshHandler.value = undefined;
        }
      };
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

  const currentTab = ref<"comment" | "analysis">("comment");
  const { editingTarget, editingOpinion, beginEditOpinion, finishEditOpinion } =
    useOpinionEditTarget();
  async function handleEditedOpinion(
    opinion: DisplayedOpinionItem
  ): Promise<void> {
    finishEditOpinion();
    await handleSubmittedComment({
      displayedOpinionItem: opinion,
      needsCacheRefresh: false,
      kind: "edited",
    });
  }
  watch(() => authStore.userId, finishEditOpinion);
  const isCurrentTabLoading = ref(false);

  // Ref for scroll targeting — bound to a wrapper div around PostActionBar in parent pages
  const actionBarElement = ref<HTMLElement | null>(null);
  const scrollContainerRef = scrollContainer ?? ref<HTMLElement | null>(null);

  function getCurrentScrollPosition(): number {
    return getScrollTop({ scrollContainer: scrollContainerRef.value });
  }

  function getElementScrollPosition({
    element,
  }: {
    element: HTMLElement;
  }): number {
    return getElementScrollTop({
      element,
      scrollContainer: scrollContainerRef.value,
    });
  }

  function scrollToPosition({
    top,
    behavior,
  }: {
    top: number;
    behavior: ScrollBehavior;
  }): void {
    scrollTo({ top, behavior, scrollContainer: scrollContainerRef.value });
  }

  const conversationScrollContext = computed<ConversationScrollContext>(() => ({
    actionBarElement: actionBarElement.value,
    scrollContainerElement: scrollContainerRef.value,
    getScrollPosition: getCurrentScrollPosition,
    getElementScrollPosition,
    scrollToPosition,
  }));

  // When true, the tab scroll restoration watcher should skip
  // restoring the saved position and let scrollToActionBar handle it instead.
  const pendingScrollOverride = ref(false);

  function scrollToActionBar({
    behavior,
  }: { behavior?: ScrollBehavior } = {}): void {
    const el = actionBarElement.value;
    if (!el) return;
    const container = scrollContainer?.value;
    const elTop = getElementScrollTop({
      element: el,
      scrollContainer: container,
    });
    scrollTo({
      top: elTop - getHeaderHeight(),
      behavior,
      scrollContainer: container,
    });
  }

  const opinionState = useOpinionListState({
    conversationSlugId: () =>
      getSingleRouteParam(
        "postSlugId" in route.params ? route.params.postSlugId : undefined
      ),
    metadata: () => conversationData.value?.metadata,
    routeContext: routeContextValue,
    enabled: () => currentTab.value === "comment",
  });
  const commentFilter = opinionState.filter;

  async function selectCommentFilter(
    filter: CommentFilterOptions
  ): Promise<void> {
    opinionState.selectFilter(filter);
    await router.replace({
      path: route.path,
      hash: route.hash,
      query: { ...route.query, opinion: undefined, filter },
    });
  }

  // Provide state and functions to child routes
  provide("refreshConversation", async () => {
    await conversationQuery.refetch();
  });
  provide("setCurrentTabLoading", (loading: boolean) => {
    isCurrentTabLoading.value = loading;
  });
  provide("scrollToActionBar", scrollToActionBar);
  provide("getScrollPosition", () => getCurrentScrollPosition());
  provide(
    "scrollToPosition",
    ({ top, behavior }: { top: number; behavior?: ScrollBehavior }) =>
      scrollTo({
        top,
        behavior,
        scrollContainer: scrollContainerRef.value,
      })
  );

  // Navigation functions for banner actions (parameterized by route prefix)
  function navigateToAnalysis({
    initialTab,
  }: { initialTab?: ShortcutItem } = {}) {
    const data = conversationData.value;
    if (data === undefined) return;

    pendingScrollOverride.value = true;
    void router.push({
      path: getConversationAnalysisPath({
        conversationSlugId: data.metadata.conversationSlugId,
        routeContext: routeContextValue.value,
      }),
      query: initialTab ? { tab: initialTab } : undefined,
    });
  }

  function navigateToCommentTab() {
    const data = conversationData.value;
    if (data === undefined) return;

    // Invalidate comments cache to ensure fresh data when user navigates
    void invalidateComments(data.metadata.conversationSlugId);

    void router.replace(
      getConversationPath({
        conversationSlugId: data.metadata.conversationSlugId,
        routeContext: routeContextValue.value,
      })
    );
  }

  function navigateToDiscoverTab() {
    const data = conversationData.value;
    if (data === undefined) return;

    opinionState.selectFilter("discover");

    // Invalidate comments cache to ensure fresh data when user navigates
    void invalidateComments(data.metadata.conversationSlugId);

    pendingScrollOverride.value = true;

    // Push (not back/replace) so the analysis entry stays in history.
    // Back from the comment tab will return to analysis at its saved position.
    void router.push(
      getConversationPath({
        conversationSlugId: data.metadata.conversationSlugId,
        routeContext: routeContextValue.value,
      })
    );
  }

  function onViewAnalysis() {
    navigateToAnalysis({ initialTab: "Me" });
  }

  // Sync currentTab with route
  watch(
    () => route.name,
    (newRouteName) => {
      if (
        newRouteName === analysisRouteName ||
        reportRouteNames.some((name) => name === newRouteName)
      ) {
        currentTab.value = "analysis";
      } else if (commentRouteNames.some((name) => name === newRouteName)) {
        currentTab.value = "comment";
      }
    },
    { immediate: true }
  );

  function openModerationHistory(): void {
    opinionState.selectFilter("moderated");
    if (currentTab.value !== "comment") {
      navigateToCommentTab();
    } else {
      void selectCommentFilter("moderated");
    }
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
    const slugId = conversationData.value?.metadata.conversationSlugId;
    if (slugId === undefined) {
      return;
    }

    const handler = submittedCommentHandler.value;
    if (
      (currentTab.value === "comment" || data.kind === "edited") &&
      handler !== undefined
    ) {
      await handler(data);
      if (currentTab.value === "comment") return;
    }

    invalidateComments(slugId);
    markAnalysisAsStale(slugId);

    if (data.needsCacheRefresh) {
      await loadAuthenticatedModules();
    }

    if (currentTab.value !== "comment") {
      opinionState.selectFilter("discover");
      pendingScrollOverride.value = true;
      await router.push(
        getConversationCommentRoute({
          conversationSlugId: slugId,
          routeContext: routeContextValue.value,
          query:
            data.kind === "edited"
              ? undefined
              : { opinion: data.displayedOpinionItem.opinionSlugId },
        })
      );
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
    conversationDisplayContent,
    hasConversationData,
    loadedConversationData,
    loadedConversationDisplayContent,
    currentTab,
    editingTarget,
    editingOpinion,
    beginEditOpinion,
    finishEditOpinion,
    handleEditedOpinion,
    isCurrentTabLoading,
    opinionState,
    commentFilter,
    selectCommentFilter,
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
    scrollContainer,
  };
}
