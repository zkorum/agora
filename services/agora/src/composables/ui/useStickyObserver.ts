import { getHeaderHeight } from "src/utils/html/scroll";
import { onBeforeUnmount, onMounted, type Ref, ref, watch } from "vue";

interface UseStickyObserverReturn {
  sentinelElement: Ref<HTMLElement | null>;
  isSticky: Ref<boolean>;
  headerHeight: Ref<number>;
}

/**
 * Detects when an element becomes sticky below a fixed Quasar header.
 *
 * Bind `sentinelElement` to a zero-height `<div>` placed immediately above the
 * sticky element.  The composable measures the `q-header` height on mount and
 * watches the sentinel ref — when it appears (e.g. after a `v-if` renders),
 * an IntersectionObserver flips `isSticky` when the sentinel scrolls behind
 * the header.  Use `headerHeight` as a CSS variable (`--header-height`) on the
 * sticky element so `top` stays in sync.
 */
export function useStickyObserver(): UseStickyObserverReturn {
  const sentinelElement = ref<HTMLElement | null>(null);
  const isSticky = ref(false);
  const headerHeight = ref(0);
  let observer: IntersectionObserver | undefined;

  onMounted(() => {
    headerHeight.value = getHeaderHeight();
  });

  watch(sentinelElement, (el) => {
    observer?.disconnect();
    if (el) {
      if (headerHeight.value === 0) {
        headerHeight.value = getHeaderHeight();
      }
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            isSticky.value = false;
          } else {
            // Only sticky when sentinel scrolled ABOVE the header,
            // not when it's below the visible viewport (long content)
            isSticky.value = entry.boundingClientRect.top < headerHeight.value;
          }
        },
        { rootMargin: `-${headerHeight.value}px 0px 0px 0px` },
      );
      observer.observe(el);
    } else {
      isSticky.value = false;
    }
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });

  return { sentinelElement, isSticky, headerHeight };
}
