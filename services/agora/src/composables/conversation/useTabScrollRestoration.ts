import {
  getElementScrollTop,
  getHeaderHeight,
  getScrollTop,
  getViewportHeight,
  scrollTo,
} from "src/utils/html/scroll";
import { nextTick, type Ref, ref, watch } from "vue";
import { onBeforeRouteUpdate, useRoute } from "vue-router";

import { computeFloorScroll, createTabScrollState } from "./tabScrollLogic";

export function useTabScrollRestoration({
  analysisRouteName,
  pendingScrollOverride,
  actionBarElement,
  scrollContainer,
  onScrollOverride,
  onScrollComplete,
}: {
  analysisRouteName: string;
  pendingScrollOverride: Ref<boolean>;
  actionBarElement: Ref<HTMLElement | null>;
  scrollContainer?: Ref<HTMLElement | null>;
  onScrollOverride?: () => void;
  onScrollComplete?: () => void;
}) {
  const route = useRoute();
  const state = createTabScrollState({ analysisRouteName });
  const tabContentStyle = ref<Record<string, string>>({});

  function getFloorScroll(): number {
    const actionBar = actionBarElement?.value;
    if (!actionBar) return 0;
    const actionBarTop = getElementScrollTop({
      element: actionBar,
      scrollContainer: scrollContainer?.value,
    });
    return computeFloorScroll({ elementTop: actionBarTop, headerHeight: getHeaderHeight() });
  }

  onBeforeRouteUpdate((_to, from) => {
    const container = scrollContainer?.value;
    const { minHeight } = state.savePosition({
      routeName: String(from.name),
      currentScroll: getScrollTop({ scrollContainer: container }),
      viewportHeight: getViewportHeight({ scrollContainer: container }),
    });
    // Prevent page shrink during KeepAlive swap (avoids scroll clamp → header reveal)
    tabContentStyle.value = { minHeight };
  });

  watch(
    () => route.name,
    (newRouteName) => {
      if (pendingScrollOverride.value) {
        pendingScrollOverride.value = false;
        tabContentStyle.value = {};
        if (onScrollOverride) {
          requestAnimationFrame(() => {
            onScrollOverride();
            onScrollComplete?.();
          });
        } else {
          onScrollComplete?.();
        }
        return;
      }

      const container = scrollContainer?.value;
      const target = state.getRestorationTarget({
        routeName: String(newRouteName),
        floorScroll: getFloorScroll(),
      });

      // Ensure minHeight supports the arriving tab's target scroll.
      // onBeforeRouteUpdate set minHeight based on departing scroll, but
      // the arriving tab may need a taller page.
      const viewportHeight = getViewportHeight({ scrollContainer: container });
      tabContentStyle.value = { minHeight: `${target + viewportHeight}px` };

      // Disable CSS transition on sticky bar to prevent visual jitter
      const actionBar = actionBarElement?.value;
      if (actionBar) {
        actionBar.style.transition = "none";
      }

      // Wait for Vue to apply the updated minHeight, then scroll.
      void nextTick(() => {
        scrollTo({ top: target, scrollContainer: container });

        // Clear minHeight lock and re-assert scroll in one paint.
        requestAnimationFrame(() => {
          if (actionBar) {
            actionBar.style.transition = "";
          }
          tabContentStyle.value = {};
          void nextTick(() => {
            scrollTo({ top: target, scrollContainer: container });
            onScrollComplete?.();
          });
        });
      });
    },
    { flush: "post" }
  );

  return { tabContentStyle };
}
