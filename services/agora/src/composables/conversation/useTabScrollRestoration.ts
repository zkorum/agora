import {
  getHeaderHeight,
  getScrollTop,
  getViewportHeight,
  scrollTo,
} from "src/utils/html/scroll";
import { onScopeDispose, type Ref, ref, watch } from "vue";
import { onBeforeRouteUpdate, useRoute } from "vue-router";

import { computeFloorScroll, createTabScrollState } from "./tabScrollLogic";

export function useTabScrollRestoration({
  analysisRouteName,
  pendingScrollOverride,
  actionBarElement,
  scrollContainer,
  onScrollComplete,
}: {
  analysisRouteName: string;
  pendingScrollOverride: Ref<boolean>;
  actionBarElement: Ref<HTMLElement | null>;
  scrollContainer?: Ref<HTMLElement | null>;
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

  // Track pending rAF IDs so they can be cancelled on unmount.
  // Without this, navigating away mid-animation leaves stale rAF callbacks
  // that call window.scrollTo() with the conversation's scroll position,
  // briefly shifting the feed before the browser corrects it.
  let outerRafId: number | undefined;
  let innerRafId: number | undefined;

  // Scroll to target with two-phase minHeight clearing to prevent scroll clamp.
  // Phase 1: scroll with minHeight still set, disable sticky bar transitions.
  // Phase 2 (rAF): clear minHeight, re-enable transitions, re-scroll after reflow.
  function scrollAndClearMinHeight({ target }: { target: number }): void {
    if (outerRafId !== undefined) cancelAnimationFrame(outerRafId);
    if (innerRafId !== undefined) cancelAnimationFrame(innerRafId);

    const container = scrollContainer?.value;
    const actionBar = actionBarElement?.value;
    if (actionBar) {
      actionBar.style.transition = "none";
    }

    scrollTo({ top: target, scrollContainer: container });

    outerRafId = requestAnimationFrame(() => {
      outerRafId = undefined;
      if (actionBar) {
        actionBar.style.transition = "";
      }
      tabContentStyle.value = {};
      innerRafId = requestAnimationFrame(() => {
        innerRafId = undefined;
        scrollTo({ top: target, scrollContainer: container });
        onScrollComplete?.();
      });
    });
  }

  onScopeDispose(() => {
    if (outerRafId !== undefined) cancelAnimationFrame(outerRafId);
    if (innerRafId !== undefined) cancelAnimationFrame(innerRafId);
  });

  watch(
    () => route.name,
    (newRouteName) => {
      if (pendingScrollOverride.value) {
        pendingScrollOverride.value = false;
        scrollAndClearMinHeight({ target: getFloorScroll() });
        return;
      }

      const target = state.getRestorationTarget({
        routeName: String(newRouteName),
        floorScroll: getFloorScroll(),
      });
      scrollAndClearMinHeight({ target });
    },
    { flush: "post" }
  );

  return { tabContentStyle };
}
