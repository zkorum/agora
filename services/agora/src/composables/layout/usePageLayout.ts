import {
  type PageLayoutConfig,
  usePageLayoutStore,
} from "src/stores/layout/pageLayout";
import { onActivated, onDeactivated, onMounted, ref } from "vue";

export function usePageLayout(layoutConfig: Partial<PageLayoutConfig>) {
  const { setPageLayout } = usePageLayoutStore();

  // Track whether this page is the active one.
  // Used to guard <Teleport> — keep-alive does NOT remove Teleported content
  // on deactivation, so multiple pages' headers would stack without this.
  const isActive = ref(false);

  onMounted(() => {
    isActive.value = true;
    setPageLayout(layoutConfig);
  });

  onActivated(() => {
    isActive.value = true;
    setPageLayout(layoutConfig);
  });

  onDeactivated(() => {
    isActive.value = false;
  });

  return { isActive };
}
