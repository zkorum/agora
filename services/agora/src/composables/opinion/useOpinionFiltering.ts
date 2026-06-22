import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, type ComputedRef, type Ref, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { z } from "zod";

export interface UseOpinionFilteringParams {
  preloadedQueries: {
    commentsDiscoverQuery: UseQueryReturnType<DisplayedOpinionItem[], Error>;
    commentsNewQuery: UseQueryReturnType<DisplayedOpinionItem[], Error>;
    commentsModeratedQuery: UseQueryReturnType<DisplayedOpinionItem[], Error>;
    hiddenCommentsQuery: UseQueryReturnType<DisplayedOpinionItem[], Error>;
    commentsMyVotesQuery: UseQueryReturnType<DisplayedOpinionItem[], Error>;
  };
}

export interface UseOpinionFilteringReturn {
  currentFilter: Ref<CommentFilterOptions>;
  activeQuery: ComputedRef<UseQueryReturnType<DisplayedOpinionItem[], Error>>;
  opinionsNew: ComputedRef<DisplayedOpinionItem[]>;
  opinionsDiscover: ComputedRef<DisplayedOpinionItem[]>;
  opinionsModerated: ComputedRef<DisplayedOpinionItem[]>;
  opinionsHidden: ComputedRef<DisplayedOpinionItem[]>;
  opinionsMyVotes: ComputedRef<DisplayedOpinionItem[]>;
  currentOpinionData: ComputedRef<DisplayedOpinionItem[]>;
  customIsEmpty: ComputedRef<boolean>;
  handleUserFilterChange: (filterValue: CommentFilterOptions) => void;
  getOpinionDataForFilter: (filter: CommentFilterOptions) => DisplayedOpinionItem[];
  handleRetryLoadComments: () => void;
}

