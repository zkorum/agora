import { computed, ref, type Ref, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import type { OpinionItem } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import {
  useCommentsQuery,
  useHiddenCommentsQuery,
} from "src/utils/api/comment/useCommentQueries";
import type { UseQueryReturnType } from "@tanstack/vue-query";

export interface UseOpinionFilteringParams {
  conversationSlugId: string;
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
  conversationSlugId,
}: UseOpinionFilteringParams): UseOpinionFilteringReturn {
  const { profileData } = storeToRefs(useUserStore());
  const currentFilter = ref<CommentFilterOptions>("discover");

  // TanStack Query hooks for different comment filters
  const commentsNewQuery = useCommentsQuery({
    conversationSlugId,
    filter: "new",
    enabled: true,
  });

  const commentsDiscoverQuery = useCommentsQuery({
    conversationSlugId,
    filter: "discover",
    enabled: true,
  });

  const commentsModeratedQuery = useCommentsQuery({
    conversationSlugId,
    filter: "moderated",
    enabled: true,
  });

  const hiddenCommentsQuery = useHiddenCommentsQuery({
    conversationSlugId,
    enabled: profileData.value.isModerator,
  });

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
    (): OpinionItem[] => commentsNewQuery.data.value || []
  );
  const opinionsDiscover = computed(
    (): OpinionItem[] => commentsDiscoverQuery.data.value || []
  );
  const opinionsModerated = computed(
    (): OpinionItem[] => commentsModeratedQuery.data.value || []
  );
  const opinionsHidden = computed(
    (): OpinionItem[] => hiddenCommentsQuery.data.value || []
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
