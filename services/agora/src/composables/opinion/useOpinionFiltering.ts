import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { OpinionItem } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, type ComputedRef, type Ref, ref } from "vue";
import { useRoute } from "vue-router";
import { z } from "zod";

export interface UseOpinionFilteringParams {
  preloadedQueries: {
    commentsDiscoverQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsNewQuery: UseQueryReturnType<OpinionItem[], Error>;
    commentsModeratedQuery: UseQueryReturnType<OpinionItem[], Error>;
    hiddenCommentsQuery: UseQueryReturnType<OpinionItem[], Error>;
  };
}

export interface UseOpinionFilteringReturn {
  currentFilter: Ref<CommentFilterOptions>;
  activeQuery: ComputedRef<UseQueryReturnType<OpinionItem[], Error>>;
  opinionsNew: ComputedRef<OpinionItem[]>;
  opinionsDiscover: ComputedRef<OpinionItem[]>;
  opinionsModerated: ComputedRef<OpinionItem[]>;
  opinionsHidden: ComputedRef<OpinionItem[]>;
  currentOpinionData: ComputedRef<OpinionItem[]>;
  customIsEmpty: ComputedRef<boolean>;
  handleUserFilterChange: (filterValue: CommentFilterOptions) => void;
  getOpinionDataForFilter: (filter: CommentFilterOptions) => OpinionItem[];
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
      default:
        return commentsDiscoverQuery;
    }
  });

  // Computed data from TanStack Query
  const opinionsNew = computed(
    (): OpinionItem[] => commentsNewQuery.data.value ?? []
  );
  const opinionsDiscover = computed(
    (): OpinionItem[] => commentsDiscoverQuery.data.value ?? []
  );
  const opinionsModerated = computed(
    (): OpinionItem[] => commentsModeratedQuery.data.value ?? []
  );
  const opinionsHidden = computed(
    (): OpinionItem[] => hiddenCommentsQuery.data.value ?? []
  );

  // Computed data source based on current filter
  const currentOpinionData = computed((): OpinionItem[] =>
    getOpinionDataForFilter(currentFilter.value)
  );

  // Simplified empty state logic that works directly with TanStack Query
  const customIsEmpty = computed((): boolean => {
    const query = activeQuery.value;

    // Only show empty state if query succeeded but returned no data
    if (
      query.isSuccess.value &&
      (!query.data.value || query.data.value.length === 0)
    ) {
      return true;
    }

    // Always use TanStack Query data for empty check - no race conditions
    return false;
  });

  function getOpinionDataForFilter(
    filter: CommentFilterOptions
  ): OpinionItem[] {
    switch (filter) {
      case "new":
        return opinionsNew.value;
      case "discover":
        return opinionsDiscover.value;
      case "hidden":
        return opinionsHidden.value;
      case "moderated":
        return opinionsModerated.value;
      default:
        return opinionsDiscover.value;
    }
  }

  function handleUserFilterChange(filterValue: CommentFilterOptions): void {
    currentFilter.value = filterValue;
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
