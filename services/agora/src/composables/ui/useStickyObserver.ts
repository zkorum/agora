import { useEventListener } from "@vueuse/core";
import { getHeaderHeight } from "src/utils/html/scroll";
import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  type Ref,
  ref,
  watchEffect,
} from "vue";

interface UseStickyObserverReturn {
  sentinelElement: Ref<HTMLElement | null>;
  isSticky: Ref<boolean>;
  headerHeight: Ref<number>;
  refresh: () => void;
}

/** Bind the sentinel immediately above the sticky element and use headerHeight for its CSS offset. */
export function useStickyObserver(): UseStickyObserverReturn {
  const sentinelElement = ref<HTMLElement | null>(null);
  const isSticky = ref(false);
  const headerHeight = ref(0);
  const supportsIntersectionObserver =
    typeof IntersectionObserver !== "undefined";
  const isActive = ref(false);
  let pendingFrame: number | undefined;

  function activate(): void {
    isActive.value = true;
  }

  function deactivate(): void {
    isActive.value = false;
    if (pendingFrame !== undefined) {
      window.cancelAnimationFrame(pendingFrame);
      pendingFrame = undefined;
    }
  }

  onMounted(activate);
  onActivated(activate);
  onDeactivated(deactivate);
  onBeforeUnmount(deactivate);

  watchEffect(
    (onCleanup) => {
      if (!isActive.value) return;
      refresh();
      const el = sentinelElement.value;
      if (el === null || !supportsIntersectionObserver) return;
      const height = headerHeight.value;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry === undefined || !isActive.value) return;
          // A sentinel below the viewport is not sticky.
          isSticky.value =
            !entry.isIntersecting && entry.boundingClientRect.top < height;
        },
        { rootMargin: `-${height}px 0px 0px 0px` }
      );
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    },
    { flush: "post" }
  );

  const eventTarget = () =>
    isActive.value && sentinelElement.value !== null ? window : undefined;
  const fallbackTarget = () =>
    supportsIntersectionObserver ? undefined : eventTarget();
  // Capture includes nested scroll containers; measure at most once per frame.
  useEventListener(fallbackTarget, "scroll", scheduleRefresh, {
    capture: true,
    passive: true,
  });
  useEventListener(eventTarget, "resize", scheduleRefresh);

  function scheduleRefresh(): void {
    pendingFrame ??= window.requestAnimationFrame(() => {
      pendingFrame = undefined;
      refresh();
    });
  }

  function refresh(): void {
    if (!isActive.value) return;
    headerHeight.value = getHeaderHeight();
    const el = sentinelElement.value;
    isSticky.value =
      el !== null && el.getBoundingClientRect().top < headerHeight.value;
  }

  return { sentinelElement, isSticky, headerHeight, refresh };
}
