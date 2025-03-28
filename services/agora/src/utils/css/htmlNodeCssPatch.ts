import { useQuasar } from "quasar";
import { onMounted } from "vue";

export const useHtmlNodeCssPatch = () => {
  const quasar = useQuasar();

  onMounted(() => {
    if (quasar.platform.is.desktop && quasar.platform.is.webkit) {
      document.documentElement.style.overscrollBehavior = "auto";
    }
  });
};
