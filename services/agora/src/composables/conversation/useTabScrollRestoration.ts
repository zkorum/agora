import { type Ref, ref, watch } from "vue";
import { onBeforeRouteUpdate, useRoute } from "vue-router";

export function useTabScrollRestoration({
  analysisRouteName,
  pendingScrollOverride,
  sentinelElement,
  actionBarElement,
  scrollContainer,
}: {
  analysisRouteName: string;
  pendingScrollOverride: Ref<boolean>;
  sentinelElement: Ref<HTMLElement | null>;
  actionBarElement: Ref<HTMLElement | null>;
  scrollContainer?: Ref<HTMLElement | null>;
}) {
  const route = useRoute();
  const tabScrollPositions = new Map<string, number>();
  const tabContentStyle = ref<Record<string, string>>({});

  const getScrollTop = () => scrollContainer?.value?.scrollTop ?? window.scrollY;
  const getViewportHeight = () => scrollContainer?.value?.clientHeight ?? window.innerHeight;
  const doScrollTo = (top: number) => {
    const container = scrollContainer?.value;
    if (container) {
      container.scrollTo({ top });
    } else {
      window.scrollTo({ top });
    }
  };

  // Calculate floor scroll position using the sentinel element (non-sticky, stable position).
  // The sentinel sits right above the action bar and has no CSS transitions,
  // so its position is always accurate regardless of header reveal state.
  function getFloorScroll(): number {
    const sentinel = sentinelElement?.value;
    if (!sentinel) return 0;
    const headerEl = document.querySelector(".q-header");
    const headerOffset = headerEl?.clientHeight ?? 0;
    const container = scrollContainer?.value;
    if (container) {
      const sentinelTop =
        sentinel.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      return Math.max(0, sentinelTop - headerOffset);
    }
    return Math.max(0, sentinel.getBoundingClientRect().top + window.scrollY - headerOffset);
  }

  onBeforeRouteUpdate((_to, from) => {
    const fromTab =
      String(from.name) === analysisRouteName ? "analysis" : "comment";
    tabScrollPositions.set(fromTab, getScrollTop());
    // Prevent page shrink during KeepAlive swap (avoids scroll clamp → header reveal)
    tabContentStyle.value = {
      minHeight: `${getScrollTop() + getViewportHeight()}px`,
    };
  });

  watch(
    () => route.name,
    (newRouteName) => {
      if (pendingScrollOverride.value) {
        pendingScrollOverride.value = false;
        tabContentStyle.value = {};
        return;
      }

      const newTab =
        String(newRouteName) === analysisRouteName ? "analysis" : "comment";
      const saved = tabScrollPositions.get(newTab);

      // Disable CSS transition on sticky bar to prevent visual jitter
      // when --header-height changes during restoration
      const actionBar = actionBarElement?.value;
      if (actionBar) {
        actionBar.style.transition = "none";
      }

      // Calculate floor: sentinel's document position minus header height.
      // If saved position is below the floor, restore it; otherwise use the floor.
      const floorScroll = getFloorScroll();
      const target = Math.max(saved ?? 0, floorScroll);
      doScrollTo(target);

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
          doScrollTo(target);
        });
      });
    },
    { flush: "post" }
  );

  return { tabContentStyle };
}
