import { ref, type Ref } from "vue";
import type { OpinionItem } from "src/shared/types/zod";

const PAGINATION_BATCH_SIZE = 10;

export function useOpinionScrollable() {
  const allOpinions = ref<OpinionItem[]>([]);
  const visibleOpinions = ref<OpinionItem[]>([]);
  const hasMore = ref(true);

  function loadMore() {
    const endSliceIndex = Math.min(
      visibleOpinions.value.length + PAGINATION_BATCH_SIZE,
      allOpinions.value.length
    );

    if (endSliceIndex === allOpinions.value.length) {
      hasMore.value = false;
    }

    const slicedList = allOpinions.value.slice(
      visibleOpinions.value.length,
      endSliceIndex
    );

    visibleOpinions.value = visibleOpinions.value.concat(slicedList);
  }

  function initializeOpinionList(
    fullOpinionList: OpinionItem[],
    priorityOpinionSlugId?: string
  ) {
    visibleOpinions.value = [];
    allOpinions.value = [...fullOpinionList];
    hasMore.value = true;

    // Move specific opinion to front if specified
    if (priorityOpinionSlugId && priorityOpinionSlugId.length > 0) {
      const moveIndex = allOpinions.value.findIndex(
        (opinion) => opinion.opinionSlugId === priorityOpinionSlugId
      );

      if (moveIndex > 0) {
        const [priorityOpinion] = allOpinions.value.splice(moveIndex, 1);
        allOpinions.value.unshift(priorityOpinion);
      }
    }

    loadMore();
  }

  function resetPagination() {
    visibleOpinions.value = [];
    hasMore.value = true;
  }

  return {
    // State
    allOpinions: allOpinions as Ref<OpinionItem[]>,
    visibleOpinions: visibleOpinions as Ref<OpinionItem[]>,
    hasMore: hasMore,

    // Actions
    loadMore,
    initializeOpinionList,
    resetPagination,
  };
}
