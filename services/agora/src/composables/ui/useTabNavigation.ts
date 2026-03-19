import type { Ref } from "vue";
import { inject, onActivated, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { z } from "zod";

export function useTabNavigation<T extends string>({
    schema,
    defaultTab,
}: {
    schema: z.ZodType<T>;
    defaultTab: T;
}): {
    currentTab: Ref<T>;
    handleSameTabClick: () => void;
} {
    const route = useRoute();
    const router = useRouter();

    const scrollToActionBar = inject<
        (options?: { behavior?: ScrollBehavior }) => void
    >("scrollToActionBar", () => {
        /* noop */
    });

    const initialTab = schema.safeParse(route.query.tab);
    const currentTab: Ref<T> = shallowRef(
        initialTab.success ? initialTab.data : defaultTab,
    );

    // Guard: skip URL sync and scroll when currentTab changes from route-driven sync
    let syncingFromRoute = false;

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
            const currentQuery = { ...route.query };
            if (newTab === defaultTab) {
                delete currentQuery.tab;
            } else {
                currentQuery.tab = newTab;
            }
            void router.replace({ query: currentQuery });

            if (oldTab !== undefined) {
                scrollToActionBar({ behavior: "smooth" });
            }
        }
        syncingFromRoute = false;
    });

    function handleSameTabClick(): void {
        scrollToActionBar({ behavior: "smooth" });
    }

    return { currentTab, handleSameTabClick };
}
