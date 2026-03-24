import type { Ref } from "vue";
import { inject, nextTick, onActivated, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { z } from "zod";

import { createSubtabScrollState } from "./subtabScrollLogic";

export function useTabNavigation<T extends string>({
    schema,
    defaultTab,
}: {
    schema: z.ZodType<T>;
    defaultTab: T;
}): {
    currentTab: Ref<T>;
    handleSameTabClick: () => void;
    switchToTab: (tab: T) => void;
} {
    const route = useRoute();
    const router = useRouter();

    const scrollToActionBar = inject<
        (options?: { behavior?: ScrollBehavior }) => void
    >("scrollToActionBar", () => {
        /* noop */
    });

    const getScrollPosition = inject<() => number>(
        "getScrollPosition",
        () => 0,
    );

    const scrollToPosition = inject<
        (params: { top: number; behavior?: ScrollBehavior }) => void
    >("scrollToPosition", () => {
        /* noop */
    });

    const subtabScroll = createSubtabScrollState<T>();

    const initialTab = schema.safeParse(route.query.tab);
    const currentTab: Ref<T> = shallowRef(
        initialTab.success ? initialTab.data : defaultTab,
    );

    // Guard: skip URL sync and scroll when currentTab changes from route-driven sync
    let syncingFromRoute = false;

    // Flag: when true, the next tab change scrolls to action bar
    // (used by "View More" / programmatic switchToTab)
    let explicitNavigation = false;

    // Sync URL → currentTab on KeepAlive reactivation only.
    // Using onActivated (not a watch on route.query.tab) to avoid firing
    // when navigating AWAY from this tab, which would reset currentTab.
    let isFirstActivation = true;
    onActivated(() => {
        if (isFirstActivation) {
            isFirstActivation = false;
            return;
        }
        // Only sync from route if an explicit ?tab= param is present.
        // Without it (normal tab switch back), KeepAlive already preserves currentTab.
        if (route.query.tab === undefined) return;
        const parsed = schema.safeParse(route.query.tab);
        const targetTab = parsed.success ? parsed.data : defaultTab;
        if (currentTab.value !== targetTab) {
            syncingFromRoute = true;
            currentTab.value = targetTab;
        }
    });

    // Sync: currentTab → URL + scroll (skipped during route-driven sync)
    watch(currentTab, (newTab, oldTab) => {
        if (!syncingFromRoute) {
            // Save departing tab's scroll position (skip on initial render)
            if (oldTab !== undefined) {
                subtabScroll.savePosition({
                    tab: oldTab,
                    currentScroll: getScrollPosition(),
                });
            }

            // Update URL
            const currentQuery = { ...route.query };
            if (newTab === defaultTab) {
                delete currentQuery.tab;
            } else {
                currentQuery.tab = newTab;
            }
            void router.replace({ query: currentQuery });

            // Determine scroll target
            if (oldTab !== undefined) {
                const isExplicit = explicitNavigation;
                explicitNavigation = false;

                const target = subtabScroll.getRestorationTarget({
                    tab: newTab,
                    defaultTab,
                    isExplicitNavigation: isExplicit,
                });

                if (target === "action-bar") {
                    scrollToActionBar({ behavior: "smooth" });
                } else {
                    // Wait for DOM update since subtab content is rendered via v-if
                    void nextTick(() => {
                        scrollToPosition({ top: target });
                    });
                }
            }
        }
        syncingFromRoute = false;
    });

    function handleSameTabClick(): void {
        scrollToActionBar({ behavior: "smooth" });
    }

    function switchToTab(tab: T): void {
        explicitNavigation = true;
        currentTab.value = tab;
    }

    return { currentTab, handleSameTabClick, switchToTab };
}
