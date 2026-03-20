import {
  getHeaderHeight,
  getScrollTop,
  getViewportHeight,
  scrollTo,
} from "src/utils/html/scroll";
import { type Ref, ref, watch } from "vue";
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

  // Cache floor scroll — offsetTop is unreliable on sticky elements (returns
  // sticky position, not flow position). Compute once when element first
  // renders at scroll 0 (not sticky), then reuse the cached value.
  let cachedFloorScroll: number | undefined;

  watch(actionBarElement, (el) => {
    if (el && cachedFloorScroll === undefined) {
      cachedFloorScroll = computeFloorScroll({
        elementTop: el.offsetTop,
        headerHeight: getHeaderHeight(),
      });
    }
  });

  function getFloorScroll(): number {
    return cachedFloorScroll ?? 0;
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

      // Disable CSS transition on sticky bar to prevent visual jitter
      // when --header-height changes during restoration
      const actionBar = actionBarElement?.value;
      if (actionBar) {
        actionBar.style.transition = "none";
      }

      scrollTo({ top: target, scrollContainer: container });

      // Clear the minHeight lock, then re-assert scroll position.
      // The minHeight was set high (departing tab's scroll + viewport) to prevent
      // page shrink during KeepAlive swap. Clearing it may cause the page to
      // shrink below the target scroll position. The second rAF ensures the
      // browser has reflowed after minHeight removal, then re-scrolls.
      requestAnimationFrame(() => {
        if (actionBar) {
          actionBar.style.transition = "";
        }
        tabContentStyle.value = {};
        requestAnimationFrame(() => {
          scrollTo({ top: target, scrollContainer: container });
          onScrollComplete?.();
        });
      });
    },
    { flush: "post" }
  );

  return { tabContentStyle };
}
