import type { Ref } from "vue";
import { inject, shallowRef, watch } from "vue";
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

    watch(currentTab, (newTab, oldTab) => {
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
    });

    function handleSameTabClick(): void {
        scrollToActionBar({ behavior: "smooth" });
    }

    return { currentTab, handleSameTabClick };
}
