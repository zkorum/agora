import { ref, type Ref } from "vue";
import type { OpinionItem } from "src/shared/types/zod";

const PAGINATION_BATCH_SIZE = 10;

export function useOpinionScrollable() {
  const opinionItemListFull = ref<OpinionItem[]>([]);
  const opinionItemListPartial = ref<OpinionItem[]>([]);
  const hasMore = ref(true);

  function loadMore() {
    const endSliceIndex = Math.min(
      opinionItemListPartial.value.length + PAGINATION_BATCH_SIZE,
      opinionItemListFull.value.length
    );

    if (endSliceIndex === opinionItemListFull.value.length) {
      hasMore.value = false;
    }

    const slicedList = opinionItemListFull.value.slice(
      opinionItemListPartial.value.length,
      endSliceIndex
    );

    opinionItemListPartial.value =
      opinionItemListPartial.value.concat(slicedList);
  }

  function setupOpinionList(
    opinionListFull: OpinionItem[],
    priorityOpinionSlugId?: string
  ) {
    opinionItemListPartial.value = [];
    opinionItemListFull.value = [...opinionListFull];
    hasMore.value = true;

    // Move specific opinion to front if specified
    if (priorityOpinionSlugId && priorityOpinionSlugId.length > 0) {
      const moveIndex = opinionItemListFull.value.findIndex(
        (opinion) => opinion.opinionSlugId === priorityOpinionSlugId
      );

      if (moveIndex > 0) {
        const [priorityOpinion] = opinionItemListFull.value.splice(
          moveIndex,
          1
        );
        opinionItemListFull.value.unshift(priorityOpinion);
      }
    }

    loadMore();
  }

  function resetPagination() {
    opinionItemListPartial.value = [];
    hasMore.value = true;
  }

  return {
    // State
    opinionItemListFull: opinionItemListFull as Ref<OpinionItem[]>,
    opinionItemListPartial: opinionItemListPartial as Ref<OpinionItem[]>,
    hasMore: hasMore,

    // Actions
    loadMore,
    setupOpinionList,
    resetPagination,
  };
}
