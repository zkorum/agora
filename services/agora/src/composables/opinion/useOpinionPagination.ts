import { watch, type Ref, type ComputedRef } from "vue";
import type { OpinionItem } from "src/shared/types/zod";
import { useComputedPagination } from "src/composables/ui/useComputedPagination";

export interface UseOpinionPaginationParams {
  currentOpinionData: ComputedRef<OpinionItem[]>;
  currentFilter: Ref<string>;
  isComponentMounted: Ref<boolean>;
  targetOpinion: Ref<OpinionItem | null>;
}

export interface UseOpinionPaginationReturn {
  visibleOpinions: ComputedRef<OpinionItem[]>;
  hasMore: ComputedRef<boolean>;
  loadMore: () => void;
  resetPagination: () => void;
  triggerLoadMore: () => void;
  onLoad: (index: number, done: () => void) => void;
}

export function useOpinionPagination({
  currentOpinionData,
  currentFilter,
  isComponentMounted,
  targetOpinion,
}: UseOpinionPaginationParams): UseOpinionPaginationReturn {
  // Use computed pagination for infinite scrolling
  const {
    visibleItems: visibleOpinions,
    hasMore,
    loadMore,
    resetPagination,
  } = useComputedPagination(currentOpinionData);

  // Watch for filter changes to reset pagination
  watch(currentFilter, () => {
    if (!isComponentMounted.value) {
      return;
    }

    // Reset target opinion when filter changes
    targetOpinion.value = null;

    // Reset pagination to start from the beginning
    resetPagination();
  });

  // Handle infinite scroll load event
  function onLoad(index: number, done: () => void): void {
    loadMore();
    done();
  }

  // Expose load more functionality for parent component
  function triggerLoadMore(): void {
    loadMore();
  }

  return {
    visibleOpinions,
    hasMore,
    loadMore,
    resetPagination,
    triggerLoadMore,
    onLoad,
  };
}