export function useOpinionFiltering({
  preloadedQueries,
}: UseOpinionFilteringParams): UseOpinionFilteringReturn {
  const route = useRoute();

  // Initialize filter from route query parameter if present
  const initialFilter = getInitialFilterFromRoute(route);
  const currentFilter = ref<CommentFilterOptions>(initialFilter);

  // Use the preloaded queries directly
  const commentsNewQuery = preloadedQueries.commentsNewQuery;
  const commentsDiscoverQuery = preloadedQueries.commentsDiscoverQuery;
  const commentsModeratedQuery = preloadedQueries.commentsModeratedQuery;
  const hiddenCommentsQuery = preloadedQueries.hiddenCommentsQuery;
  const commentsMyVotesQuery = preloadedQueries.commentsMyVotesQuery;

  // Active query based on current filter
  const activeQuery = computed(() => {
    switch (currentFilter.value) {
      case "discover":
        return commentsDiscoverQuery;
      case "new":
        return commentsNewQuery;
      case "moderated":
        return commentsModeratedQuery;
      case "hidden":
        return hiddenCommentsQuery;
      case "my_votes":
        return commentsMyVotesQuery;
      default:
        return commentsDiscoverQuery;
    }
  });

  // Computed data from TanStack Query
  const opinionsNew = computed(
    (): DisplayedOpinionItem[] => commentsNewQuery.data.value ?? []
  );
  const opinionsDiscover = computed(
    (): DisplayedOpinionItem[] => commentsDiscoverQuery.data.value ?? []
  );
  const opinionsModerated = computed(
    (): DisplayedOpinionItem[] => commentsModeratedQuery.data.value ?? []
  );
  const opinionsHidden = computed(
    (): DisplayedOpinionItem[] => hiddenCommentsQuery.data.value ?? []
  );
  const opinionsMyVotes = computed(
    (): DisplayedOpinionItem[] => commentsMyVotesQuery.data.value ?? []
  );

  // Computed data source based on current filter
  const currentOpinionData = computed((): DisplayedOpinionItem[] =>
    getOpinionDataForFilter(currentFilter.value)
  );

  // Empty state logic: just check if data is absent/empty, regardless of query status.
  // This is safe because AsyncStateHandler checks error state first (before consulting isEmpty),
  // so error won't be confused with empty. This also ensures the loading spinner shows when
  // queries are pending with no cached data (e.g., after navigating back from edit page).
  const customIsEmpty = computed((): boolean => {
    const query = activeQuery.value;
    return !query.data.value || query.data.value.length === 0;
  });

  function getOpinionDataForFilter(
    filter: CommentFilterOptions
  ): DisplayedOpinionItem[] {
    switch (filter) {
      case "new":
        return opinionsNew.value;
      case "discover":
        return opinionsDiscover.value;
      case "hidden":
        return opinionsHidden.value;
      case "moderated":
        return opinionsModerated.value;
      case "my_votes":
        return opinionsMyVotes.value;
      default:
        return opinionsDiscover.value;
    }
  }

  // Auto-fetch lazy queries when they become active.
  // This catches ALL filter change paths: user clicks, programmatic changes
  // (openModerationHistory, onModeratedOpinionDetected), and route ?filter= params.
  // No isFetching guard: TanStack Query deduplicates concurrent fetches internally,
  // and the guard can fail during transient QueryObserver initialization states.
  watch(activeQuery, (query) => {
    if (!query.data.value || query.isStale.value) {
      void query.refetch();
    }
  }, { immediate: true });

  function handleUserFilterChange(filterValue: CommentFilterOptions): void {
    currentFilter.value = filterValue;

    const targetQuery = getQueryForFilter(filterValue);
    // Always refetch "My Votes" to show latest voting state (e.g., after cancelling votes).
    // For other lazy queries, refetch if no data loaded yet to ensure switching tabs
    // always loads data (guards against watch race conditions with TanStack Query).
    if (
      filterValue === "my_votes" ||
      !targetQuery.data.value ||
      targetQuery.isStale.value
    ) {
      void targetQuery.refetch();
    }
  }

  // Helper function to get query object for a given filter
  function getQueryForFilter(
    filter: CommentFilterOptions
  ): UseQueryReturnType<DisplayedOpinionItem[], Error> {
    switch (filter) {
      case "discover":
        return commentsDiscoverQuery;
      case "new":
        return commentsNewQuery;
      case "moderated":
        return commentsModeratedQuery;
      case "hidden":
        return hiddenCommentsQuery;
      case "my_votes":
        return commentsMyVotesQuery;
      default:
        return commentsDiscoverQuery;
    }
  }

  // Handle manual retry for failed API calls
  function handleRetryLoadComments(): void {
    switch (currentFilter.value) {
      case "discover":
        void commentsDiscoverQuery.refetch();
        break;
      case "new":
        void commentsNewQuery.refetch();
        break;
      case "moderated":
        void commentsModeratedQuery.refetch();
        break;
      case "hidden":
        void hiddenCommentsQuery.refetch();
        break;
      case "my_votes":
        void commentsMyVotesQuery.refetch();
        break;
      default:
        void commentsDiscoverQuery.refetch();
        break;
    }
  }

  return {
    currentFilter,
    activeQuery,
    opinionsNew,
    opinionsDiscover,
    opinionsModerated,
    opinionsHidden,
    opinionsMyVotes,
    currentOpinionData,
    customIsEmpty,
    handleUserFilterChange,
    getOpinionDataForFilter,
    handleRetryLoadComments,
  };
}

/**
 * Zod schema for validating CommentFilterOptions
 */
const CommentFilterOptionsSchema = z.enum([
  "new",
  "moderated",
  "hidden",
  "discover",
  "my_votes",
]);

/**
 * Get initial filter from route query parameter using zod for type-safe parsing
 */
function getInitialFilterFromRoute(
  route: ReturnType<typeof useRoute>
): CommentFilterOptions {
  const filterParam = route.query.filter;

  // Use zod to safely parse the filter parameter
  const parseResult = CommentFilterOptionsSchema.safeParse(filterParam);

  if (parseResult.success) {
    return parseResult.data;
  }

  return "discover"; // Default filter
}
