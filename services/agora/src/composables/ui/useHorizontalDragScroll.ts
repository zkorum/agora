import {
  computed,
  type ComputedRef,
  onDeactivated,
  onScopeDispose,
  type Ref,
  ref,
  watch,
} from "vue";

import {
  getHorizontalDragScrollLeft,
  getHorizontalScrollMax,
  hasHorizontalDragExceededThreshold,
} from "./horizontalDragScrollLogic";

type HorizontalDragState = {
  pointerId: number;
  startClientX: number;
  startScrollLeft: number;
  hasMoved: boolean;
};

interface UseHorizontalDragScrollReturn {
  isDragging: ComputedRef<boolean>;
  handlePointerDown: (event: PointerEvent) => void;
  handleClickCapture: (event: MouseEvent) => void;
}

const defaultDragThresholdPx = 4;

export function useHorizontalDragScroll({
  scrollContainer,
  dragThresholdPx = defaultDragThresholdPx,
}: {
  scrollContainer: Ref<HTMLElement | null>;
  dragThresholdPx?: number;
}): UseHorizontalDragScrollReturn {
  const dragState = ref<HorizontalDragState | undefined>(undefined);
  const shouldSuppressClick = ref(false);
  const isDragging = computed(() => dragState.value !== undefined);

  let hasWindowListeners = false;
  let suppressClickTimeout: number | undefined;

  function getMaxScrollLeft(element: HTMLElement): number {
    return getHorizontalScrollMax({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    });
  }

  function addWindowListeners(): void {
    if (hasWindowListeners) {
      return;
    }

    window.addEventListener("pointermove", handleWindowPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);
    window.addEventListener("lostpointercapture", handleWindowPointerEnd);
    window.addEventListener("blur", handleWindowBlur);
    hasWindowListeners = true;
  }

  function removeWindowListeners(): void {
    if (!hasWindowListeners) {
      return;
    }

    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerEnd);
    window.removeEventListener("pointercancel", handleWindowPointerEnd);
    window.removeEventListener("lostpointercapture", handleWindowPointerEnd);
    window.removeEventListener("blur", handleWindowBlur);
    hasWindowListeners = false;
  }

  function capturePointer({
    element,
    pointerId,
  }: {
    element: HTMLElement;
    pointerId: number;
  }): void {
    if (
      typeof element.setPointerCapture !== "function" ||
      typeof element.hasPointerCapture !== "function" ||
      element.hasPointerCapture(pointerId)
    ) {
      return;
    }

    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Window listeners continue the drag if capture is unavailable mid-event.
    }
  }

  function releasePointerCapture({
    element,
    pointerId,
  }: {
    element: HTMLElement;
    pointerId: number;
  }): void {
    if (
      typeof element.releasePointerCapture !== "function" ||
      typeof element.hasPointerCapture !== "function" ||
      !element.hasPointerCapture(pointerId)
    ) {
      return;
    }

    element.releasePointerCapture(pointerId);
  }

  function clearDragState({
    releaseElement = scrollContainer.value,
  }: {
    releaseElement?: HTMLElement | null;
  } = {}): HorizontalDragState | undefined {
    const previousState = dragState.value;
    if (
      previousState !== undefined &&
      releaseElement !== undefined &&
      releaseElement !== null
    ) {
      releasePointerCapture({
        element: releaseElement,
        pointerId: previousState.pointerId,
      });
    }

    dragState.value = undefined;
    removeWindowListeners();
    return previousState;
  }

  function suppressNextClick(): void {
    shouldSuppressClick.value = true;
    if (suppressClickTimeout !== undefined) {
      window.clearTimeout(suppressClickTimeout);
    }

    suppressClickTimeout = window.setTimeout(() => {
      shouldSuppressClick.value = false;
      suppressClickTimeout = undefined;
    }, 0);
  }

  function clearSuppressedClick(): void {
    shouldSuppressClick.value = false;
    if (suppressClickTimeout !== undefined) {
      window.clearTimeout(suppressClickTimeout);
      suppressClickTimeout = undefined;
    }
  }

  function finishDrag({ pointerId }: { pointerId: number | undefined }): void {
    const currentDragState = dragState.value;
    if (
      currentDragState === undefined ||
      (pointerId !== undefined && currentDragState.pointerId !== pointerId)
    ) {
      return;
    }

    const previousState = clearDragState();
    if (previousState?.hasMoved === true) {
      suppressNextClick();
    }
  }

  function handlePointerDown(event: PointerEvent): void {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const element = scrollContainer.value;
    if (element === null || getMaxScrollLeft(element) === 0) {
      return;
    }

    clearDragState();
    dragState.value = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startScrollLeft: element.scrollLeft,
      hasMoved: false,
    };
    addWindowListeners();
  }

  function handleWindowPointerMove(event: PointerEvent): void {
    const currentDragState = dragState.value;
    if (
      currentDragState === undefined ||
      currentDragState.pointerId !== event.pointerId
    ) {
      return;
    }

    const element = scrollContainer.value;
    if (element === null) {
      clearDragState();
      return;
    }

    const hasMoved =
      currentDragState.hasMoved ||
      hasHorizontalDragExceededThreshold({
        startClientX: currentDragState.startClientX,
        currentClientX: event.clientX,
        thresholdPx: dragThresholdPx,
      });
    if (!hasMoved) {
      return;
    }

    event.preventDefault();
    capturePointer({ element, pointerId: event.pointerId });
    dragState.value = { ...currentDragState, hasMoved: true };
    element.scrollLeft = getHorizontalDragScrollLeft({
      startClientX: currentDragState.startClientX,
      currentClientX: event.clientX,
      startScrollLeft: currentDragState.startScrollLeft,
      maxScrollLeft: getMaxScrollLeft(element),
    });
  }

  function handleWindowPointerEnd(event: PointerEvent): void {
    finishDrag({ pointerId: event.pointerId });
  }

  function handleWindowBlur(): void {
    finishDrag({ pointerId: undefined });
  }

  function handleClickCapture(event: MouseEvent): void {
    if (!shouldSuppressClick.value) {
      return;
    }

    shouldSuppressClick.value = false;
    event.preventDefault();
    event.stopPropagation();
  }

  watch(scrollContainer, (element, previousElement) => {
    if (previousElement !== undefined && element !== previousElement) {
      clearDragState({ releaseElement: previousElement });
    }
  });

  onDeactivated(() => {
    clearDragState();
  });

  onScopeDispose(() => {
    clearDragState();
    clearSuppressedClick();
  });

  return { isDragging, handlePointerDown, handleClickCapture };
}
