import { type Ref, ref, watch } from "vue";
import { onBeforeRouteUpdate, useRoute } from "vue-router";

export function useTabScrollRestoration({
  analysisRouteName,
  pendingScrollOverride,
  scrollToActionBar,
  scrollContainer,
}: {
  analysisRouteName: string;
  pendingScrollOverride: Ref<boolean>;
  scrollToActionBar: (options?: { behavior?: ScrollBehavior }) => void;
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
        return;
      }

      const newTab =
        String(newRouteName) === analysisRouteName ? "analysis" : "comment";
      const saved = tabScrollPositions.get(newTab);

      // Never scroll up: use the deepest of saved and current position.
      // scrollToActionBar() then ensures we're at least at the sticky threshold.
      const target = Math.max(saved ?? 0, getScrollTop());
      doScrollTo(target);
      scrollToActionBar();
      // Release height lock after scroll handling
      tabContentStyle.value = {};
    },
    { flush: "post" }
  );

  return { tabContentStyle };
}
