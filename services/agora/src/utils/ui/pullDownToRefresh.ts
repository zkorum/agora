import { useScroll, useSwipe } from "@vueuse/core";
import { ref, ShallowRef, watch } from "vue";

export const usePullDownToRefresh = (
  emitTriggeredCallback: () => void,
  el: ShallowRef<HTMLElement | null>
) => {
  const loadingVisible = ref(false);

  const containerScroll = useScroll(el);
  const containerSwipe = useSwipe(el);

  watch(containerSwipe.isSwiping, async () => {
    if (
      containerScroll.y.value == 0 &&
      containerSwipe.direction.value == "down"
    ) {
      loadingVisible.value = true;
      setTimeout(() => {
        loadingVisible.value = false;
      }, 500);
      emitTriggeredCallback();
    }
  });

  return { loadingVisible };
};
