import { ref, computed, type ComputedRef } from "vue";

const PAGINATION_BATCH_SIZE = 5;

export function useComputedPagination<T>(dataSource: ComputedRef<T[]>) {
  const visibleItemCount = ref(PAGINATION_BATCH_SIZE);

  const visibleItems = computed(() => {
    const data = dataSource.value;
    return data.slice(0, visibleItemCount.value);
  });

  const hasMore = computed(() => {
    const data = dataSource.value;
    return visibleItemCount.value < data.length;
  });

  function loadMore(): void {
    const data = dataSource.value;
    const nextCount = Math.min(
      visibleItemCount.value + PAGINATION_BATCH_SIZE,
      data.length
    );
    visibleItemCount.value = nextCount;
  }

  function resetPagination(): void {
    visibleItemCount.value = PAGINATION_BATCH_SIZE;
  }

  return {
    // State
    visibleItems: visibleItems,
    hasMore,

    // Actions
    loadMore,
    resetPagination,
  };
}
