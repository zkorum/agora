import { defineStore } from "pinia";
import { OpinionItem } from "src/shared/types/zod";
import { ref } from "vue";

export const useOpinionScrollableStore = defineStore(
  "opinionScrollable",
  () => {
    const opinionItemListFull = ref<OpinionItem[]>([]);
    const opinionItemListPartial = ref<OpinionItem[]>([]);

    const hasMore = ref(true);

    function loadMore() {
      const endSliceIndex = Math.min(
        opinionItemListPartial.value.length + 5,
        opinionItemListFull.value.length
      );

      if (endSliceIndex == opinionItemListFull.value.length) {
        hasMore.value = false;
      }

      const slicedList = opinionItemListFull.value.slice(
        opinionItemListPartial.value.length,
        endSliceIndex
      );

      opinionItemListPartial.value =
        opinionItemListPartial.value.concat(slicedList);
    }

    function setupOpinionlist(opinionListFull: OpinionItem[]) {
      opinionItemListPartial.value = [];
      opinionItemListFull.value = opinionListFull;
      hasMore.value = true;
      loadMore();
    }

    return {
      setupOpinionlist,
      loadMore,
      opinionItemListPartial,
      hasMore,
    };
  }
);
