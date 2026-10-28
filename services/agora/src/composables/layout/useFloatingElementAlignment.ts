import {
  defaultWindow,
  useEventListener,
  useMutationObserver,
  useRafFn,
  useResizeObserver,
} from "@vueuse/core";
import { computed, type CSSProperties, shallowRef, watch } from "vue";

export function useFloatingElementAlignment({
  anchor,
  enabled,
}: {
  anchor: () => HTMLElement | null | undefined;
  enabled: () => boolean;
}) {
  const activeAnchor = computed(() => (enabled() ? anchor() : undefined));
  const bounds = shallowRef<{ left: number; width: number }>();
  const { resume: scheduleMeasurement, pause: cancelMeasurement } = useRafFn(
    () => {
      const rect = activeAnchor.value?.getBoundingClientRect();
      if (rect === undefined || rect.width === 0) {
        bounds.value = undefined;
      } else if (
        rect.left !== bounds.value?.left ||
        rect.width !== bounds.value.width
      ) {
        bounds.value = { left: rect.left, width: rect.width };
      }
    },
    { immediate: false, once: true }
  );

  // A capped-width anchor can move when an ancestor changes size or padding
  // without resizing itself, for example after a responsive drawer update.
  const layoutElements = computed(() => {
    const elements: HTMLElement[] = [];
    let element = activeAnchor.value;
    while (element !== undefined && element !== null) {
      elements.push(element);
      element = element.parentElement;
    }
    return elements;
  });
  useResizeObserver(layoutElements, scheduleMeasurement);
  useMutationObserver(layoutElements, scheduleMeasurement, {
    attributes: true,
    attributeFilter: ["style", "class", "dir"],
  });
  useEventListener(
    layoutElements,
    ["transitionend", "transitioncancel"],
    scheduleMeasurement,
    { passive: true }
  );
  useEventListener(
    () => (activeAnchor.value ? defaultWindow : undefined),
    "resize",
    scheduleMeasurement,
    { passive: true }
  );
  watch(
    activeAnchor,
    (element) => {
      cancelMeasurement();
      bounds.value = undefined;
      if (element) scheduleMeasurement();
    },
    { immediate: true, flush: "post" }
  );

  return computed<CSSProperties>(() => {
    const measured = bounds.value;
    if (measured === undefined) return { visibility: "hidden" };
    // DOM bounds are physical viewport coordinates in both LTR and RTL.
    return { left: `${measured.left}px`, width: `${measured.width}px` };
  });
}
